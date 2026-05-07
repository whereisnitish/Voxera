import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
  eyebrow?: string;
}

export function PageHeader({ title, description, action, eyebrow }: Props) {
  return (
    <div className="flex items-start justify-between mb-8 animate-fade-in">
      <div>
        {eyebrow && (
          <div className="text-[11px] uppercase tracking-[0.14em] text-accent-400 font-medium mb-2">
            {eyebrow}
          </div>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-text">{title}</h1>
        {description && (
          <p className="text-sm text-muted mt-1.5 max-w-xl text-balance">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
