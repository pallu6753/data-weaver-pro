import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, ShieldCheck, Star } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { usePlatform } from "@/lib/mock/store";

export const Route = createFileRoute("/catalog")({
  head: () => ({ meta: [{ title: "Data Catalog — NexusFlow" }] }),
  component: CatalogPage,
});

const zoneClr: Record<string, string> = {
  bronze: "bg-[oklch(0.55_0.10_50)]/20 text-[oklch(0.75_0.15_60)] border-[oklch(0.65_0.15_50)]/30",
  silver: "bg-muted text-muted-foreground border-border",
  gold: "bg-[color:var(--warning)]/20 text-[color:var(--warning)] border-[color:var(--warning)]/40",
  archived: "bg-background text-muted-foreground border-border",
};

function CatalogPage() {
  const datasets = usePlatform((s) => s.datasets);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(datasets[0]?.id ?? null);

  const filtered = datasets.filter((d) =>
    d.name.toLowerCase().includes(q.toLowerCase()) ||
    d.tags.some((t) => t.includes(q.toLowerCase()))
  );
  const current = datasets.find((d) => d.id === sel) ?? datasets[0];

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-6 lg:p-8">
      <PageHeader eyebrow="Governance" title="Data Catalog" description="Discover datasets, columns, owners, popularity, and PII. Backed by lineage-aware metadata." />

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search datasets…" className="glass pl-9" />
          </div>
          <div className="space-y-2">
            {filtered.map((d) => (
              <button key={d.id} onClick={() => setSel(d.id)}
                className={`block w-full rounded-lg border p-3 text-left transition ${
                  current?.id === d.id ? "border-primary bg-primary/10" : "glass border-border/60 hover:border-primary/40"
                }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-sm font-semibold">{d.name}</div>
                    <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{d.description}</div>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${zoneClr[d.zone]}`}>{d.zone}</span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="font-mono">{(d.rows / 1_000_000).toFixed(1)}M rows</span>
                  <span>{d.warehouse}</span>
                  <span className="ml-auto flex items-center gap-0.5"><Star className="h-3 w-3" />{d.popularity}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {current && (
          <Card className="glass border-border/60">
            <CardHeader className="border-b border-border/40">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{current.warehouse} • {current.schema}</div>
                  <CardTitle className="mt-1 font-mono text-xl">{current.name}</CardTitle>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{current.description}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${zoneClr[current.zone]}`}>{current.zone}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-5">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  ["Rows", current.rows.toLocaleString()],
                  ["Size", `${(current.sizeMb / 1024).toFixed(1)} GB`],
                  ["Owner", current.owner],
                  ["Updated", formatDistanceToNow(new Date(current.updatedAt), { addSuffix: true })],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-border/40 bg-background/40 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
                    <div className="mt-0.5 truncate text-sm font-medium">{v}</div>
                  </div>
                ))}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Schema</h3>
                  <div className="flex gap-1.5">
                    {current.tags.map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                  </div>
                </div>
                <div className="overflow-hidden rounded-lg border border-border/40">
                  <table className="w-full text-sm">
                    <thead className="bg-background/60 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr><th className="p-2.5 text-left">Column</th><th className="p-2.5 text-left">Type</th><th className="p-2.5 text-left">Nullable</th><th className="p-2.5 text-left">Flags</th></tr>
                    </thead>
                    <tbody>
                      {current.columns.map((c) => (
                        <tr key={c.name} className="border-t border-border/30">
                          <td className="p-2.5 font-mono">{c.name}</td>
                          <td className="p-2.5 font-mono text-primary">{c.type}</td>
                          <td className="p-2.5 text-xs text-muted-foreground">{c.nullable ? "yes" : "no"}</td>
                          <td className="p-2.5">{c.pii && <Badge variant="secondary" className="gap-1"><ShieldCheck className="h-3 w-3" />PII</Badge>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
