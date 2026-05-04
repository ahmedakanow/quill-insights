import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

const FIELDS = [
  { k: "argument_summary", label: "What did the author argue?" },
  { k: "evidence_used", label: "What evidence did they use?" },
  { k: "counterargument", label: "Counterargument" },
  { k: "connections", label: "Connections" },
  { k: "interview_point", label: "Interview point" },
] as const;

export const Route = createFileRoute("/reflections/$id")({
  component: () => <RequireAuth><AppShell><EditOne /></AppShell></RequireAuth>,
});

function EditOne() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [r, setR] = useState<any>(null);
  const [book, setBook] = useState<any>(null);
  const timer = useRef<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("reflections").select("*, books(title, author)").eq("id", id).maybeSingle()
      .then(({ data }) => { setR(data); setBook(data?.books); });
  }, [id, user]);

  async function save(next: any) {
    const isComplete = FIELDS.every((f) => (next[f.k] ?? "").trim().length >= 50);
    await supabase.from("reflections").update({ ...Object.fromEntries(FIELDS.map((f) => [f.k, next[f.k] ?? ""])), is_complete: isComplete }).eq("id", id);
    if (isComplete && !r?.is_complete) toast.success("Reflection complete");
  }
  function onChange(k: string, v: string) {
    const n = { ...r, [k]: v }; setR(n);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(n), 800);
  }

  if (!r) return <div className="p-8 text-muted-foreground">Loading…</div>;
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 lg:px-8">
      <button onClick={() => nav({ to: "/reflections" })} className="text-xs text-muted-foreground hover:underline">← All reflections</button>
      <h1 className="font-display text-3xl font-semibold">Reflection on {book?.title}</h1>
      {FIELDS.map((f) => (
        <div key={f.k} className="rounded-xl border border-border bg-card p-5 shadow-warm">
          <Label className="font-display text-base">{f.label}</Label>
          <Textarea value={r[f.k] ?? ""} onChange={(e) => onChange(f.k, e.target.value)} rows={5} className="mt-3 font-serif-reading text-base" />
        </div>
      ))}
    </div>
  );
}
