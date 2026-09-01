import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { db } from "@/server/db";
import { createTimeEntrySchema } from "@/lib/validators";

export const timeEntryRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createTimeEntrySchema)
    .mutation(async ({ ctx, input }) => {
      const task = await db.task.findUnique({ where: { id: input.taskId } });
      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      await requireTaskAccess(task.projectId, ctx.userId);

      const startedAt = new Date(input.startedAt);
      const endedAt = new Date(startedAt.getTime() + input.durationSeconds * 1000);

      return db.timeEntry.create({
        data: {
          taskId: input.taskId,
          userId: ctx.userId,
          durationSeconds: input.durationSeconds,
          billable: input.billable,
          startedAt,
          endedAt,
          note: input.note,
        },
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      });
    }),

  list: protectedProcedure
    .input(
      z.object({
        taskId: z.string().optional(),
        userId: z.string().optional(),
        projectId: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};

      if (input.taskId) {
        const task = await db.task.findUnique({ where: { id: input.taskId } });
        if (!task) throw new TRPCError({ code: "NOT_FOUND" });
        await requireTaskAccess(task.projectId, ctx.userId);
        where.taskId = input.taskId;
      }

      if (input.userId) where.userId = input.userId;

      if (input.projectId) {
        await requireTaskAccess(input.projectId, ctx.userId);
        where.task = { projectId: input.projectId };
      }

      if (input.from || input.to) {
        where.startedAt = {
          ...(input.from ? { gte: new Date(input.from) } : {}),
          ...(input.to ? { lte: new Date(input.to) } : {}),
        };
      }

      // If no filter given, scope to current user
      if (!input.taskId && !input.projectId) {
        where.userId = ctx.userId;
      }

      const skip = (input.page - 1) * input.pageSize;
      const [entries, total] = await Promise.all([
        db.timeEntry.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, image: true } },
            task: { select: { id: true, number: true, title: true, projectId: true } },
          },
          orderBy: { startedAt: "desc" },
          skip,
          take: input.pageSize,
        }),
        db.timeEntry.count({ where }),
      ]);

      const totalSeconds = entries.reduce((sum, e) => sum + e.durationSeconds, 0);

      return {
        entries,
        total,
        totalSeconds,
        page: input.page,
        pageSize: input.pageSize,
        pageCount: Math.ceil(total / input.pageSize),
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        entryId: z.string(),
        durationSeconds: z.number().min(1).optional(),
        billable: z.boolean().optional(),
        startedAt: z.string().optional(),
        note: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const entry = await db.timeEntry.findUnique({ where: { id: input.entryId } });
      if (!entry) throw new TRPCError({ code: "NOT_FOUND" });
      if (entry.userId !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Can only edit your own time entries" });
      }

      const { entryId, startedAt, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (startedAt) {
        data.startedAt = new Date(startedAt);
        const duration = input.durationSeconds ?? entry.durationSeconds;
        data.endedAt = new Date(new Date(startedAt).getTime() + duration * 1000);
      }

      return db.timeEntry.update({
        where: { id: entryId },
        data,
        include: { user: { select: { id: true, name: true, image: true } } },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ entryId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const entry = await db.timeEntry.findUnique({ where: { id: input.entryId } });
      if (!entry) throw new TRPCError({ code: "NOT_FOUND" });
      if (entry.userId !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Can only delete your own time entries" });
      }

      return db.timeEntry.delete({ where: { id: input.entryId } });
    }),
});

async function requireTaskAccess(projectId: string, userId: string) {
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
}
