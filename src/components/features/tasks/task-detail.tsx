"use client";

import { useState, useRef } from "react";
import {
  X,
  Minus,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  AlertCircle,
  CalendarDays,
  Clock,
  Tag,
  User,
  Zap,
  MessageSquare,
  CheckSquare,
  Plus,
  Send,
} from "lucide-react";
import { cn, getInitials, formatDate, formatDuration } from "@/lib/utils";
import { PRIORITY_CONFIG } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";

interface UserBasic {
  id: string;
  name?: string | null;
  email: string;
  image?: string | null;
}

interface Label {
  id: string;
  name: string;
  color: string;
}

interface StatusDef {
  id: string;
  name: string;
  color: string;
  category: "NOT_STARTED" | "ACTIVE" | "DONE";
}

interface Sprint {
  id: string;
  name: string;
}

interface Subtask {
  id: string;
  number: number;
  title: string;
  statusId: string;
  status: StatusDef;
  project: { taskPrefix: string };
}

interface Comment {
  id: string;
  body: string;
  createdAt: Date | string;
  author: UserBasic;
}

interface TimeEntry {
  id: string;
  durationSeconds: number;
  startedAt: Date | string;
  note?: string | null;
  user: UserBasic;
}

interface DetailTask {
  id: string;
  number: number;
  title: string;
  description?: string | null;
  priority: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  statusId: string;
  status: StatusDef;
  dueDate?: Date | string | null;
  startDate?: Date | string | null;
  estimate?: number | null;
  project: { taskPrefix: string; methodology: "SCRUM" | "KANBAN" };
  sprint?: Sprint | null;
  assignments: { user: UserBasic }[];
  taskLabels: { label: Label }[];
  subtasks: Subtask[];
  comments: Comment[];
  timeEntries: TimeEntry[];
}

// Public props accepted by the pages
interface TaskDetailProps {
  taskId: string;
  projectId: string;
  statuses: StatusDef[];
  labels?: Label[];
  members?: UserBasic[];
  sprints?: Sprint[];
  onUpdate: () => void;
  onClose: () => void;
  onAddComment?: (body: string) => void;
}

// Inner-component props (same shape as the original component)
interface TaskDetailContentProps {
  task: DetailTask;
  statuses: StatusDef[];
  sprints?: Sprint[];
  onUpdate: (fields: Partial<{
    title: string;
    description: string;
    statusId: string;
    priority: string;
    dueDate: string | null;
    sprintId: string | null;
    estimate: number | null;
  }>) => void;
  onClose: () => void;
  onAddComment?: (body: string) => void;
}

const PRIORITY_ICONS: Record<string, React.ReactNode> = {
  NONE: <Minus size={13} />,
  LOW: <ArrowDown size={13} />,
  MEDIUM: <ArrowRight size={13} />,
  HIGH: <ArrowUp size={13} />,
  URGENT: <AlertCircle size={13} />,
};

// Outer wrapper — fetches the task, delegates rendering to TaskDetailContent
export function TaskDetail({
  taskId,
  projectId: _projectId,
  statuses,
  labels: _labels = [],
  members: _members = [],
  sprints = [],
  onUpdate,
  onClose,
  onAddComment,
}: TaskDetailProps) {
  const { data: task, isLoading } = trpc.task.getById.useQuery({ taskId });

  const updateTask = trpc.task.update.useMutation({
    onSuccess: () => onUpdate(),
  });

  const handleUpdate = (fields: Partial<{
    title: string;
    description: string;
    statusId: string;
    priority: string;
    dueDate: string | null;
    sprintId: string | null;
    estimate: number | null;
  }>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateTask.mutate({ taskId, ...(fields as any) });
  };

  if (isLoading || !task) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading task...</div>
      </div>
    );
  }

  return (
    <TaskDetailContent
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      task={task as any}
      statuses={statuses}
      sprints={sprints}
      onUpdate={handleUpdate}
      onClose={onClose}
      onAddComment={onAddComment}
    />
  );
}

// Inner component — original rendering logic, unchanged
function TaskDetailContent({
  task,
  statuses,
  sprints = [],
  onUpdate,
  onClose,
  onAddComment,
}: TaskDetailContentProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);
  const [commentText, setCommentText] = useState("");
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const completedSubtasks = task.subtasks.filter(
    (s) => s.status.category === "DONE"
  ).length;
  const subtaskProgress =
    task.subtasks.length > 0
      ? Math.round((completedSubtasks / task.subtasks.length) * 100)
      : 0;

  const totalTracked = task.timeEntries.reduce(
    (sum, e) => sum + e.durationSeconds,
    0
  );

  const handleTitleCommit = () => {
    setEditingTitle(false);
    if (titleValue.trim() && titleValue !== task.title) {
      onUpdate({ title: titleValue.trim() });
    }
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    onAddComment?.(commentText.trim());
    setCommentText("");
  };

  return (
    <div className="flex h-full bg-[var(--card)] rounded-lg border border-[var(--border)] overflow-hidden shadow-lg">
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border)] shrink-0">
          <span className="font-mono text-xs text-[var(--muted-foreground)]">
            {task.project.taskPrefix}-{task.number}
          </span>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X size={15} />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-5 py-4 space-y-5">
            {/* Title */}
            {editingTitle ? (
              <Textarea
                ref={titleRef}
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleTitleCommit}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleTitleCommit();
                  }
                  if (e.key === "Escape") {
                    setTitleValue(task.title);
                    setEditingTitle(false);
                  }
                }}
                className="text-xl font-semibold resize-none border-0 p-0 focus-visible:ring-0 bg-transparent"
                rows={2}
                autoFocus
              />
            ) : (
              <h2
                className="text-xl font-semibold text-[var(--foreground)] cursor-text hover:bg-[var(--secondary)] rounded px-1 -mx-1 py-0.5 transition-colors"
                onClick={() => setEditingTitle(true)}
              >
                {task.title}
              </h2>
            )}

            {/* Description */}
            <div>
              <h3 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                Description
              </h3>
              <Textarea
                defaultValue={task.description ?? ""}
                onBlur={(e) => onUpdate({ description: e.target.value })}
                placeholder="Add a description..."
                className="min-h-[80px] resize-none text-sm bg-[var(--secondary)] border-transparent focus:border-[var(--border)]"
              />
            </div>

            {/* Subtasks */}
            {task.subtasks.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare size={12} />
                    Subtasks
                  </h3>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {completedSubtasks}/{task.subtasks.length}
                  </span>
                </div>
                <Progress value={subtaskProgress} className="h-1 mb-2" />
                <div className="space-y-1">
                  {task.subtasks.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[var(--secondary)] group"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: sub.status.color }}
                      />
                      <span
                        className={cn(
                          "text-sm flex-1",
                          sub.status.category === "DONE" &&
                            "line-through text-[var(--muted-foreground)]"
                        )}
                      >
                        {sub.title}
                      </span>
                      <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                        {sub.project.taskPrefix}-{sub.number}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Comments */}
            <div>
              <h3 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MessageSquare size={12} />
                Comments
              </h3>
              <div className="space-y-3 mb-3">
                {task.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2.5">
                    <Avatar className="w-6 h-6 shrink-0 mt-0.5">
                      {comment.author.image && (
                        <AvatarImage src={comment.author.image} />
                      )}
                      <AvatarFallback className="text-[9px]">
                        {getInitials(comment.author.name ?? comment.author.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-sm font-medium">
                          {comment.author.name ?? comment.author.email}
                        </span>
                        <span className="text-[11px] text-[var(--muted-foreground)]">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--foreground)]">{comment.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  className="min-h-[60px] resize-none text-sm flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleComment();
                  }}
                />
                <Button
                  size="icon"
                  onClick={handleComment}
                  disabled={!commentText.trim()}
                  className="h-9 w-9 shrink-0 self-end"
                >
                  <Send size={14} />
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Sidebar */}
      <div className="w-[220px] shrink-0 border-l border-[var(--border)] bg-[var(--secondary)]">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {/* Status */}
            <SidebarField label="Status" icon={<Zap size={12} />}>
              <Select
                value={task.statusId}
                onValueChange={(val) => onUpdate({ statusId: val })}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
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
            </SidebarField>

            {/* Priority */}
            <SidebarField label="Priority" icon={<ArrowUp size={12} />}>
              <Select
                value={task.priority}
                onValueChange={(val) => onUpdate({ priority: val })}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(PRIORITY_CONFIG) as [string, { label: string; color: string }][]).map(
                    ([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: cfg.color }}
                          />
                          {cfg.label}
                        </span>
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </SidebarField>

            {/* Assignees */}
            <SidebarField label="Assignees" icon={<User size={12} />}>
              <div className="flex flex-wrap gap-1.5">
                {task.assignments.map(({ user }) => (
                  <Tooltip key={user.id}>
                    <TooltipTrigger asChild>
                      <Avatar className="w-6 h-6">
                        {user.image && <AvatarImage src={user.image} />}
                        <AvatarFallback className="text-[9px]">
                          {getInitials(user.name ?? user.email)}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>{user.name ?? user.email}</TooltipContent>
                  </Tooltip>
                ))}
                <button className="w-6 h-6 rounded-full border border-dashed border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--foreground)] transition-colors">
                  <Plus size={11} />
                </button>
              </div>
            </SidebarField>

            {/* Labels */}
            <SidebarField label="Labels" icon={<Tag size={12} />}>
              <div className="flex flex-wrap gap-1">
                {task.taskLabels.map(({ label }) => (
                  <span
                    key={label.id}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px]"
                    style={{
                      backgroundColor: label.color + "22",
                      color: label.color,
                      border: `1px solid ${label.color}44`,
                    }}
                  >
                    {label.name}
                  </span>
                ))}
              </div>
            </SidebarField>

            {/* Due date */}
            <SidebarField label="Due date" icon={<CalendarDays size={12} />}>
              <input
                type="date"
                defaultValue={
                  task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""
                }
                onChange={(e) => onUpdate({ dueDate: e.target.value || null })}
                className="w-full h-7 text-xs bg-[var(--card)] border border-[var(--border)] rounded px-2 text-[var(--foreground)]"
              />
            </SidebarField>

            {/* Estimate */}
            <SidebarField label="Estimate (h)" icon={<Clock size={12} />}>
              <input
                type="number"
                min={0}
                step={0.5}
                defaultValue={task.estimate ?? ""}
                onBlur={(e) =>
                  onUpdate({ estimate: e.target.value ? Number(e.target.value) : null })
                }
                placeholder="—"
                className="w-full h-7 text-xs bg-[var(--card)] border border-[var(--border)] rounded px-2 text-[var(--foreground)]"
              />
            </SidebarField>

            {/* Sprint */}
            {task.project.methodology === "SCRUM" && sprints.length > 0 && (
              <SidebarField label="Sprint" icon={<Zap size={12} />}>
                <Select
                  value={task.sprint?.id ?? "none"}
                  onValueChange={(val) => onUpdate({ sprintId: val === "none" ? null : val })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="No sprint" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No sprint</SelectItem>
                    {sprints.map((sp) => (
                      <SelectItem key={sp.id} value={sp.id}>
                        {sp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SidebarField>
            )}

            {/* Time tracked */}
            <SidebarField label="Time tracked" icon={<Clock size={12} />}>
              <span className="text-xs text-[var(--foreground)]">
                {formatDuration(totalTracked)}
              </span>
            </SidebarField>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function SidebarField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}
