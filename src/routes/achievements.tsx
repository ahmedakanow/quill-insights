import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ACHIEVEMENT_DEFS } from "@/lib/quill-data";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/achievements")({
  component: () => <RequireAuth><AppShell><AchievementsPage /></AppShell></RequireAuth>,
});

function AchievementsPage() {
  const { user } = useAuth();
  const [earned, setEarned] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!user) return;
    supabase.from("achievements").select("achievement_type, earned_at").eq("user_id", user.id)
      .then(({ data }) => {
        const m: Record<string, string> = {};
        (data ?? []).forEach((a: any) => { m[a.achievement_type] = a.earned_at; });
        setEarned(m);
      });
  }, [user]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 lg:px-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Achievements</h1>
        <p className="mt-1 text-sm text-muted-foreground">Markers of intellectual progress.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {Object.entries(ACHIEVEMENT_DEFS).map(([key, def]) => {
          const Icon = (Icons as any)[def.icon] ?? Icons.Star;
          const isEarned = !!earned[key];
          return (
            <div key={key} className={cn("rounded-xl border p-4 shadow-warm transition-quill",
              isEarned ? "border-accent/50 bg-card" : "border-border bg-card/50 opacity-60")}>
              <div className={cn("mb-3 grid h-10 w-10 place-items-center rounded-lg",
                isEarned ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground")}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold">{def.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{def.description}</p>
              {isEarned && <p className="mt-2 text-[10px] uppercase tracking-wide text-accent">Earned {new Date(earned[key]).toLocaleDateString()}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
