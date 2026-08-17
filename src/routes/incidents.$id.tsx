import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertOctagon, ArrowLeft, Bot, CheckCircle2, Clock, DollarSign, GitBranch,
  RotateCcw, Sparkles, Table2, User,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHydrated } from "@/hooks/use-hydrated";
import { usePlatform } from "@/lib/mock/store";
import { ordersContract } from "@/lib/engine/contracts";

export const Route = createFileRoute("/incidents/$id")({
  head: () => ({
    meta: [
      { title: "Incident investigation — NexusFlow" },
      { name: "description", content: "Root cause analysis, blast radius, failed-record evidence, and one-click replay recovery for a data incident." },
      { property: "og:title", content: "Incident investigation — NexusFlow" },
      { property: "og:description", content: "Root cause, blast radius, and replay recovery for a data incident." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IncidentDetailPage,
});

const statusTone: Record<string, string> = {
  open: "bg-[color:var(--destructive)]/15 text-[color:var(--destructive)] border-[color:var(--destructive)]/30",
  investigating: "bg-[color:var(--warning)]/15 text-[color:var(--warning)] border-[color:var(--warning)]/30",
  mitigating: "bg-[color:var(--info)]/15 text-[color:var(--info)] border-[color:var(--info)]/30",
  resolved: "bg-[color:var(--success)]/15 text-[color:var(--success)] border-[color:var(--success)]/30",
};

const actorIcon = { system: AlertOctagon, copilot: Bot, you: User } as const;

function IncidentDetailPage() {
  const { id } = Route.useParams();
  const incident = usePlatform((s) => s.incidents.find((i) => i.id === id));
  const pipelines = usePlatform((s) => s.pipelines);
  const executions = usePlatform((s) => s.executions);
  const applyCopilotFix = usePlatform((s) => s.applyCopilotFix);
  const replayFailedRecords = usePlatform((s) => s.replayFailedRecords);
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false);

  if (!incident) {
    return (
      <div className="mx-auto max-w-2xl p-12 text-center">
        <h1 className="font-display text-2xl font-semibold">Incident not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">It may have been resolved and cleared from this session.</p>
        <Button asChild className="mt-6"><Link to="/incidents">Back to incidents</Link></Button>
      </div>
    );
  }

  const pipeline = pipelines.find((p) => p.id === incident.pipelineId);
  const run = executions.find((e) => e.runId === incident.runId);

  const onFix = () => {
    setBusy(true);
    applyCopilotFix(incident.id);
    toast.success("Remediation applied", { description: "order_total → total_amount mapping saved as pipeline v2." });
    setBusy(false);
  };

  const onReplay = () => {
    setBusy(true);
    const { recovered, stillFailing } = replayFailedRecords(incident.id);
    if (stillFailing === 0) {
      toast.success(`Recovery complete — ${recovered.toLocaleString()} rows reprocessed`, {
        description: "gold.orders_enriched is fresh again and the pipeline is healthy.",
      });
    } else {
      toast.warning(`${recovered.toLocaleString()} recovered, ${stillFailing.toLocaleString()} still failing`);
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-6 lg:p-8">
      <Link to="/incidents" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All incidents
      </Link>

      <PageHeader
        eyebrow={`${incident.ref} · ${incident.severity} severity`}
        title={incident.title}
        description={incident.rootCause.summary}
        actions={
          <>
            <span className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${statusTone[incident.status]}`}>
              {incident.status}
            </span>
            {!incident.fixApplied && (
              <Button onClick={onFix} disabled={busy}>
                <Sparkles className="mr-2 h-4 w-4" />Apply Copilot fix
              </Button>
            )}
            {incident.fixApplied && incident.status !== "resolved" && (
              <Button onClick={onReplay} disabled={busy}>
                <RotateCcw className="mr-2 h-4 w-4" />Replay {incident.failedCount.toLocaleString()} failed records
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Rows blocked", value: incident.impact.blockedRows.toLocaleString(), icon: Table2 },
          { label: "Revenue at risk", value: `$${incident.impact.revenueAtRiskUsd.toLocaleString()}`, icon: DollarSign },
          { label: "SLA breach", value: `${incident.impact.slaBreachMin}m`, icon: Clock },
          { label: "Downstream assets", value: String(incident.impact.downstreamAssets.length), icon: GitBranch },
        ].map((k) => (
          <Card key={k.label} className="glass border-border/60">
            <CardContent className="flex items-center gap-3 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <k.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</p>
                <p className="font-display text-2xl font-semibold">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {incident.replay && (
        <Card className="glass border-[color:var(--success)]/40">
          <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm">
            <CheckCircle2 className="h-5 w-5 text-[color:var(--success)]" />
            <span className="font-medium">Replay run {incident.replay.runId}</span>
            <span className="text-muted-foreground">
              {incident.replay.recovered.toLocaleString()} rows recovered ·{" "}
              {incident.replay.stillFailing.toLocaleString()} still failing
            </span>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="rootcause">
        <TabsList>
          <TabsTrigger value="rootcause">Root cause</TabsTrigger>
          <TabsTrigger value="records">Failed records ({incident.failedCount.toLocaleString()})</TabsTrigger>
          <TabsTrigger value="contract">Contract</TabsTrigger>
          <TabsTrigger value="stages">Run stages</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="rootcause" className="mt-4 grid gap-4 lg:grid-cols-3">
          <Card className="glass border-border/60 lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-base">Evidence</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {incident.rootCause.evidence.map((e, i) => (
                <div key={i} className="rounded-lg border border-border/40 bg-background/40 p-3 font-mono text-xs">{e}</div>
              ))}
            </CardContent>
          </Card>
          <Card className="glass border-border/60">
            <CardHeader className="pb-2"><CardTitle className="text-base">Blast radius</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {incident.impact.downstreamAssets.map((a) => (
                <div key={a} className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/40 p-2.5 font-mono text-xs">
                  <GitBranch className="h-3.5 w-3.5 text-[color:var(--warning)]" />{a}
                </div>
              ))}
              {pipeline && (
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link to="/pipelines/$id" params={{ id: pipeline.id }}>Open pipeline</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="records" className="mt-4">
          <Card className="glass border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quarantined records — sample of {incident.failedSample.length}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <th className="py-2 pr-4">#</th>
                    <th className="py-2 pr-4">order_id</th>
                    <th className="py-2 pr-4">payload</th>
                    <th className="py-2">violations</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {incident.failedSample.map((r) => (
                    <tr key={r.index} className="border-b border-border/30 align-top">
                      <td className="py-2 pr-4 text-muted-foreground">{r.index}</td>
                      <td className="py-2 pr-4">{String(r.raw.order_id ?? "—")}</td>
                      <td className="max-w-[420px] truncate py-2 pr-4 text-muted-foreground">
                        {JSON.stringify(r.raw)}
                      </td>
                      <td className="py-2">
                        <div className="flex flex-col gap-1">
                          {r.reasons.map((v, i) => (
                            <span key={i} className="rounded border border-[color:var(--destructive)]/30 bg-[color:var(--destructive)]/10 px-1.5 py-0.5 text-[color:var(--destructive)]">
                              {v.field} · {v.rule} — expected {v.expected}, got {v.actual}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contract" className="mt-4">
          <Card className="glass border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{ordersContract.name} v{ordersContract.version} · owner {ordersContract.owner}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <th className="py-2 pr-4">Field</th><th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Required</th><th className="py-2 pr-4">PII</th>
                    <th className="py-2">Rule</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {ordersContract.fields.map((f) => {
                    const broken = f.name === incident.drift.from;
                    return (
                      <tr key={f.name} className={`border-b border-border/30 ${broken ? "bg-[color:var(--destructive)]/10" : ""}`}>
                        <td className="py-2 pr-4">{f.name}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{f.type}</td>
                        <td className="py-2 pr-4">{f.required ? "yes" : "no"}</td>
                        <td className="py-2 pr-4">{f.pii ? "yes" : "—"}</td>
                        <td className="py-2 text-muted-foreground">{f.description}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stages" className="mt-4">
          <Card className="glass border-border/60">
            <CardHeader className="pb-2"><CardTitle className="text-base">Run {incident.runId}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(run?.stages ?? []).map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border/40 bg-background/40 p-3 text-xs">
                  <span className={`h-2 w-2 rounded-full ${
                    s.status === "success" ? "bg-[color:var(--success)]" :
                    s.status === "failed" ? "bg-[color:var(--destructive)]" : "bg-muted-foreground"
                  }`} />
                  <span className="font-mono font-medium">{s.label}</span>
                  <span className="text-muted-foreground">{s.message}</span>
                  <span className="ml-auto font-mono text-muted-foreground">
                    in {s.rowsIn.toLocaleString()} · out {s.rowsOut.toLocaleString()} · {s.durationMs}ms
                  </span>
                </div>
              ))}
              {!run && <p className="text-sm text-muted-foreground">Run detail is no longer in session memory.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Card className="glass border-border/60">
            <CardContent className="space-y-4 p-5">
              {incident.timeline.map((t, i) => {
                const Icon = actorIcon[t.actor];
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {t.title}
                        <span className="text-xs font-normal text-muted-foreground">
                          {hydrated ? formatDistanceToNow(new Date(t.ts), { addSuffix: true }) : "—"}
                        </span>
                      </div>
                      {t.detail && <p className="mt-0.5 text-xs text-muted-foreground">{t.detail}</p>}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
