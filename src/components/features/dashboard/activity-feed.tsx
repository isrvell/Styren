"use client";

import { formatDate, getInitials } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ActivityUser {
  id: string;
  name?: string | null;
  email: string;
  image?: string | null;
}

interface ActivityItem {
  id: string;
  action: string; // e.g. "created task PROJ-42" or "moved PROJ-15 to Done"
  createdAt: Date | string;
  actor: ActivityUser;
  targetUrl?: string; // optional link for the activity
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  maxHeight?: number; // px, defaults to no max
}

function timeAgo(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD < 7) return `${diffD}d ago`;
  return formatDate(date);
}

export function ActivityFeed({ activities, maxHeight }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-[var(--muted-foreground)]">
        No recent activity
      </div>
    );
  }

  const inner = (
    <div className="flex flex-col divide-y divide-[var(--border)]">
      {activities.map((item) => (
        <div key={item.id} className="flex items-start gap-3 py-3 px-1">
          <Avatar className="w-7 h-7 shrink-0 mt-0.5">
            {item.actor.image && <AvatarImage src={item.actor.image} alt={item.actor.name ?? item.actor.email} />}
            <AvatarFallback className="text-[10px]">
              {getInitials(item.actor.name ?? item.actor.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm leading-snug">
              <span className="font-medium text-[var(--foreground)]">
                {item.actor.name ?? item.actor.email}
              </span>{" "}
              <span className="text-[var(--foreground)]">{item.action}</span>
            </p>
            <time
              dateTime={new Date(item.createdAt).toISOString()}
              className="text-[11px] text-[var(--muted-foreground)] mt-0.5 block"
              title={formatDate(item.createdAt)}
            >
              {timeAgo(item.createdAt)}
            </time>
          </div>
        </div>
      ))}
    </div>
  );

  if (maxHeight) {
    return <ScrollArea style={{ maxHeight }}>{inner}</ScrollArea>;
  }

  return inner;
}
