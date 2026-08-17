// Data contracts + real record-level validation engine.
// Pure functions — no side effects, safe on server and client.

export type FieldType = "string" | "number" | "timestamp" | "enum";

export interface ContractField {
  name: string;
  type: FieldType;
  required: boolean;
  pii?: boolean;
  min?: number;
  values?: string[];
  pattern?: RegExp;
  description: string;
}

export interface DataContract {
  id: string;
  name: string;
  version: string;
  owner: string;
  dataset: string;
  fields: ContractField[];
}

export const ordersContract: DataContract = {
  id: "dc_orders_v2",
  name: "orders.raw",
  version: "2.1.0",
  owner: "data-platform",
  dataset: "gold.orders_enriched",
  fields: [
    { name: "order_id", type: "string", required: true, pattern: /^ORD-\d{6}$/, description: "Primary key, ORD-nnnnnn" },
    { name: "customer_email", type: "string", required: true, pii: true, pattern: /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i, description: "Customer email (PII)" },
    { name: "total_amount", type: "number", required: true, min: 0, description: "Order total, positive decimal" },
    { name: "currency", type: "enum", required: true, values: ["USD", "EUR", "GBP"], description: "ISO currency code" },
    { name: "created_at", type: "timestamp", required: true, description: "Order creation timestamp" },
    { name: "region", type: "enum", required: true, values: ["NA", "EMEA", "APAC"], description: "Sales region" },
  ],
};

export type RawRecord = Record<string, string | number | null>;

export interface ViolationReason {
  field: string;
  rule: string;
  expected: string;
  actual: string;
}

export interface ValidatedRecord {
  index: number;
  raw: RawRecord;
  valid: boolean;
  reasons: ViolationReason[];
}

export interface ValidationSummary {
  total: number;
  passed: number;
  failed: number;
  records: ValidatedRecord[];
  failedRecords: ValidatedRecord[];
  byRule: Array<{ rule: string; field: string; count: number }>;
  missingFields: string[];
  unexpectedFields: string[];
}

function isTimestamp(v: unknown) {
  if (typeof v !== "string") return false;
  return !Number.isNaN(Date.parse(v));
}

export function validateBatch(records: RawRecord[], contract: DataContract): ValidationSummary {
  const present = new Set(records.length ? Object.keys(records[0]) : []);
  const missingFields = contract.fields.filter((f) => !present.has(f.name)).map((f) => f.name);
  const declared = new Set(contract.fields.map((f) => f.name));
  const unexpectedFields = [...present].filter((k) => !declared.has(k));

  const validated: ValidatedRecord[] = records.map((raw, index) => {
    const reasons: ViolationReason[] = [];
    for (const f of contract.fields) {
      const v = raw[f.name];
      const absent = v === undefined || v === null || v === "";
      if (absent) {
        if (f.required) {
          reasons.push({
            field: f.name,
            rule: present.has(f.name) ? "not_null" : "field_missing",
            expected: present.has(f.name) ? "non-null value" : `column '${f.name}' present`,
            actual: present.has(f.name) ? "null" : "column absent (schema drift)",
          });
        }
        continue;
      }
      if (f.type === "number") {
        const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.\-]/g, "")) ;
        if (typeof v !== "number" && !/^-?\d+(\.\d+)?$/.test(String(v).trim())) {
          reasons.push({ field: f.name, rule: "type_mismatch", expected: "DECIMAL(12,2)", actual: `STRING "${v}"` });
        } else if (f.min !== undefined && n <= f.min) {
          reasons.push({ field: f.name, rule: "range_check", expected: `> ${f.min}`, actual: String(v) });
        }
      }
      if (f.type === "enum" && f.values && !f.values.includes(String(v))) {
        reasons.push({ field: f.name, rule: "accepted_values", expected: f.values.join(" | "), actual: String(v) });
      }
      if (f.type === "timestamp" && !isTimestamp(v)) {
        reasons.push({ field: f.name, rule: "type_mismatch", expected: "ISO-8601 TIMESTAMP", actual: String(v) });
      }
      if (f.type === "string" && f.pattern && !f.pattern.test(String(v))) {
        reasons.push({ field: f.name, rule: "pattern_match", expected: String(f.pattern), actual: String(v) });
      }
    }
    return { index, raw, valid: reasons.length === 0, reasons };
  });

  const failedRecords = validated.filter((r) => !r.valid);
  const ruleMap = new Map<string, { rule: string; field: string; count: number }>();
  for (const r of failedRecords) {
    for (const v of r.reasons) {
      const key = `${v.field}:${v.rule}`;
      const cur = ruleMap.get(key) ?? { rule: v.rule, field: v.field, count: 0 };
      cur.count += 1;
      ruleMap.set(key, cur);
    }
  }

  return {
    total: records.length,
    passed: validated.length - failedRecords.length,
    failed: failedRecords.length,
    records: validated,
    failedRecords,
    byRule: [...ruleMap.values()].sort((a, b) => b.count - a.count),
    missingFields,
    unexpectedFields,
  };
}

export interface ColumnProfile {
  name: string;
  inferredType: string;
  nullCount: number;
  nullPct: number;
  distinct: number;
  min?: string;
  max?: string;
  sample: string[];
}

export function profileBatch(records: RawRecord[]): ColumnProfile[] {
  if (!records.length) return [];
  return Object.keys(records[0]).map((col) => {
    const values = records.map((r) => r[col]);
    const nonNull = values.filter((v) => v !== null && v !== undefined && v !== "");
    const numeric = nonNull.every((v) => /^-?\d+(\.\d+)?$/.test(String(v)));
    const dates = nonNull.every((v) => !Number.isNaN(Date.parse(String(v))));
    const inferredType = numeric ? "DECIMAL" : dates && !numeric ? "TIMESTAMP" : "STRING";
    const sorted = numeric
      ? [...nonNull].map(Number).sort((a, b) => a - b).map(String)
      : [...nonNull].map(String).sort();
    return {
      name: col,
      inferredType,
      nullCount: values.length - nonNull.length,
      nullPct: +(((values.length - nonNull.length) / values.length) * 100).toFixed(2),
      distinct: new Set(nonNull.map(String)).size,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      sample: [...new Set(nonNull.map(String))].slice(0, 4),
    };
  });
}
