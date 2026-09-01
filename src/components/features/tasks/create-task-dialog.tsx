"use client";

import { useState } from "react";
import { X, Plus, CalendarDays } from "lucide-react";
import { PRIORITY_CONFIG } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

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

interface ParentTask {
  id: string;
  number: number;
  title: string;
  project: { taskPrefix: string };
}

interface CreateTaskDialogProps {
  projectId: string;
  statuses: StatusDef[];
  members: Member[];
  labels: LabelDef[];
  defaultStatusId?: string;
  onSubmit: () => void;
  onClose: () => void;
  availableParents?: ParentTask[];
}

export function CreateTaskDialog({
  projectId,
  statuses,
  members,
  labels,
  onSubmit,
  onClose,
  defaultStatusId,
  availableParents = [],
}: CreateTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statusId, setStatusId] = useState(defaultStatusId ?? statuses[0]?.id ?? "");
  const [priority, setPriority] = useState<"NONE" | "LOW" | "MEDIUM" | "HIGH" | "URGENT">("NONE");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [estimate, setEstimate] = useState("");
  const [parentTaskId, setParentTaskId] = useState("");

  const createTask = trpc.task.create.useMutation({
    onSuccess: () => {
      reset();
      onSubmit();
    },
  });

  const reset = () => {
    setTitle("");
    setDescription("");
    setStatusId(defaultStatusId ?? statuses[0]?.id ?? "");
    setPriority("NONE");
    setAssigneeIds([]);
    setLabelIds([]);
    setDueDate("");
    setEstimate("");
    setParentTaskId("");
  };

  const handleSubmit = () => {
    if (!title.trim() || !statusId) return;
    createTask.mutate({
      projectId,
      title: title.trim(),
      description: description.trim() || undefined,
      statusId,
      priority,
      assigneeIds,
      labelIds,
      dueDate: dueDate || undefined,
      estimate: estimate ? Number(estimate) : undefined,
      parentTaskId: parentTaskId || undefined,
    });
  };

  const toggleAssignee = (id: string) =>
    setAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );

  const toggleLabel = (id: string) =>
    setLabelIds((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="task-title" className="text-xs font-medium">
              Title <span className="text-[var(--destructive)]">*</span>
            </Label>
            <Input
              id="task-title"
              placeholder="Task title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
              }}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="task-desc" className="text-xs font-medium">Description</Label>
            <Textarea
              id="task-desc"
              placeholder="Add more detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] resize-none text-sm"
            />
          </div>

          {/* Status + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Status</Label>
              <Select value={statusId} onValueChange={setStatusId}>
                <SelectTrigger className="h-8 text-xs">
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
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger className="h-8 text-xs">
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
            </div>
          </div>

          {/* Assignees */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Assignees</Label>
            <div className="flex flex-wrap gap-1.5 p-2 rounded border border-[var(--border)] min-h-[36px]">
              {assigneeIds.map((id) => {
                const m = members.find((x) => x.id === id);
                if (!m) return null;
                return (
                  <Badge key={id} variant="secondary" className="gap-1 pl-1 pr-1.5 h-6 text-xs">
                    <Avatar className="w-4 h-4">
                      {m.image && <AvatarImage src={m.image} />}
                      <AvatarFallback className="text-[8px]">
                        {getInitials(m.name ?? m.email)}
                      </AvatarFallback>
                    </Avatar>
                    {m.name ?? m.email}
                    <button
                      onClick={() => toggleAssignee(id)}
                      className="ml-0.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    >
                      <X size={10} />
                    </button>
                  </Badge>
                );
              })}
              <Select onValueChange={toggleAssignee} value="">
                <SelectTrigger className="h-6 w-auto border-0 shadow-none px-1 text-xs text-[var(--muted-foreground)]">
                  <Plus size={12} />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          {m.image && <AvatarImage src={m.image} />}
                          <AvatarFallback className="text-[8px]">
                            {getInitials(m.name ?? m.email)}
                          </AvatarFallback>
                        </Avatar>
                        {m.name ?? m.email}
                        {assigneeIds.includes(m.id) && (
                          <span className="ml-auto text-[var(--primary)]">✓</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Labels */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Labels</Label>
            <div className="flex flex-wrap gap-1.5 p-2 rounded border border-[var(--border)] min-h-[36px]">
              {labelIds.map((id) => {
                const l = labels.find((x) => x.id === id);
                if (!l) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px]"
                    style={{
                      backgroundColor: l.color + "22",
                      color: l.color,
                      border: `1px solid ${l.color}44`,
                    }}
                  >
                    {l.name}
                    <button onClick={() => toggleLabel(id)}>
                      <X size={9} />
                    </button>
                  </span>
                );
              })}
              <Select onValueChange={toggleLabel} value="">
                <SelectTrigger className="h-6 w-auto border-0 shadow-none px-1 text-xs text-[var(--muted-foreground)]">
                  <Plus size={12} />
                </SelectTrigger>
                <SelectContent>
                  {labels.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: l.color }}
                        />
                        {l.name}
                        {labelIds.includes(l.id) && (
                          <span className="ml-auto text-[var(--primary)]">✓</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due date + Estimate row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Due date</Label>
              <div className="relative">
                <CalendarDays
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none"
                />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full h-8 pl-7 pr-2 text-xs bg-[var(--background)] border border-[var(--input)] rounded text-[var(--foreground)]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Estimate (h)</Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                placeholder="0"
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Parent task */}
          {availableParents.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Parent task (optional)</Label>
              <Select value={parentTaskId} onValueChange={setParentTaskId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {availableParents.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                          {p.project.taskPrefix}-{p.number}
                        </span>
                        <span className="truncate">{p.title}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => { reset(); onClose(); }}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!title.trim() || !statusId || createTask.isPending}
          >
            {createTask.isPending ? "Creating..." : "Create task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
