import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { SaveStatusIndicator, LiveRegion, type SaveStatus } from "@/components/save-status";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { ensureReviewCards } from "@/lib/review-cards";

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
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const timer = useRef<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("reflections").select("*, books(title, author)").eq("id", id).maybeSingle()
      .then(({ data }) => {
        setR(data);
        setBook(data?.books);
        if (data) { setSaveStatus("saved"); setSavedAt(Date.now()); }
      });
  }, [id, user]);

  async function save(next: any) {
    setSaveStatus("saving");
    const isComplete = FIELDS.every((f) => (next[f.k] ?? "").trim().length >= 50);
    await supabase.from("reflections").update({ ...Object.fromEntries(FIELDS.map((f) => [f.k, next[f.k] ?? ""])), is_complete: isComplete }).eq("id", id);
    setSaveStatus("saved");
    setSavedAt(Date.now());
    setAnnouncement("Reflection saved");
    if (isComplete && !r?.is_complete) {
      if (user && r?.book_id) await ensureReviewCards(user.id, id, r.book_id);
      toast.success("Reflection complete");
    }
  }
  function onChange(k: string, v: string) {
    const n = { ...r, [k]: v }; setR(n);
    setSaveStatus("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(n), 800);
  }

  if (!r) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 lg:px-8">
        <h1 className="sr-only">Loading reflection</h1>
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-9 w-2/3" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-warm space-y-3">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-28 w-full" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 lg:px-8">
      <LiveRegion message={announcement} />
      <button onClick={() => nav({ to: "/reflections" })} className="text-xs text-muted-foreground hover:underline">← All reflections</button>
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold">Reflection on {book?.title}</h1>
        <SaveStatusIndicator status={saveStatus} savedAt={savedAt} className="mt-2 shrink-0" />
      </div>
      {FIELDS.map((f) => (
        <div key={f.k} className="rounded-xl border border-border bg-card p-5 shadow-warm">
          <Label className="font-display text-base">{f.label}</Label>
          <Textarea value={r[f.k] ?? ""} onChange={(e) => onChange(f.k, e.target.value)} rows={5} className="mt-3 font-serif-reading text-base" />
        </div>
      ))}
    </div>
  );
}
