import { useMemo } from "react";
import ReactFlow, {
  Background, BackgroundVariant, Controls, Handle, MiniMap, Position,
  type Edge, type Node, type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Bell, Boxes, CheckCircle2, Circle, Code2, Database, FlaskConical,
  GitMerge, Loader2, Sparkles, XCircle,
} from "lucide-react";

import type { Pipeline } from "@/lib/mock/types";
import type { GraphNodeStatus, PipelineExecutionProgress } from "@/lib/mock/store";

const iconFor = (type: string) => {
  const icons: Record<string, typeof Code2> = {
    source: Database, transform: Code2, quality: FlaskConical, join: GitMerge,
    sql: Code2, python: Code2, spark: Sparkles, destination: Boxes, notify: Bell,
  };
  return icons[type] ?? Code2;
};

function FlowNode({ data }: NodeProps<{ label: string; type: string; status: GraphNodeStatus }>) {
  const Icon = iconFor(data.type);
  const statusTone: Record<GraphNodeStatus, string> = {
    pending: "opacity-65 border-border/60",
    running: "border-[color:var(--info)] shadow-[0_0_24px_oklch(0.72_0.15_240/0.35)]",
    success: "border-[color:var(--success)]/70",
    failed: "border-[color:var(--destructive)]/70",
  };
  const StatusIcon = data.status === "running" ? Loader2 : data.status === "success" ? CheckCircle2 : data.status === "failed" ? XCircle : Circle;
  const statusLabel = data.status === "pending" ? "waiting" : data.status;
  const statusColor = data.status === "failed" ? "text-[color:var(--destructive)]" : data.status === "success" ? "text-[color:var(--success)]" : data.status === "running" ? "text-[color:var(--info)]" : "text-muted-foreground";
  return (
    <div className={`glass-strong min-w-[180px] rounded-xl border-2 p-3 transition ${statusTone[data.status]}`}>
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-primary !bg-primary" />
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[image:var(--gradient-brand)]"><Icon className="h-4 w-4 text-white" /></div>
        <div className="min-w-0"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{data.type}</div><div className="truncate text-xs font-medium">{data.label}</div></div>
        <div className={`ml-auto flex items-center gap-1 text-[10px] capitalize ${statusColor}`}><StatusIcon className={`h-3.5 w-3.5 ${data.status === "running" ? "animate-spin" : ""}`} />{statusLabel}</div>
      </div>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-primary !bg-primary" />
    </div>
  );
}

const nodeTypes = { nexus: FlowNode };

export function PipelineFlowGraph({ pipeline, progress, onNodeSelect, height = "520px" }: {
  pipeline: Pipeline;
  progress?: PipelineExecutionProgress;
  onNodeSelect?: (nodeId: string) => void;
  height?: string;
}) {
  const nodes: Node[] = useMemo(() => pipeline.nodes.map((node) => ({
    id: node.id, position: node.position, type: "nexus",
    data: { label: node.label, type: node.type, status: progress?.nodeStatuses[node.id] ?? "pending" },
  })), [pipeline, progress]);
  const edges: Edge[] = useMemo(() => pipeline.edges.map((edge) => ({
    id: edge.id, source: edge.source, target: edge.target, animated: pipeline.status === "running",
    style: { stroke: "oklch(0.68 0.20 265)", strokeWidth: 2 },
  })), [pipeline]);

  return <div className="overflow-hidden rounded-lg" style={{ height, background: "oklch(0.12 0.03 265)" }}>
    <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView proOptions={{ hideAttribution: true }} onNodeClick={(_, node) => onNodeSelect?.(node.id)}>
      <Background variant={BackgroundVariant.Dots} gap={20} color="oklch(0.35 0.05 265 / 0.4)" />
      <Controls className="!border-border !bg-card !text-foreground" />
      <MiniMap pannable zoomable maskColor="oklch(0.10 0.03 265 / 0.8)" nodeColor={() => "oklch(0.68 0.20 265)"} className="!border-border !bg-card" />
    </ReactFlow>
  </div>;
}
