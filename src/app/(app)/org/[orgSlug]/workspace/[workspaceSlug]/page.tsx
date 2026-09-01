"use client";

import { useOrg } from "@/lib/hooks/use-org";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { FolderOpen, Plus, ArrowRight, Layers } from "lucide-react";

export default function WorkspacePage() {
  const { orgId, orgSlug } = useOrg();
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params.workspaceSlug as string;

  const [showCreate, setShowCreate] = useState(false);
  const [spaceName, setSpaceName] = useState("");
  const [spaceSlug, setSpaceSlug] = useState("");

  const { data: workspace } = trpc.workspace.getBySlug.useQuery(
    { orgId, slug: workspaceSlug },
    { enabled: !!orgId }
  );

  const { data: spaces, refetch } = trpc.space.list.useQuery(
    { workspaceId: workspace?.id ?? "" },
    { enabled: !!workspace?.id }
  );

  const createSpace = trpc.space.create.useMutation({
    onSuccess: (space) => {
      refetch();
      setShowCreate(false);
      router.push(
        `/org/${orgSlug}/workspace/${workspaceSlug}/space/${space.slug}`
      );
    },
  });

  if (!workspace) {
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
          <h1 className="text-2xl font-semibold">{workspace.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {spaces?.length ?? 0} spaces
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New space
        </button>
      </div>

      <div className="space-y-3">
        {spaces?.map((space) => (
          <Link
            key={space.id}
            href={`/org/${orgSlug}/workspace/${workspaceSlug}/space/${space.slug}`}
            className="flex items-center gap-4 border border-border rounded p-4 hover:border-primary/50 transition-colors group"
          >
            <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center">
              <Layers className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">{space.name}</h3>
              <p className="text-xs text-muted-foreground">
                {space._count?.projects ?? 0} projects
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}

        {spaces?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Layers className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No spaces yet</p>
            <p className="text-xs mt-1">Create a space to organize your projects</p>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Create space</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createSpace.mutate({
                  workspaceId: workspace.id,
                  name: spaceName,
                  slug: spaceSlug,
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <input
                  value={spaceName}
                  onChange={(e) => {
                    setSpaceName(e.target.value);
                    setSpaceSlug(
                      e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
                    );
                  }}
                  placeholder="Mobile Team"
                  required
                  className="w-full px-3 py-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Slug</label>
                <input
                  value={spaceSlug}
                  onChange={(e) => setSpaceSlug(e.target.value)}
                  required
                  pattern="^[a-z0-9-]+$"
                  className="w-full px-3 py-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
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
                  disabled={createSpace.isPending}
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
