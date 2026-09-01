import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { db } from "@/server/db";
import { createCommentSchema } from "@/lib/validators";

export const commentRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createCommentSchema)
    .mutation(async ({ ctx, input }) => {
      const task = await db.task.findUnique({ where: { id: input.taskId } });
      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      await requireTaskAccess(task.projectId, ctx.userId);

      if (input.parentId) {
        const parent = await db.comment.findUnique({ where: { id: input.parentId } });
        if (!parent || parent.taskId !== input.taskId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid parent comment" });
        }
      }

      return db.comment.create({
        data: {
          taskId: input.taskId,
          authorId: ctx.userId,
          body: input.body,
          parentId: input.parentId ?? null,
        },
        include: {
          author: { select: { id: true, name: true, email: true, image: true } },
        },
      });
    }),

  list: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        includeReplies: z.boolean().default(true),
      })
    )
    .query(async ({ ctx, input }) => {
      const task = await db.task.findUnique({ where: { id: input.taskId } });
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      await requireTaskAccess(task.projectId, ctx.userId);

      return db.comment.findMany({
        where: { taskId: input.taskId, parentId: null },
        include: {
          author: { select: { id: true, name: true, email: true, image: true } },
          ...(input.includeReplies
            ? {
                replies: {
                  include: {
                    author: { select: { id: true, name: true, email: true, image: true } },
                  },
                  orderBy: { createdAt: "asc" },
                },
              }
            : {}),
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  update: protectedProcedure
    .input(z.object({ commentId: z.string(), body: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const comment = await db.comment.findUnique({ where: { id: input.commentId } });
      if (!comment) throw new TRPCError({ code: "NOT_FOUND" });
      if (comment.authorId !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Can only edit your own comments" });
      }

      return db.comment.update({
        where: { id: input.commentId },
        data: { body: input.body, editedAt: new Date() },
        include: {
          author: { select: { id: true, name: true, image: true } },
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await db.comment.findUnique({ where: { id: input.commentId } });
      if (!comment) throw new TRPCError({ code: "NOT_FOUND" });

      if (comment.authorId !== ctx.userId) {
        // Org admins can also delete — check membership
        const task = await db.task.findUnique({
          where: { id: comment.taskId },
          include: { project: { include: { space: { include: { workspace: true } } } } },
        });
        if (!task) throw new TRPCError({ code: "NOT_FOUND" });

        const membership = await db.organizationMembership.findUnique({
          where: {
            orgId_userId: {
              orgId: task.project.space.workspace.orgId,
              userId: ctx.userId,
            },
          },
        });
        if (!membership || membership.status !== "ACTIVE") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }

      return db.comment.delete({ where: { id: input.commentId } });
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
