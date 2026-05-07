import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  PhoneOutgoing,
  PhoneIncoming,
  X,
  AlertCircle,
  PhoneCall as PhoneCallIcon,
} from "lucide-react";

import { api, ApiError } from "@/lib/api";
import { formatCost, formatDuration, formatRelative } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Empty } from "@/components/Empty";
import { Badge, Dot } from "@/components/Badge";
import { Skeleton } from "@/components/Skeleton";
import type { Agent, Call, CallStatus } from "@/types";

const STATUS_VARIANT: Record<CallStatus, "neutral" | "accent" | "success" | "warning" | "danger"> = {
  initiated: "neutral",
  ringing: "accent",
  in_progress: "warning",
  completed: "success",
  failed: "danger",
};

export function CallsPage() {
  const [showOutbound, setShowOutbound] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["calls"],
    queryFn: () => api<Call[]>("/calls"),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Activity"
        title="Calls"
        description="Inbound and outbound voice activity. Click any call to see its transcript."
        action={
          <button
            onClick={() => setShowOutbound((s) => !s)}
            className={showOutbound ? "btn" : "btn btn-primary"}
          >
            {showOutbound ? (
              <>
                <X className="h-4 w-4" /> Cancel
              </>
            ) : (
              <>
                <PhoneOutgoing className="h-4 w-4" /> Place outbound call
              </>
            )}
          </button>
        }
      />

      {showOutbound && <OutboundForm onDone={() => setShowOutbound(false)} />}

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !data || data.length === 0 ? (
        <Empty
          icon={<PhoneCallIcon className="h-5 w-5" />}
          title="No calls yet."
          hint="Inbound Twilio calls and outbound dials will appear here."
        />
      ) : (
        <div className="card overflow-hidden animate-fade-in">
          <table className="w-full text-sm">
            <thead className="bg-surface-2/50 border-b border-border">
              <tr className="text-muted-2">
                <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">
                  Direction
                </th>
                <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">
                  From → To
                </th>
                <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">
                  Duration
                </th>
                <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">
                  Cost
                </th>
                <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">
                  When
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr
                  key={c.id}
                  className="border-t border-border hover:bg-surface-2/40 transition-colors cursor-pointer"
                  onClick={() => (window.location.href = `/calls/${c.id}`)}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      {c.direction === "inbound" ? (
                        <PhoneIncoming className="h-4 w-4 text-accent-400" />
                      ) : (
                        <PhoneOutgoing className="h-4 w-4 text-success" />
                      )}
                      <span className="capitalize text-muted">{c.direction}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <Link
                      to={`/calls/${c.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-mono text-text hover:text-accent-400 transition-colors"
                    >
                      {c.from_number ?? "?"}{" "}
                      <span className="text-muted-2">→</span>{" "}
                      {c.to_number ?? "?"}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={STATUS_VARIANT[c.status]}>
                      <Dot variant={STATUS_VARIANT[c.status]} />
                      {c.status.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-muted">
                    {formatDuration(c.duration_seconds)}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-muted">
                    {formatCost(c.cost_usd)}
                  </td>
                  <td className="px-5 py-3.5 text-muted-2">
                    {formatRelative(c.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OutboundForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [agentId, setAgentId] = useState("");
  const [to, setTo] = useState("");
  const [from, setFrom] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: agents } = useQuery({
    queryKey: ["agents"],
    queryFn: () => api<Agent[]>("/agents"),
  });

  const place = useMutation({
    mutationFn: () =>
      api<Call>("/calls/outbound", {
        method: "POST",
        body: { agent_id: agentId, to, from_: from },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calls"] });
      onDone();
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : "Failed to place call"),
  });

  return (
    <form
      className="card p-6 mb-6 animate-slide-up"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        place.mutate();
      }}
    >
      <div className="flex items-center gap-2 mb-5">
        <div className="h-8 w-8 rounded-lg bg-success/10 border border-success/20 flex items-center justify-center">
          <PhoneOutgoing className="h-4 w-4 text-success" />
        </div>
        <h2 className="font-medium">Place outbound call</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="label mb-1.5">Agent</label>
          <select
            className="input"
            required
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
          >
            <option value="">Select…</option>
            {agents?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label mb-1.5">From</label>
          <input
            className="input"
            required
            placeholder="+15555550101"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="label mb-1.5">To</label>
          <input
            className="input"
            required
            placeholder="+15555550199"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger mt-4">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-border">
        <button type="button" onClick={onDone} className="btn">
          Cancel
        </button>
        <button type="submit" disabled={place.isPending} className="btn btn-primary">
          {place.isPending ? "Dialing…" : "Place call"}
        </button>
      </div>
    </form>
  );
}
