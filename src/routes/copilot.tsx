import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Send, Bot, User } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePlatform } from "@/lib/mock/store";

export const Route = createFileRoute("/copilot")({
  head: () => ({ meta: [{ title: "AI Copilot — NexusFlow" }] }),
  component: CopilotPage,
});

interface Msg { role: "user" | "assistant"; content: string; }

const suggestions = [
  "Why did the catalog pipeline fail?",
  "Optimize my Spark clickstream job",
  "Generate SQL: daily revenue by category",
  "Find pipelines above $50/day cost",
  "Suggest partitioning for gold.orders_enriched",
  "Create a dbt model for user retention",
];

function CopilotPage() {
  const pipelines = usePlatform((s) => s.pipelines);
  const alerts = usePlatform((s) => s.alerts);
  const datasets = usePlatform((s) => s.datasets);

  const [msgs, setMsgs] = useState<Msg[]>([{
    role: "assistant",
    content:
      "I'm NexusFlow Copilot. I know every pipeline, source, dataset, run, and alert in this workspace. Ask about failures, cost, SQL, dbt models, partitioning, or Spark optimizations.",
  }]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);

  const answer = (q: string): string => {
    const low = q.toLowerCase();
    if (/fail|why|error|drift/.test(low)) {
      const failing = pipelines.find((p) => p.status === "failed");
      const a = alerts.find((x) => x.pipelineId === failing?.id);
      return `**Root cause — ${failing?.name}**\n\n- Contract validation failed on \`price_v2\` (schema drift): DECIMAL(10,2) → STRING.\n- Started 3 hours ago at the "Contract check" node. All downstream nodes were skipped.\n- Impact: \`silver.products\` is stale (${datasets.find((d) => d.name.includes("products"))?.rows.toLocaleString()} rows, ~3h behind SLA). Blocks the ML feature build.\n\n**Recommended fix:**\n1. Update the data contract to accept nullable STRING for price_v2 during migration.\n2. Add a coercion transform \`TRY_CAST(price_v2 AS DECIMAL(10,2))\` before the destination.\n3. Backfill the last 3 hours with the fixed pipeline (est. ${failing?.avgDurationSec}s).\n\nConfidence: 92%. Linked alert: ${a?.id}.`;
    }
    if (/optim|spark|cost|partition/.test(low)) {
      const p = pipelines.find((x) => x.mode === "streaming")!;
      return `**Optimizing \`${p.name}\`**\n\nCurrent: ${p.rowsProcessedToday.toLocaleString()} rows/day at $${p.costUsdToday}/day.\n\nRecommendations:\n1. Repartition by \`event_type\` (currently by \`event_id\`) — reduces shuffle by ~40%.\n2. Enable adaptive query execution and skew join optimization.\n3. Increase micro-batch to 30s where SLA allows (–22% executor time).\n4. Compact silver.events daily; small-file count is trending up.\n\nProjected saving: **~$21/day (–24%)**.`;
    }
    if (/sql|query|generate/.test(low)) {
      return "```sql\n-- Daily revenue by product category\nSELECT\n  DATE_TRUNC('day', o.created_at)     AS day,\n  p.category,\n  SUM(o.total_usd)                    AS revenue_usd,\n  COUNT(DISTINCT o.user_id)           AS unique_buyers\nFROM gold.orders_enriched o\nLEFT JOIN silver.products p USING (sku)\nWHERE o.created_at >= CURRENT_DATE - INTERVAL '30 days'\nGROUP BY 1, 2\nORDER BY 1 DESC, revenue_usd DESC;\n```\n\nUses your `gold.orders_enriched` (certified) joined with `silver.products`. Est. runtime: 4.2s on Snowflake MEDIUM.";
    }
    if (/dbt|model/.test(low)) {
      return "```sql\n-- models/marts/user_retention.sql\n{{ config(materialized='incremental', unique_key='user_id') }}\n\nWITH orders AS (\n  SELECT user_id, MIN(created_at) AS first_order, MAX(created_at) AS last_order,\n         COUNT(*) AS lifetime_orders, SUM(total_usd) AS lifetime_revenue\n  FROM {{ ref('gold_orders_enriched') }}\n  GROUP BY user_id\n)\nSELECT *,\n  DATE_DIFF('day', first_order, last_order) AS lifespan_days,\n  CASE WHEN last_order > CURRENT_DATE - 30 THEN 'active' ELSE 'churned' END AS status\nFROM orders;\n```";
    }
    if (/cost|expensive/.test(low)) {
      const top = [...pipelines].sort((a, b) => b.costUsdToday - a.costUsdToday).slice(0, 3);
      return `**Top-cost pipelines today:**\n\n${top.map((p, i) => `${i + 1}. \`${p.name}\` — $${p.costUsdToday.toFixed(2)} (${p.mode})`).join("\n")}\n\nCombined: $${top.reduce((a, p) => a + p.costUsdToday, 0).toFixed(2)}. Consider streaming compaction and warehouse right-sizing.`;
    }
    return `I found **${pipelines.length} pipelines** across ${new Set(pipelines.map((p) => p.env)).size} environments. Try one of the suggested prompts, or ask about a specific pipeline by name.`;
  };

  const send = (q: string) => {
    const question = q.trim();
    if (!question || streaming) return;
    setMsgs((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setStreaming(true);

    const full = answer(question);
    let i = 0;
    setMsgs((m) => [...m, { role: "assistant", content: "" }]);
    const iv = setInterval(() => {
      i += Math.max(2, Math.floor(full.length / 60));
      setMsgs((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: full.slice(0, i) };
        return copy;
      });
      if (i >= full.length) { clearInterval(iv); setStreaming(false); }
    }, 25);
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-56px)] max-w-5xl flex-col p-6 lg:p-8">
      <PageHeader
        eyebrow="Intelligence"
        title="AI Copilot"
        description="Grounded on your live pipelines, sources, runs, and alerts."
      />

      <Card className="glass mt-6 flex min-h-0 flex-1 flex-col border-border/60">
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <div className="flex-1 space-y-4 overflow-auto p-6">
            {msgs.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.role === "user" ? "bg-primary" : "bg-[image:var(--gradient-brand)]"}`}>
                  {m.role === "user" ? <User className="h-4 w-4 text-primary-foreground" /> : <Bot className="h-4 w-4 text-white" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "glass border border-border/40"}`}>
                  <pre className="whitespace-pre-wrap font-sans">{m.content}{streaming && i === msgs.length - 1 && "▊"}</pre>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border/40 p-4">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border border-border/50 bg-background/40 px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-primary">
                  <Sparkles className="mr-1 inline h-3 w-3" />{s}
                </button>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
              <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask NexusFlow Copilot…" className="glass" disabled={streaming} />
              <Button type="submit" disabled={streaming || !input.trim()}><Send className="h-4 w-4" /></Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
