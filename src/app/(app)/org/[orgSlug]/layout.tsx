"use client";

import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc";
import { OrgCtx } from "@/lib/hooks/use-org";
import { AppShell } from "@/components/layout/app-shell";

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { data: session } = useSession();

  const { data: org, isLoading: orgLoading } = trpc.organization.getBySlug.useQuery(
    { slug: orgSlug },
    { enabled: !!orgSlug }
  );

  const { data: workspaces } = trpc.workspace.list.useQuery(
    { orgId: org?.id ?? "" },
    { enabled: !!org?.id }
  );

  if (orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Organization not found</h1>
          <p className="text-muted-foreground mt-1">
            The organization you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  const membership = (org as any).memberships?.[0];

  const user = {
    id: session?.user?.id ?? "",
    name: session?.user?.name,
    email: session?.user?.email ?? "",
    image: session?.user?.image,
  };

  return (
    <OrgCtx.Provider
      value={{
        orgId: org.id,
        orgSlug: org.slug,
        orgName: org.name,
        role: membership?.role?.name ?? "Member",
        permissions: membership?.role?.permissions ?? [],
      }}
    >
      <AppShell
        user={user}
        currentOrg={{ id: org.id, name: org.name, slug: org.slug, logo: org.logo }}
        orgs={[]}
        workspaces={(workspaces ?? []).map((ws) => ({
          id: ws.id,
          name: ws.name,
          slug: ws.slug,
          spaces: (ws.spaces ?? []).map((sp: any) => ({
            id: sp.id,
            name: sp.name,
            slug: sp.slug,
            projects: (sp.projects ?? []).map((p: any) => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
              methodology: p.methodology,
            })),
          })),
        }))}
      >
        {children}
      </AppShell>
    </OrgCtx.Provider>
  );
}
