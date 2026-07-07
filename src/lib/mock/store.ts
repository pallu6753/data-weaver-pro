import { create } from "zustand";
import {
  seedAlerts, seedDatasets, seedLineage, seedLogs, seedPipelines, seedRuns, seedSources,
} from "./seed";
import type {
  Alert, DataSource, Dataset, LineageEdge, LineageNode, LogLine, Pipeline, PipelineRun,
} from "./types";

interface PlatformState {
  sources: DataSource[];
  pipelines: Pipeline[];
  runs: PipelineRun[];
  logs: LogLine[];
  alerts: Alert[];
  datasets: Dataset[];
  lineage: { nodes: LineageNode[]; edges: LineageEdge[] };
  addSource: (s: DataSource) => void;
  addPipeline: (p: Pipeline) => void;
  updatePipeline: (id: string, patch: Partial<Pipeline>) => void;
  triggerRun: (pipelineId: string) => PipelineRun;
  ackAlert: (id: string) => void;
}

export const usePlatform = create<PlatformState>((set, get) => ({
  sources: seedSources,
  pipelines: seedPipelines,
  runs: seedRuns,
  logs: seedLogs,
  alerts: seedAlerts,
  datasets: seedDatasets,
  lineage: seedLineage,

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
  triggerRun: (pipelineId) => {
    const p = get().pipelines.find((x) => x.id === pipelineId)!;
    const run: PipelineRun = {
      id: `run_${pipelineId}_${Date.now()}`,
      pipelineId,
      status: "running",
      startedAt: new Date().toISOString(),
      durationSec: p.avgDurationSec,
      rows: Math.round(p.rowsProcessedToday / 40),
      costUsd: +(p.costUsdToday / 40).toFixed(2),
      triggeredBy: "manual",
    };
    set((st) => ({ runs: [run, ...st.runs] }));
    // Simulate completion
    setTimeout(() => {
      set((st) => ({
        runs: st.runs.map((r) => (r.id === run.id ? { ...r, status: "success" } : r)),
      }));
    }, 4500);
    return run;
  },
  ackAlert: (id) => set((st) => ({
    alerts: st.alerts.map((a) => (a.id === id ? { ...a, ack: true } : a)),
  })),
}));
