export type ConnectorKind =
  | "postgres" | "mysql" | "sqlserver" | "oracle" | "mongodb"
  | "snowflake" | "bigquery" | "redshift" | "synapse" | "clickhouse" | "duckdb"
  | "s3" | "gcs" | "azureblob" | "sftp" | "ftp"
  | "kafka" | "kinesis" | "eventhub"
  | "rest" | "graphql" | "webhook"
  | "csv" | "excel" | "json";

export type Env = "dev" | "staging" | "prod";
export type Zone = "bronze" | "silver" | "gold" | "archived";

export type SourceStatus = "connected" | "syncing" | "error" | "idle";
export interface DataSource {
  id: string;
  name: string;
  kind: ConnectorKind;
  host?: string;
  database?: string;
  schema?: string;
  status: SourceStatus;
  lastSyncAt: string;
  rowsIngestedToday: number;
  owner: string;
  env: Env;
  tags: string[];
}

export type PipelineStatus = "healthy" | "running" | "failed" | "degraded" | "paused" | "scheduled";
export type PipelineMode = "batch" | "streaming" | "cdc";

export interface PipelineNode {
  id: string;
  type: "source" | "transform" | "quality" | "join" | "sql" | "python" | "spark" | "destination" | "notify";
  label: string;
  position: { x: number; y: number };
  meta?: Record<string, string>;
}
export interface PipelineEdge { id: string; source: string; target: string; }

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  mode: PipelineMode;
  status: PipelineStatus;
  owner: string;
  env: Env;
  schedule: string;             // cron
  lastRunAt: string;
  avgDurationSec: number;
  successRate: number;          // 0..1
  rowsProcessedToday: number;
  costUsdToday: number;
  sourceIds: string[];
  destination: { warehouse: string; table: string; zone: Zone };
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  tags: string[];
  qualityScore: number;         // 0..100
}

export type RunStatus = "success" | "failed" | "running" | "queued" | "cancelled";
export interface PipelineRun {
  id: string;
  pipelineId: string;
  status: RunStatus;
  startedAt: string;
  durationSec: number;
  rows: number;
  costUsd: number;
  triggeredBy: "schedule" | "manual" | "event";
}

export type LogLevel = "info" | "warn" | "error" | "debug";
export interface LogLine {
  id: string;
  runId: string;
  pipelineId: string;
  ts: string;
  level: LogLevel;
  message: string;
  node?: string;
}

export type AlertSeverity = "critical" | "high" | "medium" | "low" | "info";
export interface Alert {
  id: string;
  ts: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  pipelineId?: string;
  ack: boolean;
  channel: "slack" | "email" | "teams" | "webhook" | "pagerduty";
}

export interface Dataset {
  id: string;
  name: string;
  zone: Zone;
  warehouse: string;
  schema: string;
  rows: number;
  sizeMb: number;
  owner: string;
  tags: string[];
  columns: Array<{ name: string; type: string; nullable: boolean; pii?: boolean }>;
  updatedAt: string;
  popularity: number;
  description: string;
}

export interface LineageNode { id: string; label: string; kind: "source" | "pipeline" | "dataset" | "dashboard"; zone?: Zone }
export interface LineageEdge { source: string; target: string }
