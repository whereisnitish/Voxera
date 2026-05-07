import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, AlertCircle, Bot, Mic, Volume2, Sparkles, Phone } from "lucide-react";
import type { ReactNode } from "react";

import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import type { Agent } from "@/types";

interface FormState {
  name: string;
  system_prompt: string;
  greeting: string;
  voice_id: string;
  language: string;
  llm_model: string;
  stt_provider: string;
  tts_provider: string;
  telephony_provider: string;
}

const empty: FormState = {
  name: "",
  system_prompt: "",
  greeting: "",
  voice_id: "",
  language: "en",
  llm_model: "gpt-4o-mini",
  stt_provider: "deepgram",
  tts_provider: "elevenlabs",
  telephony_provider: "twilio",
};

export function AgentFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<FormState>(empty);
  const [error, setError] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["agent", id],
    queryFn: () => api<Agent>(`/agents/${id}`),
    enabled: isEdit,
  });

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name,
        system_prompt: data.system_prompt,
        greeting: data.greeting ?? "",
        voice_id: data.voice_id ?? "",
        language: data.language,
        llm_model: data.llm_model,
        stt_provider: data.stt_provider,
        tts_provider: data.tts_provider,
        telephony_provider: data.telephony_provider,
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        greeting: form.greeting || null,
        voice_id: form.voice_id || null,
      };
      return isEdit
        ? api<Agent>(`/agents/${id}`, { method: "PATCH", body: payload })
        : api<Agent>("/agents", { method: "POST", body: payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents"] });
      qc.invalidateQueries({ queryKey: ["agent", id] });
      navigate("/agents");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Save failed"),
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div>
      <PageHeader
        eyebrow={isEdit ? "Edit agent" : "New agent"}
        title={isEdit ? form.name || "Edit agent" : "Build a voice agent"}
        description="Configure how this agent talks and which providers it uses at call time."
        action={
          <button onClick={() => navigate("/agents")} className="btn">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        }
      />

      <form
        className="space-y-5 animate-fade-in"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          save.mutate();
        }}
      >
        <Section icon={<Bot className="h-4 w-4" />} title="Identity" description="Name and personality.">
          <Field label="Name">
            <input
              className="input"
              required
              placeholder="e.g. Receptionist"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </Field>
          <Field
            label="System prompt"
            help="Defines the agent's persona and rules. Keep it tight — speech generation works best with concise instructions."
            full
          >
            <textarea
              className="input min-h-32 font-mono text-xs leading-relaxed"
              required
              placeholder="You are a friendly receptionist for Acme. Keep replies under two sentences."
              value={form.system_prompt}
              onChange={(e) => update("system_prompt", e.target.value)}
            />
          </Field>
          <Field
            label="Greeting"
            help="Spoken automatically when the call connects."
            full
          >
            <input
              className="input"
              placeholder="Hi, you have reached Acme. How can I help?"
              value={form.greeting}
              onChange={(e) => update("greeting", e.target.value)}
            />
          </Field>
        </Section>

        <Section icon={<Volume2 className="h-4 w-4" />} title="Voice" description="Pick a voice and language for TTS.">
          <Field label="Voice ID" help="ElevenLabs voice id.">
            <input
              className="input font-mono text-xs"
              placeholder="EXAVITQu4vr4xnSDxMaL"
              value={form.voice_id}
              onChange={(e) => update("voice_id", e.target.value)}
            />
          </Field>
          <Field label="Language">
            <input
              className="input"
              placeholder="en"
              value={form.language}
              onChange={(e) => update("language", e.target.value)}
            />
          </Field>
        </Section>

        <Section
          icon={<Sparkles className="h-4 w-4" />}
          title="Providers"
          description="Pick which provider each capability uses. Per-user keys are loaded at call time."
        >
          <Field label="LLM model">
            <input
              className="input font-mono text-xs"
              value={form.llm_model}
              onChange={(e) => update("llm_model", e.target.value)}
            />
          </Field>
          <Field label="STT provider" iconLeft={<Mic className="h-4 w-4" />}>
            <select
              className="input"
              value={form.stt_provider}
              onChange={(e) => update("stt_provider", e.target.value)}
            >
              <option value="deepgram">deepgram</option>
            </select>
          </Field>
          <Field label="TTS provider" iconLeft={<Volume2 className="h-4 w-4" />}>
            <select
              className="input"
              value={form.tts_provider}
              onChange={(e) => update("tts_provider", e.target.value)}
            >
              <option value="elevenlabs">elevenlabs</option>
            </select>
          </Field>
          <Field label="Telephony" iconLeft={<Phone className="h-4 w-4" />}>
            <select
              className="input"
              value={form.telephony_provider}
              onChange={(e) => update("telephony_provider", e.target.value)}
            >
              <option value="twilio">twilio</option>
            </select>
          </Field>
        </Section>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 sticky bottom-0 -mx-10 px-10 py-4 bg-bg/80 backdrop-blur-sm border-t border-border">
          <button type="button" onClick={() => navigate("/agents")} className="btn">
            Cancel
          </button>
          <button type="submit" disabled={save.isPending} className="btn btn-primary">
            {save.isPending
              ? "Saving…"
              : isEdit
                ? "Save changes"
                : "Create agent"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="card p-6">
      <div className="flex items-start gap-3 mb-5 pb-4 border-b border-border">
        <div className="h-8 w-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent-400 shrink-0">
          {icon}
        </div>
        <div>
          <div className="section-title">{title}</div>
          <div className="text-xs text-muted-2 mt-0.5">{description}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  help,
  full,
  iconLeft,
  children,
}: {
  label: string;
  help?: string;
  full?: boolean;
  iconLeft?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <label className="label mb-1.5 flex items-center gap-1.5">
        {iconLeft && <span className="text-muted-2">{iconLeft}</span>}
        {label}
      </label>
      {children}
      {help && <p className="field-help">{help}</p>}
    </div>
  );
}
