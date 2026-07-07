import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Play, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { usePlatform } from "@/lib/mock/store";
import { toast } from "sonner";

export const Route = createFileRoute("/pipelines/")({
  head: () => ({ meta: [{ title: "Pipelines — NexusFlow" }] }),
  component: PipelinesIndex,
});

function PipelinesIndex() {
  const pipelines = usePlatform((s) => s.pipelines);
  const triggerRun = usePlatform((s) => s.triggerRun);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const filtered = pipelines.filter((p) =>
    (filter === "all" || p.status === filter || p.mode === filter) &&
    (p.name.toLowerCase().includes(q.toLowerCase()) || p.tags.some((t) => t.includes(q.toLowerCase())))
  );

  const chips = ["all", "healthy", "running", "failed", "degraded", "batch", "streaming", "cdc"];

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-6 lg:p-8">
      <PageHeader
        eyebrow="Orchestration"
        title="Pipelines"
        description="Batch, streaming, and CDC pipelines across every environment."
        actions={<Button asChild><Link to="/pipelines/new"><Plus className="h-4 w-4" />New pipeline</Link></Button>}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pipelines or tags…" className="glass pl-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <button key={c} onClick={() => setFilter(c)}
              className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition ${
                filter === c ? "border-primary bg-primary/20 text-primary" : "border-border/60 bg-background/40 text-muted-foreground hover:border-primary/40"
              }`}>{c}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p) => (
          <Card key={p.id} className="glass group border-border/60 transition hover:border-primary/50 hover:shadow-[var(--shadow-elevated)]">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <Link to="/pipelines/$id" params={{ id: p.id }} className="min-w-0 flex-1">
                  <h3 className="truncate font-mono text-sm font-semibold group-hover:text-primary">{p.name}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                </Link>
                <StatusPill kind="pipeline" value={p.status} pulse={p.status === "running"} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground">Rows / day</div>
                  <div className="mt-0.5 font-mono font-semibold">{(p.rowsProcessedToday / 1000).toFixed(0)}k</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Quality</div>
                  <div className="mt-0.5 font-mono font-semibold">{p.qualityScore}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Cost / day</div>
                  <div className="mt-0.5 font-mono font-semibold">${p.costUsdToday.toFixed(2)}</div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="text-[10px] uppercase">{p.mode}</Badge>
                <Badge variant="outline" className="text-[10px]">{p.env}</Badge>
                {p.tags.slice(0, 3).map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 text-xs text-muted-foreground">
                <span>Last run {formatDistanceToNow(new Date(p.lastRunAt), { addSuffix: true })}</span>
                <Button variant="ghost" size="sm" onClick={(e) => {
                  e.preventDefault();
                  triggerRun(p.id);
                  toast.success(`Triggered ${p.name}`, { description: "Run queued and executing…" });
                }}>
                  <Play className="h-3 w-3" /> Run
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full glass rounded-2xl p-12 text-center text-sm text-muted-foreground">
            No pipelines match your filter.
          </div>
        )}
      </div>
    </div>
  );
}
