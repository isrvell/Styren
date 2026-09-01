"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Square, Plus, Clock, Trash2 } from "lucide-react";
import { cn, getInitials, formatDuration } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

interface TimerUser {
  id: string;
  name?: string | null;
  email: string;
  image?: string | null;
}

interface TimeEntry {
  id: string;
  durationSeconds: number;
  startedAt: Date | string;
  note?: string | null;
  billable: boolean;
  user: TimerUser;
}

interface TimeTrackerProps {
  taskId: string;
  entries: TimeEntry[];
  isRunning?: boolean;
  runningStartedAt?: Date | string | null;
  onStart: (taskId: string) => void;
  onStop: (taskId: string) => void;
  onManualEntry: (data: {
    taskId: string;
    durationSeconds: number;
    startedAt: string;
    note?: string;
    billable: boolean;
  }) => void;
  onDeleteEntry?: (entryId: string) => void;
}

function formatClock(seconds: number): string {
  const h = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function entryDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TimeTracker({
  taskId,
  entries,
  isRunning = false,
  runningStartedAt,
  onStart,
  onStop,
  onManualEntry,
  onDeleteEntry,
}: TimeTrackerProps) {
  const [elapsed, setElapsed] = useState(0);
  const [showManual, setShowManual] = useState(false);
  const [manualHours, setManualHours] = useState("");
  const [manualMinutes, setManualMinutes] = useState("");
  const [manualDate, setManualDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [manualNote, setManualNote] = useState("");
  const [manualBillable, setManualBillable] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning && runningStartedAt) {
      const base = Math.floor(
        (Date.now() - new Date(runningStartedAt).getTime()) / 1000
      );
      setElapsed(base);
      intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      setElapsed(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, runningStartedAt]);

  const totalTracked = entries.reduce((s, e) => s + e.durationSeconds, 0);

  const handleManualSubmit = () => {
    const h = Number(manualHours) || 0;
    const m = Number(manualMinutes) || 0;
    const secs = h * 3600 + m * 60;
    if (secs < 60) return;
    onManualEntry({
      taskId,
      durationSeconds: secs,
      startedAt: new Date(manualDate).toISOString(),
      note: manualNote.trim() || undefined,
      billable: manualBillable,
    });
    setManualHours("");
    setManualMinutes("");
    setManualNote("");
    setManualBillable(false);
    setShowManual(false);
  };

  return (
    <div className="space-y-4">
      {/* Timer display */}
      <div className="flex items-center gap-3 bg-[var(--secondary)] rounded p-3">
        <div className="flex-1">
          <div
            className={cn(
              "font-mono text-2xl font-semibold tabular-nums",
              isRunning ? "text-[var(--primary)]" : "text-[var(--foreground)]"
            )}
          >
            {formatClock(elapsed)}
          </div>
          <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
            Total tracked: {formatDuration(totalTracked)}
          </div>
        </div>
        <Button
          size="sm"
          variant={isRunning ? "destructive" : "default"}
          onClick={() => (isRunning ? onStop(taskId) : onStart(taskId))}
          className="h-9 w-9 p-0"
        >
          {isRunning ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
        </Button>
      </div>

      {/* Log time manually */}
      <div>
        <button
          onClick={() => setShowManual((s) => !s)}
          className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <Plus size={12} />
          Log time manually
        </button>

        {showManual && (
          <div className="mt-2 p-3 bg-[var(--secondary)] rounded border border-[var(--border)] space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px]">Hours</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={manualHours}
                  onChange={(e) => setManualHours(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Minutes</Label>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  placeholder="0"
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Date</Label>
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="w-full h-7 px-2 text-xs bg-[var(--background)] border border-[var(--border)] rounded text-[var(--foreground)]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Note (optional)</Label>
              <Input
                placeholder="What did you work on?"
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                className="h-7 text-xs"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="billable"
                  checked={manualBillable}
                  onCheckedChange={setManualBillable}
                  className="h-4 w-7"
                />
                <Label htmlFor="billable" className="text-xs cursor-pointer">Billable</Label>
              </div>
              <div className="flex gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowManual(false)}
                  className="h-6 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleManualSubmit}
                  disabled={
                    (Number(manualHours) || 0) * 60 + (Number(manualMinutes) || 0) < 1
                  }
                  className="h-6 text-xs"
                >
                  Log
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Time entries list */}
      {entries.length > 0 && (
        <div>
          <Separator className="mb-3" />
          <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Clock size={11} />
            Time entries
          </h4>
          <div className="space-y-1.5">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-[var(--secondary)] group"
              >
                <Avatar className="w-5 h-5 shrink-0">
                  {entry.user.image && <AvatarImage src={entry.user.image} />}
                  <AvatarFallback className="text-[8px]">
                    {getInitials(entry.user.name ?? entry.user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-medium">
                      {formatDuration(entry.durationSeconds)}
                    </span>
                    {entry.billable && (
                      <span className="text-[10px] text-[var(--success)] border border-[var(--success)]/30 rounded px-1">
                        billable
                      </span>
                    )}
                  </div>
                  {entry.note && (
                    <p className="text-[11px] text-[var(--muted-foreground)] truncate">{entry.note}</p>
                  )}
                  <p className="text-[10px] text-[var(--muted-foreground)]">
                    {entry.user.name ?? entry.user.email} · {entryDate(entry.startedAt)}
                  </p>
                </div>
                {onDeleteEntry && (
                  <button
                    onClick={() => onDeleteEntry(entry.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
