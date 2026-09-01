"use client";

import { TrendingUp, TrendingDown, Minus, CheckCircle2, Clock, AlertTriangle, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatValue {
  count: number;
  changePercent?: number; // positive = increase, negative = decrease
  changePeriod?: string; // e.g. "vs last week"
}

interface DashboardStats {
  totalTasks: StatValue;
  inProgress: StatValue;
  completedThisWeek: StatValue;
  overdue: StatValue;
}

interface StatsCardsProps {
  stats: DashboardStats;
}

interface CardDef {
  key: keyof DashboardStats;
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

const CARDS: CardDef[] = [
  {
    key: "totalTasks",
    label: "Total Tasks",
    icon: <LayoutList size={18} />,
    iconBg: "bg-blue-50 dark:bg-blue-900/20",
    iconColor: "text-blue-500",
  },
  {
    key: "inProgress",
    label: "In Progress",
    icon: <Clock size={18} />,
    iconBg: "bg-amber-50 dark:bg-amber-900/20",
    iconColor: "text-amber-500",
  },
  {
    key: "completedThisWeek",
    label: "Completed This Week",
    icon: <CheckCircle2 size={18} />,
    iconBg: "bg-emerald-50 dark:bg-emerald-900/20",
    iconColor: "text-emerald-500",
  },
  {
    key: "overdue",
    label: "Overdue",
    icon: <AlertTriangle size={18} />,
    iconBg: "bg-red-50 dark:bg-red-900/20",
    iconColor: "text-red-500",
  },
];

function ChangeIndicator({ value, period }: { value?: number; period?: string }) {
  if (value == null) return null;

  const isPositive = value > 0;
  const isNeutral = value === 0;

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 text-xs",
        isNeutral
          ? "text-[var(--muted-foreground)]"
          : isPositive
          ? "text-[var(--success)]"
          : "text-[var(--destructive)]"
      )}
    >
      {isNeutral ? (
        <Minus size={12} />
      ) : isPositive ? (
        <TrendingUp size={12} />
      ) : (
        <TrendingDown size={12} />
      )}
      <span className="font-medium">
        {isPositive ? "+" : ""}
        {value}%
      </span>
      {period && <span className="text-[var(--muted-foreground)] ml-0.5">{period}</span>}
    </div>
  );
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map((card) => {
        const stat = stats[card.key];
        return (
          <div
            key={card.key}
            className="bg-[var(--card)] border border-[var(--border)] rounded p-4 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between">
              <div
                className={cn(
                  "w-9 h-9 rounded flex items-center justify-center shrink-0",
                  card.iconBg,
                  card.iconColor
                )}
              >
                {card.icon}
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[var(--foreground)] tabular-nums">
                {stat.count.toLocaleString()}
              </div>
              <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{card.label}</div>
            </div>
            {stat.changePercent != null && (
              <ChangeIndicator value={stat.changePercent} period={stat.changePeriod ?? "vs last week"} />
            )}
          </div>
        );
      })}
    </div>
  );
}
