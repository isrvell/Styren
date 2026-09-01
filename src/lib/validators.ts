import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const createWorkspaceSchema = z.object({
  orgId: z.string(),
  name: z.string().min(1).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
});

export const createSpaceSchema = z.object({
  workspaceId: z.string(),
  name: z.string().min(1).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
});

export const createProjectSchema = z.object({
  spaceId: z.string(),
  name: z.string().min(1).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  methodology: z.enum(["SCRUM", "KANBAN"]).default("KANBAN"),
  taskPrefix: z
    .string()
    .min(2)
    .max(10)
    .regex(/^[A-Z0-9]+$/, "Prefix must be uppercase alphanumeric"),
});

export const createTaskSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  statusId: z.string(),
  priority: z.enum(["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"]).default("NONE"),
  assigneeIds: z.array(z.string()).optional(),
  labelIds: z.array(z.string()).optional(),
  parentTaskId: z.string().optional(),
  estimate: z.number().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  sprintId: z.string().optional(),
});

export const updateTaskSchema = z.object({
  taskId: z.string(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  statusId: z.string().optional(),
  priority: z.enum(["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  estimate: z.number().nullable().optional(),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  sprintId: z.string().nullable().optional(),
});

export const createCommentSchema = z.object({
  taskId: z.string(),
  body: z.string().min(1),
  parentId: z.string().optional(),
});

export const createTimeEntrySchema = z.object({
  taskId: z.string(),
  durationSeconds: z.number().min(1),
  billable: z.boolean().default(false),
  startedAt: z.string(),
  note: z.string().optional(),
});

export const createSprintSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(100),
  goal: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
});

export const createLabelSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  workspaceId: z.string().optional(),
  projectId: z.string().optional(),
});

export const savedViewSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(100),
  filters: z.record(z.unknown()).default({}),
  sort: z.record(z.unknown()).default({}),
  grouping: z.record(z.unknown()).default({}),
  isShared: z.boolean().default(false),
});

export const inviteMemberSchema = z.object({
  orgId: z.string(),
  email: z.string().email(),
  roleId: z.string(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type CreateSpaceInput = z.infer<typeof createSpaceSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;
export type CreateSprintInput = z.infer<typeof createSprintSchema>;
export type CreateLabelInput = z.infer<typeof createLabelSchema>;
export type SavedViewInput = z.infer<typeof savedViewSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
