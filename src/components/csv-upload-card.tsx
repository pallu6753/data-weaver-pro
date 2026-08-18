import { useCallback, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileUp, Loader2, Table2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { assertCsvFile, ingestCsvText, IngestError, type IngestedDataset } from "@/lib/engine/ingest";
import { usePlatform } from "@/lib/mock/store";

const PREVIEW_ROWS = 20;

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/40 p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-mono text-lg font-semibold ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

export function CsvUploadCard() {
  const registerUpload = usePlatform((s) => s.registerUpload);
  const uploads = usePlatform((s) => s.uploads);
  const activeUploadId = usePlatform((s) => s.activeUploadId);
  const setActiveUpload = usePlatform((s) => s.setActiveUpload);

  const active: IngestedDataset | undefined = uploads.find((u) => u.id === activeUploadId) ?? uploads[0];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      assertCsvFile(file);
      const text = await file.text();
      const ds = ingestCsvText(text, file.name);
      registerUpload(ds);
      toast.success(`${ds.fileName} ingested`, {
        description: `${ds.rowCount.toLocaleString()} rows · ${ds.columnCount} columns available to pipelines.`,
      });
      if (ds.warnings.length) toast.warning(ds.warnings[0]);
    } catch (e) {
      const msg = e instanceof IngestError ? e.message : "Could not parse this file as CSV.";
      setError(msg);
      toast.error("Upload rejected", { description: msg });
    } finally {
      setBusy(false);
    }
  }, [registerUpload]);

  return (
    <Card className="glass border-border/60">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">CSV ingestion</CardTitle>
        {uploads.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {uploads.map((u) => (
              <button key={u.id} onClick={() => setActiveUpload(u.id)}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] transition ${u.id === active?.id ? "border-primary/60 bg-primary/10 text-primary" : "border-border/50 text-muted-foreground hover:border-primary/40"}`}>
                {u.fileName}
              </button>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault(); setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void handleFile(f);
          }}
          className={`flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center transition ${dragging ? "border-primary bg-primary/5" : "border-border/60 bg-background/30"}`}
        >
          {busy ? <Loader2 className="h-7 w-7 animate-spin text-primary" /> : <FileUp className="h-7 w-7 text-primary" />}
          <p className="text-sm font-medium">Drop a CSV file here</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Parsed in-browser. Every row is retained and becomes the input batch for pipeline runs,
            profiling, and the quality engine.
          </p>
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ""; }} />
          <Button variant="outline" size="sm" className="mt-1" disabled={busy} onClick={() => inputRef.current?.click()}>
            Choose file
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/10 p-3 text-xs">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--destructive)]" />
            <span>{error}</span>
          </div>
        )}

        {active && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <CheckCircle2 className="h-4 w-4 text-[color:var(--success)]" />
              <span className="font-mono font-semibold">{active.fileName}</span>
              <Badge variant="outline" className="text-[10px]">active batch</Badge>
              {active.id === activeUploadId && <span className="text-muted-foreground">used by the next pipeline run</span>}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Rows" value={active.rowCount.toLocaleString()} />
              <Stat label="Columns" value={String(active.columnCount)} />
              <Stat label="Null cells" value={`${active.nullPct}%`}
                tone={active.nullPct > 5 ? "text-[color:var(--warning)]" : ""} />
              <Stat label="Duplicates" value={active.duplicateRows.toLocaleString()}
                tone={active.duplicateRows > 0 ? "text-[color:var(--warning)]" : ""} />
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inferred schema</div>
              <div className="flex flex-wrap gap-2">
                {active.columns.map((c) => (
                  <div key={c.name} className="rounded-lg border border-border/50 bg-background/40 px-2.5 py-1 text-[11px]">
                    <span className="font-mono">{c.name}</span>
                    <span className="ml-2 uppercase text-primary">{c.type}</span>
                    {c.nullable && <span className="ml-2 text-muted-foreground">{c.nullPct}% null</span>}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Table2 className="h-3.5 w-3.5" /> Preview — first {Math.min(PREVIEW_ROWS, active.rowCount)} of {active.rowCount.toLocaleString()} rows
              </div>
              <div className="max-h-72 overflow-auto rounded-lg border border-border/50">
                <table className="w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-background/95 backdrop-blur">
                    <tr>
                      {active.columns.map((c) => (
                        <th key={c.name} className="whitespace-nowrap px-3 py-2 font-mono font-semibold">{c.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {active.rawRows.slice(0, PREVIEW_ROWS).map((r, i) => (
                      <tr key={i} className="border-t border-border/40">
                        {active.columns.map((c) => (
                          <td key={c.name} className="whitespace-nowrap px-3 py-1.5 font-mono text-muted-foreground">
                            {r[c.name] === null || r[c.name] === undefined
                              ? <span className="italic opacity-60">null</span>
                              : String(r[c.name])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {active.warnings.length > 0 && (
              <div className="rounded-md border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 p-3 text-xs">
                {active.warnings.map((w, i) => <div key={i}>• {w}</div>)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
