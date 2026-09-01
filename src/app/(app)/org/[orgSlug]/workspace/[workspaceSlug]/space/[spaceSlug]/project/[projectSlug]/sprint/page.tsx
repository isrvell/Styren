"use client";

import { useOrg } from "@/lib/hooks/use-org";
import { trpc } from "@/lib/trpc";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ProjectHeader } from "@/components/features/projects/project-header";
import {
  Plus,
  Play,
  CheckCircle2,
  Calendar,
  Target,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function SprintPage() {
  const { orgId, orgSlug } = useOrg();
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;
  const spaceSlug = params.spaceSlug as string;
  const projectSlug = params.projectSlug as string;

  const [showCreate, setShowCreate] = useState(false);
  const [sprintName, setSprintName] = useState("");
  const [sprintGoal, setSprintGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedSprints, setExpandedSprints] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  const { data: workspace } = trpc.workspace.getBySlug.useQuery(
    { orgId, slug: workspaceSlug },
    { enabled: !!orgId }
  );

  const { data: space } = trpc.space.getBySlug.useQuery(
    { workspaceId: workspace?.id ?? "", slug: spaceSlug },
    { enabled: !!workspace?.id }
  );

  const { data: project } = trpc.project.getBySlug.useQuery(
    { spaceId: space?.id ?? "", slug: projectSlug },
    { enabled: !!space?.id }
  );

  const { data: statuses } = trpc.status.list.useQuery(
    { projectId: project?.id ?? "" },
    { enabled: !!project?.id }
  );

  const { data: sprints, refetch: refetchSprints } = trpc.sprint.list.useQuery(
    { projectId: project?.id ?? "" },
    { enabled: !!project?.id }
  );

  const { data: labels } = trpc.label.list.useQuery(
    { projectId: project?.id ?? "" },
    { enabled: !!project?.id }
  );

  const { data: members } = trpc.project.getMembers.useQuery(
    { projectId: project?.id ?? "" },
    { enabled: !!project?.id }
  );

  const createSprint = trpc.sprint.create.useMutation({
    onSuccess: () => {
      refetchSprints();
      setShowCreate(false);
      setSprintName("");
      setSprintGoal("");
      setStartDate("");
      setEndDate("");
    },
  });

  const startSprint = trpc.sprint.start.useMutation({
    onSuccess: () => refetchSprints(),
  });

  const completeSprint = trpc.sprint.complete.useMutation({
    onSuccess: () => refetchSprints(),
  });

  if (!project || !statuses) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const basePath = `/org/${orgSlug}/workspace/${workspaceSlug}/space/${spaceSlug}/project/${projectSlug}`;

  const toggleSprint = (id: string) => {
    setExpandedSprints((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const statusBadgeColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-success/10 text-success";
      case "COMPLETED":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-primary/10 text-primary";
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AnyProjectHeader = ProjectHeader as any;

  return (
    <div className="flex flex-col h-full">
      <AnyProjectHeader
        project={project}
        activeView="sprint"
        basePath={basePath}
        filters={filters}
        onFilterChange={setFilters}
        statuses={statuses}
        members={members ?? []}
        labels={labels ?? []}
      />

      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Sprints</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New sprint
          </button>
        </div>

        <div className="space-y-3">
          {sprints?.map((sprint) => (
            <div key={sprint.id} className="border border-border rounded">
              <button
                onClick={() => toggleSprint(sprint.id)}
                className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors"
              >
                {expandedSprints.has(sprint.id) ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{sprint.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${statusBadgeColor(
                        sprint.status
                      )}`}
                    >
                      {sprint.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(sprint.startDate)} — {formatDate(sprint.endDate)}
                    </span>
                    {sprint.goal && (
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {sprint.goal}
                      </span>
                    )}
                    <span>{sprint._count?.tasks ?? 0} tasks</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {sprint.status === "PLANNED" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startSprint.mutate({ sprintId: sprint.id });
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-success/10 text-success rounded hover:bg-success/20 transition-colors"
                    >
                      <Play className="w-3 h-3" />
                      Start
                    </button>
                  )}
                  {sprint.status === "ACTIVE" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        completeSprint.mutate({ sprintId: sprint.id });
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Complete
                    </button>
                  )}
                </div>
              </button>

              {expandedSprints.has(sprint.id) && (
                <div className="border-t border-border p-4">
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {sprint._count?.tasks
                      ? `${sprint._count.tasks} tasks in this sprint`
                      : "No tasks in this sprint"}
                  </p>
                </div>
              )}
            </div>
          ))}

          {sprints?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No sprints yet</p>
              <p className="text-xs mt-1">Create a sprint to plan your iterations</p>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Create sprint</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createSprint.mutate({
                  projectId: project.id,
                  name: sprintName,
                  goal: sprintGoal || undefined,
                  startDate,
                  endDate,
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <input
                  value={sprintName}
                  onChange={(e) => setSprintName(e.target.value)}
                  placeholder="Sprint 1"
                  required
                  className="w-full px-3 py-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Goal (optional)</label>
                <input
                  value={sprintGoal}
                  onChange={(e) => setSprintGoal(e.target.value)}
                  placeholder="Complete onboarding flow"
                  className="w-full px-3 py-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm rounded border border-border hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSprint.isPending}
                  className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
