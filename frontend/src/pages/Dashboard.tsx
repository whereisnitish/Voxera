import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Users,
  KeyRound,
  PhoneCall,
  Clock,
  ArrowUpRight,
  PhoneIncoming,
  PhoneOutgoing,
  Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { api } from "@/lib/api";
import { formatDuration, formatRelative } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/Skeleton";
import { Badge, Dot } from "@/components/Badge";
import type { Agent, ApiKey, Call, CallStatus } from "@/types";

const STATUS_VARIANT: Record<CallStatus, "neutral" | "accent" | "success" | "warning" | "danger"> = {
  initiated: "neutral",
  ringing: "accent",
  in_progress: "warning",
  completed: "success",
  failed: "danger",
};

export function DashboardPage() {
  const agents = useQuery({ queryKey: ["agents"], queryFn: () => api<Agent[]>("/agents") });
  const keys = useQuery({ queryKey: ["api-keys"], queryFn: () => api<ApiKey[]>("/api-keys") });
  const calls = useQuery({
    queryKey: ["calls"],
    queryFn: () => api<Call[]>("/calls?limit=10"),
  });

  const totalDuration =
    calls.data?.reduce((acc, c) => acc + (c.duration_seconds ?? 0), 0) ?? 0;
  const totalCost = calls.data?.reduce((acc, c) => acc + (c.cost_usd ?? 0), 0) ?? 0;

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="A snapshot of your voice agents, keys, and recent activity."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat
          icon={Users}
          label="Agents"
          value={agents.data?.length ?? null}
          loading={agents.isLoading}
          href="/agents"
        />
        <Stat
          icon={KeyRound}
          label="API keys"
          value={keys.data?.length ?? null}
          loading={keys.isLoading}
          href="/api-keys"
        />
        <Stat
          icon={PhoneCall}
          label="Recent calls"
          value={calls.data?.length ?? null}
          loading={calls.isLoading}
          href="/calls"
        />
        <Stat
          icon={Clock}
          label="Total minutes"
          value={(totalDuration / 60).toFixed(1)}
          loading={calls.isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <div className="section-title">Recent calls</div>
              <div className="text-xs text-muted-2 mt-0.5">Latest 5 calls across all agents.</div>
            </div>
            <Link
              to="/calls"
              className="text-xs text-accent-400 hover:text-accent-500 font-medium inline-flex items-center gap-1"
            >
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {calls.isLoading ? (
            <div className="p-5 space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : calls.data && calls.data.length > 0 ? (
            <ul className="divide-y divide-border">
              {calls.data.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/calls/${c.id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-surface-2 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center">
                        {c.direction === "inbound" ? (
                          <PhoneIncoming className="h-4 w-4 text-accent-400" />
                        ) : (
                          <PhoneOutgoing className="h-4 w-4 text-success" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm">
                          {c.from_number ?? "Unknown"}{" "}
                          <span className="text-muted-2">→</span>{" "}
                          {c.to_number ?? "Unknown"}
                        </div>
                        <div className="text-xs text-muted-2 mt-0.5">
                          {formatRelative(c.created_at)} ·{" "}
                          {formatDuration(c.duration_seconds)}
                        </div>
                      </div>
                    </div>
                    <Badge variant={STATUS_VARIANT[c.status]}>
                      <Dot variant={STATUS_VARIANT[c.status]} />
                      {c.status.replace("_", " ")}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-10 text-center">
              <div className="text-sm text-muted">No calls yet.</div>
              <div className="text-xs text-muted-2 mt-1">
                Wire up Twilio or place an outbound call to see activity here.
              </div>
            </div>
          )}
        </div>

        <div className="card p-5 flex flex-col">
          <div className="section-title">Spend</div>
          <div className="text-xs text-muted-2 mt-0.5">Across recent calls.</div>
          <div className="mt-6 text-4xl font-semibold tracking-tight">
            ${totalCost.toFixed(4)}
          </div>
          <div className="text-xs text-muted-2 mt-2">
            From {calls.data?.length ?? 0} call{calls.data?.length === 1 ? "" : "s"}.
          </div>

          <div className="divider my-5" />

          <div className="text-xs text-muted-2 uppercase tracking-wider mb-3">
            Quick actions
          </div>
          <div className="space-y-2">
            <Link to="/agents/new" className="btn btn-ghost w-full justify-start">
              <Plus className="h-4 w-4" /> New agent
            </Link>
            <Link to="/api-keys" className="btn btn-ghost w-full justify-start">
              <KeyRound className="h-4 w-4" /> Add API key
            </Link>
            <Link to="/calls" className="btn btn-ghost w-full justify-start">
              <PhoneOutgoing className="h-4 w-4" /> Place outbound call
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  href,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number | null;
  href?: string;
  loading?: boolean;
}) {
  const inner = (
    <div className="card card-hover p-5 h-full relative overflow-hidden group">
      <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-accent/5 blur-2xl group-hover:bg-accent/10 transition-colors" />
      <div className="flex items-center justify-between mb-4">
        <div className="h-9 w-9 rounded-lg bg-surface-2 border border-border flex items-center justify-center">
          <Icon className="h-4 w-4 text-accent-400" />
        </div>
        {href && (
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-2 group-hover:text-text transition-colors" />
        )}
      </div>
      <div className="label">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold tracking-tight">
        {loading ? <Skeleton className="h-7 w-16" /> : value ?? "—"}
      </div>
    </div>
  );
  return href ? (
    <Link to={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}
