import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  PhoneIncoming,
  PhoneOutgoing,
  Bot,
  User as UserIcon,
  Clock,
  DollarSign,
  Hash,
} from "lucide-react";
import clsx from "clsx";

import { api } from "@/lib/api";
import { formatCost, formatDuration, formatRelative } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Badge, Dot } from "@/components/Badge";
import type { Call, CallStatus, Transcript } from "@/types";

const STATUS_VARIANT: Record<CallStatus, "neutral" | "accent" | "success" | "warning" | "danger"> = {
  initiated: "neutral",
  ringing: "accent",
  in_progress: "warning",
  completed: "success",
  failed: "danger",
};

export function CallDetailPage() {
  const { id } = useParams();

  const call = useQuery({
    queryKey: ["call", id],
    queryFn: () => api<Call>(`/calls/${id}`),
    refetchInterval: (q) =>
      q.state.data?.status === "in_progress" || q.state.data?.status === "ringing"
        ? 3000
        : false,
  });

  const transcripts = useQuery({
    queryKey: ["call-transcripts", id],
    queryFn: () => api<Transcript[]>(`/calls/${id}/transcripts`),
    refetchInterval: () => {
      const status = call.data?.status;
      return status === "in_progress" || status === "ringing" ? 2000 : false;
    },
  });

  if (call.isLoading)
    return (
      <div className="text-sm text-muted">Loading…</div>
    );
  if (!call.data) return <div className="text-sm text-muted">Call not found.</div>;

  const c = call.data;
  const isLive = c.status === "in_progress" || c.status === "ringing";

  return (
    <div>
      <PageHeader
        eyebrow="Call detail"
        title={`${c.from_number ?? "Unknown"} → ${c.to_number ?? "Unknown"}`}
        description={`${c.direction === "inbound" ? "Inbound" : "Outbound"} call · ${formatRelative(c.created_at)}`}
        action={
          <Link to="/calls" className="btn">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        }
      />

      <div className="flex items-center gap-2 mb-6">
        {c.direction === "inbound" ? (
          <Badge variant="accent">
            <PhoneIncoming className="h-3 w-3" /> Inbound
          </Badge>
        ) : (
          <Badge variant="success">
            <PhoneOutgoing className="h-3 w-3" /> Outbound
          </Badge>
        )}
        <Badge variant={STATUS_VARIANT[c.status]}>
          <Dot variant={STATUS_VARIANT[c.status]} />
          {c.status.replace("_", " ")}
        </Badge>
        {isLive && (
          <span className="text-xs text-muted-2 inline-flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-warning" />
            </span>
            Live — auto-refreshing
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <Field icon={Hash} label="Call ID" value={c.id.slice(0, 8) + "…"} mono />
        <Field
          icon={Clock}
          label="Duration"
          value={formatDuration(c.duration_seconds)}
        />
        <Field icon={DollarSign} label="Cost" value={formatCost(c.cost_usd)} mono />
        <Field
          icon={c.direction === "inbound" ? PhoneIncoming : PhoneOutgoing}
          label="External ID"
          value={c.external_call_id ? c.external_call_id.slice(0, 12) + "…" : "—"}
          mono
        />
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <div className="section-title">Transcript</div>
            <div className="text-xs text-muted-2 mt-0.5">
              {transcripts.data?.length ?? 0} message
              {transcripts.data?.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>
        <div className="p-6">
          {!transcripts.data || transcripts.data.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">
              {isLive ? "Listening…" : "No transcript yet."}
            </p>
          ) : (
            <ul className="space-y-4">
              {transcripts.data.map((t) => (
                <Bubble key={t.id} t={t} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Bubble({ t }: { t: Transcript }) {
  const isAgent = t.role === "agent";
  const isUser = t.role === "user";

  return (
    <li
      className={clsx(
        "flex gap-3 animate-fade-in",
        isAgent ? "flex-row" : "flex-row-reverse",
      )}
    >
      <div
        className={clsx(
          "h-8 w-8 rounded-lg border flex items-center justify-center shrink-0 mt-1",
          isAgent
            ? "bg-accent/10 border-accent/30 text-accent-400"
            : isUser
              ? "bg-surface-2 border-border text-muted"
              : "bg-warning/10 border-warning/30 text-warning",
        )}
      >
        {isAgent ? <Bot className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
      </div>

      <div
        className={clsx(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm border leading-relaxed",
          isAgent
            ? "bg-accent/5 border-accent/20 rounded-tl-sm"
            : isUser
              ? "bg-surface-2 border-border rounded-tr-sm"
              : "bg-warning/10 border-warning/30",
        )}
      >
        <div className="text-[10px] uppercase tracking-wider text-muted-2 mb-1">
          {t.role}
        </div>
        {t.text}
      </div>
    </li>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-muted-2">
        <Icon className="h-3.5 w-3.5" />
        <div className="label">{label}</div>
      </div>
      <div className={clsx("text-sm mt-2 text-text", mono && "font-mono")}>{value}</div>
    </div>
  );
}
