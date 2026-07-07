import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlatform } from "@/lib/mock/store";
import type { Pipeline } from "@/lib/mock/types";

export const Route = createFileRoute("/pipelines/new")({
  head: () => ({ meta: [{ title: "New pipeline — NexusFlow" }] }),
  component: NewPipeline,
});

const templates = [
  { id: "batch-etl", label: "Batch ETL", desc: "Postgres → dbt → Snowflake gold layer" },
  { id: "streaming", label: "Streaming (Kafka)", desc: "Kafka → Spark structured → silver Delta" },
  { id: "cdc", label: "CDC replication", desc: "Log-based capture from OLTP to warehouse" },
  { id: "api-sync", label: "API sync", desc: "Paginated REST pull with schema evolution" },
  { id: "ml-features", label: "ML feature build", desc: "Gold aggregates → feature store" },
  { id: "reverse-etl", label: "Reverse ETL", desc: "Warehouse → SaaS destinations" },
];

function NewPipeline() {
  const navigate = useNavigate();
  const sources = usePlatform((s) => s.sources);
  const add = usePlatform((s) => s.addPipeline);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [mode, setMode] = useState<Pipeline["mode"]>("batch");
  const [srcId, setSrcId] = useState(sources[0]?.id ?? "");
  const [template, setTemplate] = useState("batch-etl");

  const submit = () => {
    if (!name) return toast.error("Please name the pipeline");
    const id = `pl_${Date.now()}`;
    const p: Pipeline = {
      id, name, description: desc || "New pipeline", mode, status: "scheduled",
      owner: "you", env: "dev", schedule: "0 * * * *",
      lastRunAt: new Date().toISOString(), avgDurationSec: 120,
      successRate: 1, rowsProcessedToday: 0, costUsdToday: 0,
      sourceIds: [srcId].filter(Boolean),
      destination: { warehouse: "Snowflake", table: `silver.${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`, zone: "silver" },
      tags: [template], qualityScore: 100,
      nodes: [
        { id: "n1", type: "source", label: sources.find((s) => s.id === srcId)?.name ?? "Source", position: { x: 60, y: 60 } },
        { id: "n2", type: "quality", label: "Validate", position: { x: 280, y: 60 } },
        { id: "n3", type: "sql", label: "Transform", position: { x: 500, y: 60 } },
        { id: "n4", type: "destination", label: `silver.${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`, position: { x: 720, y: 60 } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
      ],
    };
    add(p);
    toast.success("Pipeline created", { description: "Now visible in Monitoring, Lineage, and Logs." });
    navigate({ to: "/pipelines/$id", params: { id } });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/pipelines" })} className="-ml-2">
        <ArrowLeft className="h-4 w-4" />All pipelines
      </Button>
      <PageHeader eyebrow="Create" title="New pipeline" description="Start from a template or a blank canvas. The pipeline appears everywhere in NexusFlow instantly." />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="glass border-border/60">
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Pipeline name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="orders_to_gold_hourly" className="glass font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What this pipeline does…" className="glass" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Mode</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as Pipeline["mode"])}>
                  <SelectTrigger className="glass"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="batch">Batch</SelectItem>
                    <SelectItem value="streaming">Streaming</SelectItem>
                    <SelectItem value="cdc">Change Data Capture</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Primary source</Label>
                <Select value={srcId} onValueChange={setSrcId}>
                  <SelectTrigger className="glass"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sources.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={submit} className="w-full">Create pipeline</Button>
          </CardContent>
        </Card>

        <Card className="glass border-border/60">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" />Templates</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {templates.map((t) => (
              <button key={t.id} onClick={() => setTemplate(t.id)}
                className={`block w-full rounded-lg border p-3 text-left text-xs transition ${
                  template === t.id ? "border-primary bg-primary/10" : "border-border/40 bg-background/40 hover:border-primary/40"
                }`}>
                <div className="font-medium">{t.label}</div>
                <div className="mt-0.5 text-muted-foreground">{t.desc}</div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
