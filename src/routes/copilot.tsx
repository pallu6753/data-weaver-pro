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
  "What is a data pipeline?",
  "Why did my pipeline fail?",
  "Show recent errors",
  "How can I improve data quality?",
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
    
    if (/fail|why|error|drift/.test(low) && !/recent/.test(low)) {
      const failing = pipelines.find((p) => p.status === "failed");
      const a = alerts.find((x) => x.pipelineId === failing?.id);
      return `**Root cause — ${failing?.name || "Product Catalog → Products"}**\n\n- Data format check failed: total amount field has a different name.\n- Node: "Data format check". Downstream steps were skipped.\n- Impact: Dataset is stale. Blocks AI analytics features.\n\n**Recommended fix:**\n1. Map the renamed column \`order_total\` back and cast to DECIMAL.\n2. Replay quarantined records.\n\nConfidence: 95%. Linked alert: ${a?.id || "al_1"}.`;
    }
    
    if (/what is a data pipeline|what is pipeline|pipeline/.test(low)) {
      return `**What is a Data Pipeline?**\n\nA data pipeline is a series of automated software steps that move data from a source (like databases or APIs) to a destination (like data warehouses or data lakes). \n\nAlong the way, the data is collected, formatted, cleaned, and verified to ensure it is structured and ready for dashboards, metrics, and AI models.`;
    }

    if (/errors|recent/.test(low)) {
      return `**Recent pipeline errors:**\n\n1. **Product Catalog → Products**\n   - *Error:* Data format changed: total amount field has a different name.\n   - *Severity:* Critical\n   - *Occurred:* 12m ago\n\n2. **Billing → Daily Billing**\n   - *Error:* Pipeline success rate dropped to 91.2% in the last 24 hours.\n   - *Severity:* High\n   - *Occurred:* 38m ago`;
    }

    if (/quality/.test(low)) {
      return `**How to Improve Data Quality in NexusFlow:**\n\n1. **Define Schema Contracts**: Enforce rigid types (like DECIMAL, TIMESTAMP) on your datasets.\n2. **Add Validation Checks**: Enable Null checks and Primary Key verification blocks in your pipeline graphs.\n3. **Set Up Alerts**: Configure Slack or PagerDuty alerts to quickly capture anomalies.\n4. **Review Incidents**: Resolve incidents early by debugging error logs and deploying Copilot-suggested column-mapping remedies.`;
    }

    if (/kafka/.test(low)) {
      return `**What is Apache Kafka?**\n\nApache Kafka is a highly scalable messaging engine designed to capture and distribute continuous data stream logs (like real-time user clickstreams or API requests) in real time.\n\nIn NexusFlow, it acts as the streaming API request ingestion source.`;
    }

    if (/troubleshoot/.test(low)) {
      return `**Troubleshooting Pipeline Errors**\n\nTo debug pipeline failures in NexusFlow:\n1. Open the **Incidents** tab to see active alerts.\n2. Inspect the **Logs** tab for specific validation error messages.\n3. Use the **AI Copilot** one-click remediation to generate a mapping fix.\n4. Replay quarantined records to process them without database loss.`;
    }

    if (/optim|spark|cost|partition/.test(low)) {
      const p = pipelines.find((x) => x.mode === "streaming")!;
      return `**Optimizing \`${p.name}\`**\n\nCurrent: ${p.rowsProcessedToday.toLocaleString()} rows/day at $${p.costUsdToday}/day.\n\nRecommendations:\n1. Repartition by event logs keys to reduce shuffle.\n2. Compact daily files to reduce small-file index overhead.\n\nProjected saving: **~$21/day (–24%)**.`;
    }
    
    if (/sql|query|generate/.test(low)) {
      return "```sql\n-- Daily transactions by user\nSELECT\n  DATE_TRUNC('day', created_at) AS day,\n  COUNT(*)                      AS count,\n  SUM(total_usd)                AS total\nFROM gold.orders_enriched\nGROUP BY 1\nORDER BY 1 DESC;\n```";
    }

    return `I found **${pipelines.length} active pipelines** across the platform. Try asking about "What is a data pipeline?", "What is Kafka?", "Why did my pipeline fail?", or click one of the suggestion prompts!`;
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
      i += Math.max(3, Math.floor(full.length / 50));
      setMsgs((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: full.slice(0, i) };
        return copy;
      });
      if (i >= full.length) { clearInterval(iv); setStreaming(false); }
    }, 20);
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-56px)] max-w-5xl flex-col p-6 lg:p-8">
      <PageHeader
        eyebrow="Intelligence"
        title="NexusFlow AI Copilot"
        description="Your beginner-friendly AI assistant to learn about data pipelines, monitor execution logs, check alerts, and troubleshoot errors."
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
