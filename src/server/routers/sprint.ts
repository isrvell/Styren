import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { db } from "@/server/db";
import { createSprintSchema } from "@/lib/validators";

export const sprintRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createSprintSchema)
    .mutation(async ({ ctx, input }) => {
      await requireProjectAccess(input.projectId, ctx.userId);

      return db.sprint.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          goal: input.goal,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          status: "PLANNED",
        },
      });
    }),

  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        status: z.enum(["PLANNED", "ACTIVE", "COMPLETED"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireProjectAccess(input.projectId, ctx.userId);

      return db.sprint.findMany({
        where: {
          projectId: input.projectId,
          ...(input.status ? { status: input.status } : {}),
        },
        include: {
          _count: { select: { tasks: true } },
        },
        orderBy: { startDate: "desc" },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        sprintId: z.string(),
        name: z.string().min(1).max(100).optional(),
        goal: z.string().optional().nullable(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const sprint = await db.sprint.findUnique({ where: { id: input.sprintId } });
      if (!sprint) throw new TRPCError({ code: "NOT_FOUND" });
      await requireProjectAccess(sprint.projectId, ctx.userId);

      const { sprintId, startDate, endDate, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (startDate) data.startDate = new Date(startDate);
      if (endDate) data.endDate = new Date(endDate);

      return db.sprint.update({ where: { id: sprintId }, data });
    }),

  start: protectedProcedure
    .input(z.object({ sprintId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sprint = await db.sprint.findUnique({ where: { id: input.sprintId } });
      if (!sprint) throw new TRPCError({ code: "NOT_FOUND" });
      await requireProjectAccess(sprint.projectId, ctx.userId);

      if (sprint.status !== "PLANNED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only PLANNED sprints can be started" });
      }

      // Ensure no other sprint is active in this project
      const activeSprint = await db.sprint.findFirst({
        where: { projectId: sprint.projectId, status: "ACTIVE" },
      });
      if (activeSprint) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Another sprint is already active. Complete it first.",
        });
      }

      return db.sprint.update({ where: { id: input.sprintId }, data: { status: "ACTIVE" } });
    }),

  complete: protectedProcedure
    .input(
      z.object({
        sprintId: z.string(),
        moveIncompleteToSprintId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const sprint = await db.sprint.findUnique({ where: { id: input.sprintId } });
      if (!sprint) throw new TRPCError({ code: "NOT_FOUND" });
      await requireProjectAccess(sprint.projectId, ctx.userId);

      if (sprint.status !== "ACTIVE") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only ACTIVE sprints can be completed" });
      }

      return db.$transaction(async (tx) => {
        if (input.moveIncompleteToSprintId) {
          // Move tasks that aren't in a DONE status to the target sprint
          const doneStatuses = await tx.statusDefinition.findMany({
            where: { projectId: sprint.projectId, category: "DONE" },
            select: { id: true },
          });
          const doneIds = doneStatuses.map((s) => s.id);

          await tx.task.updateMany({
            where: {
              sprintId: input.sprintId,
              statusId: { notIn: doneIds },
            },
            data: { sprintId: input.moveIncompleteToSprintId },
          });
        }

        return tx.sprint.update({
          where: { id: input.sprintId },
          data: { status: "COMPLETED" },
        });
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
