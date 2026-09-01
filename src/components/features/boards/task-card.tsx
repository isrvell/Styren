"use client";

import { Minus, ArrowDown, ArrowRight, ArrowUp, AlertCircle, CalendarDays } from "lucide-react";
import { cn, getInitials, generateTaskId } from "@/lib/utils";
import { PRIORITY_CONFIG } from "@/lib/constants";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDate } from "@/lib/utils";

interface Label {
  id: string;
  name: string;
  color: string;
}

interface AssigneeUser {
  id: string;
  name?: string | null;
  image?: string | null;
  email: string;
}

interface TaskAssignment {
  user: AssigneeUser;
}

interface Subtask {
  id: string;
  statusId: string;
}

interface StatusDef {
  id: string;
  category: "NOT_STARTED" | "ACTIVE" | "DONE";
}

interface TaskCardTask {
  id: string;
  number: number;
  title: string;
  priority: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  statusId: string;
  dueDate?: Date | string | null;
  estimate?: number | null;
  assignments: TaskAssignment[];
  taskLabels: { label: Label }[];
  subtasks: Subtask[];
  project: { taskPrefix: string };
  status?: StatusDef;
}

interface TaskCardProps {
  task: TaskCardTask;
}

const PRIORITY_ICONS: Record<string, React.ReactNode> = {
  NONE: <Minus size={12} />,
  LOW: <ArrowDown size={12} />,
  MEDIUM: <ArrowRight size={12} />,
  HIGH: <ArrowUp size={12} />,
  URGENT: <AlertCircle size={12} />,
};

export function TaskCard({ task }: TaskCardProps) {
  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const taskId = generateTaskId(task.project.taskPrefix, task.number);
  const assignees = task.assignments.slice(0, 3);
  const extraAssignees = task.assignments.length - 3;

  const doneSubtasks =
    task.subtasks.filter((s) => {
      // We count done subtasks naively since we may not have status objects in scope
      return false; // placeholder; callers can pass richer data
    }).length;
  const totalSubtasks = task.subtasks.length;

  const isOverdue =
    task.dueDate != null && new Date(task.dueDate) < new Date();

  return (
    <div
      className={cn(
        "bg-[var(--card)] border border-[var(--border)] rounded p-2.5 cursor-pointer select-none",
        "hover:border-[var(--primary)] transition-colors group"
      )}
    >
      {/* Task ID + Priority */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono text-[11px] text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]">
          {taskId}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span style={{ color: priorityConfig.color }} className="shrink-0">
              {PRIORITY_ICONS[task.priority]}
            </span>
          </TooltipTrigger>
          <TooltipContent>{priorityConfig.label}</TooltipContent>
        </Tooltip>
      </div>

      {/* Title */}
      <p className="text-[13px] leading-snug text-[var(--foreground)] mb-2 line-clamp-2">
        {task.title}
      </p>

      {/* Labels */}
      {task.taskLabels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.taskLabels.slice(0, 4).map(({ label }) => (
            <Tooltip key={label.id}>
              <TooltipTrigger asChild>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: label.color }}
                />
              </TooltipTrigger>
              <TooltipContent>{label.name}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        {/* Assignees */}
        <div className="flex items-center">
          {assignees.map(({ user }, i) => (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <Avatar
                  className="w-5 h-5 border border-[var(--background)]"
                  style={{ marginLeft: i > 0 ? "-6px" : 0 }}
                >
                  {user.image && <AvatarImage src={user.image} alt={user.name ?? user.email} />}
                  <AvatarFallback className="text-[8px]">
                    {getInitials(user.name ?? user.email)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>{user.name ?? user.email}</TooltipContent>
            </Tooltip>
          ))}
          {extraAssignees > 0 && (
            <span
              className="w-5 h-5 rounded-full bg-[var(--secondary)] border border-[var(--background)] flex items-center justify-center text-[8px] text-[var(--muted-foreground)]"
              style={{ marginLeft: "-6px" }}
            >
              +{extraAssignees}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Subtask progress */}
          {totalSubtasks > 0 && (
            <span className="text-[11px] text-[var(--muted-foreground)]">
              {doneSubtasks}/{totalSubtasks}
            </span>
          )}
          {/* Due date */}
          {task.dueDate && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-[11px]",
                isOverdue ? "text-[var(--destructive)]" : "text-[var(--muted-foreground)]"
              )}
            >
              <CalendarDays size={11} />
              {formatDate(task.dueDate)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
