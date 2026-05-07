import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Trash2, Pencil, Bot, Mic, Volume2, Sparkles } from "lucide-react";

import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Empty } from "@/components/Empty";
import { Badge, Dot } from "@/components/Badge";
import { Skeleton } from "@/components/Skeleton";
import type { Agent } from "@/types";

export function AgentsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: () => api<Agent[]>("/agents"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/agents/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agents"] }),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Build"
        title="Agents"
        description="Each agent has its own prompt, voice, and provider mix. Wire them to a phone number or call them out."
        action={
          <button onClick={() => navigate("/agents/new")} className="btn btn-primary">
            <Plus className="h-4 w-4" /> New agent
          </button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      ) : !data || data.length === 0 ? (
        <Empty
          icon={<Bot className="h-5 w-5" />}
          title="No agents yet."
          hint="Create your first voice agent to get started."
          action={
            <button onClick={() => navigate("/agents/new")} className="btn btn-primary">
              <Plus className="h-4 w-4" /> New agent
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((a) => (
            <div key={a.id} className="card card-hover p-5 group animate-fade-in">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-accent-500/20 to-accent-600/10 border border-accent/20 flex items-center justify-center shrink-0">
                    <Bot className="h-5 w-5 text-accent-400" />
                  </div>
                  <div className="min-w-0">
                    <Link
                      to={`/agents/${a.id}`}
                      className="font-medium text-text hover:text-accent-400 transition-colors truncate block"
                    >
                      {a.name}
                    </Link>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Badge variant={a.is_active ? "success" : "neutral"}>
                        <Dot variant={a.is_active ? "success" : "neutral"} />
                        {a.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="neutral">{a.language}</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted mt-4 line-clamp-2 leading-relaxed">
                {a.system_prompt}
              </p>

              <div className="flex flex-wrap items-center gap-1.5 mt-4">
                <ProviderChip icon={Mic} label={a.stt_provider} />
                <ProviderChip icon={Volume2} label={a.tts_provider} />
                <ProviderChip icon={Sparkles} label={a.llm_model} />
              </div>

              <div className="flex gap-2 mt-5 pt-4 border-t border-border">
                <Link to={`/agents/${a.id}`} className="btn btn-sm flex-1">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Link>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => {
                    if (confirm(`Delete agent "${a.name}"?`)) remove.mutate(a.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProviderChip({
  icon: Icon,
  label,
}: {
  icon: typeof Mic;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2 py-1 text-[11px] text-muted">
      <Icon className="h-3 w-3" />
      <span className="font-mono">{label}</span>
    </span>
  );
}
