import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, KeyRound, AlertCircle, Lock, X } from "lucide-react";

import { api, ApiError } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Empty } from "@/components/Empty";
import { Badge } from "@/components/Badge";
import { Skeleton } from "@/components/Skeleton";
import type { ApiKey, ProviderKind } from "@/types";

const KIND_PROVIDERS: Record<ProviderKind, string[]> = {
  stt: ["deepgram"],
  tts: ["elevenlabs"],
  telephony: ["twilio"],
  llm: ["openai"],
};

const KIND_LABEL: Record<ProviderKind, string> = {
  stt: "Speech-to-text",
  tts: "Text-to-speech",
  telephony: "Telephony",
  llm: "LLM",
};

const KIND_VARIANT: Record<ProviderKind, "neutral" | "accent" | "success" | "warning"> = {
  stt: "accent",
  tts: "warning",
  telephony: "success",
  llm: "neutral",
};

export function ApiKeysPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => api<ApiKey[]>("/api-keys"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/api-keys/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys"] }),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Credentials"
        title="API Keys"
        description="Provider keys are encrypted at rest with Fernet and only decrypted in-memory at call time."
        action={
          <button
            onClick={() => setShowForm((s) => !s)}
            className={showForm ? "btn" : "btn btn-primary"}
          >
            {showForm ? (
              <>
                <X className="h-4 w-4" /> Cancel
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Add key
              </>
            )}
          </button>
        }
      />

      {showForm && <NewKeyForm onDone={() => setShowForm(false)} />}

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !data || data.length === 0 ? (
        <Empty
          icon={<KeyRound className="h-5 w-5" />}
          title="No API keys yet."
          hint="Add at least one key per provider you intend to use."
          action={
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              <Plus className="h-4 w-4" /> Add key
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden animate-fade-in">
          <table className="w-full text-sm">
            <thead className="bg-surface-2/50 border-b border-border">
              <tr className="text-muted-2">
                <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Kind</th>
                <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Provider</th>
                <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Label</th>
                <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wider">Added</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((k) => (
                <tr
                  key={k.id}
                  className="border-t border-border hover:bg-surface-2/40 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <Badge variant={KIND_VARIANT[k.kind]}>{KIND_LABEL[k.kind]}</Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5 text-muted-2" />
                      <span className="font-mono text-text">{k.provider}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted">{k.label ?? "—"}</td>
                  <td className="px-5 py-3.5 text-muted-2">
                    {formatRelative(k.created_at)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => {
                        if (confirm("Delete this key?")) remove.mutate(k.id);
                      }}
                      className="btn btn-sm btn-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
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

function NewKeyForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<ProviderKind>("stt");
  const [provider, setProvider] = useState("deepgram");
  const [apiKey, setApiKey] = useState("");
  const [label, setLabel] = useState("");
  const [accountSid, setAccountSid] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: (payload: unknown) =>
      api<ApiKey>("/api-keys", { method: "POST", body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      onDone();
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : "Failed to create key"),
  });

  return (
    <div className="card p-6 mb-6 animate-slide-up">
      <div className="flex items-center gap-2 mb-5">
        <div className="h-8 w-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
          <KeyRound className="h-4 w-4 text-accent-400" />
        </div>
        <h2 className="font-medium">Add API key</h2>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const payload: Record<string, unknown> = {
            kind,
            provider,
            api_key: apiKey,
            label: label || undefined,
          };
          if (provider === "twilio") payload.extra = { account_sid: accountSid };
          create.mutate(payload);
        }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <div>
          <label className="label mb-1.5">Kind</label>
          <select
            className="input"
            value={kind}
            onChange={(e) => {
              const k = e.target.value as ProviderKind;
              setKind(k);
              setProvider(KIND_PROVIDERS[k][0]);
            }}
          >
            <option value="stt">Speech-to-text</option>
            <option value="tts">Text-to-speech</option>
            <option value="telephony">Telephony</option>
            <option value="llm">LLM</option>
          </select>
        </div>
        <div>
          <label className="label mb-1.5">Provider</label>
          <select
            className="input"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            {KIND_PROVIDERS[kind].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label mb-1.5">API key</label>
          <input
            className="input"
            type="password"
            required
            placeholder="Paste your secret key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="field-help">
            Stored encrypted with Fernet. Never displayed again after saving.
          </p>
        </div>
        {provider === "twilio" && (
          <div className="sm:col-span-2">
            <label className="label mb-1.5">Twilio Account SID</label>
            <input
              className="input"
              required
              placeholder="ACxxxxxxxxxxxxxxxxxx"
              value={accountSid}
              onChange={(e) => setAccountSid(e.target.value)}
            />
          </div>
        )}
        <div className="sm:col-span-2">
          <label className="label mb-1.5">Label (optional)</label>
          <input
            className="input"
            placeholder="e.g. Production Deepgram"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>

        {error && (
          <div className="sm:col-span-2 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="sm:col-span-2 flex gap-2 justify-end pt-2">
          <button type="button" onClick={onDone} className="btn">
            Cancel
          </button>
          <button type="submit" disabled={create.isPending} className="btn btn-primary">
            {create.isPending ? "Saving…" : "Save key"}
          </button>
        </div>
      </form>
    </div>
  );
}
