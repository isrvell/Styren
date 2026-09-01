"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AppShellProps {
  children: React.ReactNode;
  user: User;
  orgs: Org[];
  currentOrg: Org;
  workspaces: WorkspaceNode[];
  breadcrumbs?: BreadcrumbItem[];
  notificationCount?: number;
  inboxCount?: number;
}

export function AppShell({
  children,
  user,
  orgs,
  currentOrg,
  workspaces,
  breadcrumbs = [],
  notificationCount = 0,
  inboxCount = 0,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const handleThemeToggle = () => {
    setIsDarkMode((d) => !d);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <TooltipProvider delayDuration={200}>
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <Sidebar
        user={user}
        orgs={orgs}
        currentOrg={currentOrg}
        workspaces={workspaces}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        inboxCount={inboxCount}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          breadcrumbs={breadcrumbs}
          notificationCount={notificationCount}
          user={user}
          onThemeToggle={handleThemeToggle}
          isDarkMode={isDarkMode}
        />
        <main
          className={cn(
            "flex-1 overflow-y-auto",
            "bg-[var(--background)]"
          )}
        >
          {children}
        </main>
      </div>
    </div>
    </TooltipProvider>
  );
}
