import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SaveStatusIndicator, LiveRegion, type SaveStatus } from "@/components/save-status";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { checkAchievements } from "@/lib/achievements";
import { ensureReviewCards } from "@/lib/review-cards";
import { z } from "zod";

const FIELDS = [
  { k: "argument_summary", label: "What did the author argue?", helper: "Summarise the author's central thesis in 2–3 sentences." },
  { k: "evidence_used", label: "What evidence did they use?", helper: "What examples, data, or reasoning did they draw on?" },
  { k: "counterargument", label: "What is your counterargument?", helper: "Where do you disagree? What did the author miss or get wrong?" },
  { k: "connections", label: "How does this connect to your other reading?", helper: "Link this to at least one other book or idea you've encountered." },
  { k: "interview_point", label: "What would you raise in interview?", helper: "If a tutor asked about this book, what's the one point you'd want to discuss?" },
] as const;

const searchSchema = z.object({ bookId: z.string().optional(), id: z.string().optional() });

export const Route = createFileRoute("/reflections/new")({
  validateSearch: searchSchema,
  component: () => <RequireAuth><AppShell><ReflectionEditor /></AppShell></RequireAuth>,
});

function ReflectionEditor() {
  const { user } = useAuth();
  const { bookId } = Route.useSearch();
  const nav = useNavigate();
  const [reflection, setReflection] = useState<any>(null);
  const [book, setBook] = useState<any>(null);
  const [vals, setVals] = useState<Record<string, string>>({
    argument_summary: "", evidence_used: "", counterargument: "", connections: "", interview_point: "",
  });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const timer = useRef<any>(null);

  useEffect(() => {
    if (!user || !bookId) return;
    supabase.from("books").select("title, author").eq("id", bookId).maybeSingle().then(({ data }) => setBook(data));
    supabase.from("reflections").select("*").eq("user_id", user.id).eq("book_id", bookId).maybeSingle()
      .then(async ({ data }) => {
        if (data) {
          setReflection(data);
          setVals({
            argument_summary: data.argument_summary ?? "",
            evidence_used: data.evidence_used ?? "",
            counterargument: data.counterargument ?? "",
            connections: data.connections ?? "",
            interview_point: data.interview_point ?? "",
          });
          setSaveStatus("saved");
          setSavedAt(Date.now());
        } else {
          const { data: created } = await supabase.from("reflections").insert({ user_id: user.id, book_id: bookId }).select().maybeSingle();
          setReflection(created);
        }
      });
  }, [user, bookId]);

  async function save(next = vals) {
    if (!reflection) return;
    setSaveStatus("saving");
    const isComplete = Object.values(next).every((v) => v.trim().length >= 50);
    await supabase.from("reflections").update({ ...next, is_complete: isComplete }).eq("id", reflection.id);
    setSaveStatus("saved");
    setSavedAt(Date.now());
    setAnnouncement("Reflection saved");
    if (isComplete && !reflection.is_complete) {
      setReflection({ ...reflection, is_complete: true });
      const newCards = await ensureReviewCards(user!.id, reflection.id, bookId!);
      const newly = await checkAchievements(user!.id);
      newly.forEach((t) => toast.success(`Achievement: ${t.replace(/_/g, " ")}`));
      toast.success(newCards > 0 ? `Reflection complete · ${newCards} review cards added` : "Reflection complete");
    }
  }
  function onChange(k: string, v: string) {
    const next = { ...vals, [k]: v };
    setVals(next);
    setSaveStatus("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(next), 800);
  }

  if (!bookId) return <div className="p-8 text-muted-foreground">Pick a book first.</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 lg:px-8">
      <LiveRegion message={announcement} />
      <div>
        <button onClick={() => nav({ to: "/reflections" })} className="text-xs text-muted-foreground hover:underline">← All reflections</button>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold">Reflection on {book?.title}</h1>
            <p className="text-sm text-muted-foreground">{book?.author}</p>
          </div>
          <SaveStatusIndicator status={saveStatus} savedAt={savedAt} className="mt-2 shrink-0" />
        </div>
      </div>
      {FIELDS.map((f) => {
        const v = vals[f.k] ?? "";
        const wc = v.trim().split(/\s+/).filter(Boolean).length;
        return (
          <div key={f.k} className="rounded-xl border border-border bg-card p-5 shadow-warm">
            <Label className="font-display text-base">{f.label}</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">{f.helper}</p>
            <Textarea value={v} onChange={(e) => onChange(f.k, e.target.value)} onBlur={() => save()} rows={5} className="mt-3 font-serif-reading text-base" />
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
              <span>{v.length >= 50 ? "✓" : "Need 50+ characters"}</span>
              <span>{wc} words</span>
            </div>
          </div>
        );
      })}
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => nav({ to: "/personal-statement" })}>Use in personal statement</Button>
      </div>
    </div>
  );
}
