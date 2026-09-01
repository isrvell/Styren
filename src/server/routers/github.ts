import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { db } from "@/server/db";

export const githubRouter = createTRPCRouter({
  listInstallations: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireOrgMember(input.orgId, ctx.userId);

      return db.gitHubInstallation.findMany({
        where: { orgId: input.orgId },
        orderBy: { createdAt: "asc" },
      });
    }),

  linkRepo: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        repoFullName: z.string().min(1),
        syncRules: z.record(z.unknown()).default({}),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await requireProjectAccess(input.projectId, ctx.userId);

      const existing = await db.gitHubRepoLink.findUnique({
        where: {
          projectId_repoFullName: {
            projectId: input.projectId,
            repoFullName: input.repoFullName,
          },
        },
      });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Repository is already linked" });
      }

      return db.gitHubRepoLink.create({
        data: {
          projectId: input.projectId,
          repoFullName: input.repoFullName,
          syncRules: JSON.parse(JSON.stringify(input.syncRules)),
        },
      });
    }),

  unlinkRepo: protectedProcedure
    .input(z.object({ linkId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const link = await db.gitHubRepoLink.findUnique({ where: { id: input.linkId } });
      if (!link) throw new TRPCError({ code: "NOT_FOUND" });
      await requireProjectAccess(link.projectId, ctx.userId);

      return db.gitHubRepoLink.delete({ where: { id: input.linkId } });
    }),

  listTaskLinks: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ ctx, input }) => {
      const task = await db.task.findUnique({ where: { id: input.taskId } });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      await requireProjectAccess(task.projectId, ctx.userId);

      return db.gitHubTaskLink.findMany({
        where: { taskId: input.taskId },
        orderBy: { createdAt: "desc" },
      });
    }),

  linkTask: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        repoFullName: z.string(),
        linkType: z.enum(["ISSUE", "PULL_REQUEST", "COMMIT", "BRANCH"]),
        externalId: z.string(),
        externalUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const task = await db.task.findUnique({ where: { id: input.taskId } });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      await requireProjectAccess(task.projectId, ctx.userId);

      return db.gitHubTaskLink.create({
        data: {
          taskId: input.taskId,
          repoFullName: input.repoFullName,
          linkType: input.linkType,
          externalId: input.externalId,
          externalUrl: input.externalUrl,
        },
      });
    }),
});

async function requireOrgMember(orgId: string, userId: string) {
  const membership = await db.organizationMembership.findUnique({
    where: { orgId_userId: { orgId, userId } },
  });
  if (!membership || membership.status !== "ACTIVE") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return membership;
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
  return project;
}
