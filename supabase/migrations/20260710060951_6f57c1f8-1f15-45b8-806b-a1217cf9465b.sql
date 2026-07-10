
-- =====================================================================
-- Enums
-- =====================================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'engineer', 'analyst', 'viewer');
CREATE TYPE public.env_kind AS ENUM ('dev', 'test', 'stage', 'prod');
CREATE TYPE public.source_status AS ENUM ('connected', 'syncing', 'error', 'idle');
CREATE TYPE public.pipeline_status AS ENUM ('healthy', 'running', 'failed', 'degraded', 'paused', 'scheduled', 'draft');
CREATE TYPE public.run_status AS ENUM ('queued', 'running', 'success', 'failed', 'cancelled');
CREATE TYPE public.log_level AS ENUM ('debug', 'info', 'warn', 'error');
CREATE TYPE public.alert_severity AS ENUM ('info', 'low', 'medium', 'high', 'critical');
CREATE TYPE public.zone_kind AS ENUM ('bronze', 'silver', 'gold', 'archived');

-- =====================================================================
-- Shared updated_at trigger
-- =====================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================================
-- profiles
-- =====================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all_authed" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- organizations
-- =====================================================================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_organizations_updated BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- memberships (must come before has_role, which references it)
-- =====================================================================
CREATE TABLE public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memberships TO authenticated;
GRANT ALL ON public.memberships TO service_role;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_memberships_updated BEFORE UPDATE ON public.memberships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- Security-definer helpers
-- =====================================================================
CREATE OR REPLACE FUNCTION public.is_org_member(_user UUID, _org UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user AND organization_id = _org
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user UUID, _org UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user AND organization_id = _org AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.can_write(_user UUID, _org UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user AND organization_id = _org AND role IN ('admin','engineer')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_run(_user UUID, _org UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user AND organization_id = _org AND role IN ('admin','engineer','analyst')
  );
$$;

-- Policies for organizations & memberships (now that helpers exist)
CREATE POLICY "orgs_select_members" ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), id));
CREATE POLICY "orgs_insert_authed" ON public.organizations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "orgs_update_admin" ON public.organizations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), id, 'admin'));
CREATE POLICY "orgs_delete_admin" ON public.organizations FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), id, 'admin'));

CREATE POLICY "memberships_select_self_or_org" ON public.memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "memberships_insert_admin_or_bootstrap" ON public.memberships FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), organization_id, 'admin'));
CREATE POLICY "memberships_update_admin" ON public.memberships FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), organization_id, 'admin'));
CREATE POLICY "memberships_delete_admin_or_self" ON public.memberships FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), organization_id, 'admin'));

-- =====================================================================
-- workspaces
-- =====================================================================
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspaces_select" ON public.workspaces FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "workspaces_write" ON public.workspaces FOR ALL TO authenticated
  USING (public.can_write(auth.uid(), organization_id))
  WITH CHECK (public.can_write(auth.uid(), organization_id));
CREATE TRIGGER trg_workspaces_updated BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- projects
-- =====================================================================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_select" ON public.projects FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "projects_write" ON public.projects FOR ALL TO authenticated
  USING (public.can_write(auth.uid(), organization_id))
  WITH CHECK (public.can_write(auth.uid(), organization_id));
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- environments
-- =====================================================================
CREATE TABLE public.environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind public.env_kind NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, kind)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.environments TO authenticated;
GRANT ALL ON public.environments TO service_role;
ALTER TABLE public.environments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "envs_select" ON public.environments FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "envs_write" ON public.environments FOR ALL TO authenticated
  USING (public.can_write(auth.uid(), organization_id))
  WITH CHECK (public.can_write(auth.uid(), organization_id));
CREATE TRIGGER trg_environments_updated BEFORE UPDATE ON public.environments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- data_sources
-- =====================================================================
CREATE TABLE public.data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  env_kind public.env_kind NOT NULL DEFAULT 'prod',
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  schema_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  status public.source_status NOT NULL DEFAULT 'idle',
  owner TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  rows_ingested_today BIGINT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_sources TO authenticated;
GRANT ALL ON public.data_sources TO service_role;
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ds_select" ON public.data_sources FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "ds_write" ON public.data_sources FOR ALL TO authenticated
  USING (public.can_write(auth.uid(), organization_id))
  WITH CHECK (public.can_write(auth.uid(), organization_id));
CREATE TRIGGER trg_data_sources_updated BEFORE UPDATE ON public.data_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_data_sources_project ON public.data_sources(project_id);

-- =====================================================================
-- pipelines & pipeline_versions
-- =====================================================================
CREATE TABLE public.pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  env_kind public.env_kind NOT NULL DEFAULT 'prod',
  name TEXT NOT NULL,
  description TEXT,
  mode TEXT NOT NULL DEFAULT 'batch',
  status public.pipeline_status NOT NULL DEFAULT 'draft',
  schedule TEXT,
  owner TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  current_version INT NOT NULL DEFAULT 1,
  definition JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  destination JSONB NOT NULL DEFAULT '{}'::jsonb,
  quality_score INT NOT NULL DEFAULT 100,
  avg_duration_sec INT NOT NULL DEFAULT 0,
  success_rate NUMERIC NOT NULL DEFAULT 1.0,
  rows_processed_today BIGINT NOT NULL DEFAULT 0,
  cost_usd_today NUMERIC NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipelines TO authenticated;
GRANT ALL ON public.pipelines TO service_role;
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pipelines_select" ON public.pipelines FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "pipelines_write" ON public.pipelines FOR ALL TO authenticated
  USING (public.can_write(auth.uid(), organization_id))
  WITH CHECK (public.can_write(auth.uid(), organization_id));
CREATE TRIGGER trg_pipelines_updated BEFORE UPDATE ON public.pipelines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_pipelines_project ON public.pipelines(project_id);

CREATE TABLE public.pipeline_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  version INT NOT NULL,
  definition JSONB NOT NULL,
  message TEXT,
  author_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pipeline_id, version)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipeline_versions TO authenticated;
GRANT ALL ON public.pipeline_versions TO service_role;
ALTER TABLE public.pipeline_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pv_select" ON public.pipeline_versions FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "pv_write" ON public.pipeline_versions FOR ALL TO authenticated
  USING (public.can_write(auth.uid(), organization_id))
  WITH CHECK (public.can_write(auth.uid(), organization_id));

-- =====================================================================
-- pipeline_runs & run_events
-- =====================================================================
CREATE TABLE public.pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  status public.run_status NOT NULL DEFAULT 'queued',
  triggered_by TEXT NOT NULL DEFAULT 'manual',
  triggered_by_user UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_sec INT,
  rows BIGINT NOT NULL DEFAULT 0,
  cost_usd NUMERIC NOT NULL DEFAULT 0,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipeline_runs TO authenticated;
GRANT ALL ON public.pipeline_runs TO service_role;
ALTER TABLE public.pipeline_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "runs_select" ON public.pipeline_runs FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "runs_insert_runner" ON public.pipeline_runs FOR INSERT TO authenticated
  WITH CHECK (public.can_run(auth.uid(), organization_id));
CREATE POLICY "runs_update_runner" ON public.pipeline_runs FOR UPDATE TO authenticated
  USING (public.can_run(auth.uid(), organization_id));
CREATE POLICY "runs_delete_writer" ON public.pipeline_runs FOR DELETE TO authenticated
  USING (public.can_write(auth.uid(), organization_id));
CREATE INDEX idx_pipeline_runs_pipeline_started ON public.pipeline_runs(pipeline_id, started_at DESC);

CREATE TABLE public.run_events (
  id BIGSERIAL PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.pipeline_runs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  level public.log_level NOT NULL DEFAULT 'info',
  node_id TEXT,
  message TEXT NOT NULL,
  metrics JSONB
);
GRANT SELECT, INSERT ON public.run_events TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.run_events_id_seq TO authenticated;
GRANT ALL ON public.run_events TO service_role;
GRANT ALL ON SEQUENCE public.run_events_id_seq TO service_role;
ALTER TABLE public.run_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_select" ON public.run_events FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "events_insert_runner" ON public.run_events FOR INSERT TO authenticated
  WITH CHECK (public.can_run(auth.uid(), organization_id));
CREATE INDEX idx_run_events_run_ts ON public.run_events(run_id, ts);

-- Realtime for live UI
ALTER PUBLICATION supabase_realtime ADD TABLE public.pipeline_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.run_events;

-- =====================================================================
-- datasets
-- =====================================================================
CREATE TABLE public.datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  zone public.zone_kind NOT NULL DEFAULT 'bronze',
  warehouse TEXT,
  schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  rows BIGINT NOT NULL DEFAULT 0,
  size_mb NUMERIC NOT NULL DEFAULT 0,
  owner TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  is_stale BOOLEAN NOT NULL DEFAULT false,
  last_refreshed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.datasets TO authenticated;
GRANT ALL ON public.datasets TO service_role;
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "datasets_select" ON public.datasets FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "datasets_write" ON public.datasets FOR ALL TO authenticated
  USING (public.can_write(auth.uid(), organization_id))
  WITH CHECK (public.can_write(auth.uid(), organization_id));
CREATE TRIGGER trg_datasets_updated BEFORE UPDATE ON public.datasets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- quality_rules & quality_results
-- =====================================================================
CREATE TABLE public.quality_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE,
  pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  severity public.alert_severity NOT NULL DEFAULT 'medium',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quality_rules TO authenticated;
GRANT ALL ON public.quality_rules TO service_role;
ALTER TABLE public.quality_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qr_select" ON public.quality_rules FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "qr_write" ON public.quality_rules FOR ALL TO authenticated
  USING (public.can_write(auth.uid(), organization_id))
  WITH CHECK (public.can_write(auth.uid(), organization_id));
CREATE TRIGGER trg_quality_rules_updated BEFORE UPDATE ON public.quality_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.quality_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.quality_rules(id) ON DELETE CASCADE,
  run_id UUID REFERENCES public.pipeline_runs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  passed BOOLEAN NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.quality_results TO authenticated;
GRANT ALL ON public.quality_results TO service_role;
ALTER TABLE public.quality_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qres_select" ON public.quality_results FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "qres_insert_runner" ON public.quality_results FOR INSERT TO authenticated
  WITH CHECK (public.can_run(auth.uid(), organization_id));

-- =====================================================================
-- lineage_edges
-- =====================================================================
CREATE TABLE public.lineage_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  from_kind TEXT NOT NULL,
  from_ref TEXT NOT NULL,
  to_kind TEXT NOT NULL,
  to_ref TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, from_kind, from_ref, to_kind, to_ref)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lineage_edges TO authenticated;
GRANT ALL ON public.lineage_edges TO service_role;
ALTER TABLE public.lineage_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lineage_select" ON public.lineage_edges FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "lineage_write" ON public.lineage_edges FOR ALL TO authenticated
  USING (public.can_write(auth.uid(), organization_id))
  WITH CHECK (public.can_write(auth.uid(), organization_id));

-- =====================================================================
-- alerts
-- =====================================================================
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE SET NULL,
  run_id UUID REFERENCES public.pipeline_runs(id) ON DELETE SET NULL,
  severity public.alert_severity NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  detail TEXT,
  channel TEXT NOT NULL DEFAULT 'email',
  ack BOOLEAN NOT NULL DEFAULT false,
  ack_by UUID REFERENCES auth.users(id),
  ack_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts_select" ON public.alerts FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "alerts_insert_runner" ON public.alerts FOR INSERT TO authenticated
  WITH CHECK (public.can_run(auth.uid(), organization_id));
CREATE POLICY "alerts_update_member" ON public.alerts FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "alerts_delete_writer" ON public.alerts FOR DELETE TO authenticated
  USING (public.can_write(auth.uid(), organization_id));
CREATE TRIGGER trg_alerts_updated BEFORE UPDATE ON public.alerts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;

-- =====================================================================
-- audit_log
-- =====================================================================
CREATE TABLE public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_kind TEXT,
  target_ref TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.audit_log_id_seq TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
GRANT ALL ON SEQUENCE public.audit_log_id_seq TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_insert_member" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "audit_select_admin" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), organization_id, 'admin'));

-- =====================================================================
-- Bootstrap: helper to create an Acme demo org for a new user
-- (called from the app after first sign-in when they have no memberships)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.bootstrap_demo_workspace()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_org UUID;
  v_ws UUID;
  v_proj UUID;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Only bootstrap if user has no memberships
  IF EXISTS (SELECT 1 FROM public.memberships WHERE user_id = v_user) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.organizations (name, slug)
  VALUES ('Acme Corp', 'acme-' || substr(v_user::text, 1, 8))
  RETURNING id INTO v_org;

  INSERT INTO public.memberships (user_id, organization_id, role)
  VALUES (v_user, v_org, 'admin');

  INSERT INTO public.workspaces (organization_id, name, slug, description)
  VALUES (v_org, 'Analytics', 'analytics', 'Retail analytics workspace')
  RETURNING id INTO v_ws;

  INSERT INTO public.projects (workspace_id, organization_id, name, slug, description)
  VALUES (v_ws, v_org, 'Retail', 'retail', 'Retail orders and customer analytics')
  RETURNING id INTO v_proj;

  INSERT INTO public.environments (project_id, organization_id, kind)
  VALUES (v_proj, v_org, 'dev'), (v_proj, v_org, 'stage'), (v_proj, v_org, 'prod');

  RETURN v_org;
END;
$$;
GRANT EXECUTE ON FUNCTION public.bootstrap_demo_workspace() TO authenticated;
