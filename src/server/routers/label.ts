import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { db } from "@/server/db";
import { createLabelSchema } from "@/lib/validators";

export const labelRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createLabelSchema)
    .mutation(async ({ ctx, input }) => {
      if (!input.workspaceId && !input.projectId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either workspaceId or projectId is required",
        });
      }

      if (input.workspaceId) {
        const workspace = await db.workspace.findUnique({ where: { id: input.workspaceId } });
        if (!workspace) throw new TRPCError({ code: "NOT_FOUND" });
        await requireOrgMember(workspace.orgId, ctx.userId);
      }

      if (input.projectId) {
        await requireProjectAccess(input.projectId, ctx.userId);
      }

      return db.label.create({
        data: {
          name: input.name,
          color: input.color,
          workspaceId: input.workspaceId ?? null,
          projectId: input.projectId ?? null,
        },
      });
    }),

  list: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().optional(),
        projectId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!input.workspaceId && !input.projectId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "workspaceId or projectId required" });
      }

      if (input.workspaceId) {
        const workspace = await db.workspace.findUnique({ where: { id: input.workspaceId } });
        if (!workspace) throw new TRPCError({ code: "NOT_FOUND" });
        await requireOrgMember(workspace.orgId, ctx.userId);
      }

      if (input.projectId) {
        await requireProjectAccess(input.projectId, ctx.userId);
      }

      const where: Record<string, unknown> = {};
      if (input.workspaceId) where.workspaceId = input.workspaceId;
      if (input.projectId) where.projectId = input.projectId;

      return db.label.findMany({ where, orderBy: { name: "asc" } });
    }),

  update: protectedProcedure
    .input(
      z.object({
        labelId: z.string(),
        name: z.string().min(1).max(50).optional(),
        color: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const label = await db.label.findUnique({ where: { id: input.labelId } });
      if (!label) throw new TRPCError({ code: "NOT_FOUND" });

      if (label.workspaceId) {
        const workspace = await db.workspace.findUnique({ where: { id: label.workspaceId } });
        if (workspace) await requireOrgMember(workspace.orgId, ctx.userId);
      } else if (label.projectId) {
        await requireProjectAccess(label.projectId, ctx.userId);
      }

      const { labelId, ...data } = input;
      return db.label.update({ where: { id: labelId }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ labelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const label = await db.label.findUnique({ where: { id: input.labelId } });
      if (!label) throw new TRPCError({ code: "NOT_FOUND" });

      if (label.workspaceId) {
        const workspace = await db.workspace.findUnique({ where: { id: label.workspaceId } });
        if (workspace) await requireOrgMember(workspace.orgId, ctx.userId);
      } else if (label.projectId) {
        await requireProjectAccess(label.projectId, ctx.userId);
      }

      return db.label.delete({ where: { id: input.labelId } });
    }),
});

async function requireOrgMember(orgId: string, userId: string) {
  const membership = await db.organizationMembership.findUnique({
    where: { orgId_userId: { orgId, userId } },
  });
  if (!membership || membership.status !== "ACTIVE") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}

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
