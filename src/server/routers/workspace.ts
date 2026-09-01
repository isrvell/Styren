import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { db } from "@/server/db";
import { createWorkspaceSchema } from "@/lib/validators";

export const workspaceRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createWorkspaceSchema)
    .mutation(async ({ ctx, input }) => {
      await requireOrgMember(input.orgId, ctx.userId);

      const existing = await db.workspace.findUnique({
        where: { orgId_slug: { orgId: input.orgId, slug: input.slug } },
      });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Workspace slug already taken" });
      }

      return db.workspace.create({
        data: { orgId: input.orgId, name: input.name, slug: input.slug },
      });
    }),

  list: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireOrgMember(input.orgId, ctx.userId);

      return db.workspace.findMany({
        where: { orgId: input.orgId },
        include: {
          spaces: {
            include: {
              _count: { select: { projects: true } },
              projects: {
                select: { id: true, name: true, slug: true, methodology: true },
                orderBy: { createdAt: "asc" },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  getBySlug: protectedProcedure
    .input(z.object({ orgId: z.string(), slug: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireOrgMember(input.orgId, ctx.userId);

      const workspace = await db.workspace.findUnique({
        where: { orgId_slug: { orgId: input.orgId, slug: input.slug } },
        include: {
          spaces: {
            include: {
              projects: { orderBy: { createdAt: "asc" } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!workspace) throw new TRPCError({ code: "NOT_FOUND" });
      return workspace;
    }),

  update: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        name: z.string().min(1).max(100).optional(),
        icon: z.string().optional().nullable(),
        settings: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const workspace = await db.workspace.findUnique({ where: { id: input.workspaceId } });
      if (!workspace) throw new TRPCError({ code: "NOT_FOUND" });
      await requireOrgMember(workspace.orgId, ctx.userId);

      const { workspaceId, settings, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (settings !== undefined) {
        data.settings = JSON.parse(JSON.stringify(settings));
      }
      return db.workspace.update({ where: { id: workspaceId }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const workspace = await db.workspace.findUnique({ where: { id: input.workspaceId } });
      if (!workspace) throw new TRPCError({ code: "NOT_FOUND" });
      await requireOrgMember(workspace.orgId, ctx.userId);

      return db.workspace.delete({ where: { id: input.workspaceId } });
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
