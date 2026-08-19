// Real CSV ingestion: parse → infer schema → profile → keep the raw rows.
// Pure functions, no side effects. The parsed rows are the single copy of the
// data used by preview, pipeline execution and the quality engine.

import Papa from "papaparse";
import type { DataContract, RawRecord } from "./contracts";

export type InferredType = "string" | "integer" | "decimal" | "boolean" | "date" | "datetime";

export interface IngestedColumn {
  name: string;
  type: InferredType;
  nullable: boolean;
  nullCount: number;
  nullPct: number;
  distinct: number;
  sample: string[];
}

export interface IngestedDataset {
  id: string;
  name: string;
  fileName: string;
  uploadedAt: string;
  rowCount: number;
  columnCount: number;
  columns: IngestedColumn[];
  /** Every parsed record — kept in full so pipelines process the real data. */
  rawRows: RawRecord[];
  nullCells: number;
  nullPct: number;
  duplicateRows: number;
  malformedRows: number;
  warnings: string[];
}

export class IngestError extends Error {}

const BOOLEANS = new Set(["true", "false", "yes", "no", "0", "1", "y", "n"]);
const INT_RE = /^-?\d+$/;
const DEC_RE = /^-?\d+(\.\d+)?$/;
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function coerce(raw: string): string | number | null {
  const v = raw.trim();
  if (v === "" || v.toLowerCase() === "null" || v.toLowerCase() === "na") return null;
  if (DEC_RE.test(v)) return Number(v);
  return v;
}

function inferType(values: Array<string | number | null>): InferredType {
  const nonNull = values.filter((v) => v !== null).map((v) => String(v).trim());
  if (!nonNull.length) return "string";
  if (nonNull.every((v) => INT_RE.test(v))) return "integer";
  if (nonNull.every((v) => DEC_RE.test(v))) return "decimal";
  if (nonNull.every((v) => BOOLEANS.has(v.toLowerCase()))) return "boolean";
  if (nonNull.every((v) => DATE_ONLY_RE.test(v))) return "date";
  if (nonNull.every((v) => Number.isNaN(Number(v)) && !Number.isNaN(Date.parse(v)))) return "datetime";
  return "string";
}

/** Parses CSV text into a fully profiled dataset that retains every raw row. */
export function ingestCsvText(text: string, fileName: string, datasetName?: string): IngestedDataset {
  if (!text || !text.trim()) throw new IngestError("The file is empty — no CSV content found.");

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });

  const headers = (parsed.meta.fields ?? []).filter((h) => h && h.length > 0);
  if (!headers.length) throw new IngestError("No header row detected. The first line must contain column names.");
  if (new Set(headers).size !== headers.length) {
    throw new IngestError("Duplicate column names in the header row — column names must be unique.");
  }
  if (!parsed.data.length) throw new IngestError("The CSV has a header but no data rows.");

  const warnings: string[] = [];
  let malformedRows = 0;

  const rawRows: RawRecord[] = [];
  for (const row of parsed.data) {
    const keys = Object.keys(row).filter((k) => k !== "__parsed_extra");
    const fieldCount = keys.length;
    if ("__parsed_extra" in row || fieldCount !== headers.length) malformedRows += 1;
    const rec: RawRecord = {};
    for (const h of headers) rec[h] = coerce(row[h] ?? "");
    // Skip rows that are entirely empty.
    if (Object.values(rec).every((v) => v === null)) {
      malformedRows += 1;
      continue;
    }
    rawRows.push(rec);
  }

  if (!rawRows.length) throw new IngestError("No usable data rows — every row was empty or malformed.");
  if (malformedRows) warnings.push(`${malformedRows.toLocaleString()} row(s) had a field count mismatch and were repaired or skipped.`);
  for (const e of parsed.errors.slice(0, 3)) warnings.push(`Parser: ${e.message} (row ${e.row ?? "?"})`);

  const columns: IngestedColumn[] = headers.map((name) => {
    const values = rawRows.map((r) => r[name] ?? null);
    const nullCount = values.filter((v) => v === null).length;
    const nonNull = values.filter((v) => v !== null).map(String);
    return {
      name,
      type: inferType(values),
      nullable: nullCount > 0,
      nullCount,
      nullPct: +((nullCount / rawRows.length) * 100).toFixed(2),
      distinct: new Set(nonNull).size,
      sample: [...new Set(nonNull)].slice(0, 4),
    };
  });

  const seen = new Set<string>();
  let duplicateRows = 0;
  for (const r of rawRows) {
    const key = headers.map((h) => String(r[h] ?? "")).join("\u0001");
    if (seen.has(key)) duplicateRows += 1;
    else seen.add(key);
  }

  const nullCells = columns.reduce((a, c) => a + c.nullCount, 0);
  const id = `ds_upload_${Date.now()}`;

  return {
    id,
    name: datasetName ?? fileName.replace(/\.[^.]+$/, ""),
    fileName,
    uploadedAt: new Date().toISOString(),
    rowCount: rawRows.length,
    columnCount: headers.length,
    columns,
    rawRows,
    nullCells,
    nullPct: +((nullCells / (rawRows.length * headers.length)) * 100).toFixed(2),
    duplicateRows,
    malformedRows,
    warnings,
  };
}

export function assertCsvFile(file: File) {
  const ok = /\.csv$/i.test(file.name) || file.type === "text/csv" || file.type === "application/vnd.ms-excel";
  if (!ok) throw new IngestError(`Unsupported file type "${file.name}". Upload a .csv file.`);
  if (file.size === 0) throw new IngestError("The selected file is empty.");
  if (file.size > 25 * 1024 * 1024) throw new IngestError("File too large — the demo accepts CSV files up to 25 MB.");
}

/**
 * Builds a data contract from an uploaded dataset's inferred schema, so custom
 * CSVs are validated against their own shape instead of the Orders contract.
 * Validation is real: types must hold and columns that were fully populated at
 * ingest time are required.
 */
export function contractFromDataset(ds: IngestedDataset): DataContract {
  return {
    id: `dc_${ds.id}`,
    name: ds.name,
    version: "1.0.0",
    owner: "you",
    dataset: `bronze.${ds.name}`,
    fields: ds.columns.map((c) => ({
      name: c.name,
      type:
        c.type === "integer" || c.type === "decimal"
          ? ("number" as const)
          : c.type === "date" || c.type === "datetime"
            ? ("timestamp" as const)
            : ("string" as const),
      required: !c.nullable,
      pii: /email|phone|ssn|address|name/i.test(c.name),
      description: `Inferred ${c.type} from ${ds.fileName} · ${c.distinct.toLocaleString()} distinct, ${c.nullPct}% null`,
    })),
  };
}
