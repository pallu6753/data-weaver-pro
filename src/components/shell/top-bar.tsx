import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Command as CmdIcon, Bell, User } from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { usePlatform } from "@/lib/mock/store";

export function TopBar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const pipelines = usePlatform((s) => s.pipelines);
  const sources = usePlatform((s) => s.sources);
  const datasets = usePlatform((s) => s.datasets);
  const alerts = usePlatform((s) => s.alerts);
  const unread = alerts.filter((a) => !a.ack).length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (to: string) => { setOpen(false); navigate({ to }); };

  return (
    <header className="glass sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border/60 px-4">
      <SidebarTrigger />
      <button
        onClick={() => setOpen(true)}
        className="flex flex-1 items-center gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-1.5 text-left text-sm text-muted-foreground transition hover:border-primary/40 hover:bg-background/70 max-w-xl"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1">Search pipelines, tables, jobs…</span>
        <kbd className="flex items-center gap-0.5 rounded border border-border/60 bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono">
          <CmdIcon className="h-3 w-3" />K
        </kbd>
      </button>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/alerts" })} className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--destructive)] px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread}
            </span>
          )}
        </Button>
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-2 py-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[image:var(--gradient-brand)] text-[10px] font-bold text-white">DA</div>
          <div className="hidden text-xs leading-tight md:block">
            <div className="font-medium">Demo Admin</div>
            <div className="text-muted-foreground">Platform Owner</div>
          </div>
        </div>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Jump to anything…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Navigate">
            <CommandItem onSelect={() => go("/")}>Dashboard</CommandItem>
            <CommandItem onSelect={() => go("/pipelines")}>Pipelines</CommandItem>
            <CommandItem onSelect={() => go("/sources")}>Data Sources</CommandItem>
            <CommandItem onSelect={() => go("/monitoring")}>Monitoring</CommandItem>
            <CommandItem onSelect={() => go("/lineage")}>Lineage</CommandItem>
            <CommandItem onSelect={() => go("/copilot")}>AI Copilot</CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Pipelines">
            {pipelines.slice(0, 6).map((p) => (
              <CommandItem key={p.id} onSelect={() => go(`/pipelines/${p.id}`)}>
                <span className="mr-2 flex-1 truncate">{p.name}</span>
                <Badge variant="secondary" className="text-[10px]">{p.mode}</Badge>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Sources">
            {sources.slice(0, 5).map((s) => (
              <CommandItem key={s.id} onSelect={() => go("/sources")}>{s.name}</CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Datasets">
            {datasets.map((d) => (
              <CommandItem key={d.id} onSelect={() => go("/catalog")}>{d.name}</CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}
