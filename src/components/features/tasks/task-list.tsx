"use client";

import { useState } from "react";
import {
  Minus,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  CalendarDays,
} from "lucide-react";
import { cn, getInitials, generateTaskId, formatDate } from "@/lib/utils";
import { PRIORITY_CONFIG } from "@/lib/constants";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Label {
  id: string;
  name: string;
  color: string;
}

interface UserBasic {
  id: string;
  name?: string | null;
  email: string;
  image?: string | null;
}

interface StatusDef {
  id: string;
  name: string;
  color: string;
  category: "NOT_STARTED" | "ACTIVE" | "DONE";
}

interface ListTask {
  id: string;
  number: number;
  title: string;
  priority: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  statusId: string;
  status: StatusDef;
  dueDate?: Date | string | null;
  assignments: { user: UserBasic }[];
  taskLabels: { label: Label }[];
  project: { taskPrefix: string };
}

type SortField = "id" | "title" | "status" | "priority" | "dueDate";
type SortDir = "asc" | "desc";

interface TaskListProps {
  tasks: ListTask[];
  statuses: StatusDef[];
  onTaskClick: (taskId: string) => void;
  onBulkAction?: (action: string, taskIds: string[]) => void;
}

const PRIORITY_ORDER: Record<string, number> = {
  URGENT: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  NONE: 0,
};

const PRIORITY_ICONS: Record<string, React.ReactNode> = {
  NONE: <Minus size={13} />,
  LOW: <ArrowDown size={13} />,
  MEDIUM: <ArrowRight size={13} />,
  HIGH: <ArrowUp size={13} />,
  URGENT: <AlertCircle size={13} />,
};

export function TaskList({ tasks, statuses, onTaskClick, onBulkAction }: TaskListProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () => {
    if (selected.size === tasks.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(tasks.map((t) => t.id)));
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sorted = [...tasks].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case "id":
        cmp = a.number - b.number;
        break;
      case "title":
        cmp = a.title.localeCompare(b.title);
        break;
      case "status": {
        const sa = statuses.find((s) => s.id === a.statusId);
        const sb = statuses.find((s) => s.id === b.statusId);
        cmp = (sa?.name ?? "").localeCompare(sb?.name ?? "");
        break;
      }
      case "priority":
        cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        break;
      case "dueDate":
        cmp =
          (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) -
          (b.dueDate ? new Date(b.dueDate).getTime() : Infinity);
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown size={12} className="text-[var(--muted-foreground)]" />;
    return sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)]/10 border-b border-[var(--border)]">
          <span className="text-sm text-[var(--foreground)]">{selected.size} selected</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onBulkAction?.("delete", Array.from(selected))}
            className="h-7 text-xs text-[var(--destructive)]"
          >
            Delete
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onBulkAction?.("assign", Array.from(selected))}
            className="h-7 text-xs"
          >
            Assign
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onBulkAction?.("status", Array.from(selected))}
            className="h-7 text-xs"
          >
            Change status
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelected(new Set())}
            className="h-7 text-xs ml-auto"
          >
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <ScrollArea className="flex-1">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--background)] border-b border-[var(--border)]">
            <tr>
              <th className="w-10 px-4 py-2.5 text-left">
                <Checkbox
                  checked={selected.size === tasks.length && tasks.length > 0}
                  onCheckedChange={toggleAll}
                />
              </th>
              <th
                className="w-24 px-2 py-2.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider cursor-pointer hover:text-[var(--foreground)]"
                onClick={() => handleSort("id")}
              >
                <span className="flex items-center gap-1">
                  ID <SortIcon field="id" />
                </span>
              </th>
              <th
                className="px-2 py-2.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider cursor-pointer hover:text-[var(--foreground)]"
                onClick={() => handleSort("title")}
              >
                <span className="flex items-center gap-1">
                  Title <SortIcon field="title" />
                </span>
              </th>
              <th
                className="w-28 px-2 py-2.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider cursor-pointer hover:text-[var(--foreground)]"
                onClick={() => handleSort("status")}
              >
                <span className="flex items-center gap-1">
                  Status <SortIcon field="status" />
                </span>
              </th>
              <th
                className="w-24 px-2 py-2.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider cursor-pointer hover:text-[var(--foreground)]"
                onClick={() => handleSort("priority")}
              >
                <span className="flex items-center gap-1">
                  Priority <SortIcon field="priority" />
                </span>
              </th>
              <th className="w-28 px-2 py-2.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                Assignees
              </th>
              <th
                className="w-28 px-2 py-2.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider cursor-pointer hover:text-[var(--foreground)]"
                onClick={() => handleSort("dueDate")}
              >
                <span className="flex items-center gap-1">
                  Due <SortIcon field="dueDate" />
                </span>
              </th>
              <th className="w-28 px-2 py-2.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                Labels
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((task) => {
              const isSelected = selected.has(task.id);
              const priorityCfg = PRIORITY_CONFIG[task.priority];
              const isOverdue =
                task.dueDate != null && new Date(task.dueDate) < new Date();
              return (
                <tr
                  key={task.id}
                  onClick={() => onTaskClick(task.id)}
                  className={cn(
                    "border-b border-[var(--border)] cursor-pointer transition-colors",
                    isSelected
                      ? "bg-[var(--primary)]/5"
                      : "hover:bg-[var(--secondary)]"
                  )}
                >
                  <td
                    className="px-4 py-2.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(task.id);
                    }}
                  >
                    <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(task.id)} />
                  </td>
                  <td className="px-2 py-2.5">
                    <span className="font-mono text-xs text-[var(--muted-foreground)]">
                      {generateTaskId(task.project.taskPrefix, task.number)}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 max-w-xs">
                    <span className="truncate block text-[var(--foreground)]">{task.title}</span>
                  </td>
                  <td className="px-2 py-2.5">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: task.status.color }}
                      />
                      <span className="text-xs truncate">{task.status.name}</span>
                    </span>
                  </td>
                  <td className="px-2 py-2.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className="flex items-center gap-1 text-xs"
                          style={{ color: priorityCfg.color }}
                        >
                          {PRIORITY_ICONS[task.priority]}
                          <span className="hidden lg:inline">{priorityCfg.label}</span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{priorityCfg.label}</TooltipContent>
                    </Tooltip>
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center">
                      {task.assignments.slice(0, 3).map(({ user }, i) => (
                        <Tooltip key={user.id}>
                          <TooltipTrigger asChild>
                            <Avatar
                              className="w-5 h-5 border border-[var(--background)]"
                              style={{ marginLeft: i > 0 ? "-4px" : 0 }}
                            >
                              {user.image && <AvatarImage src={user.image} />}
                              <AvatarFallback className="text-[8px]">
                                {getInitials(user.name ?? user.email)}
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent>{user.name ?? user.email}</TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </td>
                  <td className="px-2 py-2.5">
                    {task.dueDate && (
                      <span
                        className={cn(
                          "flex items-center gap-1 text-xs",
                          isOverdue
                            ? "text-[var(--destructive)]"
                            : "text-[var(--muted-foreground)]"
                        )}
                      >
                        <CalendarDays size={11} />
                        {formatDate(task.dueDate)}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-0.5">
                      {task.taskLabels.slice(0, 4).map(({ label }) => (
                        <Tooltip key={label.id}>
                          <TooltipTrigger asChild>
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: label.color }}
                            />
                          </TooltipTrigger>
                          <TooltipContent>{label.name}</TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {tasks.length === 0 && (
          <div className="flex items-center justify-center py-16 text-sm text-[var(--muted-foreground)]">
            No tasks found
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
