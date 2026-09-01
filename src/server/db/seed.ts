import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SYSTEM_ROLES = [
  {
    name: "Org Owner",
    description: "Full control over the organization",
    scopeLevel: "ORGANIZATION" as const,
    permissions: ["*"],
  },
  {
    name: "Org Admin",
    description: "Manage members, roles, security, and integrations",
    scopeLevel: "ORGANIZATION" as const,
    permissions: [
      "org.member.invite",
      "org.member.remove",
      "org.member.manage_roles",
      "org.settings.manage",
      "org.integrations.manage",
      "workspace.create",
      "workspace.delete",
      "workspace.manage",
      "space.create",
      "space.delete",
      "project.create",
      "project.delete",
      "project.manage",
      "project.task.create",
      "project.task.edit",
      "project.task.delete",
      "project.task.assign",
      "project.task.comment",
      "project.view.manage",
    ],
  },
  {
    name: "Workspace Admin",
    description: "Manage spaces and projects within a workspace",
    scopeLevel: "WORKSPACE" as const,
    permissions: [
      "workspace.manage",
      "space.create",
      "space.delete",
      "project.create",
      "project.delete",
      "project.manage",
      "project.task.create",
      "project.task.edit",
      "project.task.delete",
      "project.task.assign",
      "project.task.comment",
      "project.view.manage",
    ],
  },
  {
    name: "Project Manager",
    description: "Configure workflows, manage members, edit all tasks",
    scopeLevel: "PROJECT" as const,
    permissions: [
      "project.manage",
      "project.task.create",
      "project.task.edit",
      "project.task.delete",
      "project.task.assign",
      "project.task.comment",
      "project.view.manage",
      "project.members.manage",
    ],
  },
  {
    name: "Member",
    description: "Create, edit, and comment on tasks",
    scopeLevel: "PROJECT" as const,
    permissions: [
      "project.task.create",
      "project.task.edit",
      "project.task.assign",
      "project.task.comment",
    ],
  },
  {
    name: "Viewer",
    description: "Read-only access, can comment",
    scopeLevel: "PROJECT" as const,
    permissions: ["project.task.comment"],
  },
];

async function main() {
  console.log("Seeding system roles...");

  for (const role of SYSTEM_ROLES) {
    await prisma.role.upsert({
      where: { id: role.name.toLowerCase().replace(/\s+/g, "-") },
      update: {
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        scopeLevel: role.scopeLevel,
        isSystem: true,
      },
      create: {
        id: role.name.toLowerCase().replace(/\s+/g, "-"),
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        scopeLevel: role.scopeLevel,
        isSystem: true,
        orgId: null,
      },
    });
  }

  console.log("Seeding default organization...");

  const existingOrg = await prisma.organization.findUnique({ where: { slug: "default" } });
  if (!existingOrg) {
    const org = await prisma.organization.create({
      data: {
        name: "My Company",
        slug: "default",
      },
    });

    const ownerRole = await prisma.role.create({
      data: {
        orgId: org.id,
        name: "Owner",
        description: "Organization owner with full access",
        permissions: ["*"],
        scopeLevel: "ORGANIZATION",
        isSystem: true,
      },
    });

    await prisma.role.create({
      data: {
        orgId: org.id,
        name: "Member",
        description: "Standard member",
        permissions: ["read", "comment", "create_task"],
        scopeLevel: "ORGANIZATION",
        isSystem: true,
      },
    });

    await prisma.workspace.create({
      data: {
        orgId: org.id,
        name: "General",
        slug: "general",
      },
    });

    const passwordHash = await bcrypt.hash("admin1234", 12);
    const adminUser = await prisma.user.upsert({
      where: { email: "admin@styren.dev" },
      update: {},
      create: {
        email: "admin@styren.dev",
        name: "Admin",
        passwordHash,
      },
    });

    await prisma.organizationMembership.create({
      data: {
        orgId: org.id,
        userId: adminUser.id,
        roleId: ownerRole.id,
        status: "ACTIVE",
        joinedAt: new Date(),
      },
    });

    console.log(`Created default org: ${org.name} (slug: ${org.slug})`);
    console.log(`Admin user: admin@styren.dev / admin1234`);
  } else {
    console.log("Default organization already exists, skipping.");
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
