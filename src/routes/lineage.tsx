import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import ReactFlow, {
  Background, BackgroundVariant, Controls, Handle, Position,
  type Node, type Edge, type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import { Database, GitBranch, LayoutDashboard, Boxes } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePlatform } from "@/lib/mock/store";

export const Route = createFileRoute("/lineage")({
  head: () => ({ meta: [{ title: "Lineage — NexusFlow" }] }),
  component: LineagePage,
});

const kindIcon: Record<string, any> = { source: Database, pipeline: GitBranch, dataset: Boxes, dashboard: LayoutDashboard };
const kindColor: Record<string, string> = {
  source: "border-[color:var(--info)]/60",
  pipeline: "border-primary/60",
  dataset: "border-[color:var(--success)]/60",
  dashboard: "border-[color:var(--warning)]/60",
};

function LineageNodeCard({ data }: NodeProps<{ label: string; kind: string }>) {
  const Icon = kindIcon[data.kind] ?? Database;
  return (
    <div className={`glass-strong flex min-w-[180px] items-center gap-2 rounded-xl border-2 p-2.5 ${kindColor[data.kind]}`}>
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-primary" />
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[image:var(--gradient-brand)]"><Icon className="h-3.5 w-3.5 text-white" /></div>
      <div className="min-w-0">
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{data.kind}</div>
        <div className="truncate text-xs font-medium">{data.label}</div>
      </div>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-primary" />
    </div>
  );
}
const nodeTypes = { lineage: LineageNodeCard };

function LineagePage() {
  const lineage = usePlatform((s) => s.lineage);

  const { nodes, edges } = useMemo(() => {
    // Simple lane layout by kind
    const laneX: Record<string, number> = { source: 0, pipeline: 320, dataset: 640, dashboard: 960 };
    const counters: Record<string, number> = { source: 0, pipeline: 0, dataset: 0, dashboard: 0 };
    const nodes: Node[] = lineage.nodes.map((n) => {
      const y = counters[n.kind]++ * 90;
      return { id: n.id, position: { x: laneX[n.kind], y }, data: { label: n.label, kind: n.kind }, type: "lineage" };
    });
    const edges: Edge[] = lineage.edges.map((e, i) => ({
      id: `e${i}`, source: e.source, target: e.target,
      style: { stroke: "oklch(0.68 0.20 265 / 0.6)", strokeWidth: 1.5 },
      animated: false,
    }));
    return { nodes, edges };
  }, [lineage]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-6 lg:p-8">
      <PageHeader
        eyebrow="Governance"
        title="Data Lineage"
        description="End-to-end flow from sources → pipelines → datasets → dashboards. Zoom, pan, and click a node for impact analysis."
        actions={
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(kindIcon).map((k) => (
              <Badge key={k} variant="outline" className="capitalize text-xs">{k}</Badge>
            ))}
          </div>
        }
      />

      <Card className="glass border-border/60">
        <CardContent className="p-2">
          <div className="h-[720px] overflow-hidden rounded-lg" style={{ background: "oklch(0.12 0.03 265)" }}>
            <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView proOptions={{ hideAttribution: true }}>
              <Background variant={BackgroundVariant.Dots} gap={22} color="oklch(0.35 0.05 265 / 0.4)" />
              <Controls className="!border-border !bg-card !text-foreground" />
            </ReactFlow>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
