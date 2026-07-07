import { createFileRoute } from "@tanstack/react-router";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { formatDistanceToNow } from "date-fns";
import { Cpu, HardDrive, Zap, Users } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePlatform } from "@/lib/mock/store";
import { seedThroughput } from "@/lib/mock/seed";

export const Route = createFileRoute("/monitoring")({
  head: () => ({ meta: [{ title: "Monitoring — NexusFlow" }] }),
  component: MonitoringPage,
});

const cpu = Array.from({ length: 30 }).map((_, i) => ({ t: i, cpu: 30 + Math.round(Math.sin(i / 2) * 15 + Math.random() * 10), mem: 45 + Math.round(Math.cos(i / 3) * 10 + Math.random() * 8) }));

function MonitoringPage() {
  const pipelines = usePlatform((s) => s.pipelines);
  const runs = usePlatform((s) => s.runs);

  const perPipeline = pipelines.map((p) => ({
    name: p.name.split(" ")[0].slice(0, 18),
    duration: p.avgDurationSec,
    quality: p.qualityScore,
  }));

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-6 lg:p-8">
      <PageHeader eyebrow="Observability" title="Monitoring Center" description="Cluster resources, execution times, quality trends, and live queue depth." />

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "CPU", value: "62%", icon: Cpu, tone: "info" },
          { label: "Memory", value: "48%", icon: HardDrive, tone: "primary" },
          { label: "Active workers", value: "24 / 40", icon: Users, tone: "success" },
          { label: "Queue depth", value: "18", icon: Zap, tone: "warning" },
        ].map((k) => (
          <Card key={k.label} className="glass border-border/60">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[image:var(--gradient-brand)]">
                <k.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</div>
                <div className="mt-0.5 font-display text-2xl font-semibold">{k.value}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass border-border/60">
          <CardHeader className="pb-2"><CardTitle className="text-base">CPU & Memory — last 30m</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={cpu}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.30 0.04 265 / 0.4)" />
                <XAxis dataKey="t" stroke="oklch(0.68 0.03 260)" fontSize={11} />
                <YAxis stroke="oklch(0.68 0.03 260)" fontSize={11} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ background: "oklch(0.20 0.035 265)", border: "1px solid oklch(0.32 0.04 265)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="cpu" stroke="oklch(0.68 0.20 265)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="mem" stroke="oklch(0.78 0.16 195)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass border-border/60">
          <CardHeader className="pb-2"><CardTitle className="text-base">Rows/hour — batch vs streaming</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={seedThroughput}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.30 0.04 265 / 0.4)" />
                <XAxis dataKey="hour" stroke="oklch(0.68 0.03 260)" fontSize={11} />
                <YAxis stroke="oklch(0.68 0.03 260)" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "oklch(0.20 0.035 265)", border: "1px solid oklch(0.32 0.04 265)", borderRadius: 8 }} />
                <Area dataKey="streaming" fill="oklch(0.78 0.16 195 / 0.35)" stroke="oklch(0.78 0.16 195)" />
                <Area dataKey="batch" fill="oklch(0.68 0.20 265 / 0.35)" stroke="oklch(0.68 0.20 265)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass border-border/60 lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Pipeline performance</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={perPipeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.30 0.04 265 / 0.4)" />
                <XAxis dataKey="name" stroke="oklch(0.68 0.03 260)" fontSize={11} interval={0} angle={-15} textAnchor="end" height={70} />
                <YAxis stroke="oklch(0.68 0.03 260)" fontSize={11} />
                <Tooltip contentStyle={{ background: "oklch(0.20 0.035 265)", border: "1px solid oklch(0.32 0.04 265)", borderRadius: 8 }} />
                <Bar dataKey="duration" fill="oklch(0.68 0.20 265)" name="avg duration (s)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="quality" fill="oklch(0.70 0.17 155)" name="quality score" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="glass border-border/60">
        <CardHeader className="pb-2"><CardTitle className="text-base">Live queue</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3 text-left">Pipeline</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Started</th><th className="p-3 text-right">Duration</th><th className="p-3 text-right">Rows</th></tr>
            </thead>
            <tbody>
              {runs.slice(0, 12).map((r) => {
                const p = pipelines.find((x) => x.id === r.pipelineId)!;
                return (
                  <tr key={r.id} className="border-b border-border/30 hover:bg-background/40">
                    <td className="p-3 font-mono text-xs">{p.name}</td>
                    <td className="p-3"><StatusPill kind="run" value={r.status} pulse={r.status === "running"} /></td>
                    <td className="p-3 text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.startedAt), { addSuffix: true })}</td>
                    <td className="p-3 text-right font-mono text-xs">{r.durationSec}s</td>
                    <td className="p-3 text-right font-mono text-xs">{r.rows.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
