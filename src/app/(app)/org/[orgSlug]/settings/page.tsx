"use client";

import { useOrg, useHasPermission } from "@/lib/hooks/use-org";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { Settings, AlertTriangle } from "lucide-react";

export default function OrgSettingsPage() {
  const { orgId, orgName } = useOrg();
  const canManage = useHasPermission("org.settings.manage");

  const { data: org } = trpc.organization.getById.useQuery({ orgId });

  const [name, setName] = useState(org?.name ?? orgName);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (org?.name) setName(org.name);
  }, [org?.name]);

  const updateOrg = trpc.organization.update.useMutation({
    onSuccess: () => setSaving(false),
  });

  if (!canManage) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <Settings className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">You don&apos;t have permission to manage settings.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-8">Organization Settings</h1>

      <section className="border border-border rounded p-6 mb-6">
        <h2 className="font-medium mb-4">General</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSaving(true);
            updateOrg.mutate({ orgId, name });
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium">Organization name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Slug</label>
            <input
              value={org?.slug ?? ""}
              disabled
              className="w-full px-3 py-2 rounded border border-input bg-muted text-sm text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">Slug cannot be changed after creation.</p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>
      </section>

      <section className="border border-destructive/50 rounded p-6">
        <h2 className="font-medium text-destructive mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Danger Zone
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Deleting the organization will permanently remove all workspaces, projects, tasks, and data. This cannot be undone.
        </p>
        <button className="px-4 py-2 text-sm rounded border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors">
          Delete organization
        </button>
      </section>
    </div>
  );
}
