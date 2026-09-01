"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Kanban,
  List,
  Zap,
  Filter,
  X,
  Search,
  ChevronDown,
  Bookmark,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

type ViewType = "board" | "list" | "sprint";

interface StatusDef {
  id: string;
  name: string;
  color: string;
}

interface Member {
  id: string;
  name?: string | null;
  email: string;
  image?: string | null;
}

interface LabelDef {
  id: string;
  name: string;
  color: string;
}

interface SavedView {
  id: string;
  name: string;
  filters: Record<string, unknown>;
}

interface Project {
  id: string;
  name: string;
  methodology: "SCRUM" | "KANBAN";
}

interface Filters {
  statusId?: string;
  assigneeId?: string;
  priority?: string;
  labelId?: string;
  search?: string;
}

interface ProjectHeaderProps {
  project: Project;
  activeView: ViewType;
  basePath?: string;
  onViewChange?: (view: ViewType) => void;
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  statuses?: StatusDef[];
  members?: Member[];
  labels?: LabelDef[];
  savedViews?: SavedView[];
  onSaveView?: () => void;
  onLoadView?: (view: SavedView) => void;
  onCreateTask?: () => void;
}

export function ProjectHeader({
  project,
  activeView,
  basePath,
  onViewChange,
  filters,
  onFilterChange,
  statuses = [],
  members = [],
  labels = [],
  savedViews = [],
  onSaveView,
  onLoadView,
  onCreateTask,
}: ProjectHeaderProps) {
  const router = useRouter();
  const [showFilterBar, setShowFilterBar] = useState(false);

  const handleViewChange = (view: ViewType) => {
    if (basePath) {
      router.push(`${basePath}/${view}`);
    } else {
      onViewChange?.(view);
    }
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const clearFilter = (key: keyof Filters) => {
    const next = { ...filters };
    delete next[key];
    onFilterChange(next);
  };

  const views: { id: ViewType; label: string; icon: React.ReactNode }[] = [
    { id: "board", label: "Board", icon: <Kanban size={13} /> },
    { id: "list", label: "List", icon: <List size={13} /> },
    ...(project.methodology === "SCRUM"
      ? [{ id: "sprint" as ViewType, label: "Sprint", icon: <Zap size={13} /> }]
      : []),
  ];

  return (
    <div className="flex flex-col border-b border-[var(--border)] bg-[var(--background)] shrink-0">
      {/* Row 1: Project name + actions */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h1 className="text-base font-semibold truncate">{project.name}</h1>
          <Badge
            variant="secondary"
            className="text-[10px] shrink-0"
          >
            {project.methodology === "SCRUM" ? "Scrum" : "Kanban"}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Saved views */}
          {savedViews.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
                  <Bookmark size={13} />
                  Views
                  <ChevronDown size={11} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {savedViews.map((view) => (
                  <DropdownMenuItem key={view.id} onClick={() => onLoadView?.(view)}>
                    {view.name}
                  </DropdownMenuItem>
                ))}
                {onSaveView && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onSaveView} className="gap-1.5">
                      <Plus size={12} />
                      Save current view
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Filter toggle */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 gap-1.5 text-xs",
              (showFilterBar || activeFilterCount > 0) && "text-[var(--primary)]"
            )}
            onClick={() => setShowFilterBar((s) => !s)}
          >
            <Filter size={13} />
            Filter
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-[9px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {onCreateTask && (
            <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={onCreateTask}>
              <Plus size={13} />
              Create task
            </Button>
          )}
        </div>
      </div>

      {/* Row 2: View tabs */}
      <div className="px-4 pb-0">
        <Tabs value={activeView} onValueChange={(v) => handleViewChange(v as ViewType)}>
          <TabsList className="h-8 bg-transparent p-0 gap-0">
            {views.map((v) => (
              <TabsTrigger
                key={v.id}
                value={v.id}
                className={cn(
                  "h-8 px-3 gap-1.5 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--primary)] data-[state=active]:text-[var(--primary)] data-[state=active]:bg-transparent transition-colors"
                )}
              >
                {v.icon}
                {v.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Row 3: Filter bar */}
      {showFilterBar && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-t border-[var(--border)] bg-[var(--secondary)]">
          {/* Search */}
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none" />
            <Input
              placeholder="Search tasks..."
              value={filters.search ?? ""}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value || undefined })}
              className="h-7 pl-7 w-44 text-xs"
            />
          </div>

          {/* Status filter */}
          {statuses.length > 0 && (
            <Select
              value={filters.statusId ?? "all"}
              onValueChange={(v) =>
                onFilterChange({ ...filters, statusId: v === "all" ? undefined : v })
              }
            >
              <SelectTrigger className="h-7 w-32 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      {s.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Assignee filter */}
          {members.length > 0 && (
            <Select
              value={filters.assigneeId ?? "all"}
              onValueChange={(v) =>
                onFilterChange({ ...filters, assigneeId: v === "all" ? undefined : v })
              }
            >
              <SelectTrigger className="h-7 w-32 text-xs">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assignees</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <span className="flex items-center gap-1.5">
                      <Avatar className="w-4 h-4">
                        {m.image && <AvatarImage src={m.image} />}
                        <AvatarFallback className="text-[8px]">
                          {getInitials(m.name ?? m.email)}
                        </AvatarFallback>
                      </Avatar>
                      {m.name ?? m.email}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Priority filter */}
          <Select
            value={filters.priority ?? "all"}
            onValueChange={(v) =>
              onFilterChange({ ...filters, priority: v === "all" ? undefined : v })
            }
          >
            <SelectTrigger className="h-7 w-28 text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                <SelectItem key={p} value={p}>
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Label filter */}
          {labels.length > 0 && (
            <Select
              value={filters.labelId ?? "all"}
              onValueChange={(v) =>
                onFilterChange({ ...filters, labelId: v === "all" ? undefined : v })
              }
            >
              <SelectTrigger className="h-7 w-28 text-xs">
                <SelectValue placeholder="Label" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All labels</SelectItem>
                {labels.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: l.color }}
                      />
                      {l.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Clear filters */}
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFilterChange({})}
              className="h-7 text-xs text-[var(--muted-foreground)] gap-1"
            >
              <X size={12} />
              Clear
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
