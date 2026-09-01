import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { db } from "@/server/db";
import { savedViewSchema } from "@/lib/validators";

export const savedViewRouter = createTRPCRouter({
  create: protectedProcedure
    .input(savedViewSchema)
    .mutation(async ({ ctx, input }) => {
      await requireProjectAccess(input.projectId, ctx.userId);

      return db.savedView.create({
        data: {
          projectId: input.projectId,
          ownerId: ctx.userId,
          name: input.name,
          filters: JSON.parse(JSON.stringify(input.filters)),
          sort: JSON.parse(JSON.stringify(input.sort)),
          grouping: JSON.parse(JSON.stringify(input.grouping)),
          isShared: input.isShared,
        },
      });
    }),

  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        includeShared: z.boolean().default(true),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireProjectAccess(input.projectId, ctx.userId);

      return db.savedView.findMany({
        where: {
          projectId: input.projectId,
          ...(input.includeShared
            ? { OR: [{ ownerId: ctx.userId }, { isShared: true }] }
            : { ownerId: ctx.userId }),
        },
        include: {
          owner: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        viewId: z.string(),
        name: z.string().min(1).max(100).optional(),
        filters: z.record(z.unknown()).optional(),
        sort: z.record(z.unknown()).optional(),
        grouping: z.record(z.unknown()).optional(),
        isShared: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const view = await db.savedView.findUnique({ where: { id: input.viewId } });
      if (!view) throw new TRPCError({ code: "NOT_FOUND" });
      if (view.ownerId !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Can only edit your own saved views" });
      }

      const { viewId, filters, sort, grouping, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (filters !== undefined) data.filters = JSON.parse(JSON.stringify(filters));
      if (sort !== undefined) data.sort = JSON.parse(JSON.stringify(sort));
      if (grouping !== undefined) data.grouping = JSON.parse(JSON.stringify(grouping));
      return db.savedView.update({ where: { id: viewId }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ viewId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const view = await db.savedView.findUnique({ where: { id: input.viewId } });
      if (!view) throw new TRPCError({ code: "NOT_FOUND" });
      if (view.ownerId !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Can only delete your own saved views" });
      }

      return db.savedView.delete({ where: { id: input.viewId } });
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
}
