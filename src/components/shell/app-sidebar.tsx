import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Database, GitBranch, Activity, Network, ScrollText,
  Bell, BookMarked, Sparkles, Settings, Waves, Boxes, ShieldCheck,
} from "lucide-react";

import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const platform = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Data Sources", url: "/sources", icon: Database },
  { title: "Pipelines", url: "/pipelines", icon: GitBranch },
  { title: "Monitoring", url: "/monitoring", icon: Activity },
  { title: "Lineage", url: "/lineage", icon: Network },
];
const insights = [
  { title: "Logs", url: "/logs", icon: ScrollText },
  { title: "Alerts", url: "/alerts", icon: Bell },
  { title: "Data Catalog", url: "/catalog", icon: BookMarked },
];
const intelligence = [
  { title: "AI Copilot", url: "/copilot", icon: Sparkles },
];
const admin = [
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (u: string) => (u === "/" ? pathname === "/" : pathname.startsWith(u));

  const section = (label: string, items: typeof platform) => (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70">{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                <Link to={item.url} className="flex items-center gap-3">
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="font-medium">{item.title}</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2.5 px-2 py-2">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-[image:var(--gradient-brand)] shadow-[var(--shadow-glow)]">
            <Waves className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-none">
              <span className="font-display text-base font-semibold tracking-tight text-sidebar-foreground">NexusFlow</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Data Platform</span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-1">
        {section("Platform", platform)}
        {section("Observability", insights)}
        {section("Intelligence", intelligence)}
        {section("Admin", admin)}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed ? (
          <div className="glass rounded-lg p-3 text-xs">
            <div className="flex items-center gap-2 font-medium text-sidebar-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-[color:var(--success)]" />
              Prod • us-east-1
            </div>
            <div className="mt-1 text-muted-foreground">All systems operational</div>
          </div>
        ) : (
          <div className="mx-auto flex h-8 w-8 items-center justify-center">
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
