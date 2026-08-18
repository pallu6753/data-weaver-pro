import { create } from "zustand";
import {
  seedAlerts, seedDatasets, seedLineage, seedLogs, seedPipelines, seedRuns, seedSources,
} from "./seed";
import type {
  Alert, DataSource, Dataset, LineageEdge, LineageNode, LogLine, Pipeline, PipelineRun,
} from "./types";
import { ordersContract, type RawRecord } from "@/lib/engine/contracts";
import { applyDrift, applyRenameFix, generateOrders, ORDERS_DRIFT } from "@/lib/engine/dataset";
import { executeBatch, type ExecutionResult } from "@/lib/engine/execution";
import { buildIncident, type Incident } from "@/lib/engine/incident";
import type { IngestedDataset } from "@/lib/engine/ingest";

export const DEMO_PIPELINE_ID = "pl_orders_bronze_gold";

export interface QuarantinedRecord {
  id: string;
  incidentId: string;
  record: RawRecord;
  reason: string;
  status: "quarantined" | "replayed" | "failed";
  quarantinedAt: string;
  replayedAt?: string;
}
interface PlatformState {
  sources: DataSource[];
  pipelines: Pipeline[];
  runs: PipelineRun[];
  logs: LogLine[];
  alerts: Alert[];
  datasets: Dataset[];
  lineage: { nodes: LineageNode[]; edges: LineageEdge[] };

  // Real processing state
  batch: RawRecord[];
  batchLabel: string;
  driftActive: boolean;
  executions: ExecutionResult[];
  incidents: Incident[];
  quarantine: QuarantinedRecord[];

  /** Uploaded CSV datasets, raw rows included. */
  uploads: IngestedDataset[];
  activeUploadId: string | null;

  addSource: (s: DataSource) => void;
  addPipeline: (p: Pipeline) => void;
  updatePipeline: (id: string, patch: Partial<Pipeline>) => void;
  triggerRun: (pipelineId: string) => PipelineRun;
  ackAlert: (id: string) => void;

  loadBatch: (records: RawRecord[], label: string) => void;
  /** Registers a parsed CSV upload and makes its raw rows the active batch. */
  registerUpload: (ds: IngestedDataset) => void;
  setActiveUpload: (id: string) => void;
  /** Rows a pipeline should process: the active upload, else the generated batch. */
  getActiveRows: () => RawRecord[];
  executePipeline: (pipelineId: string) => ExecutionResult;
  runDemoIncident: () => Incident;
  applyCopilotFix: (incidentId: string) => void;
  replayFailedRecords: (incidentId: string) => { recovered: number; stillFailing: number };
  setIncidentStatus: (incidentId: string, status: Incident["status"]) => void;
}

function executionToRun(res: ExecutionResult): PipelineRun {
  return {
    id: res.runId,
    pipelineId: res.pipelineId,
    status: res.status === "failed" ? "failed" : "success",
    startedAt: res.startedAt,
    durationSec: Math.round(res.durationMs / 1000),
    rows: res.rowsLoaded,
    costUsd: res.costUsd,
    triggeredBy: "manual",
  };
}

function executionToLogs(res: ExecutionResult): LogLine[] {
  return res.logs.map((l, i) => ({
    id: `${res.runId}_le${i}`,
    runId: res.runId,
    pipelineId: res.pipelineId,
    ts: l.ts,
    level: l.level,
    message: l.message,
    node: l.stage,
  }));
}

export const usePlatform = create<PlatformState>((set, get) => ({
  sources: seedSources,
  pipelines: seedPipelines,
  runs: seedRuns,
  logs: seedLogs,
  alerts: seedAlerts,
  datasets: seedDatasets,
  lineage: seedLineage,

  batch: generateOrders(),
  batchLabel: "orders_demo · 500 rows (generated)",
  driftActive: false,
  executions: [],
  incidents: [],
  quarantine: [],
  uploads: [],
  activeUploadId: null,

  addSource: (s) => set((st) => ({ sources: [s, ...st.sources] })),
  addPipeline: (p) => set((st) => ({
    pipelines: [p, ...st.pipelines],
    lineage: {
      nodes: [...st.lineage.nodes, { id: p.id, label: p.name, kind: "pipeline" }],
      edges: [...st.lineage.edges, ...p.sourceIds.map((s) => ({ source: s, target: p.id }))],
    },
  })),
  updatePipeline: (id, patch) => set((st) => ({
    pipelines: st.pipelines.map((p) => (p.id === id ? { ...p, ...patch } : p)),
  })),

  triggerRun: (pipelineId) => executionToRun(get().executePipeline(pipelineId)),

  ackAlert: (id) => set((st) => ({
    alerts: st.alerts.map((a) => (a.id === id ? { ...a, ack: true } : a)),
  })),

  loadBatch: (records, label) => set({ batch: records, batchLabel: label, driftActive: false }),

  registerUpload: (ds) => set((st) => ({

    uploads: [ds, ...st.uploads.filter((u) => u.id !== ds.id)],
    activeUploadId: ds.id,
    // The uploaded rows become the rows every pipeline run processes.
    batch: ds.rawRows,
    batchLabel: `${ds.name} · ${ds.rowCount.toLocaleString()} rows (${ds.fileName})`,
    driftActive: false,
    datasets: [
      {
        id: ds.id,
        name: `bronze.${ds.name}`,
        zone: "bronze" as const,
        warehouse: "NexusFlow Lake",
        schema: "bronze",
        rows: ds.rowCount,
        sizeMb: +((ds.rowCount * ds.columnCount * 24) / 1_048_576).toFixed(2),
        owner: "you",
        tags: ["uploaded", "csv"],
        columns: ds.columns.map((c) => ({
          name: c.name,
          type: c.type.toUpperCase(),
          nullable: c.nullable,
          pii: /email|phone|ssn|address|name/i.test(c.name),
        })),
        updatedAt: ds.uploadedAt,
        popularity: 1,
        description: `Ingested from ${ds.fileName} — ${ds.rowCount.toLocaleString()} rows, ${ds.columnCount} columns.`,
      },
      ...st.datasets.filter((d) => d.id !== ds.id),
    ],
  })),

  setActiveUpload: (id) => set((st) => {
    const ds = st.uploads.find((u) => u.id === id);
    if (!ds) return {};
    return {
      activeUploadId: id,
      batch: ds.rawRows,
      batchLabel: `${ds.name} · ${ds.rowCount.toLocaleString()} rows (${ds.fileName})`,
      driftActive: false,
    };
  }),

  getActiveRows: () => {
    const st = get();
    const active = st.uploads.find((u) => u.id === st.activeUploadId);
    return active && !st.driftActive ? active.rawRows : st.batch;
  },

  executePipeline: (pipelineId) => {
    const res = executeBatch({ pipelineId, records: get().getActiveRows(), contract: ordersContract });
    set((st) => ({
      executions: [res, ...st.executions],
      runs: [executionToRun(res), ...st.runs],
      logs: [...executionToLogs(res), ...st.logs],
      pipelines: st.pipelines.map((p) => p.id === pipelineId ? {
        ...p,
        status: res.status === "failed" ? "failed" : res.status === "partial" ? "degraded" : "healthy",
        lastRunAt: res.finishedAt,
        qualityScore: res.qualityScore,
        rowsProcessedToday: p.rowsProcessedToday + res.rowsLoaded,
        avgDurationSec: Math.round(res.durationMs / 1000),
      } : p),
    }));
    return res;
  },

  runDemoIncident: () => {
    const drifted = applyDrift(generateOrders());
    set({ batch: drifted, batchLabel: "orders_demo · 500 rows (post-migration payload)", driftActive: true });
    const res = get().executePipeline(DEMO_PIPELINE_ID);
    const incident = buildIncident(res, ORDERS_DRIFT);
    set((st) => ({
      incidents: [incident, ...st.incidents],
      alerts: [{
        id: `al_${incident.id}`,
        ts: incident.createdAt,
        severity: incident.severity === "critical" ? "critical" : "high",
        title: `${incident.ref}: ${incident.title}`,
        detail: incident.rootCause.summary,
        pipelineId: incident.pipelineId,
        ack: false,
        channel: "slack",
      }, ...st.alerts],
      sources: st.sources.map((s) => s.id === "src_pg_orders" ? { ...s, status: "error" } : s),
      datasets: st.datasets.map((d) => d.id === "ds_gold_orders"
        ? { ...d, tags: [...new Set([...d.tags, "stale"])] } : d),
    }));
    return incident;
  },

  applyCopilotFix: (incidentId) => {
    set((st) => ({
      batch: applyRenameFix(st.batch),
      driftActive: false,
      incidents: st.incidents.map((i) => i.id === incidentId ? {
        ...i,
        status: "mitigating",
        fixApplied: true,
        timeline: [...i.timeline, {
          ts: new Date().toISOString(),
          actor: "copilot" as const,
          title: "Remediation applied — column mapping + type coercion",
          detail: `Added mapping order_total → total_amount with CAST to DECIMAL(12,2); pipeline saved as v${(st.pipelines.find((p) => p.id === i.pipelineId)?.qualityScore ?? 0) > 0 ? "2" : "2"}.`,
        }],
      } : i),
    }));
  },

  replayFailedRecords: (incidentId) => {
    const st = get();
    const incident = st.incidents.find((i) => i.id === incidentId);
    if (!incident) return { recovered: 0, stillFailing: 0 };
    const res = executeBatch({
      pipelineId: incident.pipelineId,
      records: incident.fixApplied ? st.batch : applyRenameFix(st.batch),
      contract: ordersContract,
      runId: `replay_${incident.runId}`,
    });
    const recovered = res.validation.passed;
    const stillFailing = res.validation.failed;
    set((state) => ({
      executions: [res, ...state.executions],
      runs: [{ ...executionToRun(res), triggeredBy: "manual" }, ...state.runs],
      logs: [...executionToLogs(res), ...state.logs],
      pipelines: state.pipelines.map((p) => p.id === incident.pipelineId ? {
        ...p,
        status: stillFailing === 0 ? "healthy" : "degraded",
        qualityScore: res.qualityScore,
        lastRunAt: res.finishedAt,
        rowsProcessedToday: p.rowsProcessedToday + recovered,
      } : p),
      sources: state.sources.map((s) => s.id === "src_pg_orders" ? { ...s, status: "connected" } : s),
      datasets: state.datasets.map((d) => d.id === "ds_gold_orders"
        ? { ...d, tags: d.tags.filter((t) => t !== "stale"), updatedAt: res.finishedAt, rows: d.rows + recovered } : d),
      alerts: state.alerts.map((a) => a.pipelineId === incident.pipelineId ? { ...a, ack: true } : a),
      incidents: state.incidents.map((i) => i.id === incidentId ? {
        ...i,
        status: stillFailing === 0 ? "resolved" : "mitigating",
        replay: { runId: res.runId, recovered, stillFailing, at: res.finishedAt },
        timeline: [...i.timeline, {
          ts: res.finishedAt,
          actor: "you" as const,
          title: `Replayed ${incident.failedCount.toLocaleString()} quarantined records`,
          detail: `${recovered.toLocaleString()} recovered, ${stillFailing.toLocaleString()} still failing`,
        }],
      } : i),
    }));
    return { recovered, stillFailing };
  },

  setIncidentStatus: (incidentId, status) => set((st) => ({
    incidents: st.incidents.map((i) => i.id === incidentId ? {
      ...i, status,
      timeline: [...i.timeline, { ts: new Date().toISOString(), actor: "you" as const, title: `Status → ${status}` }],
    } : i),
  })),
}));
