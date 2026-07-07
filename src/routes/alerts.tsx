import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Check, Slack, Mail, MessageSquare, Webhook, PhoneCall } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePlatform } from "@/lib/mock/store";
import { toast } from "sonner";

export const Route = createFileRoute("/alerts")({
  head: () => ({ meta: [{ title: "Alerts — NexusFlow" }] }),
  component: AlertsPage,
});

const channelIcon: Record<string, any> = {
  slack: Slack, email: Mail, teams: MessageSquare, webhook: Webhook, pagerduty: PhoneCall,
};

function AlertsPage() {
  const alerts = usePlatform((s) => s.alerts);
  const pipelines = usePlatform((s) => s.pipelines);
  const ack = usePlatform((s) => s.ackAlert);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6 lg:p-8">
      <PageHeader
        eyebrow="Notifications"
        title="Alerts"
        description="Real-time notifications from every pipeline, quality rule, and SLA."
      />

      <div className="grid gap-3">
        {alerts.map((a) => {
          const p = a.pipelineId ? pipelines.find((x) => x.id === a.pipelineId) : null;
          const Icon = channelIcon[a.channel] ?? Slack;
          return (
            <Card key={a.id} className={`glass border-border/60 ${!a.ack ? "border-l-4 border-l-[color:var(--destructive)]" : "opacity-70"}`}>
              <CardContent className="flex items-start gap-4 p-4">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-[image:var(--gradient-brand)]">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <StatusPill kind="alert" value={a.severity} />
                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.ts), { addSuffix: true })}</span>
                    <span className="text-xs text-muted-foreground">• via {a.channel}</span>
                  </div>
                  <h3 className="mt-1 font-medium">{a.title}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{a.detail}</p>
                  {p && (
                    <Link to="/pipelines/$id" params={{ id: p.id }} className="mt-2 inline-block font-mono text-xs text-primary hover:underline">
                      {p.name} →
                    </Link>
                  )}
                </div>
                {!a.ack && (
                  <Button size="sm" variant="outline" onClick={() => { ack(a.id); toast.success("Acknowledged"); }}>
                    <Check className="h-3 w-3" />Ack
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
