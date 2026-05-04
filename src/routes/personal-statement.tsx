import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PS_SECTIONS } from "@/lib/quill-data";
import { toast } from "sonner";
import { checkAchievements } from "@/lib/achievements";

export const Route = createFileRoute("/personal-statement")({
  component: () => <RequireAuth><AppShell><PSPage /></AppShell></RequireAuth>,
});

function PSPage() {
  const { user } = useAuth();
  const [blocks, setBlocks] = useState<Record<string, { id?: string; content: string }>>({});
  const [reflections, setReflections] = useState<any[]>([]);
  const timer = useRef<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("personal_statement_blocks").select("*").eq("user_id", user.id)
      .then(({ data }) => {
        const m: Record<string, any> = {};
        PS_SECTIONS.forEach((s) => { m[s.key] = { content: "" }; });
        (data ?? []).forEach((b: any) => { m[b.section] = { id: b.id, content: b.content }; });
        setBlocks(m);
      });
    supabase.from("reflections").select("id, argument_summary, interview_point, books(title)")
      .eq("user_id", user.id).eq("is_complete", true).then(({ data }) => setReflections(data ?? []));
  }, [user]);

  async function save(section: string, content: string) {
    if (!user) return;
    const sec = PS_SECTIONS.find((s) => s.key === section)!;
    await supabase.from("personal_statement_blocks").upsert({
      user_id: user.id, section, content, sort_order: sec.order,
    }, { onConflict: "user_id,section" });
    const newly = await checkAchievements(user.id);
    newly.forEach((t) => toast.success(`Achievement: ${t.replace(/_/g, " ")}`));
  }

  function onChange(section: string, v: string) {
    setBlocks((b) => ({ ...b, [section]: { ...b[section], content: v } }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(section, v), 800);
  }

  const totalChars = Object.values(blocks).reduce((s, b) => s + (b?.content?.length ?? 0), 0);
  const target = 4000;

  function exportText() {
    const text = PS_SECTIONS.map((s) => `## ${s.label}\n\n${blocks[s.key]?.content ?? ""}`).join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 lg:px-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Personal statement</h1>
          <p className="mt-1 text-sm text-muted-foreground">Five sections. Build it from your reading.</p>
        </div>
        <Button variant="outline" onClick={exportText}>Copy to clipboard</Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-warm">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{totalChars} / {target} characters</span>
          <span className="text-xs text-muted-foreground">~{Math.round(totalChars / 6.5)} words</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-accent transition-quill" style={{ width: `${Math.min(100, (totalChars / target) * 100)}%` }} />
        </div>
      </div>

      {PS_SECTIONS.map((s) => (
        <div key={s.key} className="grid gap-4 md:grid-cols-[1fr_240px]">
          <div className="rounded-xl border border-border bg-card p-5 shadow-warm">
            <h2 className="font-display text-xl font-semibold">{s.label}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{s.prompt}</p>
            <Textarea value={blocks[s.key]?.content ?? ""} onChange={(e) => onChange(s.key, e.target.value)} rows={6} className="mt-3 font-serif-reading text-base" />
          </div>
          <aside className="rounded-xl border border-dashed border-border bg-card/40 p-3 text-xs">
            <div className="mb-2 font-medium text-muted-foreground uppercase tracking-wide">Reference reflections</div>
            {reflections.length === 0 ? (
              <p className="text-muted-foreground">Complete reflections to draw on here.</p>
            ) : (
              <ul className="space-y-2">
                {reflections.slice(0, 3).map((r) => (
                  <li key={r.id} className="rounded border border-border bg-card p-2">
                    <div className="font-display text-sm font-semibold">{r.books?.title}</div>
                    <div className="mt-1 text-muted-foreground line-clamp-3">{r.interview_point || r.argument_summary}</div>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      ))}
    </div>
  );
}
