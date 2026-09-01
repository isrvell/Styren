"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  CheckSquare,
  Calendar,
  Settings,
  Building2,
  Clock,
  FileText,
  Users,
  FolderOpen,
  Layers,
  FolderKanban,
  ChevronDown,
  ChevronRight,
  Plus,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface User {
  id: string;
  name?: string | null;
  email: string;
  image?: string | null;
}

interface Org {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
}

interface ProjectNode {
  id: string;
  name: string;
  slug: string;
  methodology: "SCRUM" | "KANBAN";
}

interface SpaceNode {
  id: string;
  name: string;
  slug: string;
  projects: ProjectNode[];
}

interface WorkspaceNode {
  id: string;
  name: string;
  slug: string;
  spaces: SpaceNode[];
}

interface SidebarProps {
  user: User;
  orgs: Org[];
  currentOrg: Org;
  workspaces: WorkspaceNode[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  inboxCount?: number;
}

function SectionHeader({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return null;
  return (
    <div className="px-3 pt-4 pb-1">
      <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
        {label}
      </span>
    </div>
  );
}

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  active?: boolean;
}

function NavItem({ href, icon, label, collapsed, active }: NavItemProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors",
            active
              ? "bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20"
              : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]",
            collapsed && "justify-center px-0 w-10 mx-auto"
          )}
        >
          <span className="shrink-0 w-4 h-4">{icon}</span>
          {!collapsed && <span className="flex-1 truncate">{label}</span>}
        </Link>
      </TooltipTrigger>
      {collapsed && <TooltipContent side="right">{label}</TooltipContent>}
    </Tooltip>
  );
}

function WorkspaceTree({
  workspaces,
  collapsed,
  orgSlug,
}: {
  workspaces: WorkspaceNode[];
  collapsed: boolean;
  orgSlug: string;
}) {
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(
    new Set(workspaces[0] ? [workspaces[0].id] : [])
  );
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set());

  const toggleWorkspace = (id: string) =>
    setExpandedWorkspaces((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleSpace = (id: string) =>
    setExpandedSpaces((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  if (collapsed) return null;

  if (workspaces.length === 0) {
    return (
      <p className="px-3 py-2 text-[12px] text-[var(--muted-foreground)]">No workspaces yet</p>
    );
  }

  return (
    <div className="space-y-0.5">
      {workspaces.map((ws) => {
        const wsExpanded = expandedWorkspaces.has(ws.id);
        return (
          <div key={ws.id}>
            <button
              onClick={() => toggleWorkspace(ws.id)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors",
                "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]"
              )}
            >
              <span className="w-3 h-3 shrink-0 text-[var(--muted-foreground)]">
                {wsExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </span>
              <Layers size={13} className="shrink-0" />
              <span className="flex-1 text-left truncate text-[13px]">{ws.name}</span>
            </button>
            {wsExpanded && (
              <div className="ml-4 space-y-0.5">
                {ws.spaces.map((space) => {
                  const spExpanded = expandedSpaces.has(space.id);
                  return (
                    <div key={space.id}>
                      <button
                        onClick={() => toggleSpace(space.id)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors",
                          "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]"
                        )}
                      >
                        <span className="w-3 h-3 shrink-0 text-[var(--muted-foreground)]">
                          {spExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </span>
                        {spExpanded ? (
                          <FolderOpen size={13} className="shrink-0" />
                        ) : (
                          <FolderKanban size={13} className="shrink-0" />
                        )}
                        <span className="flex-1 text-left truncate text-[13px]">{space.name}</span>
                      </button>
                      {spExpanded && (
                        <div className="ml-4 space-y-0.5">
                          {space.projects.map((project) => (
                            <Link
                              key={project.id}
                              href={`/org/${orgSlug}/workspace/${ws.slug}/${space.slug}/${project.slug}`}
                              className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded text-[12px] transition-colors",
                                "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]"
                              )}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted-foreground)] shrink-0" />
                              <span className="flex-1 truncate">{project.name}</span>
                            </Link>
                          ))}
                          {space.projects.length === 0 && (
                            <p className="px-3 py-1 text-[11px] text-[var(--muted-foreground)]">No projects</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {ws.spaces.length === 0 && (
                  <p className="px-3 py-1 text-[11px] text-[var(--muted-foreground)]">No spaces</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Sidebar({
  user,
  orgs: _orgs,
  currentOrg,
  workspaces,
  collapsed,
  onToggleCollapse,
  inboxCount: _inboxCount = 0,
}: SidebarProps) {
  const pathname = usePathname();
  const slug = currentOrg.slug;

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] transition-all duration-200 overflow-hidden shrink-0",
        collapsed ? "w-12" : "w-[240px]"
      )}
    >
      {/* Logo + collapse */}
      <div
        className={cn(
          "flex items-center border-b border-[var(--sidebar-border)] h-12 shrink-0 px-3",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[var(--primary)] flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-[var(--primary-foreground)]">S</span>
            </div>
            <span className="text-sm font-semibold text-[var(--foreground)] tracking-tight">
              {APP_NAME}
            </span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="h-6 w-6 flex items-center justify-center rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--sidebar-accent)] transition-colors"
        >
          {collapsed ? <PanelLeft size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>

      {/* Scrollable nav body */}
      <div className="flex-1 overflow-y-auto py-1">
        {/* CORE PAGES */}
        <SectionHeader label="Core Pages" collapsed={collapsed} />
        <div className={cn("space-y-0.5", collapsed ? "px-1" : "px-2")}>
          <NavItem
            href={`/org/${slug}`}
            icon={<Home size={15} />}
            label="Home"
            collapsed={collapsed}
            active={pathname === `/org/${slug}`}
          />
          <NavItem
            href={`/org/${slug}`}
            icon={<CheckSquare size={15} />}
            label="My Tasks"
            collapsed={collapsed}
            active={false}
          />
          <NavItem
            href={`/org/${slug}`}
            icon={<Calendar size={15} />}
            label="Timeline"
            collapsed={collapsed}
            active={false}
          />
          <NavItem
            href={`/org/${slug}/settings`}
            icon={<Settings size={15} />}
            label="Settings"
            collapsed={collapsed}
            active={isActive(`/org/${slug}/settings`)}
          />
          <NavItem
            href={`/org/${slug}/members`}
            icon={<Building2 size={15} />}
            label="Organization"
            collapsed={collapsed}
            active={isActive(`/org/${slug}/members`)}
          />
        </div>

        {/* TOOLS */}
        <SectionHeader label="Tools" collapsed={collapsed} />
        <div className={cn("space-y-0.5", collapsed ? "px-1" : "px-2")}>
          <NavItem
            href={`/org/${slug}`}
            icon={<Clock size={15} />}
            label="Time Tracking"
            collapsed={collapsed}
            active={false}
          />
          <NavItem
            href={`/org/${slug}`}
            icon={<FileText size={15} />}
            label="Audit Log"
            collapsed={collapsed}
            active={false}
          />
          <NavItem
            href={`/org/${slug}/members`}
            icon={<Users size={15} />}
            label="Members"
            collapsed={collapsed}
            active={false}
          />
        </div>

        {/* WORKSPACES */}
        {!collapsed && (
          <div className="flex items-center justify-between px-3 pt-4 pb-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
              Workspaces
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="w-4 h-4 flex items-center justify-center rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--sidebar-accent)] transition-colors">
                  <Plus size={12} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Create workspace</TooltipContent>
            </Tooltip>
          </div>
        )}
        {collapsed && (
          <div className="px-1 pt-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="w-10 mx-auto flex items-center justify-center py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--sidebar-accent)] rounded transition-colors">
                  <Plus size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Create workspace</TooltipContent>
            </Tooltip>
          </div>
        )}

        <div className={cn("px-2 pb-2")}>
          <WorkspaceTree workspaces={workspaces} collapsed={collapsed} orgSlug={slug} />
        </div>
      </div>

      {/* Bottom: user */}
      <div
        className={cn(
          "border-t border-[var(--sidebar-border)] px-2 py-2 shrink-0",
          collapsed && "px-1"
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center gap-2.5 px-2 py-2 rounded transition-colors",
                "hover:bg-[var(--sidebar-accent)] text-[var(--sidebar-foreground)]",
                collapsed && "justify-center px-0"
              )}
            >
              <Avatar className="w-7 h-7 shrink-0">
                {user.image && <AvatarImage src={user.image} alt={user.name ?? user.email} />}
                <AvatarFallback className="text-[10px] bg-[var(--primary)]/20 text-[var(--primary)]">
                  {getInitials(user.name ?? user.email)}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 text-left min-w-0">
                  <div className="text-[13px] font-medium truncate leading-tight">{user.name ?? "User"}</div>
                  <div className="text-[11px] text-[var(--muted-foreground)] truncate leading-tight">{user.email}</div>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/settings/profile">Profile settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/auth/signout" className="text-[var(--destructive)]">
                Sign out
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
