import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Download } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePlatform } from "@/lib/mock/store";

export const Route = createFileRoute("/logs")({
  head: () => ({ meta: [{ title: "Logs — NexusFlow" }] }),
  component: LogsPage,
});

function LogsPage() {
  const logs = usePlatform((s) => s.logs);
  const pipelines = usePlatform((s) => s.pipelines);
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("all");

  const filtered = logs
    .filter((l) => (level === "all" || l.level === level) && l.message.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-6 lg:p-8">
      <PageHeader
        eyebrow="Observability"
        title="Execution Logs"
        description="Structured logs from every pipeline run. Filter by level, node, or pipeline."
        actions={<Button variant="outline"><Download className="h-4 w-4" />Export</Button>}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search log lines…" className="glass pl-9 font-mono" />
        </div>
        <div className="flex gap-1.5">
          {["all", "info", "warn", "error", "debug"].map((l) => (
            <button key={l} onClick={() => setLevel(l)}
              className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition ${
                level === l ? "border-primary bg-primary/20 text-primary" : "border-border/60 bg-background/40 text-muted-foreground hover:border-primary/40"
              }`}>{l}</button>
          ))}
        </div>
      </div>

      <Card className="glass border-border/60">
        <CardContent className="p-0">
          <div className="max-h-[calc(100dvh-260px)] overflow-auto font-mono text-xs">
            {filtered.map((l) => {
              const p = pipelines.find((x) => x.id === l.pipelineId);
              return (
                <div key={l.id} className="flex gap-3 border-b border-border/20 px-4 py-2 hover:bg-background/40">
                  <span className="w-40 shrink-0 text-muted-foreground">{new Date(l.ts).toLocaleString()}</span>
                  <span className={`w-14 shrink-0 font-semibold uppercase ${
                    l.level === "error" ? "text-[color:var(--destructive)]" :
                    l.level === "warn" ? "text-[color:var(--warning)]" :
                    l.level === "debug" ? "text-muted-foreground" : "text-[color:var(--info)]"
                  }`}>{l.level}</span>
                  <span className="w-56 shrink-0 truncate text-primary">{p?.name ?? l.pipelineId}</span>
                  {l.node && <span className="w-32 shrink-0 truncate text-accent">{l.node}</span>}
                  <span className="flex-1">{l.message}</span>
                </div>
              );
            })}
            {filtered.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No matching log lines.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
