import type {
  Alert, DataSource, Dataset, LineageEdge, LineageNode, LogLine,
  Pipeline, PipelineRun,
} from "./types";

// Deterministic PRNG — SSR and client must produce identical seed data,
// otherwise React hydration fails on rendered numbers.
function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry(20260401);

const now = Date.now();
const ago = (mins: number) => new Date(now - mins * 60_000).toISOString();

export const seedSources: DataSource[] = [
  { id: "src_pg_orders", name: "OrdersDB (Postgres)", kind: "postgres", host: "orders.internal", database: "orders", schema: "public", status: "connected", lastSyncAt: ago(6), rowsIngestedToday: 1_284_512, owner: "data-platform", env: "prod", tags: ["orders", "oltp"] },
  { id: "src_mysql_users", name: "UsersDB (MySQL)", kind: "mysql", host: "users.internal", database: "users", status: "connected", lastSyncAt: ago(11), rowsIngestedToday: 89_120, owner: "growth", env: "prod", tags: ["users", "cdc"] },
  { id: "src_kafka_events", name: "Clickstream (Kafka)", kind: "kafka", host: "kafka-01:9092", status: "syncing", lastSyncAt: ago(1), rowsIngestedToday: 8_942_301, owner: "analytics", env: "prod", tags: ["events", "streaming"] },
  { id: "src_s3_logs", name: "App Logs (S3)", kind: "s3", host: "s3://nexusflow-logs", status: "connected", lastSyncAt: ago(22), rowsIngestedToday: 412_998, owner: "sre", env: "prod", tags: ["logs"] },
  { id: "src_stripe", name: "Stripe API", kind: "rest", host: "api.stripe.com", status: "connected", lastSyncAt: ago(45), rowsIngestedToday: 12_411, owner: "finance", env: "prod", tags: ["payments"] },
  { id: "src_mongo_catalog", name: "Product Catalog (Mongo)", kind: "mongodb", host: "mongo.internal", database: "catalog", status: "error", lastSyncAt: ago(180), rowsIngestedToday: 0, owner: "catalog", env: "prod", tags: ["products"] },
  { id: "src_snowflake_ext", name: "Partner Snowflake", kind: "snowflake", host: "acme.snowflakecomputing.com", database: "PARTNER", status: "connected", lastSyncAt: ago(90), rowsIngestedToday: 220_444, owner: "partnerships", env: "prod", tags: ["b2b"] },
  { id: "src_gcs_ml", name: "ML Features (GCS)", kind: "gcs", host: "gs://nexusflow-ml", status: "idle", lastSyncAt: ago(720), rowsIngestedToday: 0, owner: "ml-platform", env: "staging", tags: ["ml"] },
];

const grid = (col: number, row: number) => ({ x: 60 + col * 220, y: 60 + row * 130 });

export const seedPipelines: Pipeline[] = [
  {
    id: "pl_orders_bronze_gold",
    name: "orders → gold.orders_enriched",
    description: "Ingests OrdersDB via CDC, joins users, applies quality rules, lands in gold.",
    mode: "cdc", status: "healthy", owner: "data-platform", env: "prod",
    schedule: "*/15 * * * *", lastRunAt: ago(8), avgDurationSec: 214,
    successRate: 0.984, rowsProcessedToday: 1_284_512, costUsdToday: 42.11,
    sourceIds: ["src_pg_orders", "src_mysql_users"],
    destination: { warehouse: "Snowflake", table: "gold.orders_enriched", zone: "gold" },
    tags: ["core", "revenue"], qualityScore: 96,
    nodes: [
      { id: "n1", type: "source", label: "orders (CDC)", position: grid(0, 0), meta: { source: "src_pg_orders" } },
      { id: "n2", type: "source", label: "users", position: grid(0, 1), meta: { source: "src_mysql_users" } },
      { id: "n3", type: "quality", label: "Null & PK checks", position: grid(1, 0) },
      { id: "n4", type: "join", label: "Join on user_id", position: grid(2, 0) },
      { id: "n5", type: "sql", label: "Enrich + partition", position: grid(3, 0) },
      { id: "n6", type: "destination", label: "gold.orders_enriched", position: grid(4, 0) },
      { id: "n7", type: "notify", label: "Alert on failure", position: grid(4, 1) },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n3" }, { id: "e2", source: "n3", target: "n4" },
      { id: "e3", source: "n2", target: "n4" }, { id: "e4", source: "n4", target: "n5" },
      { id: "e5", source: "n5", target: "n6" }, { id: "e6", source: "n6", target: "n7" },
    ],
  },
  {
    id: "pl_clickstream_stream",
    name: "clickstream → silver.events",
    description: "Real-time Kafka ingestion with Spark structured streaming.",
    mode: "streaming", status: "running", owner: "analytics", env: "prod",
    schedule: "continuous", lastRunAt: ago(0), avgDurationSec: 0,
    successRate: 0.997, rowsProcessedToday: 8_942_301, costUsdToday: 88.20,
    sourceIds: ["src_kafka_events"],
    destination: { warehouse: "Delta Lake", table: "silver.events", zone: "silver" },
    tags: ["streaming", "events"], qualityScore: 92,
    nodes: [
      { id: "n1", type: "source", label: "kafka: events", position: grid(0, 0) },
      { id: "n2", type: "spark", label: "Spark structured", position: grid(1, 0) },
      { id: "n3", type: "quality", label: "Schema evolution", position: grid(2, 0) },
      { id: "n4", type: "destination", label: "silver.events", position: grid(3, 0) },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" },
      { id: "e3", source: "n3", target: "n4" },
    ],
  },
  {
    id: "pl_stripe_finance",
    name: "stripe → gold.finance_daily",
    description: "Hourly REST pull, dbt models, materialized to gold.",
    mode: "batch", status: "degraded", owner: "finance", env: "prod",
    schedule: "0 * * * *", lastRunAt: ago(38), avgDurationSec: 402,
    successRate: 0.912, rowsProcessedToday: 12_411, costUsdToday: 6.44,
    sourceIds: ["src_stripe"],
    destination: { warehouse: "Snowflake", table: "gold.finance_daily", zone: "gold" },
    tags: ["finance", "dbt"], qualityScore: 81,
    nodes: [
      { id: "n1", type: "source", label: "Stripe API", position: grid(0, 0) },
      { id: "n2", type: "python", label: "Paginate + hash", position: grid(1, 0) },
      { id: "n3", type: "sql", label: "dbt: stg_stripe", position: grid(2, 0) },
      { id: "n4", type: "quality", label: "Freshness + range", position: grid(3, 0) },
      { id: "n5", type: "destination", label: "gold.finance_daily", position: grid(4, 0) },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" },
      { id: "e3", source: "n3", target: "n4" }, { id: "e4", source: "n4", target: "n5" },
    ],
  },
  {
    id: "pl_catalog_sync",
    name: "mongo.catalog → silver.products",
    description: "Nightly product catalog sync — currently failing on schema drift.",
    mode: "batch", status: "failed", owner: "catalog", env: "prod",
    schedule: "0 2 * * *", lastRunAt: ago(180), avgDurationSec: 612,
    successRate: 0.612, rowsProcessedToday: 0, costUsdToday: 1.10,
    sourceIds: ["src_mongo_catalog"],
    destination: { warehouse: "Delta Lake", table: "silver.products", zone: "silver" },
    tags: ["products", "nightly"], qualityScore: 42,
    nodes: [
      { id: "n1", type: "source", label: "mongo.catalog", position: grid(0, 0) },
      { id: "n2", type: "python", label: "Flatten nested", position: grid(1, 0) },
      { id: "n3", type: "quality", label: "Contract check", position: grid(2, 0) },
      { id: "n4", type: "destination", label: "silver.products", position: grid(3, 0) },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" },
      { id: "e3", source: "n3", target: "n4" },
    ],
  },
  {
    id: "pl_ml_features",
    name: "gold → feature_store.user_features",
    description: "Rebuilds ML feature store views for the churn model.",
    mode: "batch", status: "scheduled", owner: "ml-platform", env: "prod",
    schedule: "0 4 * * *", lastRunAt: ago(1440), avgDurationSec: 890,
    successRate: 0.973, rowsProcessedToday: 0, costUsdToday: 0,
    sourceIds: ["src_snowflake_ext"],
    destination: { warehouse: "Snowflake", table: "feature_store.user_features", zone: "gold" },
    tags: ["ml", "features"], qualityScore: 94,
    nodes: [
      { id: "n1", type: "source", label: "gold.orders_enriched", position: grid(0, 0) },
      { id: "n2", type: "sql", label: "Window aggregates", position: grid(1, 0) },
      { id: "n3", type: "spark", label: "Feature transform", position: grid(2, 0) },
      { id: "n4", type: "destination", label: "feature_store.user_features", position: grid(3, 0) },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" },
      { id: "e3", source: "n3", target: "n4" },
    ],
  },
  {
    id: "pl_logs_archive",
    name: "s3.logs → archived.raw_logs",
    description: "Compresses and archives raw logs older than 30 days.",
    mode: "batch", status: "paused", owner: "sre", env: "prod",
    schedule: "0 3 * * 0", lastRunAt: ago(5400), avgDurationSec: 1400,
    successRate: 0.999, rowsProcessedToday: 0, costUsdToday: 0,
    sourceIds: ["src_s3_logs"],
    destination: { warehouse: "Delta Lake", table: "archived.raw_logs", zone: "archived" },
    tags: ["ops", "archive"], qualityScore: 88,
    nodes: [
      { id: "n1", type: "source", label: "s3://logs", position: grid(0, 0) },
      { id: "n2", type: "python", label: "Compress + hash", position: grid(1, 0) },
      { id: "n3", type: "destination", label: "archived.raw_logs", position: grid(2, 0) },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2" }, { id: "e2", source: "n2", target: "n3" },
    ],
  },
];

// Runs — 40 recent
export const seedRuns: PipelineRun[] = Array.from({ length: 60 }).flatMap((_, i) => {
  const p = seedPipelines[i % seedPipelines.length];
  const failed = (i % 11) === 0 && p.status !== "paused";
  const running = p.status === "running" && i < 3;
  return [{
    id: `run_${p.id}_${i}`,
    pipelineId: p.id,
    status: running ? "running" : failed ? "failed" : "success",
    startedAt: ago(i * 18 + 3),
    durationSec: Math.round(p.avgDurationSec * (0.8 + rnd() * 0.5)),
    rows: Math.round(p.rowsProcessedToday / 40 * (0.7 + rnd() * 0.6)),
    costUsd: +(p.costUsdToday / 40 * (0.7 + rnd() * 0.6)).toFixed(2),
    triggeredBy: (i % 7 === 0 ? "manual" : "schedule") as "manual" | "schedule",
  } satisfies PipelineRun];
});

export const seedLogs: LogLine[] = seedRuns.slice(0, 24).flatMap((r) => {
  const p = seedPipelines.find((x) => x.id === r.pipelineId)!;
  const base = new Date(r.startedAt).getTime();
  const lines: LogLine[] = [
    { id: `${r.id}_l1`, runId: r.id, pipelineId: r.pipelineId, ts: new Date(base).toISOString(), level: "info", message: `Run started (${r.triggeredBy})`, node: p.nodes[0]?.label },
    { id: `${r.id}_l2`, runId: r.id, pipelineId: r.pipelineId, ts: new Date(base + 4000).toISOString(), level: "info", message: `Read ${r.rows.toLocaleString()} rows from ${p.nodes[0]?.label}` },
    { id: `${r.id}_l3`, runId: r.id, pipelineId: r.pipelineId, ts: new Date(base + 12000).toISOString(), level: "debug", message: `Applied ${p.nodes.length - 2} transformations` },
  ];
  if (r.status === "failed") {
    lines.push({ id: `${r.id}_l4`, runId: r.id, pipelineId: r.pipelineId, ts: new Date(base + 22000).toISOString(), level: "error", message: `Schema drift detected on column 'price_v2' — expected DECIMAL(10,2), got STRING`, node: "Contract check" });
  } else {
    lines.push({ id: `${r.id}_l4`, runId: r.id, pipelineId: r.pipelineId, ts: new Date(base + r.durationSec * 1000).toISOString(), level: "info", message: `Wrote ${r.rows.toLocaleString()} rows to ${p.destination.table} in ${r.durationSec}s` });
  }
  return lines;
});

export const seedAlerts: Alert[] = [
  { id: "al_1", ts: ago(12), severity: "critical", title: "Pipeline failed: mongo.catalog → silver.products", detail: "Contract validation failed on column price_v2 (schema drift).", pipelineId: "pl_catalog_sync", ack: false, channel: "slack" },
  { id: "al_2", ts: ago(38), severity: "high", title: "Elevated failure rate: stripe → gold.finance_daily", detail: "Success rate dropped to 91.2% over last 24h.", pipelineId: "pl_stripe_finance", ack: false, channel: "pagerduty" },
  { id: "al_3", ts: ago(120), severity: "medium", title: "Freshness SLA breached: gold.orders_enriched", detail: "Lag reached 27m (SLA 15m). Auto-recovered.", pipelineId: "pl_orders_bronze_gold", ack: true, channel: "slack" },
  { id: "al_4", ts: ago(240), severity: "low", title: "Cost spike: clickstream stream", detail: "Hourly cost +38% vs 7d avg — investigate partitioning.", pipelineId: "pl_clickstream_stream", ack: false, channel: "email" },
  { id: "al_5", ts: ago(1440), severity: "info", title: "Weekly report ready", detail: "Data quality report for W48 is available.", ack: true, channel: "email" },
];

export const seedDatasets: Dataset[] = [
  {
    id: "ds_gold_orders", name: "gold.orders_enriched", zone: "gold", warehouse: "Snowflake", schema: "gold",
    rows: 48_211_003, sizeMb: 4210, owner: "data-platform", tags: ["revenue", "certified"], popularity: 96,
    description: "Enriched orders with customer + product metadata. Source of truth for revenue.",
    updatedAt: ago(8),
    columns: [
      { name: "order_id", type: "STRING", nullable: false },
      { name: "user_id", type: "STRING", nullable: false, pii: true },
      { name: "email", type: "STRING", nullable: true, pii: true },
      { name: "total_usd", type: "DECIMAL(12,2)", nullable: false },
      { name: "created_at", type: "TIMESTAMP", nullable: false },
    ],
  },
  {
    id: "ds_silver_events", name: "silver.events", zone: "silver", warehouse: "Delta Lake", schema: "silver",
    rows: 2_311_090_812, sizeMb: 82_400, owner: "analytics", tags: ["events", "hot"], popularity: 88,
    description: "Cleaned clickstream events, deduped and partitioned by day.",
    updatedAt: ago(0),
    columns: [
      { name: "event_id", type: "STRING", nullable: false },
      { name: "user_id", type: "STRING", nullable: true, pii: true },
      { name: "event_type", type: "STRING", nullable: false },
      { name: "ts", type: "TIMESTAMP", nullable: false },
      { name: "properties", type: "MAP", nullable: true },
    ],
  },
  {
    id: "ds_silver_products", name: "silver.products", zone: "silver", warehouse: "Delta Lake", schema: "silver",
    rows: 128_412, sizeMb: 92, owner: "catalog", tags: ["products", "stale"], popularity: 61,
    description: "Product catalog flattened from Mongo. Currently stale — see alert.",
    updatedAt: ago(180),
    columns: [
      { name: "sku", type: "STRING", nullable: false },
      { name: "name", type: "STRING", nullable: false },
      { name: "price_v2", type: "STRING", nullable: true },
      { name: "category", type: "STRING", nullable: true },
    ],
  },
  {
    id: "ds_feature_user", name: "feature_store.user_features", zone: "gold", warehouse: "Snowflake", schema: "feature_store",
    rows: 12_100_982, sizeMb: 1820, owner: "ml-platform", tags: ["ml", "features"], popularity: 79,
    description: "Per-user aggregated features for churn model v3.",
    updatedAt: ago(1440),
    columns: [
      { name: "user_id", type: "STRING", nullable: false, pii: true },
      { name: "orders_30d", type: "INT", nullable: false },
      { name: "revenue_30d", type: "DECIMAL(12,2)", nullable: false },
      { name: "last_seen_days", type: "INT", nullable: false },
    ],
  },
];

export const seedLineage: { nodes: LineageNode[]; edges: LineageEdge[] } = {
  nodes: [
    ...seedSources.map((s) => ({ id: s.id, label: s.name, kind: "source" as const })),
    ...seedPipelines.map((p) => ({ id: p.id, label: p.name, kind: "pipeline" as const })),
    ...seedDatasets.map((d) => ({ id: d.id, label: d.name, kind: "dataset" as const, zone: d.zone })),
    { id: "dash_revenue", label: "Executive Revenue Dashboard", kind: "dashboard" },
    { id: "dash_ml", label: "Churn Model v3", kind: "dashboard" },
  ],
  edges: [
    ...seedPipelines.flatMap((p) => p.sourceIds.map((s) => ({ source: s, target: p.id }))),
    { source: "pl_orders_bronze_gold", target: "ds_gold_orders" },
    { source: "pl_clickstream_stream", target: "ds_silver_events" },
    { source: "pl_catalog_sync", target: "ds_silver_products" },
    { source: "pl_ml_features", target: "ds_feature_user" },
    { source: "ds_gold_orders", target: "dash_revenue" },
    { source: "ds_feature_user", target: "dash_ml" },
    { source: "ds_gold_orders", target: "pl_ml_features" },
  ],
};

// 24h time series
export const seedThroughput = Array.from({ length: 24 }).map((_, h) => ({
  hour: `${String(h).padStart(2, "0")}:00`,
  batch: Math.round(200_000 + Math.sin(h / 3) * 90_000 + rnd() * 40_000),
  streaming: Math.round(380_000 + Math.cos(h / 4) * 120_000 + rnd() * 60_000),
}));

export const seedCost7d = Array.from({ length: 7 }).map((_, d) => ({
  day: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][d],
  compute: +(120 + rnd() * 60).toFixed(2),
  storage: +(40 + rnd() * 15).toFixed(2),
  egress: +(18 + rnd() * 10).toFixed(2),
}));
