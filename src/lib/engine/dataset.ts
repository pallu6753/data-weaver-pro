import type { RawRecord } from "./contracts";

// Deterministic PRNG so server and client agree and runs are reproducible.
function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["ana", "luis", "mei", "omar", "sofia", "jonas", "priya", "kai", "elena", "tom"];
const LAST = ["reyes", "kim", "novak", "haddad", "silva", "muller", "patel", "chen", "rossi", "walsh"];
const DOMAINS = ["acme.io", "northwind.com", "globex.co", "initech.dev"];
const REGIONS = ["NA", "EMEA", "APAC"];
const CURRENCIES = ["USD", "EUR", "GBP"];

export const DEMO_BATCH_SIZE = 500;

/** Builds a clean, contract-conformant batch of orders. */
export function generateOrders(count = DEMO_BATCH_SIZE, seed = 20260401): RawRecord[] {
  const rnd = mulberry(seed);
  const base = Date.UTC(2026, 3, 1, 0, 0, 0);
  return Array.from({ length: count }, (_, i) => {
    const first = FIRST[Math.floor(rnd() * FIRST.length)];
    const last = LAST[Math.floor(rnd() * LAST.length)];
    return {
      order_id: `ORD-${String(100000 + i).slice(0, 6)}`,
      customer_email: `${first}.${last}${i}@${DOMAINS[Math.floor(rnd() * DOMAINS.length)]}`,
      total_amount: +(9 + rnd() * 940).toFixed(2),
      currency: CURRENCIES[Math.floor(rnd() * CURRENCIES.length)],
      created_at: new Date(base + i * 97_000).toISOString(),
      region: REGIONS[Math.floor(rnd() * REGIONS.length)],
    } satisfies RawRecord;
  });
}

export interface DriftDescription {
  kind: "column_rename" | "type_change";
  from: string;
  to: string;
  detail: string;
  affectedPct: number;
}

export const ORDERS_DRIFT: DriftDescription = {
  kind: "column_rename",
  from: "total_amount",
  to: "order_total",
  detail:
    "Upstream OrdersDB migration renamed total_amount → order_total and began emitting the value as a currency-suffixed string.",
  affectedPct: 100,
};

/**
 * Applies the upstream breaking change: the column is renamed and the value
 * becomes a string like "412.50 USD". Records keep their identity so a replay
 * can repair and reprocess exactly the rows that failed.
 */
export function applyDrift(records: RawRecord[]): RawRecord[] {
  return records.map((r, i) => {
    const { total_amount, ...rest } = r;
    const asString = i % 7 === 0 ? "" : `${total_amount} ${r.currency}`;
    return { ...rest, order_total: asString } as RawRecord;
  });
}

/** The remediation the Copilot proposes: map the renamed column back and coerce the type. */
export function applyRenameFix(records: RawRecord[]): RawRecord[] {
  return records.map((r) => {
    if (!("order_total" in r)) return r;
    const { order_total, ...rest } = r;
    const parsed = Number(String(order_total ?? "").replace(/[^0-9.\-]/g, ""));
    return {
      ...rest,
      total_amount: Number.isFinite(parsed) && parsed > 0 ? +parsed.toFixed(2) : null,
    } as RawRecord;
  });
}

export function toCsv(records: RawRecord[]): string {
  if (!records.length) return "";
  const cols = Object.keys(records[0]);
  const body = records.map((r) => cols.map((c) => String(r[c] ?? "")).join(","));
  return [cols.join(","), ...body].join("\n");
}

export function parseCsv(text: string): RawRecord[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const cols = lines[0].split(",").map((c) => c.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const rec: RawRecord = {};
    cols.forEach((c, i) => {
      const raw = (cells[i] ?? "").trim();
      rec[c] = raw === "" ? null : /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw;
    });
    return rec;
  });
}
