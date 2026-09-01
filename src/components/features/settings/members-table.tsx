"use client";

import { useState } from "react";
import { UserPlus, Trash2, MoreHorizontal } from "lucide-react";
import { cn, getInitials, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Role {
  id: string;
  name: string;
}

interface Member {
  id: string;
  user: {
    id: string;
    name?: string | null;
    email: string;
    image?: string | null;
  };
  role: Role;
  status: "ACTIVE" | "INVITED" | "REMOVED";
  joinedAt?: Date | string | null;
}

interface MembersTableProps {
  members: Member[];
  roles: Role[];
  onRoleChange: (memberId: string, roleId: string) => void;
  onRemove: (memberId: string) => void;
  onInvite: (email: string, roleId: string) => void;
}

export function MembersTable({
  members,
  roles,
  onRoleChange,
  onRemove,
  onInvite,
}: MembersTableProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState(roles[0]?.id ?? "");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteRoleId) return;
    setInviteLoading(true);
    try {
      await onInvite(inviteEmail.trim(), inviteRoleId);
      setInviteEmail("");
      setInviteOpen(false);
    } finally {
      setInviteLoading(false);
    }
  };

  const statusColor: Record<string, string> = {
    ACTIVE: "var(--success)",
    INVITED: "var(--warning)",
    REMOVED: "var(--muted-foreground)",
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Members</h2>
          <p className="text-xs text-[var(--muted-foreground)]">{members.length} member{members.length !== 1 ? "s" : ""}</p>
        </div>
        <Button size="sm" onClick={() => setInviteOpen(true)} className="gap-1.5 h-8 text-xs">
          <UserPlus size={13} />
          Invite member
        </Button>
      </div>

      {/* Table */}
      <div className="rounded border border-[var(--border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--secondary)]">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                Member
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                Email
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                Role
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                Joined
              </th>
              <th className="w-10 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr
                key={member.id}
                className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--secondary)] transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="w-7 h-7">
                      {member.user.image && <AvatarImage src={member.user.image} />}
                      <AvatarFallback className="text-[10px]">
                        {getInitials(member.user.name ?? member.user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {member.user.name ?? member.user.email}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: statusColor[member.status] }}
                        />
                        <span className="text-[11px] text-[var(--muted-foreground)] capitalize">
                          {member.status.toLowerCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">
                  {member.user.email}
                </td>
                <td className="px-4 py-3">
                  <Select
                    value={member.role.id}
                    onValueChange={(v) => onRoleChange(member.id, v)}
                  >
                    <SelectTrigger className="h-7 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id} className="text-xs">
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">
                  {member.joinedAt ? formatDate(member.joinedAt) : "—"}
                </td>
                <td className="px-4 py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-[var(--destructive)] gap-2"
                        onClick={() => setRemoveTarget(member)}
                      >
                        <Trash2 size={13} />
                        Remove member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && (
          <div className="py-12 text-center text-sm text-[var(--muted-foreground)]">
            No members yet
          </div>
        )}
      </div>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Email address</Label>
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Role</Label>
              <Select value={inviteRoleId} onValueChange={setInviteRoleId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" size="sm">Cancel</Button>
            </DialogClose>
            <Button
              size="sm"
              onClick={handleInvite}
              disabled={!inviteEmail.trim() || !inviteRoleId || inviteLoading}
            >
              {inviteLoading ? "Sending..." : "Send invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <AlertDialog
        open={removeTarget != null}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget?.user.name ?? removeTarget?.user.email} will lose access to this organization. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeTarget) onRemove(removeTarget.id);
                setRemoveTarget(null);
              }}
              className="bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:bg-[var(--destructive)]/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
