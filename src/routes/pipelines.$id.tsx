import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft, Play, Pause, Settings, Database, Filter, GitMerge, Code2,
  FlaskConical, Sparkles, Bell, Boxes,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePlatform } from "@/lib/mock/store";
import { PipelineFlowGraph } from "@/components/pipeline-flow-graph";

export const Route = createFileRoute("/pipelines/$id")({
  head: ({ params }) => ({ meta: [{ title: `${params.id} — Pipeline — NexusFlow` }] }),
  component: PipelineDetail,
});

const iconFor = (type: string) => {
  const map: Record<string, any> = {
    source: Database, transform: Code2, quality: FlaskConical, join: GitMerge,
    sql: Code2, python: Code2, spark: Sparkles, destination: Boxes, notify: Bell,
    filter: Filter,
  };
  return map[type] ?? Code2;
};

function PipelineDetail() {
  const { id } = Route.useParams();
  // Selectors must return stable references: `s.runs.filter(...)` builds a new
  // array on every store read, which makes useSyncExternalStore re-render
  // forever ("Maximum update depth exceeded") and trips the error boundary.
  const pipeline = usePlatform((s) => s.pipelines.find((p) => p.id === id));
<<<<<<< HEAD
  const runs = usePlatform((s) => s.runs.filter((r) => r.pipelineId === id));
  const logs = usePlatform((s) => s.logs.filter((l) => l.pipelineId === id));
  const progress = usePlatform((s) => s.executionProgress[id]);
=======
  const allRuns = usePlatform((s) => s.runs);
  const allLogs = usePlatform((s) => s.logs);
>>>>>>> origin/main
  const triggerRun = usePlatform((s) => s.triggerRun);
  const updatePipeline = usePlatform((s) => s.updatePipeline);
  const hydrated = useHydrated();

  const runs = useMemo(() => allRuns.filter((r) => r.pipelineId === id), [allRuns, id]);
  const logs = useMemo(() => allLogs.filter((l) => l.pipelineId === id), [allLogs, id]);

  const [selected, setSelected] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

<<<<<<< HEAD
=======
  const nodes: Node[] = useMemo(() => (pipeline?.nodes ?? []).map((n) => ({
    id: n.id, position: n.position, data: { label: n.label, type: n.type }, type: "nexus",
  })), [pipeline]);
  const edges: Edge[] = useMemo(() => (pipeline?.edges ?? []).map((e) => ({
    id: e.id, source: e.source, target: e.target, animated: pipeline?.status === "running",
    style: { stroke: "oklch(0.68 0.20 265)", strokeWidth: 2 },
  })), [pipeline]);

  if (!pipeline) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-8">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/pipelines"><ArrowLeft className="h-4 w-4" /> All pipelines</Link>
        </Button>
        <Card className="glass border-border/60">
          <CardHeader><CardTitle className="text-base">Pipeline not found</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>No pipeline exists with id <span className="font-mono text-foreground">{id}</span>.</p>
            <p>It may have been created in a previous session — pipelines live in the in-memory platform store and reset on reload.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const runNow = async () => {
    setRunning(true);
    try {
      const res = executePipeline(pipeline.id);
      const label = `${res.rowsLoaded.toLocaleString()} rows loaded · quality ${res.qualityScore}%`;
      if (res.status === "failed") {
        toast.error(`Run failed — ${res.error ?? "no rows passed contract validation"}`, {
          description: `${res.validation.failed.toLocaleString()} of ${res.rowsRead.toLocaleString()} records rejected. See the Logs tab for per-stage detail.`,
        });
      } else if (res.status === "partial") {
        toast.warning(`Run completed with rejects — ${label}`, {
          description: `${res.validation.failed.toLocaleString()} records quarantined.`,
        });
      } else {
        toast.success(`Run succeeded — ${label}`);
      }
    } catch (err) {
      toast.error("Could not start the run", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setRunning(false);
    }
  };

>>>>>>> origin/main
  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-6 lg:p-8">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/pipelines"><ArrowLeft className="h-4 w-4" /> All pipelines</Link>
      </Button>

      <PageHeader
        eyebrow={pipeline.mode.toUpperCase()}
        title={pipeline.name}
        description={pipeline.description}
        actions={
          <>
            <StatusPill kind="pipeline" value={pipeline.status} pulse={pipeline.status === "running"} />
            <Button variant="outline" onClick={() => {
              updatePipeline(pipeline.id, { status: pipeline.status === "paused" ? "healthy" : "paused" });
              toast.success(pipeline.status === "paused" ? "Pipeline resumed" : "Pipeline paused");
            }}>
              {pipeline.status === "paused" ? <><Play className="h-4 w-4" />Resume</> : <><Pause className="h-4 w-4" />Pause</>}
            </Button>
            <Button disabled={pipeline.status === "running"} onClick={() => {
              void triggerRun(pipeline.id)
                .then(() => toast.success("Pipeline completed"))
                .catch((error: unknown) => toast.error("Pipeline failed", { description: error instanceof Error ? error.message : "Unexpected execution error" }));
            }}>
              <Play className="h-4 w-4" />Run now
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {[
          ["Owner", pipeline.owner],
          ["Env", pipeline.env],
          ["Schedule", pipeline.schedule],
          ["Avg Runtime", `${Math.round(pipeline.avgDurationSec / 60)}m ${pipeline.avgDurationSec % 60}s`],
          ["Success Rate", `${(pipeline.successRate * 100).toFixed(1)}%`],
          ["Destination", pipeline.destination.table],
        ].map(([k, v]) => (
          <div key={k} className="glass rounded-lg px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
            <div className="mt-0.5 truncate font-mono text-sm font-medium">{v}</div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="graph">
        <TabsList className="glass">
          <TabsTrigger value="graph">Graph</TabsTrigger>
          <TabsTrigger value="runs">Runs</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="graph" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <Card className="glass border-border/60">
              <CardContent className="p-2">
                <PipelineFlowGraph pipeline={pipeline} progress={progress} onNodeSelect={setSelected} />
              </CardContent>
            </Card>

            <Card className="glass border-border/60">
              <CardHeader className="pb-2"><CardTitle className="text-sm">{selected ? "Node details" : "Node palette"}</CardTitle></CardHeader>
              <CardContent className="text-xs">
                {selected ? (() => {
                  const n = pipeline.nodes.find((x) => x.id === selected)!;
                  const Icon = iconFor(n.type);
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[image:var(--gradient-brand)]"><Icon className="h-4 w-4 text-white" /></div>
                        <div><div className="text-[10px] uppercase text-muted-foreground">{n.type}</div><div className="font-medium">{n.label}</div></div>
                      </div>
                      <div className="rounded-md border border-border/40 bg-background/40 p-3 font-mono">
                        <div className="text-muted-foreground">id: <span className="text-foreground">{n.id}</span></div>
                        <div className="text-muted-foreground">position: <span className="text-foreground">({n.position.x}, {n.position.y})</span></div>
                        {n.meta && Object.entries(n.meta).map(([k, v]) => (
                          <div key={k} className="text-muted-foreground">{k}: <span className="text-foreground">{v}</span></div>
                        ))}
                      </div>
                      <Button size="sm" variant="outline" className="w-full"><Settings className="h-3 w-3" />Edit</Button>
                    </div>
                  );
                })() : (
                  <div className="space-y-1.5">
                    {["source", "quality", "join", "sql", "python", "spark", "destination", "notify"].map((t) => {
                      const Icon = iconFor(t);
                      return (
                        <div key={t} className="flex items-center gap-2 rounded-md border border-border/40 bg-background/40 p-2 cursor-grab hover:border-primary/40">
                          <Icon className="h-3.5 w-3.5 text-primary" />
                          <span className="capitalize">{t}</span>
                        </div>
                      );
                    })}
                    <p className="pt-2 text-[11px] text-muted-foreground">Drag nodes onto the canvas or click one to configure.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="runs" className="mt-4">
          <Card className="glass border-border/60">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr><th className="p-3 text-left">Status</th><th className="p-3 text-left">Started</th><th className="p-3 text-left">Duration</th><th className="p-3 text-right">Rows</th><th className="p-3 text-right">Cost</th><th className="p-3 text-left">Trigger</th></tr>
                </thead>
                <tbody>
                  {runs.slice(0, 25).map((r) => (
                    <tr key={r.id} className="border-b border-border/30 hover:bg-background/40">
                      <td className="p-3"><StatusPill kind="run" value={r.status} pulse={r.status === "running"} /></td>
                      <td className="p-3 text-muted-foreground">{formatDistanceToNow(new Date(r.startedAt), { addSuffix: true })}</td>
                      <td className="p-3 font-mono">{r.durationSec}s</td>
                      <td className="p-3 text-right font-mono">{r.rows.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono">${r.costUsd.toFixed(2)}</td>
                      <td className="p-3"><Badge variant="outline">{r.triggeredBy}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card className="glass border-border/60">
            <CardContent className="p-0">
              <div className="max-h-[520px] overflow-auto font-mono text-xs">
                {logs.map((l) => (
                  <div key={l.id} className="flex gap-3 border-b border-border/20 px-4 py-2 hover:bg-background/40">
                    <span className="w-40 shrink-0 text-muted-foreground">{new Date(l.ts).toLocaleTimeString()}</span>
                    <span className={`w-14 shrink-0 font-semibold uppercase ${
                      l.level === "error" ? "text-[color:var(--destructive)]" :
                      l.level === "warn" ? "text-[color:var(--warning)]" :
                      l.level === "debug" ? "text-muted-foreground" : "text-[color:var(--info)]"
                    }`}>{l.level}</span>
                    {l.node && <span className="w-32 shrink-0 truncate text-primary">{l.node}</span>}
                    <span className="flex-1">{l.message}</span>
                  </div>
                ))}
                {logs.length === 0 && <div className="p-6 text-center text-muted-foreground">No log lines yet.</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          <Card className="glass border-border/60">
            <CardContent className="p-5">
              <pre className="overflow-auto rounded-md bg-background/60 p-4 font-mono text-xs">
{JSON.stringify({
  id: pipeline.id, name: pipeline.name, mode: pipeline.mode, env: pipeline.env,
  schedule: pipeline.schedule, sources: pipeline.sourceIds,
  destination: pipeline.destination, tags: pipeline.tags,
  nodes: pipeline.nodes.length, edges: pipeline.edges.length,
}, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
