import { createTRPCRouter } from "@/server/trpc";
import { authRouter } from "./auth";
import { organizationRouter } from "./organization";
import { workspaceRouter } from "./workspace";
import { spaceRouter } from "./space";
import { projectRouter } from "./project";
import { taskRouter } from "./task";
import { commentRouter } from "./comment";
import { timeEntryRouter } from "./timeEntry";
import { sprintRouter } from "./sprint";
import { labelRouter } from "./label";
import { savedViewRouter } from "./savedView";
import { githubRouter } from "./github";
import { statusRouter } from "./status";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  organization: organizationRouter,
  workspace: workspaceRouter,
  space: spaceRouter,
  project: projectRouter,
  task: taskRouter,
  comment: commentRouter,
  timeEntry: timeEntryRouter,
  sprint: sprintRouter,
  label: labelRouter,
  savedView: savedViewRouter,
  github: githubRouter,
  status: statusRouter,
});

export type AppRouter = typeof appRouter;
