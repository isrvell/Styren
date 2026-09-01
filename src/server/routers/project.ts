import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { db } from "@/server/db";
import { createProjectSchema } from "@/lib/validators";
import { DEFAULT_STATUSES } from "@/lib/constants";

export const projectRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const space = await db.space.findUnique({
        where: { id: input.spaceId },
        include: { workspace: true },
      });
      if (!space) throw new TRPCError({ code: "NOT_FOUND", message: "Space not found" });
      await requireOrgMember(space.workspace.orgId, ctx.userId);

      const existing = await db.project.findUnique({
        where: { spaceId_slug: { spaceId: input.spaceId, slug: input.slug } },
      });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Project slug already taken in this space" });
      }

      return db.$transaction(async (tx) => {
        const project = await tx.project.create({
          data: {
            spaceId: input.spaceId,
            name: input.name,
            slug: input.slug,
            methodology: input.methodology,
            taskPrefix: input.taskPrefix,
          },
        });

        await tx.statusDefinition.createMany({
          data: DEFAULT_STATUSES.map((s) => ({
            projectId: project.id,
            name: s.name,
            color: s.color,
            category: s.category,
            position: s.position,
          })),
        });

        // Add creator as a project member with owner role (find or create org owner role)
        const ownerRole = await tx.role.findFirst({
          where: { orgId: space.workspace.orgId, name: "Owner", isSystem: true },
        });

        if (ownerRole) {
          await tx.projectMember.create({
            data: {
              projectId: project.id,
              userId: ctx.userId,
              roleId: ownerRole.id,
            },
          });
        }

        return tx.project.findUnique({
          where: { id: project.id },
          include: { statuses: { orderBy: { position: "asc" } } },
        });
      });
    }),

  getBySlug: protectedProcedure
    .input(z.object({ spaceId: z.string(), slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const space = await db.space.findUnique({
        where: { id: input.spaceId },
        include: { workspace: true },
      });
      if (!space) throw new TRPCError({ code: "NOT_FOUND" });
      await requireOrgMember(space.workspace.orgId, ctx.userId);

      const project = await db.project.findUnique({
        where: { spaceId_slug: { spaceId: input.spaceId, slug: input.slug } },
        include: {
          statuses: { orderBy: { position: "asc" } },
          labels: true,
          sprints: { orderBy: { startDate: "desc" }, take: 10 },
          _count: { select: { tasks: true, members: true } },
        },
      });

      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      return project;
    }),

  list: protectedProcedure
    .input(z.object({ spaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const space = await db.space.findUnique({
        where: { id: input.spaceId },
        include: { workspace: true },
      });
      if (!space) throw new TRPCError({ code: "NOT_FOUND" });
      await requireOrgMember(space.workspace.orgId, ctx.userId);

      return db.project.findMany({
        where: { spaceId: input.spaceId },
        include: {
          statuses: { orderBy: { position: "asc" } },
          _count: { select: { tasks: true } },
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional().nullable(),
        methodology: z.enum(["SCRUM", "KANBAN"]).optional(),
        isPrivate: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await requireProjectAccess(input.projectId, ctx.userId);
      const { projectId, ...data } = input;
      return db.project.update({ where: { id: projectId }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireProjectAccess(input.projectId, ctx.userId);
      return db.project.delete({ where: { id: input.projectId } });
    }),

  getMembers: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireProjectAccess(input.projectId, ctx.userId);

      return db.projectMember.findMany({
        where: { projectId: input.projectId },
        include: {
          role: { select: { id: true, name: true } },
          project: { select: { space: { select: { workspace: { select: { orgId: true } } } } } },
        },
        orderBy: { createdAt: "asc" },
      }).then(async (members) => {
        const userIds = members.map((m) => m.userId);
        const users = await db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true, image: true },
        });
        const userMap = new Map(users.map((u) => [u.id, u]));
        return members.map((m) => ({
          ...m,
          user: userMap.get(m.userId) ?? { id: m.userId, name: null, email: "", image: null },
        }));
      });
    }),

  addMember: protectedProcedure
    .input(z.object({ projectId: z.string(), userId: z.string(), roleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireProjectAccess(input.projectId, ctx.userId);

      const existing = await db.projectMember.findUnique({
        where: { projectId_userId: { projectId: input.projectId, userId: input.userId } },
      });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "User is already a project member" });
      }

      return db.projectMember.create({
        data: { projectId: input.projectId, userId: input.userId, roleId: input.roleId },
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

async function requireOrgMember(orgId: string, userId: string) {
  const membership = await db.organizationMembership.findUnique({
    where: { orgId_userId: { orgId, userId } },
  });
  if (!membership || membership.status !== "ACTIVE") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this organization" });
  }
  return membership;
}
