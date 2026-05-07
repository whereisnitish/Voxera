import type { ReactNode } from "react";

export function Empty({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="card p-12 text-center animate-fade-in">
      {icon && (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-2 text-muted">
          {icon}
        </div>
      )}
      <div className="text-sm font-medium text-text">{title}</div>
      {hint && <div className="text-xs text-muted-2 mt-1.5">{hint}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
