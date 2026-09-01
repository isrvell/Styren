"use client";

import { useOrg, useHasPermission } from "@/lib/hooks/use-org";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Users, Plus, Mail, Shield, Trash2 } from "lucide-react";
import { getInitials, formatDate } from "@/lib/utils";

export default function MembersPage() {
  const { orgId } = useOrg();
  const canManage = useHasPermission("org.member.invite");

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");

  const { data: members, refetch } = trpc.organization.listMembers.useQuery({ orgId });
  const { data: availableRoles } = trpc.organization.listRoles.useQuery({ orgId });

  const memberRole = availableRoles?.find((r) => r.name === "Member");
  const effectiveInviteRoleId = inviteRoleId || memberRole?.id || availableRoles?.[0]?.id || "";

  const inviteMember = trpc.organization.inviteMember.useMutation({
    onSuccess: () => {
      refetch();
      setShowInvite(false);
      setInviteEmail("");
      setInviteRoleId("");
    },
  });

  const removeMember = trpc.organization.removeMember.useMutation({
    onSuccess: () => refetch(),
  });

  const updateRole = trpc.organization.updateMemberRole.useMutation({
    onSuccess: () => refetch(),
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Members</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage organization members and roles
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowInvite(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Invite member
          </button>
        )}
      </div>

      <div className="border border-border rounded">
        <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-4 py-3 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>Member</span>
          <span>Role</span>
          <span>Joined</span>
          <span></span>
        </div>

        {members?.map((member) => (
          <div
            key={member.id}
            className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-4 py-3 border-b border-border last:border-0 items-center"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                {getInitials(member.user?.name || member.user?.email || "U")}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  {member.user?.name || "Unnamed"}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {member.user?.email}
                </div>
              </div>
              {member.status === "INVITED" && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning">
                  Pending
                </span>
              )}
            </div>

            <div>
              {canManage && member.role?.name !== "Org Owner" ? (
                <select
                  value={member.roleId}
                  onChange={(e) =>
                    updateRole.mutate({
                      orgId,
                      userId: member.userId,
                      roleId: e.target.value,
                    })
                  }
                  className="text-sm bg-background border border-border rounded px-2 py-1"
                >
                  {(availableRoles ?? []).map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="inline-flex items-center gap-1 text-sm">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  {member.role?.name}
                </span>
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              {member.createdAt ? formatDate(member.createdAt) : "—"}
            </div>

            <div>
              {canManage && member.role?.name !== "Org Owner" && (
                <button
                  onClick={() =>
                    removeMember.mutate({ orgId, userId: member.userId })
                  }
                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}

        {members?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No members yet</p>
          </div>
        )}
      </div>

      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Invite member</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                inviteMember.mutate({
                  orgId,
                  email: inviteEmail,
                  roleId: effectiveInviteRoleId,
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    required
                    className="w-full pl-10 pr-3 py-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <select
                  value={effectiveInviteRoleId}
                  onChange={(e) => setInviteRoleId(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {(availableRoles ?? []).map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="px-4 py-2 text-sm rounded border border-border hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteMember.isPending || !effectiveInviteRoleId}
                  className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  Send invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
