"use client";

import { useOrg } from "@/lib/hooks/use-org";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { FolderKanban, Plus, ArrowRight, LayoutGrid, GitBranch } from "lucide-react";

export default function SpacePage() {
  const { orgId, orgSlug } = useOrg();
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params.workspaceSlug as string;
  const spaceSlug = params.spaceSlug as string;

  const [showCreate, setShowCreate] = useState(false);
  const [projName, setProjName] = useState("");
  const [projSlug, setProjSlug] = useState("");
  const [projPrefix, setProjPrefix] = useState("");
  const [methodology, setMethodology] = useState<"KANBAN" | "SCRUM">("KANBAN");

  const { data: workspace } = trpc.workspace.getBySlug.useQuery(
    { orgId, slug: workspaceSlug },
    { enabled: !!orgId }
  );

  const { data: space } = trpc.space.getBySlug.useQuery(
    { workspaceId: workspace?.id ?? "", slug: spaceSlug },
    { enabled: !!workspace?.id }
  );

  const { data: projects, refetch } = trpc.project.list.useQuery(
    { spaceId: space?.id ?? "" },
    { enabled: !!space?.id }
  );

  const createProject = trpc.project.create.useMutation({
    onSuccess: (proj) => {
      refetch();
      setShowCreate(false);
      if (proj) {
        router.push(
          `/org/${orgSlug}/workspace/${workspaceSlug}/space/${spaceSlug}/project/${proj.slug}/board`
        );
      }
    },
  });

  if (!space) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">{space.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {projects?.length ?? 0} projects
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects?.map((proj) => (
          <Link
            key={proj.id}
            href={`/org/${orgSlug}/workspace/${workspaceSlug}/space/${spaceSlug}/project/${proj.slug}/board`}
            className="border border-border rounded p-5 hover:border-primary/50 transition-colors group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{proj.name}</h3>
                <span className="font-mono text-xs text-muted-foreground">
                  {proj.taskPrefix}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary">
                {proj.methodology === "SCRUM" ? (
                  <GitBranch className="w-3 h-3" />
                ) : (
                  <LayoutGrid className="w-3 h-3" />
                )}
                {proj.methodology}
              </span>
              <span>{proj._count?.tasks ?? 0} tasks</span>
            </div>
          </Link>
        ))}
      </div>

      {projects?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FolderKanban className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No projects yet</p>
          <p className="text-xs mt-1">Create your first project to start tracking tasks</p>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Create project</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createProject.mutate({
                  spaceId: space.id,
                  name: projName,
                  slug: projSlug,
                  taskPrefix: projPrefix,
                  methodology,
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <input
                  value={projName}
                  onChange={(e) => {
                    setProjName(e.target.value);
                    setProjSlug(
                      e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
                    );
                    if (!projPrefix) {
                      setProjPrefix(
                        e.target.value.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 4)
                      );
                    }
                  }}
                  placeholder="Q3 Redesign"
                  required
                  className="w-full px-3 py-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Slug</label>
                  <input
                    value={projSlug}
                    onChange={(e) => setProjSlug(e.target.value)}
                    required
                    pattern="^[a-z0-9-]+$"
                    className="w-full px-3 py-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Task prefix</label>
                  <input
                    value={projPrefix}
                    onChange={(e) => setProjPrefix(e.target.value.toUpperCase())}
                    placeholder="PROJ"
                    required
                    pattern="^[A-Z0-9]+$"
                    maxLength={10}
                    className="w-full px-3 py-2 rounded border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Methodology</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["KANBAN", "SCRUM"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethodology(m)}
                      className={`px-3 py-2 rounded border text-sm transition-colors ${
                        methodology === m
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
                  disabled={createProject.isPending}
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
