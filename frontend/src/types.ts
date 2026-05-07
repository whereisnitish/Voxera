export type ProviderKind = "stt" | "tts" | "telephony" | "llm";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ApiKey {
  id: string;
  kind: ProviderKind;
  provider: string;
  label: string | null;
  extra: Record<string, unknown> | null;
  created_at: string;
}

export interface Agent {
  id: string;
  name: string;
  system_prompt: string;
  stt_provider: string;
  tts_provider: string;
  telephony_provider: string;
  llm_model: string;
  voice_id: string | null;
  language: string;
  greeting: string | null;
  settings: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CallDirection = "inbound" | "outbound";
export type CallStatus =
  | "initiated"
  | "ringing"
  | "in_progress"
  | "completed"
  | "failed";

export interface Call {
  id: string;
  agent_id: string;
  direction: CallDirection;
  status: CallStatus;
  external_call_id: string | null;
  from_number: string | null;
  to_number: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  cost_usd: number | null;
  created_at: string;
}

export type TranscriptRole = "user" | "agent" | "system";

export interface Transcript {
  id: string;
  role: TranscriptRole;
  text: string;
  sequence: number;
  is_final: boolean;
  timestamp_ms: number | null;
  created_at: string;
}
