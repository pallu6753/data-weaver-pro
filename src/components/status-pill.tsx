import type { PipelineStatus, RunStatus, AlertSeverity } from "@/lib/mock/types";
import { cn } from "@/lib/utils";

const pipeline: Record<PipelineStatus, string> = {
  healthy: "bg-[color:var(--success)]/15 text-[color:var(--success)] border-[color:var(--success)]/30",
  running: "bg-[color:var(--info)]/15 text-[color:var(--info)] border-[color:var(--info)]/30",
  failed: "bg-[color:var(--destructive)]/15 text-[color:var(--destructive)] border-[color:var(--destructive)]/30",
  degraded: "bg-[color:var(--warning)]/15 text-[color:var(--warning)] border-[color:var(--warning)]/30",
  paused: "bg-muted text-muted-foreground border-border",
  scheduled: "bg-primary/15 text-primary border-primary/30",
};

const run: Record<RunStatus, string> = {
  success: "bg-[color:var(--success)]/15 text-[color:var(--success)] border-[color:var(--success)]/30",
  failed: "bg-[color:var(--destructive)]/15 text-[color:var(--destructive)] border-[color:var(--destructive)]/30",
  running: "bg-[color:var(--info)]/15 text-[color:var(--info)] border-[color:var(--info)]/30",
  queued: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const alert: Record<AlertSeverity, string> = {
  critical: "bg-[color:var(--destructive)]/20 text-[color:var(--destructive)] border-[color:var(--destructive)]/40",
  high: "bg-[color:var(--warning)]/20 text-[color:var(--warning)] border-[color:var(--warning)]/40",
  medium: "bg-[color:var(--info)]/20 text-[color:var(--info)] border-[color:var(--info)]/40",
  low: "bg-muted text-muted-foreground border-border",
  info: "bg-primary/15 text-primary border-primary/30",
};

export function StatusPill({
  kind, value, pulse = false,
}: {
  kind: "pipeline" | "run" | "alert";
  value: string;
  pulse?: boolean;
}) {
  const map = kind === "pipeline" ? pipeline : kind === "run" ? run : alert;
  const cls = (map as Record<string, string>)[value] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
      cls,
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full bg-current", pulse && "animate-pulse-dot")} />
      {value}
    </span>
  );
}
