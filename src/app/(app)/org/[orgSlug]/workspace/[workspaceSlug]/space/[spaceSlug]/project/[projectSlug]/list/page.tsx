"use client";

import { useOrg } from "@/lib/hooks/use-org";
import { trpc } from "@/lib/trpc";
import { useParams } from "next/navigation";
import { useState, useCallback } from "react";
import { TaskList } from "@/components/features/tasks/task-list";
import { TaskDetail } from "@/components/features/tasks/task-detail";
import { CreateTaskDialog } from "@/components/features/tasks/create-task-dialog";
import { ProjectHeader } from "@/components/features/projects/project-header";

export default function ListPage() {
  const { orgId, orgSlug } = useOrg();
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;
  const spaceSlug = params.spaceSlug as string;
  const projectSlug = params.projectSlug as string;

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
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

  const { data: tasks, refetch: refetchTasks } = trpc.task.list.useQuery(
    { projectId: project?.id ?? "", ...filters },
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

  if (!project || !statuses) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const basePath = `/org/${orgSlug}/workspace/${workspaceSlug}/space/${spaceSlug}/project/${projectSlug}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AnyProjectHeader = ProjectHeader as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AnyTaskDetail = TaskDetail as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AnyCreateTaskDialog = CreateTaskDialog as any;

  return (
    <div className="flex flex-col h-full">
      <AnyProjectHeader
        project={project}
        activeView="list"
        basePath={basePath}
        filters={filters}
        onFilterChange={setFilters}
        statuses={statuses}
        members={members ?? []}
        labels={labels ?? []}
        onCreateTask={() => setShowCreate(true)}
      />

      <div className="flex-1 overflow-auto px-6 py-4">
        <TaskList
          tasks={(tasks?.tasks ?? []) as any}
          statuses={statuses as any}
          onTaskClick={setSelectedTaskId as any}
          onBulkAction={() => refetchTasks()}
        />
      </div>

      {selectedTaskId && (
        <AnyTaskDetail
          taskId={selectedTaskId}
          projectId={project.id}
          statuses={statuses}
          labels={labels ?? []}
          members={members ?? []}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={() => refetchTasks()}
        />
      )}

      {showCreate && (
        <AnyCreateTaskDialog
          projectId={project.id}
          statuses={statuses}
          members={members ?? []}
          labels={labels ?? []}
          defaultStatusId={statuses[0]?.id ?? ""}
          onSubmit={() => {
            refetchTasks();
            setShowCreate(false);
          }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
