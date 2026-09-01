import { z } from "zod";
import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { db } from "@/server/db";
import { inviteMemberSchema } from "@/lib/validators";
import { sendInviteEmail } from "@/lib/email";

export const organizationRouter = createTRPCRouter({
  getById: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      const membership = await db.organizationMembership.findUnique({
        where: { orgId_userId: { orgId: input.orgId, userId: ctx.userId } },
      });
      if (!membership || membership.status !== "ACTIVE") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const org = await db.organization.findUnique({
        where: { id: input.orgId },
        include: {
          workspaces: true,
          _count: { select: { memberships: { where: { status: "ACTIVE" } } } },
        },
      });
      if (!org) throw new TRPCError({ code: "NOT_FOUND" });
      return org;
    }),

  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const org = await db.organization.findUnique({ where: { slug: input.slug } });
      if (!org) throw new TRPCError({ code: "NOT_FOUND" });

      const membership = await db.organizationMembership.findUnique({
        where: { orgId_userId: { orgId: org.id, userId: ctx.userId } },
      });
      if (!membership || membership.status !== "ACTIVE") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return db.organization.findUnique({
        where: { slug: input.slug },
        include: {
          workspaces: true,
          memberships: {
            where: { userId: ctx.userId, status: "ACTIVE" },
            include: { role: true },
            take: 1,
          },
        },
      });
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await db.organizationMembership.findMany({
      where: { userId: ctx.userId, status: "ACTIVE" },
      include: {
        organization: {
          include: {
            workspaces: { take: 1, orderBy: { createdAt: "asc" } },
            _count: { select: { memberships: { where: { status: "ACTIVE" } } } },
          },
        },
        role: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return memberships.map((m) => ({ ...m.organization, myRole: m.role }));
  }),

  update: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        name: z.string().min(1).max(100).optional(),
        logo: z.string().url().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireOrgMember(input.orgId, ctx.userId);
      const { orgId, ...data } = input;
      return db.organization.update({ where: { id: orgId }, data });
    }),

  inviteMember: protectedProcedure
    .input(inviteMemberSchema)
    .mutation(async ({ ctx, input }) => {
      await requireOrgMember(input.orgId, ctx.userId);

      const role = await db.role.findFirst({ where: { id: input.roleId, orgId: input.orgId } });
      if (!role) throw new TRPCError({ code: "NOT_FOUND", message: "Role not found" });

      let invitee = await db.user.findUnique({ where: { email: input.email } });
      if (!invitee) {
        invitee = await db.user.create({
          data: { email: input.email, name: input.email.split("@")[0] },
        });
      }

      const existing = await db.organizationMembership.findUnique({
        where: { orgId_userId: { orgId: input.orgId, userId: invitee.id } },
      });

      if (existing && existing.status === "ACTIVE") {
        throw new TRPCError({ code: "CONFLICT", message: "User is already a member" });
      }

      const inviteToken = crypto.randomBytes(32).toString("hex");
      const org = await db.organization.findUnique({ where: { id: input.orgId } });
      const inviter = await db.user.findUnique({ where: { id: ctx.userId } });

      let membership;
      if (existing) {
        membership = await db.organizationMembership.update({
          where: { id: existing.id },
          data: { roleId: input.roleId, status: "INVITED", inviteToken },
        });
      } else {
        membership = await db.organizationMembership.create({
          data: {
            orgId: input.orgId,
            userId: invitee.id,
            roleId: input.roleId,
            status: "INVITED",
            inviteToken,
          },
        });
      }

      try {
        await sendInviteEmail({
          to: input.email,
          inviterName: inviter?.name || inviter?.email || "A team member",
          orgName: org?.name || "your organization",
          inviteToken,
        });
      } catch (err) {
        console.error("Email send failed:", err);
      }

      return membership;
    }),

  listRoles: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireOrgMember(input.orgId, ctx.userId);

      return db.role.findMany({
        where: { orgId: input.orgId },
        select: { id: true, name: true, description: true, scopeLevel: true },
        orderBy: { createdAt: "asc" },
      });
    }),

  listMembers: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      await requireOrgMember(input.orgId, ctx.userId);

      return db.organizationMembership.findMany({
        where: { orgId: input.orgId, status: { in: ["ACTIVE", "INVITED"] } },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          role: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  removeMember: protectedProcedure
    .input(z.object({ orgId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireOrgMember(input.orgId, ctx.userId);

      if (input.userId === ctx.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot remove yourself" });
      }

      return db.organizationMembership.update({
        where: { orgId_userId: { orgId: input.orgId, userId: input.userId } },
        data: { status: "REMOVED" },
      });
    }),

  updateMemberRole: protectedProcedure
    .input(z.object({ orgId: z.string(), userId: z.string(), roleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await requireOrgMember(input.orgId, ctx.userId);

      const role = await db.role.findFirst({ where: { id: input.roleId, orgId: input.orgId } });
      if (!role) throw new TRPCError({ code: "NOT_FOUND", message: "Role not found" });

      return db.organizationMembership.update({
        where: { orgId_userId: { orgId: input.orgId, userId: input.userId } },
        data: { roleId: input.roleId },
      });
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
