import type { ReactNode } from "react";
import { Mic, Phone, Sparkles } from "lucide-react";
import { BrandLockup } from "./Brand";
import { ThemeToggle } from "./ThemeToggle";

const features = [
  {
    icon: Phone,
    title: "Plug in any telephony provider",
    desc: "Twilio today, more tomorrow — provider abstractions are one-line changes.",
  },
  {
    icon: Mic,
    title: "Streaming STT & TTS",
    desc: "Deepgram listens, ElevenLabs speaks — token-by-token, with barge-in.",
  },
  {
    icon: Sparkles,
    title: "Bring your own LLM key",
    desc: "Per-user encrypted keys, dynamic loading at call time.",
  },
];

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full grid lg:grid-cols-2 relative">
      <div className="absolute top-4 right-4 w-32 z-20">
        <ThemeToggle />
      </div>

      <div className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="mb-8 lg:hidden">
            <BrandLockup />
          </div>
          {children}
        </div>
      </div>

      <div className="hidden lg:flex relative items-center justify-center border-l border-border overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent" />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-success/10 blur-3xl" />

        <div className="relative z-10 max-w-md px-12">
          <div className="mb-10">
            <BrandLockup />
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-balance leading-tight">
            Production-grade voice agents.
            <br />
            <span className="bg-gradient-to-r from-accent-400 to-accent-600 bg-clip-text text-transparent">
              Modular. Streaming. Yours.
            </span>
          </h2>
          <p className="text-sm text-muted mt-3 leading-relaxed">
            Build voice AI products on top of best-in-class providers — without the glue code.
          </p>

          <ul className="mt-10 space-y-5">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <li key={f.title} className="flex gap-4">
                  <div className="shrink-0 mt-0.5 h-9 w-9 rounded-lg bg-surface-2 border border-border flex items-center justify-center">
                    <Icon className="h-4 w-4 text-accent-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-text">{f.title}</div>
                    <div className="text-xs text-muted mt-0.5 leading-relaxed">{f.desc}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
