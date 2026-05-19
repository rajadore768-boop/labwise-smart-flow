import { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
  badge,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  badge?: string;
}) {
  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between px-8">
      <div>
        <h1 className="font-display text-xl">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {badge && (
          <span className="px-2 py-1 bg-accent/10 text-accent rounded text-[10px] font-mono uppercase">
            {badge}
          </span>
        )}
        {actions}
      </div>
    </header>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent,
  bar,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "default" | "good" | "warn";
  bar?: number;
}) {
  return (
    <div className="bg-card p-5 border border-border rounded-xl ring-1 ring-black/5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-display mt-1">{value}</p>
      {bar !== undefined ? (
        <div className="mt-4 h-1 w-full bg-surface-muted rounded-full overflow-hidden">
          <div
            className={`h-full ${accent === "warn" ? "bg-warning" : "bg-accent"}`}
            style={{ width: `${Math.min(100, Math.max(0, bar))}%` }}
          />
        </div>
      ) : (
        hint && (
          <div
            className={`mt-4 flex items-center gap-2 text-[10px] font-mono ${
              accent === "good" ? "text-accent" : accent === "warn" ? "text-warning" : "text-muted-foreground"
            }`}
          >
            {accent === "good" && <span className="size-1.5 rounded-full bg-accent" />}
            {hint}
          </div>
        )
      )}
    </div>
  );
}
