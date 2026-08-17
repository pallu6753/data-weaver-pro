import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertOctagon, ArrowUpRight, ShieldAlert, Zap } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePlatform } from "@/lib/mock/store";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/incidents/")({
  head: () => ({
    meta: [
      { title: "Incidents — NexusFlow Reliability" },
      { name: "description", content: "Investigate data incidents: root cause, contract breaches, blast radius, and record-level replay recovery." },
      { property: "og:title", content: "Incidents — NexusFlow Reliability" },
      { property: "og:description", content: "Root cause, blast radius, and record-level replay recovery for data incidents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IncidentsPage,
});

const statusTone: Record<string, string> = {
  open: "bg-[color:var(--destructive)]/15 text-[color:var(--destructive)] border-[color:var(--destructive)]/30",
  investigating: "bg-[color:var(--warning)]/15 text-[color:var(--warning)] border-[color:var(--warning)]/30",
  mitigating: "bg-[color:var(--info)]/15 text-[color:var(--info)] border-[color:var(--info)]/30",
  resolved: "bg-[color:var(--success)]/15 text-[color:var(--success)] border-[color:var(--success)]/30",
};

function IncidentsPage() {
  const incidents = usePlatform((s) => s.incidents);
  const runDemoIncident = usePlatform((s) => s.runDemoIncident);
  const navigate = useNavigate();
  const hydrated = useHydrated();

  const open = incidents.filter((i) => i.status !== "resolved");

  const trigger = () => {
    const inc = runDemoIncident();
    toast.error(`${inc.ref} opened`, { description: inc.title });
    navigate({ to: "/incidents/$id", params: { id: inc.id } });
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6 lg:p-8">
      <PageHeader
        eyebrow="Reliability"
        title="Incidents"
        description="Every contract breach, drift event, and quality failure — with record-level evidence and a replay path back to green."
        actions={<Button onClick={trigger}><Zap className="mr-2 h-4 w-4" />Run demo incident</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass border-border/60">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Open incidents</p>
            <p className="mt-2 font-display text-3xl font-semibold">{open.length}</p>
          </CardContent>
        </Card>
        <Card className="glass border-border/60">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Rows quarantined</p>
            <p className="mt-2 font-display text-3xl font-semibold">
              {open.reduce((a, i) => a + i.impact.blockedRows, 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="glass border-border/60">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Revenue at risk</p>
            <p className="mt-2 font-display text-3xl font-semibold">
              ${open.reduce((a, i) => a + i.impact.revenueAtRiskUsd, 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {incidents.length === 0 ? (
        <Card className="glass border-dashed border-border/60">
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <ShieldAlert className="h-10 w-10 text-[color:var(--success)]" />
            <h3 className="font-display text-lg font-semibold">No active incidents</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              All contracts are holding. Run the demo incident to inject an upstream schema
              migration on OrdersDB and walk the full detect → diagnose → fix → replay loop.
            </p>
            <Button onClick={trigger} className="mt-2"><Zap className="mr-2 h-4 w-4" />Run demo incident</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {incidents.map((i) => (
            <Link key={i.id} to="/incidents/$id" params={{ id: i.id }}
              className="group glass flex items-start gap-4 rounded-xl border border-border/60 p-4 transition hover:border-primary/50">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-[image:var(--gradient-brand)]">
                <AlertOctagon className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-primary">{i.ref}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusTone[i.status]}`}>{i.status}</span>
                  <span className="text-xs uppercase text-muted-foreground">{i.severity}</span>
                  <span className="text-xs text-muted-foreground">
                    {hydrated ? formatDistanceToNow(new Date(i.createdAt), { addSuffix: true }) : "—"}
                  </span>
                </div>
                <h3 className="mt-1 text-sm font-semibold">{i.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{i.rootCause.summary}</p>
              </div>
              <div className="hidden text-right text-xs md:block">
                <div className="font-mono text-sm font-semibold">{i.impact.blockedRows.toLocaleString()}</div>
                <div className="text-muted-foreground">rows blocked</div>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
