import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { db } from "@/server/db";

export const statusRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireProjectAccess(input.projectId, ctx.userId);

      return db.statusDefinition.findMany({
        where: { projectId: input.projectId },
        include: { _count: { select: { tasks: true } } },
        orderBy: { position: "asc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1).max(100),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        category: z.enum(["NOT_STARTED", "ACTIVE", "DONE"]),
        position: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireProjectAccess(input.projectId, ctx.userId);

      // Determine position: append after last if not specified
      let position = input.position;
      if (position === undefined) {
        const last = await db.statusDefinition.findFirst({
          where: { projectId: input.projectId },
          orderBy: { position: "desc" },
          select: { position: true },
        });
        position = (last?.position ?? -1) + 1;
      } else {
        // Shift existing statuses at or after this position
        await db.statusDefinition.updateMany({
          where: { projectId: input.projectId, position: { gte: position } },
          data: { position: { increment: 1 } },
        });
      }

      return db.statusDefinition.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          color: input.color,
          category: input.category,
          position,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        statusId: z.string(),
        name: z.string().min(1).max(100).optional(),
        color: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .optional(),
        category: z.enum(["NOT_STARTED", "ACTIVE", "DONE"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const status = await db.statusDefinition.findUnique({ where: { id: input.statusId } });
      if (!status) throw new TRPCError({ code: "NOT_FOUND" });
      await requireProjectAccess(status.projectId, ctx.userId);

      const { statusId, ...data } = input;
      return db.statusDefinition.update({ where: { id: statusId }, data });
    }),

  reorder: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        // Ordered list of status IDs in the desired new order
        orderedIds: z.array(z.string()).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireProjectAccess(input.projectId, ctx.userId);

      // Verify all statuses belong to this project
      const statuses = await db.statusDefinition.findMany({
        where: { projectId: input.projectId },
        select: { id: true },
      });
      const existingIds = new Set(statuses.map((s) => s.id));
      for (const id of input.orderedIds) {
        if (!existingIds.has(id)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Status ${id} not in project` });
        }
      }

      return db.$transaction(async (tx) => {
        // Two-pass to avoid unique constraint violation on (projectId, position)
        // Pass 1: set all positions to negative offsets
        for (let i = 0; i < input.orderedIds.length; i++) {
          await tx.statusDefinition.update({
            where: { id: input.orderedIds[i] },
            data: { position: -(i + 1) },
          });
        }
        // Pass 2: set to final positions
        for (let i = 0; i < input.orderedIds.length; i++) {
          await tx.statusDefinition.update({
            where: { id: input.orderedIds[i] },
            data: { position: i },
          });
        }
      });
    }),

  delete: protectedProcedure
    .input(
      z.object({
        statusId: z.string(),
        migrateTo: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const status = await db.statusDefinition.findUnique({ where: { id: input.statusId } });
      if (!status) throw new TRPCError({ code: "NOT_FOUND" });
      await requireProjectAccess(status.projectId, ctx.userId);

      // Must have at least one status remaining
      const count = await db.statusDefinition.count({ where: { projectId: status.projectId } });
      if (count <= 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete the last status" });
      }

      return db.$transaction(async (tx) => {
        const tasksWithStatus = await tx.task.count({ where: { statusId: input.statusId } });

        if (tasksWithStatus > 0) {
          let targetStatusId = input.migrateTo;
          if (!targetStatusId) {
            const fallback = await tx.statusDefinition.findFirst({
              where: { projectId: status.projectId, id: { not: input.statusId } },
              orderBy: { position: "asc" },
            });
            if (!fallback) throw new TRPCError({ code: "BAD_REQUEST", message: "No fallback status" });
            targetStatusId = fallback.id;
          }
          await tx.task.updateMany({
            where: { statusId: input.statusId },
            data: { statusId: targetStatusId },
          });
        }

        return tx.statusDefinition.delete({ where: { id: input.statusId } });
      });
    }),
});

async function requireProjectAccess(projectId: string, userId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { space: { include: { workspace: true } } },
  });
  if (!project) throw new TRPCError({ code: "NOT_FOUND" });

  const membership = await db.organizationMembership.findUnique({
    where: { orgId_userId: { orgId: project.space.workspace.orgId, userId } },
  });
  if (!membership || membership.status !== "ACTIVE") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return project;
}
