"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Layers,
  UserCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderKanban,
  Users,
  ArrowRight,
  Plus,
  BarChart2,
  PieChart,
  TrendingUp,
  Zap,
  Timer,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrg } from "@/lib/hooks/use-org";
import { trpc } from "@/lib/trpc";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const AVATAR_COLORS = [
  "#6366F1", "#8B5CF6", "#EC4899", "#F43F5E",
  "#F97316", "#EAB308", "#22C55E", "#14B8A6",
  "#3B82F6", "#06B6D4",
];

function getAvatarColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitial(name: string | null | undefined, email: string) {
  const src = name ?? email;
  return src.charAt(0).toUpperCase();
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  accent?: string;
  loading?: boolean;
}

function StatCard({ label, value, subtitle, icon, iconBg, accent, loading }: StatCardProps) {
  return (
    <div
      className={cn(
        "relative bg-[var(--card)] border border-[var(--border)] rounded p-4 flex flex-col gap-2 overflow-hidden",
        accent && `border-b-2`
      )}
      style={accent ? { borderBottomColor: accent } : undefined}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
          {label}
        </span>
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: iconBg + "22" }}
        >
          <span style={{ color: iconBg }}>{icon}</span>
        </span>
      </div>
      {loading ? (
        <div className="h-8 w-16 rounded bg-[var(--muted)] animate-pulse" />
      ) : (
        <div className="text-3xl font-bold text-[var(--foreground)] leading-none">{value}</div>
      )}
      <div className="text-xs text-[var(--muted-foreground)]">{subtitle}</div>
    </div>
  );
}

function ChartPlaceholder({
  title,
  icon,
  emptyText,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  emptyText: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
      </div>
      {children ?? (
        <div className="flex flex-col items-center justify-center py-8 gap-3 text-[var(--muted-foreground)]">
          <span className="opacity-20">{icon}</span>
          <p className="text-xs">{emptyText}</p>
        </div>
      )}
    </div>
  );
}

function PriorityDistributionCard() {
  const priorities = [
    { label: "URGENT", color: "#EF4444", pct: 0 },
    { label: "HIGH",   color: "#F97316", pct: 0 },
    { label: "MEDIUM", color: "#EAB308", pct: 0 },
    { label: "LOW",    color: "#22C55E", pct: 0 },
  ];

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded p-5 flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-[var(--foreground)]">Priority Distribution</h3>
      <div className="space-y-3">
        {priorities.map((p) => (
          <div key={p.label} className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-xs text-[var(--muted-foreground)] w-14 shrink-0">{p.label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${p.pct}%`, backgroundColor: p.color }}
              />
            </div>
            <span className="text-xs text-[var(--muted-foreground)] w-6 text-right">{p.pct}%</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-[var(--muted-foreground)] text-center pt-1">
        No task data yet
      </p>
    </div>
  );
}

interface WorkspaceRowProps {
  name: string;
  spaceCount: number;
  index: number;
}

function WorkspaceRow({ name, spaceCount, index }: WorkspaceRowProps) {
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-[var(--border)] last:border-0">
      <div
        className="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold shrink-0"
        style={{ backgroundColor: color }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--foreground)] truncate">{name}</p>
      </div>
      <div className="text-xs text-[var(--muted-foreground)] shrink-0">{spaceCount} spaces</div>
      <div className="text-xs text-[var(--muted-foreground)] shrink-0 w-16 text-right">—</div>
      <div className="w-24 shrink-0">
        <div className="h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
          <div className="h-full rounded-full bg-[var(--primary)] w-0" />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OrgHomePage() {
  const { orgId, orgSlug, orgName } = useOrg();
  const { data: session } = useSession();
  const router = useRouter();

  const [showCreate, setShowCreate] = useState(false);
  const [wsName, setWsName] = useState("");
  const [wsSlug, setWsSlug] = useState("");

  const { data: workspaces, isLoading: wsLoading, refetch } = trpc.workspace.list.useQuery({ orgId });
  const { data: members, isLoading: membersLoading } = trpc.organization.listMembers.useQuery({ orgId });

  const createWorkspace = trpc.workspace.create.useMutation({
    onSuccess: (ws) => {
      refetch();
      setShowCreate(false);
      router.push(`/org/${orgSlug}/workspace/${ws.slug}`);
    },
  });

  const firstName = useMemo(() => {
    const name = session?.user?.name;
    if (!name) return "there";
    return name.split(" ")[0];
  }, [session?.user?.name]);

  const greeting = getGreeting();
  const wsCount = workspaces?.length ?? 0;
  const memberCount = members?.length ?? 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Here&apos;s a complete overview of your workspace.
          </p>
        </div>
        <div
          className="px-3 py-1.5 rounded border border-[var(--border)] text-xs font-medium text-[var(--muted-foreground)] bg-[var(--card)] flex items-center gap-2"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] inline-block" />
          {orgName}
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Tasks"
          value={0}
          subtitle="— no change"
          icon={<Layers size={14} />}
          iconBg="#6366F1"
          accent="#6366F1"
          loading={wsLoading}
        />
        <StatCard
          label="Workspaces"
          value={wsCount}
          subtitle={wsCount === 1 ? "1 workspace" : `${wsCount} workspaces`}
          icon={<UserCheck size={14} />}
          iconBg="#22C55E"
          loading={wsLoading}
        />
        <StatCard
          label="Members"
          value={memberCount}
          subtitle={`${memberCount} active`}
          icon={<Users size={14} />}
          iconBg="#F97316"
          loading={membersLoading}
        />
        <StatCard
          label="Completed"
          value={0}
          subtitle="— no change"
          icon={<CheckCircle2 size={14} />}
          iconBg="#22C55E"
          loading={false}
        />
        <StatCard
          label="Overdue"
          value={0}
          subtitle="— no change"
          icon={<AlertTriangle size={14} />}
          iconBg="#EF4444"
          loading={false}
        />
      </div>

      {/* ── Chart Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartPlaceholder
          title="Status Overview"
          icon={<PieChart size={48} />}
          emptyText="No status data available"
        />
        <PriorityDistributionCard />
        <ChartPlaceholder
          title="Monthly Trend"
          icon={<BarChart2 size={48} />}
          emptyText="No monthly data yet"
        />
      </div>

      {/* ── Projects / Workspaces Table ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <FolderKanban size={15} className="text-[var(--muted-foreground)]" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Workspaces ({wsCount})
            </h2>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--primary)] hover:underline"
          >
            <Plus size={12} />
            New workspace
          </button>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[1fr_80px_80px_100px] px-5 py-2 text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)] border-b border-[var(--border)]">
          <span>Workspace</span>
          <span className="text-right">Spaces</span>
          <span className="text-right">Tasks</span>
          <span className="text-right">Progress</span>
        </div>

        <div className="px-5">
          {wsLoading ? (
            <div className="py-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 rounded bg-[var(--muted)] animate-pulse" />
              ))}
            </div>
          ) : wsCount === 0 ? (
            <div className="flex flex-col items-center py-10 gap-2 text-[var(--muted-foreground)]">
              <FolderKanban size={32} className="opacity-20" />
              <p className="text-sm">No workspaces yet</p>
              <p className="text-xs">Create your first workspace to get started</p>
            </div>
          ) : (
            workspaces?.map((ws, i) => (
              <Link key={ws.id} href={`/org/${orgSlug}/workspace/${ws.slug}`} className="block">
                <WorkspaceRow
                  name={ws.name}
                  spaceCount={ws.spaces?.length ?? 0}
                  index={i}
                />
              </Link>
            ))
          )}
        </div>
      </div>

      {/* ── Quick Links ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded p-5">
        <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: <CheckCircle2 size={16} />, label: "Tasks", href: `/org/${orgSlug}` },
            { icon: <TrendingUp size={16} />, label: "Sprints", href: `/org/${orgSlug}` },
            { icon: <Timer size={16} />, label: "Time Tracking", href: `/org/${orgSlug}` },
            { icon: <ClipboardList size={16} />, label: "Audit Logs", href: `/org/${orgSlug}` },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded border border-[var(--border)] hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5 transition-colors group"
            >
              <span className="text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors">
                {item.icon}
              </span>
              <span className="text-sm text-[var(--foreground)]">{item.label}</span>
              <ArrowRight size={12} className="ml-auto text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      </div>

      {/* ── Team Section ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-[var(--muted-foreground)]" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Team ({memberCount})
            </h2>
          </div>
          <Link
            href={`/org/${orgSlug}/members`}
            className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1"
          >
            Manage <ArrowRight size={11} />
          </Link>
        </div>

        {membersLoading ? (
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-[var(--muted)] animate-pulse" />
                <div className="h-3 w-14 rounded bg-[var(--muted)] animate-pulse" />
              </div>
            ))}
          </div>
        ) : memberCount === 0 ? (
          <div className="flex flex-col items-center py-6 gap-2 text-[var(--muted-foreground)]">
            <Users size={28} className="opacity-20" />
            <p className="text-xs">No members yet</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-5">
            {members?.map((m) => {
              const name = m.user.name ?? m.user.email;
              const color = getAvatarColor(m.user.id);
              return (
                <div key={m.id} className="flex flex-col items-center gap-1.5">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: color }}
                  >
                    {getInitial(m.user.name, m.user.email)}
                  </div>
                  <span className="text-[11px] text-[var(--muted-foreground)] max-w-[60px] truncate text-center">
                    {name.split(" ")[0]}
                  </span>
                </div>
              );
            })}
            <Link
              href={`/org/${orgSlug}/members`}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">
                <Plus size={16} />
              </div>
              <span className="text-[11px] text-[var(--muted-foreground)]">Invite</span>
            </Link>
          </div>
        )}
      </div>

      {/* ── Create Workspace Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-[var(--primary)]" />
              <h2 className="text-base font-semibold text-[var(--foreground)]">Create workspace</h2>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createWorkspace.mutate({ orgId, name: wsName, slug: wsSlug });
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]">Name</label>
                <input
                  value={wsName}
                  onChange={(e) => {
                    setWsName(e.target.value);
                    setWsSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-|-$/g, "")
                    );
                  }}
                  placeholder="Product & Engineering"
                  required
                  className="w-full px-3 py-2 rounded border border-[var(--input)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]">Slug</label>
                <input
                  value={wsSlug}
                  onChange={(e) => setWsSlug(e.target.value)}
                  required
                  pattern="^[a-z0-9-]+$"
                  className="w-full px-3 py-2 rounded border border-[var(--input)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)] font-mono text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm rounded border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createWorkspace.isPending}
                  className="px-4 py-2 text-sm rounded bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {createWorkspace.isPending ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
