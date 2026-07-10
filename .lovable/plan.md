# Phase 2 — Flagship End-to-End Workflow

Goal: turn NexusFlow into a platform where a single realistic scenario (OrdersDB → pipeline → failure → AI fix → success) drives every existing module through shared, persisted state. No new placeholder pages. Deepen what exists.

## Scope of this phase

In:
- Auth + Org/Workspace/Project/Environment hierarchy
- Data Source connector wizard (OrdersDB scenario, realistic validation + schema preview)
- Pipeline Builder deepening (validation, quality, transform, destination node config; versioning)
- Realistic pipeline execution engine (progress, streaming logs, node-by-node status)
- Auto-generated lineage + profiling + quality results
- Scripted failure injection (schema drift on `orders.total_amount`)
- Alerts, Monitoring, Dashboard KPIs, Catalog, Reports all react
- AI Copilot grounded on live run state → root cause + one-click fix
- Persistence in Lovable Cloud (survives refresh)
- Audit log for every user action

Out (deferred to later phases, architecture ready): Streaming, CDC, Lakehouse, Feature Store, Git/CI/CD, SQL Workbench, Spark, ML, Reverse ETL, plugin marketplace, notebooks, dashboard builder.

## The scenario (single golden path)

```text
1. Sign in (email/password + Google)
2. Land in Acme Corp › Analytics › Retail › prod
3. Sources → Add → Postgres wizard → OrdersDB
   test connection → schema preview (orders, order_items, customers, products)
4. Pipelines → New → drag Source(orders) → Validate → Transform(SQL) →
   Quality(rules) → Warehouse(orders_gold)
5. Save v1 → Run
6. Live: node highlights green in order, logs stream, monitoring metrics tick,
   lineage graph auto-draws, catalog gains orders_gold entry with profile
7. Trigger drift button on OrdersDB (renames total_amount → order_total)
8. Re-run → fails at Validate node
   → alert fires (Slack channel, unacked)
   → dashboard "Failed" KPI +1
   → monitoring shows red span
   → logs show schema mismatch
   → lineage node turns red
   → catalog marks dataset stale
9. Open AI Copilot from the alert → it reads run+schema state, explains
   root cause, estimates impact ("blocks 3 downstream, ~$412/day revenue
   reporting delay"), offers "Apply fix" (rename mapping in Transform node)
10. Apply → pipeline auto-saves v2 → re-run → success
11. All KPIs, lineage, catalog, alerts, reports update; run recorded
12. Refresh page → everything persists
```

## Architecture changes

Repository/service layer between UI and data:

```text
src/lib/
  db/                       Supabase client wrappers, typed row helpers
  repos/                    orgs, projects, sources, pipelines, runs, logs,
                            alerts, datasets, quality, audit
  services/
    execution-engine.ts     run(pipeline) → streams NodeEvent → logs+metrics+run row
    profiler.ts             deterministic profile from schema + sampled rows
    quality-engine.ts       run rules → results
    lineage-builder.ts      derive graph from pipeline defs
    drift-simulator.ts      mutate source schema
    ai-context.ts           gather live state → prompt payload
  hooks/                    useOrg, useProject, useEnv, usePipelineRun (subscribes to realtime)
```

State: keep Zustand for UI-only ephemeral state (selected nodes, palette open). All domain data moves to Supabase + React Query. Realtime channels on `pipeline_runs`, `run_events`, `alerts` drive live UI without polling.

Route changes: no new top-level routes. Sub-tabs added inside existing pipeline detail (Overview / Runs / Logs / Lineage / Quality / Versions / Settings). Sources gains a wizard drawer. Copilot gains context-panel + Apply-Fix action bus.

## Data model (single migration, RLS + GRANTs)

```text
organizations, workspaces, projects, environments
memberships (user_id, org_id, role: admin|engineer|analyst|viewer)
data_sources (project_id, env, kind, config jsonb, schema_snapshot jsonb, status)
pipelines (project_id, env, definition jsonb, current_version)
pipeline_versions (pipeline_id, version, definition jsonb, author)
pipeline_runs (pipeline_id, version, status, started_at, finished_at, stats jsonb)
run_events (run_id, ts, node_id, level, message, metrics jsonb)   -- realtime
datasets (project_id, name, zone, schema jsonb, profile jsonb, updated_at)
quality_rules (dataset_id, kind, config jsonb)
quality_results (rule_id, run_id, passed, details jsonb)
lineage_edges (project_id, from_node, to_node, kind)
alerts (project_id, severity, title, detail, pipeline_id, run_id, ack)
audit_log (actor_id, action, target, meta jsonb, ts)
```

RLS: everything scoped by membership in the owning org. `has_role` security-definer function; admin/engineer can write, analyst can trigger runs, viewer read-only.

## Demo data

Seed migration inserts one org (Acme Corp), one workspace (Analytics), one project (Retail), envs dev/stage/prod, an OrdersDB source with 4 realistic tables and 500 sampled rows encoded as JSON, and 2 pre-built pipelines with completed run history so the app is never empty on first load.

## AI Copilot grounding

`services/ai-context.ts` collects: current project, last N runs, failing node's inputs/outputs, referenced schemas, active alerts. Sent to Lovable AI (`google/gemini-2.5-flash`) with a strict system prompt. Tool calls: `suggest_fix(pipeline_id, node_id, patch)` — Copilot proposes a JSON patch; UI shows diff; user clicks Apply → repo writes new pipeline_version.

## Delivery order (single turn)

1. Supabase migration (schema + RLS + GRANTs + seed)
2. Auth pages + `_authenticated` gate + org/workspace/env switcher in top bar
3. Repos + React Query hooks; delete Zustand seed store, keep UI store
4. Sources wizard + drift button
5. Execution engine + realtime run/logs; upgrade Pipeline Detail tabs
6. Profiler, quality engine, lineage builder wiring
7. Alert generation + Dashboard/Monitoring/Catalog/Reports reactive reads
8. AI Copilot context + apply-fix flow
9. Audit log middleware on all mutations
10. Fix the current SSR hydration mismatch on the dashboard "Recent activity" list (relative-time strings differ server vs client) by moving those timestamps behind a client-only render.

## Non-goals / guardrails

- Not rebuilding the design system, sidebar, command palette, dashboard layout, or React Flow setup — they stay.
- No mock `setTimeout` fake execution left in production paths; the execution engine is deterministic and event-driven.
- No new routes without real functionality.
- Every mutation goes through a repo → audit log entry.

## Risks

- Single-turn size is very large; if something must be cut, cut Reports first, then Audit UI (keep the writes), keeping the golden-path scenario intact.
- Supabase realtime bill: single channel per active run, torn down on unmount.

Approve to proceed, or tell me what to trim.