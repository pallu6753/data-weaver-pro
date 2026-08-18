import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plus, Database, HardDrive, Cloud, Waves, Code2, FileText, Server,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { CsvUploadCard } from "@/components/csv-upload-card";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlatform } from "@/lib/mock/store";
import type { ConnectorKind, DataSource } from "@/lib/mock/types";

export const Route = createFileRoute("/sources")({
  head: () => ({ meta: [{ title: "Data Sources — NexusFlow" }] }),
  component: SourcesPage,
});

const CONNECTORS: Array<{ id: ConnectorKind; label: string; group: string; icon: any }> = [
  { id: "postgres", label: "PostgreSQL", group: "Databases", icon: Database },
  { id: "mysql", label: "MySQL", group: "Databases", icon: Database },
  { id: "sqlserver", label: "SQL Server", group: "Databases", icon: Database },
  { id: "oracle", label: "Oracle", group: "Databases", icon: Database },
  { id: "mongodb", label: "MongoDB", group: "Databases", icon: Database },
  { id: "snowflake", label: "Snowflake", group: "Warehouses", icon: Server },
  { id: "bigquery", label: "BigQuery", group: "Warehouses", icon: Server },
  { id: "redshift", label: "Redshift", group: "Warehouses", icon: Server },
  { id: "synapse", label: "Azure Synapse", group: "Warehouses", icon: Server },
  { id: "clickhouse", label: "ClickHouse", group: "Warehouses", icon: Server },
  { id: "s3", label: "AWS S3", group: "Object Storage", icon: HardDrive },
  { id: "gcs", label: "Google GCS", group: "Object Storage", icon: HardDrive },
  { id: "azureblob", label: "Azure Blob", group: "Object Storage", icon: HardDrive },
  { id: "sftp", label: "SFTP", group: "Object Storage", icon: HardDrive },
  { id: "kafka", label: "Apache Kafka", group: "Streaming", icon: Waves },
  { id: "kinesis", label: "AWS Kinesis", group: "Streaming", icon: Waves },
  { id: "eventhub", label: "Azure Event Hub", group: "Streaming", icon: Waves },
  { id: "rest", label: "REST API", group: "APIs", icon: Code2 },
  { id: "graphql", label: "GraphQL", group: "APIs", icon: Code2 },
  { id: "webhook", label: "Webhook", group: "APIs", icon: Code2 },
  { id: "csv", label: "CSV upload", group: "Files", icon: FileText },
  { id: "excel", label: "Excel", group: "Files", icon: FileText },
  { id: "json", label: "JSON", group: "Files", icon: FileText },
];

function KindIcon({ kind }: { kind: ConnectorKind }) {
  const c = CONNECTORS.find((c) => c.id === kind);
  const Icon = c?.icon ?? Cloud;
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[image:var(--gradient-brand)]">
      <Icon className="h-5 w-5 text-white" />
    </div>
  );
}

function SourcesPage() {
  const sources = usePlatform((s) => s.sources);
  const addSource = usePlatform((s) => s.addSource);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ConnectorKind>("postgres");
  const [name, setName] = useState("");
  const [host, setHost] = useState("");

  const create = () => {
    if (!name) return toast.error("Name required");
    const s: DataSource = {
      id: `src_${Date.now()}`, name, kind, host, status: "connected",
      lastSyncAt: new Date().toISOString(), rowsIngestedToday: 0,
      owner: "you", env: "dev", tags: [kind],
    };
    addSource(s);
    setOpen(false); setName(""); setHost("");
    toast.success("Source connected", { description: "Available for pipelines and lineage." });
  };

  const groups = Array.from(new Set(CONNECTORS.map((c) => c.group)));

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-6 lg:p-8">
      <PageHeader
        eyebrow="Ingestion"
        title="Data Sources"
        description="18+ connectors across databases, warehouses, object storage, streaming, and APIs."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4" />Connect source</Button></DialogTrigger>
            <DialogContent className="glass-strong max-w-2xl">
              <DialogHeader><DialogTitle>Connect a new data source</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>Connector type</Label>
                  <Select value={kind} onValueChange={(v) => setKind(v as ConnectorKind)}>
                    <SelectTrigger className="glass"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {groups.map((g) => (
                        <div key={g}>
                          <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">{g}</div>
                          {CONNECTORS.filter((c) => c.group === g).map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="orders_prod" className="glass" /></div>
                <div className="grid gap-2"><Label>Host / URI</Label><Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="db.internal:5432" className="glass font-mono" /></div>
                <div className="rounded-md border border-[color:var(--success)]/30 bg-[color:var(--success)]/10 p-3 text-xs">
                  ✓ Test connection successful (simulated). Schema preview ready.
                </div>
                <Button onClick={create} className="w-full">Save & connect</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <CsvUploadCard />



      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sources.map((s) => (
          <Card key={s.id} className="glass border-border/60 transition hover:border-primary/50">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <KindIcon kind={s.kind} />
                  <div className="min-w-0">
                    <div className="truncate font-mono text-sm font-semibold">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{CONNECTORS.find((c) => c.id === s.kind)?.label}</div>
                  </div>
                </div>
                <StatusPill kind="pipeline" value={s.status === "connected" ? "healthy" : s.status === "syncing" ? "running" : s.status === "error" ? "failed" : "paused"} pulse={s.status === "syncing"} />
              </div>
              {s.host && <div className="mt-3 truncate rounded-md bg-background/50 px-2 py-1 font-mono text-[11px] text-muted-foreground">{s.host}</div>}
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div><div className="text-muted-foreground">Rows today</div><div className="mt-0.5 font-mono font-semibold">{s.rowsIngestedToday.toLocaleString()}</div></div>
                <div><div className="text-muted-foreground">Last sync</div><div className="mt-0.5 font-mono font-semibold">{formatDistanceToNow(new Date(s.lastSyncAt), { addSuffix: true })}</div></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[10px]">{s.env}</Badge>
                {s.tags.map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass border-border/60">
        <CardHeader><CardTitle className="text-base">Available connectors</CardTitle></CardHeader>
        <CardContent>
          {groups.map((g) => (
            <div key={g} className="mb-4 last:mb-0">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g}</div>
              <div className="flex flex-wrap gap-2">
                {CONNECTORS.filter((c) => c.group === g).map((c) => {
                  const Icon = c.icon;
                  return (
                    <div key={c.id} className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/40 px-3 py-1.5 text-xs">
                      <Icon className="h-3.5 w-3.5 text-primary" />{c.label}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
