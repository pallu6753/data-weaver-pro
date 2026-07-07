import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — NexusFlow" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 lg:p-8">
      <PageHeader eyebrow="Workspace" title="Settings" description="Preferences, notifications, defaults, and API access." />

      <Card className="glass border-border/60">
        <CardHeader><CardTitle className="text-base">Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[
            ["Pipeline failures", "Critical alerts routed to PagerDuty + Slack", true],
            ["Freshness SLA breaches", "Warn when data lag exceeds SLA", true],
            ["Cost anomalies", "Notify when spend > 25% above 7-day avg", true],
            ["Weekly summary", "Every Monday, quality + cost + throughput", false],
          ].map(([label, desc, defaultOn]) => (
            <div key={label as string} className="flex items-start justify-between gap-4 border-b border-border/30 pb-3 last:border-0">
              <div>
                <Label className="text-sm">{label}</Label>
                <p className="mt-0.5 text-xs text-muted-foreground">{desc as string}</p>
              </div>
              <Switch defaultChecked={defaultOn as boolean} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="glass border-border/60">
        <CardHeader><CardTitle className="text-base">Pipeline defaults</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Default warehouse</Label>
            <Select defaultValue="snowflake">
              <SelectTrigger className="glass"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["snowflake","bigquery","redshift","synapse","clickhouse","duckdb"].map((w) => <SelectItem key={w} value={w} className="capitalize">{w}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Default schedule</Label>
            <Input className="glass font-mono" defaultValue="0 * * * *" />
          </div>
          <div className="space-y-2">
            <Label>Retry policy</Label>
            <Select defaultValue="3">
              <SelectTrigger className="glass"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["0","1","3","5"].map((n) => <SelectItem key={n} value={n}>{n} retries</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Alert channel</Label>
            <Select defaultValue="slack">
              <SelectTrigger className="glass"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["slack","email","teams","pagerduty","webhook"].map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-border/60">
        <CardHeader><CardTitle className="text-base">API keys</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[
            ["prod-airflow", "sk_live_•••••••••••••2f4a", "12 days ago"],
            ["ml-service", "sk_live_•••••••••••••88c1", "3 hours ago"],
          ].map(([n, k, seen]) => (
            <div key={n as string} className="flex items-center justify-between rounded-lg border border-border/40 bg-background/40 p-3 text-xs">
              <div>
                <div className="font-medium">{n}</div>
                <div className="font-mono text-muted-foreground">{k}</div>
              </div>
              <div className="text-muted-foreground">last seen {seen}</div>
            </div>
          ))}
          <Button variant="outline" className="w-full">Create new API key</Button>
        </CardContent>
      </Card>
    </div>
  );
}
