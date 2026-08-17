import type { ValidatedRecord } from "./contracts";
import type { DriftDescription } from "./dataset";
import type { ExecutionResult } from "./execution";

export type IncidentStatus = "open" | "investigating" | "mitigating" | "resolved";

export interface TimelineEvent {
  ts: string;
  actor: "system" | "copilot" | "you";
  title: string;
  detail?: string;
}

export interface Incident {
  id: string;
  ref: string;
  createdAt: string;
  pipelineId: string;
  runId: string;
  severity: "critical" | "high" | "medium";
  status: IncidentStatus;
  title: string;
  drift: DriftDescription;
  rootCause: { summary: string; evidence: string[] };
  impact: { downstreamAssets: string[]; revenueAtRiskUsd: number; slaBreachMin: number; blockedRows: number };
  failedCount: number;
  failedSample: ValidatedRecord[];
  timeline: TimelineEvent[];
  fixApplied: boolean;
  replay?: { runId: string; recovered: number; stillFailing: number; at: string };
}

let counter = 1041;

export function buildIncident(result: ExecutionResult, drift: DriftDescription): Incident {
  counter += 1;
  const blocked = result.validation.failed;
  return {
    id: `inc_${result.runId}`,
    ref: `INC-${counter}`,
    createdAt: result.finishedAt,
    pipelineId: result.pipelineId,
    runId: result.runId,
    severity: blocked > result.validation.total * 0.5 ? "critical" : "high",
    status: "open",
    title: `Contract breach on orders.raw — ${blocked.toLocaleString()} rows quarantined`,
    drift,
    rootCause: {
      summary: drift.detail,
      evidence: [
        `Column '${drift.from}' absent from source payload; undeclared column '${drift.to}' present instead.`,
        `${blocked.toLocaleString()} of ${result.validation.total.toLocaleString()} rows failed the contract gate.`,
        ...result.validation.byRule.slice(0, 3).map((r) => `Rule '${r.rule}' on '${r.field}' failed ${r.count.toLocaleString()} times.`),
      ],
    },
    impact: {
      downstreamAssets: ["gold.orders_enriched", "feature_store.user_features", "Executive Revenue Dashboard"],
      revenueAtRiskUsd: Math.round(blocked * 0.82 * 100) / 100,
      slaBreachMin: 27,
      blockedRows: blocked,
    },
    failedCount: blocked,
    failedSample: result.validation.failedRecords.slice(0, 25),
    timeline: [
      { ts: result.startedAt, actor: "system", title: "Run started", detail: `${result.validation.total.toLocaleString()} rows extracted from OrdersDB` },
      { ts: result.finishedAt, actor: "system", title: "Contract gate failed", detail: `Schema drift detected on '${drift.from}'` },
      { ts: result.finishedAt, actor: "system", title: "Incident opened & alert dispatched", detail: "Routed to #data-oncall (Slack) and PagerDuty" },
    ],
    fixApplied: false,
  };
}
