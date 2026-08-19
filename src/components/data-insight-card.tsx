import { useMemo, useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlatform } from "@/lib/mock/store";
import type { IngestedColumn, IngestedDataset } from "@/lib/engine/ingest";

type Bucket = { label: string; count: number };

const MAX_BARS = 10;

function isNumeric(t: IngestedColumn["type"]) {
  return t === "integer" || t === "decimal";
}
function isTemporal(t: IngestedColumn["type"]) {
  return t === "date" || t === "datetime";
}

function fmtNum(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function categoryBuckets(values: unknown[]): Bucket[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (v === null || v === undefined || v === "") continue;
    const key = String(v).trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_BARS);
}

function numericBuckets(values: unknown[]): Bucket[] {
  const nums = values
    .map((v) => (typeof v === "number" ? v : Number(String(v ?? "").replace(/[,$\s]/g, ""))))
    .filter((n) => Number.isFinite(n)) as number[];
  if (nums.length < 2) return [];
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (min === max) return [{ label: fmtNum(min), count: nums.length }];
  const binCount = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(new Set(nums).size))));
  const width = (max - min) / binCount;
  const out: Bucket[] = Array.from({ length: binCount }, (_, i) => ({
    label: `${fmtNum(min + i * width)}–${fmtNum(min + (i + 1) * width)}`,
    count: 0,
  }));
  for (const n of nums) {
    const idx = Math.min(binCount - 1, Math.floor((n - min) / width));
    out[idx]!.count += 1;
  }
  return out;
}

function dateBuckets(values: unknown[]): Bucket[] {
  const times: number[] = [];
  for (const v of values) {
    const t = new Date(String(v ?? "")).getTime();
    if (Number.isFinite(t)) times.push(t);
  }
  if (times.length < 2) return [];
  const spanDays = (Math.max(...times) - Math.min(...times)) / 86_400_000;
  const keyOf = (t: number) => {
    const d = new Date(t);
    if (spanDays <= 2) return `${String(d.getUTCHours()).padStart(2, "0")}:00`;
    if (spanDays <= 90) return d.toISOString().slice(0, 10);
    if (spanDays <= 1200) return d.toISOString().slice(0, 7);
    return String(d.getUTCFullYear());
  };
  const counts = new Map<string, number>();
  for (const t of times) counts.set(keyOf(t), (counts.get(keyOf(t)) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-MAX_BARS)
    .map(([label, count]) => ({ label, count }));
}

function buildBuckets(ds: IngestedDataset, col: IngestedColumn): Bucket[] {
  const values = ds.rawRows.map((r) => (r as Record<string, unknown>)[col.name]);
  if (isNumeric(col.type)) return numericBuckets(values);
  if (isTemporal(col.type)) return dateBuckets(values);
  return categoryBuckets(values);
}

export function DataInsightCard() {
  const uploads = usePlatform((s) => s.uploads);
  const activeUploadId = usePlatform((s) => s.activeUploadId);
  const active = uploads.find((u) => u.id === activeUploadId) ?? null;

  // Prefer low-cardinality string columns, then other columns.
  const ordered = useMemo(() => {
    if (!active) return [] as IngestedColumn[];
    const score = (c: IngestedColumn) => {
      if (c.type === "boolean") return 0;
      if (c.type === "string") return c.distinct > 1 && c.distinct <= 30 ? 1 : 3;
      if (isTemporal(c.type)) return 2;
      return 4;
    };
    return [...active.columns].sort((a, b) => score(a) - score(b));
  }, [active]);

  const [column, setColumn] = useState<string>("");
  useEffect(() => {
    setColumn(ordered[0]?.name ?? "");
  }, [active?.id, ordered]);

  const col = active?.columns.find((c) => c.name === column) ?? null;
  const buckets = useMemo(() => (active && col ? buildBuckets(active, col) : []), [active, col]);

  return (
    <Card className="glass border-border/60">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
        <div className="min-w-0">
          <CardTitle className="text-base">Data Insight</CardTitle>
          {active && (
            <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
              {active.name} · {active.rowCount.toLocaleString()} rows
            </div>
          )}
        </div>
        {active && active.columns.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Column</span>
            <Select value={column} onValueChange={setColumn}>
              <SelectTrigger className="glass h-8 w-[190px] text-xs"><SelectValue placeholder="Select column" /></SelectTrigger>
              <SelectContent>
                {ordered.map((c) => (
                  <SelectItem key={c.name} value={c.name} className="text-xs">
                    <span className="font-mono">{c.name}</span>
                    <span className="ml-2 text-[10px] uppercase text-muted-foreground">{c.type}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {!active ? (
          <div className="flex h-[180px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border/60 text-center">
            <div className="text-sm font-medium">No active dataset</div>
            <div className="text-xs text-muted-foreground">Upload a CSV to explore your data.</div>
          </div>
        ) : buckets.length === 0 ? (
          <div className="flex h-[180px] items-center justify-center rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground">
            Not enough usable data for this visualization.
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                {col && isNumeric(col.type) ? "Distribution" : col && isTemporal(col.type) ? "Over time" : "Top categories"}
              </Badge>
              <span className="truncate font-mono text-xs text-muted-foreground">{column}</span>
            </div>
            <div style={{ height: Math.max(180, buckets.length * 26 + 20) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buckets} layout="vertical" margin={{ left: 4, right: 24, top: 4, bottom: 4 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={120}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "color-mix(in oklab, var(--primary) 12%, transparent)" }}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
                    {buckets.map((b, i) => (
                      <Cell key={b.label} fill={i === 0 ? "var(--primary)" : "color-mix(in oklab, var(--primary) 65%, var(--accent))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
