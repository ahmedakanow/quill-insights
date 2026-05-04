import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X, ChevronDown, ChevronUp, ShieldCheck, AlertTriangle, AlertOctagon } from "lucide-react";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PS_SECTIONS } from "@/lib/quill-data";
import { toast } from "sonner";
import { checkAchievements } from "@/lib/achievements";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/personal-statement")({
  component: () => <RequireAuth><AppShell><PSPage /></AppShell></RequireAuth>,
});

type Block = { id?: string; content: string; linked_reflection_ids: string[] };

function PSPage() {
  const { user } = useAuth();
  const [blocks, setBlocks] = useState<Record<string, Block>>({});
  const [reflections, setReflections] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(true);
  const [allBooks, setAllBooks] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [annotationsByBook, setAnnotationsByBook] = useState<Record<string, number>>({});
  const [reflectionsByBook, setReflectionsByBook] = useState<Record<string, any>>({});
  const timer = useRef<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("personal_statement_blocks").select("*").eq("user_id", user.id)
      .then(({ data }) => {
        const m: Record<string, Block> = {};
        PS_SECTIONS.forEach((s) => { m[s.key] = { content: "", linked_reflection_ids: [] }; });
        (data ?? []).forEach((b: any) => {
          m[b.section] = {
            id: b.id,
            content: b.content,
            linked_reflection_ids: b.linked_reflection_ids ?? [],
          };
        });
        setBlocks(m);
      });
    supabase.from("reflections").select("id, argument_summary, interview_point, counterargument, book_id, books(title)")
      .eq("user_id", user.id).eq("is_complete", true).then(({ data }) => {
        setReflections(data ?? []);
        const m: Record<string, any> = {};
        (data ?? []).forEach((r: any) => { m[r.book_id] = r; });
        setReflectionsByBook(m);
      });
    supabase.from("books").select("id, title, author").then(({ data }) => setAllBooks(data ?? []));
    supabase.from("reading_progress").select("book_id, last_read_at, status").eq("user_id", user.id)
      .then(({ data }) => setProgress(data ?? []));
    supabase.from("annotations").select("book_id").eq("user_id", user.id).then(({ data }) => {
      const m: Record<string, number> = {};
      (data ?? []).forEach((a: any) => { m[a.book_id] = (m[a.book_id] ?? 0) + 1; });
      setAnnotationsByBook(m);
    });
  }, [user]);

  async function persist(section: string, patch: Partial<Block>) {
    if (!user) return;
    const sec = PS_SECTIONS.find((s) => s.key === section)!;
    const current = blocks[section] ?? { content: "", linked_reflection_ids: [] };
    const merged = { ...current, ...patch };
    await supabase.from("personal_statement_blocks").upsert({
      user_id: user.id,
      section,
      content: merged.content,
      linked_reflection_ids: merged.linked_reflection_ids,
      sort_order: sec.order,
    }, { onConflict: "user_id,section" });
    const newly = await checkAchievements(user.id);
    newly.forEach((t) => toast.success(`Achievement: ${t.replace(/_/g, " ")}`));
  }

  function onChange(section: string, v: string) {
    setBlocks((b) => ({ ...b, [section]: { ...b[section], content: v } }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => persist(section, { content: v }), 800);
  }

  async function toggleLink(section: string, reflectionId: string) {
    const cur = blocks[section]?.linked_reflection_ids ?? [];
    const next = cur.includes(reflectionId)
      ? cur.filter((id) => id !== reflectionId)
      : [...cur, reflectionId];
    setBlocks((b) => ({ ...b, [section]: { ...b[section], linked_reflection_ids: next } }));
    await persist(section, { linked_reflection_ids: next });
    toast.success(cur.includes(reflectionId) ? "Reflection unlinked" : "Reflection linked");
  }

  const totalChars = Object.values(blocks).reduce((s, b) => s + (b?.content?.length ?? 0), 0);
  const target = 4000;
  const minPerSection = 350;

  function exportText() {
    const text = PS_SECTIONS.map((s) => `## ${s.label}\n\n${blocks[s.key]?.content ?? ""}`).join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  // Risk audit: scan all section content for book titles in user's library
  const audit = useMemo(() => {
    const fullText = Object.values(blocks).map((b) => b?.content ?? "").join("\n").toLowerCase();
    const ninetyDaysAgo = Date.now() - 90 * 86400000;
    const findings: Array<{ book: any; status: "green" | "yellow" | "red"; reasons: string[] }> = [];
    for (const book of allBooks) {
      const title = (book.title ?? "").toLowerCase();
      if (title.length < 4) continue;
      if (!fullText.includes(title)) continue;
      const annCount = annotationsByBook[book.id] ?? 0;
      const refl = reflectionsByBook[book.id];
      const prog = progress.find((p) => p.book_id === book.id);
      const lastRead = prog?.last_read_at ? new Date(prog.last_read_at).getTime() : 0;
      const recentRead = lastRead >= ninetyDaysAgo;
      const counterLen = (refl?.counterargument ?? "").length;

      if (!refl) {
        findings.push({
          book, status: "red",
          reasons: ["You mention this book but have no reflection. Tutors WILL ask about it."],
        });
        continue;
      }
      const reasons: string[] = [];
      if (annCount < 3) reasons.push(`Only ${annCount} annotation${annCount === 1 ? "" : "s"} — re-read and mark up.`);
      if (counterLen < 50) reasons.push("No counterargument written — tutors love a respectful disagreement.");
      if (!recentRead) {
        const months = lastRead ? Math.round((Date.now() - lastRead) / (30 * 86400000)) : "?";
        reasons.push(`Last read ${months} month${months === 1 ? "" : "s"} ago — review before interview.`);
      }
      findings.push({ book, status: reasons.length ? "yellow" : "green", reasons });
    }
    return findings;
  }, [blocks, allBooks, annotationsByBook, reflectionsByBook, progress]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 lg:px-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Personal statement</h1>
          <p className="mt-1 text-sm text-muted-foreground">Three sections — UCAS format. Build it from your reading.</p>
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

      {/* Risk Audit */}
      <div className="rounded-xl border border-border bg-card shadow-warm">
        <button onClick={() => setAuditOpen((o) => !o)} className="flex w-full items-center justify-between p-4 text-left">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent" />
            <span className="font-display text-base font-semibold">Statement risk check</span>
            {audit.length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">
                {audit.filter((a) => a.status === "green").length} ✓ ·{" "}
                {audit.filter((a) => a.status === "yellow").length} ⚠ ·{" "}
                {audit.filter((a) => a.status === "red").length} ✗
              </span>
            )}
          </div>
          {auditOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {auditOpen && (
          <div className="border-t border-border p-4">
            {audit.length === 0 ? (
              <p className="text-sm text-muted-foreground">No book mentions detected yet. Mention books from your library above.</p>
            ) : (
              <ul className="space-y-2">
                {audit.map((a) => (
                  <li key={a.book.id} className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 text-sm",
                    a.status === "green" && "border-emerald-300/60 bg-emerald-50/50 dark:bg-emerald-950/20",
                    a.status === "yellow" && "border-amber-300/60 bg-amber-50/50 dark:bg-amber-950/20",
                    a.status === "red" && "border-rose-300/60 bg-rose-50/50 dark:bg-rose-950/20",
                  )}>
                    <span className="mt-0.5 shrink-0">
                      {a.status === "green" && <ShieldCheck className="h-4 w-4 text-emerald-600" />}
                      {a.status === "yellow" && <AlertTriangle className="h-4 w-4 text-amber-600" />}
                      {a.status === "red" && <AlertOctagon className="h-4 w-4 text-rose-600" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-sm font-semibold">{a.book.title}</div>
                      <div className="text-xs text-muted-foreground">{a.book.author}</div>
                      {a.reasons.length > 0 && (
                        <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
                          {a.reasons.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      )}
                    </div>
                    <Link to="/reflections/new" search={{ bookId: a.book.id }} className="shrink-0 text-xs text-accent hover:underline">
                      {reflectionsByBook[a.book.id] ? "Edit reflection" : "Write reflection"} →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {PS_SECTIONS.map((s) => {
        const linkedIds = blocks[s.key]?.linked_reflection_ids ?? [];
        const linked = reflections.filter((r) => linkedIds.includes(r.id));
        const content = blocks[s.key]?.content ?? "";
        const len = content.length;
        const tooShort = len > 0 && len < minPerSection;
        return (
          <div key={s.key} className="grid gap-4 md:grid-cols-[1fr_240px]">
            <div className="rounded-xl border border-border bg-card p-5 shadow-warm">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-xl font-semibold">{s.label}</h2>
                {tooShort && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                    Below {minPerSection} chars
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.prompt}</p>
              <Textarea
                value={content}
                onChange={(e) => onChange(s.key, e.target.value)}
                onBlur={() => persist(s.key, { content })}
                rows={8}
                className="mt-3 font-serif-reading text-base"
              />
              <div className="mt-1 flex justify-end text-[11px] text-muted-foreground">
                {len} chars · min {minPerSection}
              </div>
            </div>
            <aside className="rounded-xl border border-dashed border-border bg-card/40 p-3 text-xs">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-medium text-muted-foreground uppercase tracking-wide">Linked reflections</div>
              </div>
              {linked.length === 0 ? (
                <p className="text-muted-foreground">No reflections linked yet.</p>
              ) : (
                <ul className="space-y-2">
                  {linked.map((r) => (
                    <li key={r.id} className="rounded border border-border bg-card p-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-display text-sm font-semibold">{r.books?.title}</div>
                          <div className="mt-1 text-muted-foreground line-clamp-3">{r.interview_point || r.argument_summary}</div>
                        </div>
                        <button
                          onClick={() => toggleLink(s.key, r.id)}
                          className="grid h-5 w-5 shrink-0 place-items-center rounded hover:bg-muted"
                          title="Unlink"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <Dialog open={openDialog === s.key} onOpenChange={(o) => setOpenDialog(o ? s.key : null)}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="mt-3 w-full gap-1">
                    <Plus className="h-3 w-3" /> Link a reflection
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Link reflections — {s.label}</DialogTitle>
                    <DialogDescription>
                      Pick completed reflections to anchor this section.
                    </DialogDescription>
                  </DialogHeader>
                  {reflections.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Complete some reflections first.
                    </p>
                  ) : (
                    <ul className="max-h-[60vh] space-y-2 overflow-auto">
                      {reflections.map((r) => {
                        const isLinked = linkedIds.includes(r.id);
                        return (
                          <li key={r.id}>
                            <button
                              onClick={() => toggleLink(s.key, r.id)}
                              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                                isLinked ? "border-accent bg-accent/10" : "border-border hover:bg-muted/50"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="font-display text-sm font-semibold">{r.books?.title}</div>
                                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                    {r.interview_point || r.argument_summary}
                                  </div>
                                </div>
                                <span className="shrink-0 text-xs font-medium">
                                  {isLinked ? "Linked" : "Link"}
                                </span>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </DialogContent>
              </Dialog>
            </aside>
          </div>
        );
      })}
    </div>
  );
}
