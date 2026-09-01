import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { db } from "@/server/db";
import { createTaskSchema, updateTaskSchema } from "@/lib/validators";

const taskInclude = {
  status: true,
  assignments: {
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  },
  taskLabels: { include: { label: true } },
  sprint: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true, image: true } },
  _count: { select: { subtasks: true, comments: true } },
} as const;

export const taskRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createTaskSchema)
    .mutation(async ({ ctx, input }) => {
      await requireProjectAccess(input.projectId, ctx.userId);

      return db.$transaction(async (tx) => {
        // Atomically increment task counter and get the new number
        const project = await tx.project.update({
          where: { id: input.projectId },
          data: { taskCounter: { increment: 1 } },
          select: { taskCounter: true },
        });

        const task = await tx.task.create({
          data: {
            projectId: input.projectId,
            number: project.taskCounter,
            title: input.title,
            description: input.description,
            statusId: input.statusId,
            priority: input.priority,
            estimate: input.estimate,
            startDate: input.startDate ? new Date(input.startDate) : undefined,
            dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
            sprintId: input.sprintId ?? null,
            parentTaskId: input.parentTaskId ?? null,
            createdById: ctx.userId,
          },
        });

        if (input.assigneeIds?.length) {
          await tx.taskAssignment.createMany({
            data: input.assigneeIds.map((userId, i) => ({
              taskId: task.id,
              userId,
              isOwner: i === 0,
            })),
            skipDuplicates: true,
          });
        }

        if (input.labelIds?.length) {
          await tx.taskLabel.createMany({
            data: input.labelIds.map((labelId) => ({ taskId: task.id, labelId })),
            skipDuplicates: true,
          });
        }

        return tx.task.findUnique({ where: { id: task.id }, include: taskInclude });
      });
    }),

  getById: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ ctx, input }) => {
      const task = await db.task.findUnique({
        where: { id: input.taskId },
        include: {
          ...taskInclude,
          project: { select: { taskPrefix: true, methodology: true } },
          comments: {
            where: { parentId: null },
            include: {
              author: { select: { id: true, name: true, image: true } },
              replies: {
                include: { author: { select: { id: true, name: true, image: true } } },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          timeEntries: {
            include: { user: { select: { id: true, name: true } } },
            orderBy: { startedAt: "desc" },
          },
          subtasks: {
            include: {
              ...taskInclude,
              project: { select: { taskPrefix: true, methodology: true } },
            },
          },
          githubLinks: true,
        },
      });

      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      await requireProjectAccess(task.projectId, ctx.userId);
      return task;
    }),

  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        statusId: z.string().optional(),
        statusIds: z.array(z.string()).optional(),
        assigneeId: z.string().optional(),
        priority: z.enum(["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
        labelId: z.string().optional(),
        sprintId: z.string().optional(),
        search: z.string().optional(),
        parentTaskId: z.string().nullable().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(50),
        includeStatusCounts: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireProjectAccess(input.projectId, ctx.userId);

      const where: Record<string, unknown> = { projectId: input.projectId };

      if (input.statusId) where.statusId = input.statusId;
      if (input.statusIds?.length) where.statusId = { in: input.statusIds };
      if (input.assigneeId) {
        where.assignments = { some: { userId: input.assigneeId } };
      }
      if (input.priority) where.priority = input.priority;
      if (input.labelId) {
        where.taskLabels = { some: { labelId: input.labelId } };
      }
      if (input.sprintId !== undefined) where.sprintId = input.sprintId;
      if (input.search) {
        where.OR = [
          { title: { contains: input.search, mode: "insensitive" } },
          { description: { contains: input.search, mode: "insensitive" } },
        ];
      }
      if (input.parentTaskId !== undefined) {
        where.parentTaskId = input.parentTaskId;
      }

      const skip = (input.page - 1) * input.pageSize;

      const [tasks, total] = await Promise.all([
        db.task.findMany({
          where,
          include: taskInclude,
          orderBy: [{ status: { position: "asc" } }, { createdAt: "desc" }],
          skip,
          take: input.pageSize,
        }),
        db.task.count({ where }),
      ]);

      let statusCounts: Record<string, number> | undefined;
      if (input.includeStatusCounts) {
        const grouped = await db.task.groupBy({
          by: ["statusId"],
          where: { projectId: input.projectId },
          _count: true,
        });
        statusCounts = Object.fromEntries(grouped.map((g) => [g.statusId, g._count]));
      }

      return {
        tasks,
        total,
        page: input.page,
        pageSize: input.pageSize,
        pageCount: Math.ceil(total / input.pageSize),
        statusCounts,
      };
    }),

  update: protectedProcedure
    .input(updateTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const task = await db.task.findUnique({ where: { id: input.taskId } });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      await requireProjectAccess(task.projectId, ctx.userId);

      const { taskId, ...raw } = input;
      const data: Record<string, unknown> = { ...raw };
      if (raw.startDate !== undefined) {
        data.startDate = raw.startDate ? new Date(raw.startDate) : null;
      }
      if (raw.dueDate !== undefined) {
        data.dueDate = raw.dueDate ? new Date(raw.dueDate) : null;
      }

      return db.task.update({ where: { id: taskId }, data, include: taskInclude });
    }),

  delete: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const task = await db.task.findUnique({ where: { id: input.taskId } });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      await requireProjectAccess(task.projectId, ctx.userId);

      return db.task.delete({ where: { id: input.taskId } });
    }),

  bulkUpdate: protectedProcedure
    .input(
      z.object({
        taskIds: z.array(z.string()).min(1).max(200),
        statusId: z.string().optional(),
        priority: z.enum(["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
        sprintId: z.string().nullable().optional(),
        assigneeId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.taskIds.length === 0) return { count: 0 };

      // Verify all tasks belong to a project the user can access
      const tasks = await db.task.findMany({
        where: { id: { in: input.taskIds } },
        select: { id: true, projectId: true },
      });

      const projectIds = [...new Set(tasks.map((t) => t.projectId))];
      for (const projectId of projectIds) {
        await requireProjectAccess(projectId, ctx.userId);
      }

      const data: Record<string, unknown> = {};
      if (input.statusId !== undefined) data.statusId = input.statusId;
      if (input.priority !== undefined) data.priority = input.priority;
      if (input.sprintId !== undefined) data.sprintId = input.sprintId;

      const result = await db.task.updateMany({
        where: { id: { in: input.taskIds } },
        data,
      });

      // Handle bulk assignee separately
      if (input.assigneeId) {
        await db.taskAssignment.createMany({
          data: input.taskIds.map((taskId) => ({
            taskId,
            userId: input.assigneeId!,
            isOwner: false,
          })),
          skipDuplicates: true,
        });
      }

      return { count: result.count };
    }),

  assign: protectedProcedure
    .input(z.object({ taskId: z.string(), userId: z.string(), isOwner: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      const task = await db.task.findUnique({ where: { id: input.taskId } });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      await requireProjectAccess(task.projectId, ctx.userId);

      return db.taskAssignment.upsert({
        where: { taskId_userId: { taskId: input.taskId, userId: input.userId } },
        create: { taskId: input.taskId, userId: input.userId, isOwner: input.isOwner },
        update: { isOwner: input.isOwner },
      });
    }),

  unassign: protectedProcedure
    .input(z.object({ taskId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const task = await db.task.findUnique({ where: { id: input.taskId } });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      await requireProjectAccess(task.projectId, ctx.userId);

      return db.taskAssignment.delete({
        where: { taskId_userId: { taskId: input.taskId, userId: input.userId } },
      });
    }),

  addLabel: protectedProcedure
    .input(z.object({ taskId: z.string(), labelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const task = await db.task.findUnique({ where: { id: input.taskId } });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      await requireProjectAccess(task.projectId, ctx.userId);

      return db.taskLabel.create({ data: { taskId: input.taskId, labelId: input.labelId } });
    }),

  removeLabel: protectedProcedure
    .input(z.object({ taskId: z.string(), labelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const task = await db.task.findUnique({ where: { id: input.taskId } });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      await requireProjectAccess(task.projectId, ctx.userId);

      return db.taskLabel.delete({
        where: { taskId_labelId: { taskId: input.taskId, labelId: input.labelId } },
      });
    }),

  getSubtasks: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ ctx, input }) => {
      const task = await db.task.findUnique({ where: { id: input.taskId } });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      await requireProjectAccess(task.projectId, ctx.userId);

      return db.task.findMany({
        where: { parentTaskId: input.taskId },
        include: taskInclude,
        orderBy: { createdAt: "asc" },
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
