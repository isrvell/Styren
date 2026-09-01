"use client";

import { useOrg } from "@/lib/hooks/use-org";
import { trpc } from "@/lib/trpc";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  Settings,
  Plus,
  GripVertical,
  Trash2,
  Palette,
  GitBranch,
  LayoutGrid,
} from "lucide-react";
import { STATUS_CATEGORY_CONFIG } from "@/lib/constants";

export default function ProjectSettingsPage() {
  const { orgId, orgSlug } = useOrg();
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;
  const spaceSlug = params.spaceSlug as string;
  const projectSlug = params.projectSlug as string;

  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusCategory, setNewStatusCategory] = useState<"NOT_STARTED" | "ACTIVE" | "DONE">("NOT_STARTED");
  const [newStatusColor, setNewStatusColor] = useState("#6B7280");

  const { data: workspace } = trpc.workspace.getBySlug.useQuery(
    { orgId, slug: workspaceSlug },
    { enabled: !!orgId }
  );

  const { data: space } = trpc.space.getBySlug.useQuery(
    { workspaceId: workspace?.id ?? "", slug: spaceSlug },
    { enabled: !!workspace?.id }
  );

  const { data: project, refetch: refetchProject } = trpc.project.getBySlug.useQuery(
    { spaceId: space?.id ?? "", slug: projectSlug },
    { enabled: !!space?.id }
  );

  const { data: statuses, refetch: refetchStatuses } = trpc.status.list.useQuery(
    { projectId: project?.id ?? "" },
    { enabled: !!project?.id }
  );

  const updateProject = trpc.project.update.useMutation({
    onSuccess: () => refetchProject(),
  });

  const createStatus = trpc.status.create.useMutation({
    onSuccess: () => {
      refetchStatuses();
      setNewStatusName("");
    },
  });

  const deleteStatus = trpc.status.delete.useMutation({
    onSuccess: () => refetchStatuses(),
  });

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      <h1 className="text-2xl font-semibold mb-8">Project Settings</h1>

      <section className="border border-border rounded p-6 mb-6">
        <h2 className="font-medium mb-4">General</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Project name</label>
            <input
              defaultValue={project.name}
              onBlur={(e) => {
                if (e.target.value !== project.name) {
                  updateProject.mutate({
                    projectId: project.id,
                    name: e.target.value,
                  });
                }
              }}
              className="w-full px-3 py-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Methodology</label>
            <div className="grid grid-cols-2 gap-2 max-w-xs">
              {(["KANBAN", "SCRUM"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() =>
                    updateProject.mutate({ projectId: project.id, methodology: m })
                  }
                  className={`px-3 py-2 rounded border text-sm transition-colors ${
                    project.methodology === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-secondary"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {m === "KANBAN" ? (
                      <LayoutGrid className="w-4 h-4" />
                    ) : (
                      <GitBranch className="w-4 h-4" />
                    )}
                    {m === "KANBAN" ? "Kanban" : "Scrum"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Task prefix
            </label>
            <input
              value={project.taskPrefix}
              disabled
              className="w-full max-w-[200px] px-3 py-2 rounded border border-input bg-muted text-sm font-mono text-muted-foreground"
            />
          </div>
        </div>
      </section>

      <section className="border border-border rounded p-6 mb-6">
        <h2 className="font-medium mb-4">Status Pipeline</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Define the statuses a task moves through. Statuses are grouped into
          categories for cross-project reporting.
        </p>

        <div className="space-y-2 mb-6">
          {statuses?.map((status) => (
            <div
              key={status.id}
              className="flex items-center gap-3 py-2 px-3 border border-border rounded group"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground/50 cursor-grab" />
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: status.color }}
              />
              <span className="text-sm font-medium flex-1">{status.name}</span>
              <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-secondary">
                {STATUS_CATEGORY_CONFIG[status.category as keyof typeof STATUS_CATEGORY_CONFIG]?.label}
              </span>
              <button
                onClick={() =>
                  deleteStatus.mutate({ statusId: status.id })
                }
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            createStatus.mutate({
              projectId: project.id,
              name: newStatusName,
              category: newStatusCategory,
              color: newStatusColor,
            });
          }}
          className="flex items-end gap-3"
        >
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Name</label>
            <input
              value={newStatusName}
              onChange={(e) => setNewStatusName(e.target.value)}
              placeholder="New status"
              required
              className="w-full px-3 py-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <select
              value={newStatusCategory}
              onChange={(e) => setNewStatusCategory(e.target.value as typeof newStatusCategory)}
              className="px-3 py-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="NOT_STARTED">Not Started</option>
              <option value="ACTIVE">Active</option>
              <option value="DONE">Done</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Color</label>
            <input
              type="color"
              value={newStatusColor}
              onChange={(e) => setNewStatusColor(e.target.value)}
              className="w-10 h-10 rounded border border-input cursor-pointer"
            />
          </div>
          <button
            type="submit"
            disabled={createStatus.isPending}
            className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>
      </section>
    </div>
  );
}
