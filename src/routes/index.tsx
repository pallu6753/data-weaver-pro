import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity, AlertTriangle, CheckCircle2, Clock, DollarSign, Database,
  GitBranch, Zap, TrendingUp, ArrowUpRight, Play,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { formatDistanceToNow } from "date-fns";

import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePlatform } from "@/lib/mock/store";
import { useHydrated } from "@/hooks/use-hydrated";
import { seedCost7d, seedThroughput } from "@/lib/mock/seed";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — NexusFlow" }] }),
  component: DashboardPage,
});

function KpiCard({
  label, value, delta, icon: Icon, tone = "primary", sub,
}: {
  label: string; value: string; delta?: string; icon: any;
  tone?: "primary" | "success" | "warning" | "danger" | "info";
  sub?: string;
}) {
  const toneMap: Record<string, string> = {
    primary: "from-[color:var(--primary)]/25 to-[color:var(--primary)]/0 text-primary",
    success: "from-[color:var(--success)]/25 to-[color:var(--success)]/0 text-[color:var(--success)]",
    warning: "from-[color:var(--warning)]/25 to-[color:var(--warning)]/0 text-[color:var(--warning)]",
    danger: "from-[color:var(--destructive)]/25 to-[color:var(--destructive)]/0 text-[color:var(--destructive)]",
    info: "from-[color:var(--info)]/25 to-[color:var(--info)]/0 text-[color:var(--info)]",
  };
  return (
    <Card className="glass relative overflow-hidden border-border/60">
      <div className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${toneMap[tone]} blur-2xl opacity-60`} />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-3xl font-semibold tracking-tight">{value}</p>
            {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${toneMap[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {delta && (
          <div className="mt-3 flex items-center gap-1 text-xs">
            <TrendingUp className="h-3 w-3 text-[color:var(--success)]" />
            <span className="font-medium text-[color:var(--success)]">{delta}</span>
            <span className="text-muted-foreground">vs 7d avg</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const pipelines = usePlatform((s) => s.pipelines);
  const runs = usePlatform((s) => s.runs);
  const sources = usePlatform((s) => s.sources);
  const alerts = usePlatform((s) => s.alerts);
  const hydrated = useHydrated();

  const running = pipelines.filter((p) => p.status === "running").length;
  const failed = pipelines.filter((p) => p.status === "failed" || p.status === "degraded").length;
  const scheduled = pipelines.filter((p) => p.status === "scheduled").length;
  const totalRows = pipelines.reduce((a, p) => a + p.rowsProcessedToday, 0);
  const totalCost = pipelines.reduce((a, p) => a + p.costUsdToday, 0);
  const avgQuality = Math.round(pipelines.reduce((a, p) => a + p.qualityScore, 0) / pipelines.length);
  const avgRuntime = Math.round(pipelines.reduce((a, p) => a + p.avgDurationSec, 0) / pipelines.length);
  const activeSources = sources.filter((s) => s.status === "connected" || s.status === "syncing").length;
  const healthPct = Math.round((pipelines.filter((p) => p.status === "healthy" || p.status === "running").length / pipelines.length) * 100);

  const statusData = [
    { name: "Healthy", value: pipelines.filter((p) => p.status === "healthy").length, fill: "oklch(0.70 0.17 155)" },
    { name: "Running", value: running, fill: "oklch(0.72 0.15 240)" },
    { name: "Degraded", value: pipelines.filter((p) => p.status === "degraded").length, fill: "oklch(0.78 0.16 75)" },
    { name: "Failed", value: pipelines.filter((p) => p.status === "failed").length, fill: "oklch(0.65 0.25 25)" },
    { name: "Paused", value: pipelines.filter((p) => p.status === "paused").length, fill: "oklch(0.55 0.03 265)" },
    { name: "Scheduled", value: scheduled, fill: "oklch(0.68 0.20 265)" },
  ].filter((d) => d.value > 0);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-6 lg:p-8">
      <PageHeader
        eyebrow="Overview"
        title="Platform Dashboard"
        description="Live health, throughput, cost, and quality across all pipelines, sources, and warehouses."
        actions={
          <>
            <Button variant="outline" asChild><Link to="/monitoring">Open Monitoring</Link></Button>
            <Button asChild><Link to="/pipelines/new">New Pipeline</Link></Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Pipeline Health" value={`${healthPct}%`} tone="success" icon={CheckCircle2} delta="+2.4%" />
        <KpiCard label="Running Now" value={String(running)} tone="info" icon={Play} sub={`${scheduled} scheduled`} />
        <KpiCard label="Failed / Degraded" value={String(failed)} tone="danger" icon={AlertTriangle} sub="requires attention" />
        <KpiCard label="Rows Processed" value={`${(totalRows / 1_000_000).toFixed(2)}M`} tone="primary" icon={Zap} delta="+18%" />
        <KpiCard label="Cost Today" value={`$${totalCost.toFixed(2)}`} tone="warning" icon={DollarSign} sub="+$12 vs yday" />
        <KpiCard label="Quality Score" value={`${avgQuality}`} tone="success" icon={CheckCircle2} sub="of 100" />
        <KpiCard label="Active Sources" value={`${activeSources}/${sources.length}`} tone="primary" icon={Database} />
        <KpiCard label="Avg Runtime" value={`${Math.round(avgRuntime / 60)}m ${avgRuntime % 60}s`} tone="info" icon={Clock} />
        <KpiCard label="Alerts (24h)" value={String(alerts.length)} tone="danger" icon={AlertTriangle} sub={`${alerts.filter((a) => !a.ack).length} unacked`} />
        <KpiCard label="Storage" value="482 TB" tone="primary" icon={Database} sub="of 1 PB" />
        <KpiCard label="Active Pipelines" value={String(pipelines.length)} tone="info" icon={GitBranch} />
        <KpiCard label="Throughput" value="612K/s" tone="success" icon={Activity} delta="+22%" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="glass border-border/60 lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Throughput — last 24h</CardTitle>
              <span className="text-xs text-muted-foreground">Rows per hour</span>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={seedThroughput}>
                <defs>
                  <linearGradient id="gBatch" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.68 0.20 265)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="oklch(0.68 0.20 265)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gStream" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.16 195)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="oklch(0.78 0.16 195)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.30 0.04 265 / 0.4)" />
                <XAxis dataKey="hour" stroke="oklch(0.68 0.03 260)" fontSize={11} />
                <YAxis stroke="oklch(0.68 0.03 260)" fontSize={11} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "oklch(0.20 0.035 265)", border: "1px solid oklch(0.32 0.04 265)", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="batch" stroke="oklch(0.68 0.20 265)" fill="url(#gBatch)" strokeWidth={2} />
                <Area type="monotone" dataKey="streaming" stroke="oklch(0.78 0.16 195)" fill="url(#gStream)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pipeline status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {statusData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "oklch(0.20 0.035 265)", border: "1px solid oklch(0.32 0.04 265)", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
              {statusData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm" style={{ background: d.fill }} />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="ml-auto font-mono font-medium">{d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="glass border-border/60 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Active pipelines</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/pipelines">View all <ArrowUpRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {pipelines.slice(0, 5).map((p) => (
              <Link key={p.id} to="/pipelines/$id" params={{ id: p.id }}
                className="group flex items-center gap-3 rounded-lg border border-border/40 bg-background/40 p-3 transition hover:border-primary/50 hover:bg-background/70">
                <div className={`h-8 w-1 rounded-full bg-current opacity-70 ${
                  p.status === "healthy" ? "text-[color:var(--success)]" :
                  p.status === "running" ? "text-[color:var(--info)]" :
                  p.status === "failed" ? "text-[color:var(--destructive)]" :
                  p.status === "degraded" ? "text-[color:var(--warning)]" : "text-muted-foreground"
                }`} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-sm font-medium">{p.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {p.mode} • {p.owner} • last run {hydrated ? formatDistanceToNow(new Date(p.lastRunAt), { addSuffix: true }) : "—"}
                  </div>
                </div>
                <div className="hidden text-right text-xs md:block">
                  <div className="font-mono font-medium">{(p.rowsProcessedToday / 1000).toFixed(0)}k rows</div>
                  <div className="text-muted-foreground">${p.costUsdToday.toFixed(2)}</div>
                </div>
                <StatusPill kind="pipeline" value={p.status} pulse={p.status === "running"} />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="glass border-border/60">
          <CardHeader className="pb-2"><CardTitle className="text-base">Cost — last 7 days</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={seedCost7d}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.30 0.04 265 / 0.4)" />
                <XAxis dataKey="day" stroke="oklch(0.68 0.03 260)" fontSize={11} />
                <YAxis stroke="oklch(0.68 0.03 260)" fontSize={11} />
                <Tooltip contentStyle={{ background: "oklch(0.20 0.035 265)", border: "1px solid oklch(0.32 0.04 265)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="compute" stackId="a" fill="oklch(0.68 0.20 265)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="storage" stackId="a" fill="oklch(0.72 0.20 300)" />
                <Bar dataKey="egress" stackId="a" fill="oklch(0.78 0.16 195)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              {["compute", "storage", "egress"].map((k, i) => (
                <div key={k} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm" style={{ background: ["oklch(0.68 0.20 265)","oklch(0.72 0.20 300)","oklch(0.78 0.16 195)"][i] }} />
                  <span className="capitalize text-muted-foreground">{k}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass border-border/60">
          <CardHeader className="pb-2"><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {runs.slice(0, 8).map((r) => {
              const p = pipelines.find((x) => x.id === r.pipelineId)!;
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-md border border-border/40 bg-background/40 p-2.5">
                  <StatusPill kind="run" value={r.status} pulse={r.status === "running"} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-xs">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {hydrated ? formatDistanceToNow(new Date(r.startedAt), { addSuffix: true }) : "just now"} • {r.durationSec}s • {r.rows.toLocaleString()} rows
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="glass border-border/60">
          <CardHeader className="pb-2"><CardTitle className="text-base">Recent alerts</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {alerts.slice(0, 5).map((a) => (
              <Link key={a.id} to="/alerts" className="block rounded-md border border-border/40 bg-background/40 p-3 transition hover:border-primary/40">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{a.title}</div>
                    <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{a.detail}</div>
                  </div>
                  <StatusPill kind="alert" value={a.severity} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
