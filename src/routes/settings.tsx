import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { SUBJECTS } from "@/lib/quill-data";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  component: () => <RequireAuth><AppShell><SettingsPage /></AppShell></RequireAuth>,
});

function SettingsPage() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [p, setP] = useState<any>(null);
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setP(data));
  }, [user]);

  async function save() {
    await supabase.from("profiles").update({
      full_name: p.full_name, target_university: p.target_university,
      target_subject: p.target_subject, target_college: p.target_college,
      year_group: p.year_group, daily_reading_goal_minutes: p.daily_reading_goal_minutes,
    }).eq("id", user!.id);
    toast.success("Saved");
  }

  if (!p) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 lg:px-8">
      <h1 className="font-display text-3xl font-semibold">Settings</h1>

      <section className="rounded-xl border border-border bg-card p-5 shadow-warm space-y-4">
        <h2 className="font-display text-xl font-semibold">Profile</h2>
        <div className="space-y-1.5"><Label>Full name</Label><Input value={p.full_name ?? ""} onChange={(e) => setP({ ...p, full_name: e.target.value })} /></div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5"><Label>Target university</Label>
            <select value={p.target_university ?? ""} onChange={(e) => setP({ ...p, target_university: e.target.value })} className="w-full rounded-md border border-border bg-background p-2 text-sm">
              <option value="oxford">Oxford</option><option value="cambridge">Cambridge</option><option value="both">Both</option>
            </select>
          </div>
          <div className="space-y-1.5"><Label>Year group</Label>
            <select value={p.year_group ?? ""} onChange={(e) => setP({ ...p, year_group: e.target.value })} className="w-full rounded-md border border-border bg-background p-2 text-sm">
              <option value="">—</option><option value="year_12">Year 12</option><option value="year_13">Year 13</option>
            </select>
          </div>
        </div>
        <div className="space-y-1.5"><Label>Subject</Label>
          <select value={p.target_subject ?? ""} onChange={(e) => setP({ ...p, target_subject: e.target.value })} className="w-full rounded-md border border-border bg-background p-2 text-sm">
            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="space-y-1.5"><Label>College (optional)</Label><Input value={p.target_college ?? ""} onChange={(e) => setP({ ...p, target_college: e.target.value })} /></div>
        <Button onClick={save}>Save profile</Button>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-warm space-y-3">
        <h2 className="font-display text-xl font-semibold">Daily reading goal</h2>
        <div className="font-display text-3xl text-accent">{p.daily_reading_goal_minutes} min</div>
        <Slider value={[p.daily_reading_goal_minutes]} min={15} max={60} step={5}
          onValueChange={(v) => setP({ ...p, daily_reading_goal_minutes: v[0] })}
          onValueCommit={save} />
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-warm space-y-3">
        <h2 className="font-display text-xl font-semibold">Appearance</h2>
        <div className="flex gap-2">
          {(["light", "dark", "system"] as const).map((t) => (
            <Button key={t} variant={theme === t ? "default" : "outline"} size="sm" onClick={() => setTheme(t)}>{t}</Button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-warm space-y-3">
        <h2 className="font-display text-xl font-semibold">Account</h2>
        <Button variant="outline" onClick={() => signOut()}>Sign out</Button>
      </section>
    </div>
  );
}
