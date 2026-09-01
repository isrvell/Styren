import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { db } from "@/server/db";
import { createSpaceSchema } from "@/lib/validators";

export const spaceRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createSpaceSchema)
    .mutation(async ({ ctx, input }) => {
      const workspace = await db.workspace.findUnique({ where: { id: input.workspaceId } });
      if (!workspace) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      await requireOrgMember(workspace.orgId, ctx.userId);

      const existing = await db.space.findUnique({
        where: { workspaceId_slug: { workspaceId: input.workspaceId, slug: input.slug } },
      });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Space slug already taken" });
      }

      return db.space.create({
        data: { workspaceId: input.workspaceId, name: input.name, slug: input.slug },
      });
    }),

  list: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const workspace = await db.workspace.findUnique({ where: { id: input.workspaceId } });
      if (!workspace) throw new TRPCError({ code: "NOT_FOUND" });
      await requireOrgMember(workspace.orgId, ctx.userId);

      return db.space.findMany({
        where: { workspaceId: input.workspaceId },
        include: {
          projects: { orderBy: { createdAt: "asc" } },
          _count: { select: { projects: true } },
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  getBySlug: protectedProcedure
    .input(z.object({ workspaceId: z.string(), slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const workspace = await db.workspace.findUnique({ where: { id: input.workspaceId } });
      if (!workspace) throw new TRPCError({ code: "NOT_FOUND" });
      await requireOrgMember(workspace.orgId, ctx.userId);

      const space = await db.space.findUnique({
        where: { workspaceId_slug: { workspaceId: input.workspaceId, slug: input.slug } },
        include: {
          projects: {
            include: {
              statuses: { orderBy: { position: "asc" } },
              _count: { select: { tasks: true, members: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!space) throw new TRPCError({ code: "NOT_FOUND" });
      return space;
    }),

  update: protectedProcedure
    .input(
      z.object({
        spaceId: z.string(),
        name: z.string().min(1).max(100).optional(),
        icon: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const space = await db.space.findUnique({
        where: { id: input.spaceId },
        include: { workspace: true },
      });
      if (!space) throw new TRPCError({ code: "NOT_FOUND" });
      await requireOrgMember(space.workspace.orgId, ctx.userId);

      const { spaceId, ...data } = input;
      return db.space.update({ where: { id: spaceId }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ spaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const space = await db.space.findUnique({
        where: { id: input.spaceId },
        include: { workspace: true },
      });
      if (!space) throw new TRPCError({ code: "NOT_FOUND" });
      await requireOrgMember(space.workspace.orgId, ctx.userId);

      return db.space.delete({ where: { id: input.spaceId } });
    }),
});

async function requireOrgMember(orgId: string, userId: string) {
  const membership = await db.organizationMembership.findUnique({
    where: { orgId_userId: { orgId, userId } },
  });
  if (!membership || membership.status !== "ACTIVE") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this organization" });
  }
  return membership;
}
