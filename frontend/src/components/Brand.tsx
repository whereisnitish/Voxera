import clsx from "clsx";

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "relative flex h-8 w-8 items-center justify-center rounded-lg",
        "bg-gradient-to-br from-accent-400 to-accent-600 shadow-glow",
        className,
      )}
    >
      <span className="absolute inset-[2px] rounded-[7px] bg-bg/80" />
      <span className="relative h-1.5 w-1.5 rounded-full bg-accent-400 shadow-[0_0_12px_2px_rgba(124,92,255,0.7)]" />
    </div>
  );
}

export function BrandLockup() {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark />
      <div>
        <div className="text-sm font-semibold tracking-tight">Voxera</div>
        <div className="text-[11px] text-muted-2 -mt-0.5">Voice AI platform</div>
      </div>
    </div>
  );
}
