import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { RequireAuth } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveRegion } from "@/components/save-status";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { applySm2 } from "@/lib/review-cards";
import { checkAchievements } from "@/lib/achievements";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/review")({
  component: () => <RequireAuth><ReviewPage /></RequireAuth>,
});

const TIPS = [
  "Take your time in interview. Speed of response won't impress.",
  "If a tutor offers a hint, take it — they want to see you think, not memorise.",
  "It's fine to say 'I hadn't considered that' and then work through it aloud.",
  "Tutors examine your thinking, not your knowledge. Show your reasoning.",
  "Re-read your reflections out loud. Speech reveals what writing hides.",
];

const KBD_HINT_KEY = "quill-review-kbd-uses";

type Card = {
  id: string;
  prompt_text: string;
  card_type: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  reflection_id: string;
  books: { title: string; author: string } | null;
  reflections: {
    argument_summary: string;
    counterargument: string;
    interview_point: string;
  } | null;
};

const QUALITY_LABELS: Record<number, string> = { 1: "Hard", 3: "Good", 5: "Easy" };

function ReviewPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [cards, setCards] = useState<Card[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [showRef, setShowRef] = useState(false);
  const [done, setDone] = useState(0);
  const [nextDate, setNextDate] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [kbdUses, setKbdUses] = useState(0);

  useEffect(() => {
    try {
      const v = parseInt(localStorage.getItem(KBD_HINT_KEY) ?? "0", 10);
      if (!Number.isNaN(v)) setKbdUses(v);
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from("review_cards")
      .select("*, books(title, author), reflections(argument_summary, counterargument, interview_point)")
      .eq("user_id", user.id)
      .lte("next_review_date", today)
      .order("next_review_date", { ascending: true })
      .then(({ data }) => {
        setCards((data ?? []) as any);
      });
  }, [user]);

  useEffect(() => setShowRef(false), [idx]);

  async function rate(quality: number) {
    if (!user || !cards) return;
    const card = cards[idx];
    if (!card) return;
    const next = applySm2(card, quality);
    await Promise.all([
      supabase.from("review_cards").update({
        ...next,
        last_reviewed_at: new Date().toISOString(),
      }).eq("id", card.id),
      supabase.from("review_sessions").insert({
        user_id: user.id,
        card_id: card.id,
        quality,
      }),
    ]);
    setAnnouncement(`Review card rated ${QUALITY_LABELS[quality]}, next due in ${next.interval_days} day${next.interval_days === 1 ? "" : "s"}.`);
    setDone((d) => d + 1);
    if (idx + 1 < cards.length) {
      setIdx(idx + 1);
    } else {
      const { data } = await supabase
        .from("review_cards")
        .select("next_review_date")
        .eq("user_id", user.id)
        .order("next_review_date", { ascending: true })
        .limit(1);
      setNextDate(data?.[0]?.next_review_date ?? null);
      const newly = await checkAchievements(user.id);
      newly.forEach((t) => toast.success(`Achievement: ${t.replace(/_/g, " ")}`));
      setIdx(idx + 1);
    }
  }

  function bumpKbd() {
    setKbdUses((n) => {
      const v = n + 1;
      try { localStorage.setItem(KBD_HINT_KEY, String(v)); } catch {}
      return v;
    });
  }

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === "Escape") { e.preventDefault(); nav({ to: "/dashboard" }); return; }
      if (!cards || !cards[idx]) return;
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        setShowRef((s) => !s);
        bumpKbd();
        return;
      }
      if (e.key === "1") { e.preventDefault(); bumpKbd(); rate(1); return; }
      if (e.key === "2") { e.preventDefault(); bumpKbd(); rate(3); return; }
      if (e.key === "3") { e.preventDefault(); bumpKbd(); rate(5); return; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, idx, nav]);

  const total = cards?.length ?? 0;
  const completed = done;
  const card = cards?.[idx];
  const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
  const showHint = kbdUses < 3;

  return (
    <div className="min-h-screen bg-background">
      <LiveRegion message={announcement} />
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <button onClick={() => nav({ to: "/dashboard" })} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </button>
          <div className="text-xs text-muted-foreground">
            {total === 0 ? (cards === null ? "" : "No cards") : `${Math.min(completed + (card ? 1 : 0), total)} of ${total}`}
          </div>
        </div>
        <div className="h-1 bg-muted">
          <div className="h-full bg-accent transition-quill" style={{ width: total === 0 ? "0%" : `${(completed / total) * 100}%` }} />
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-12 lg:py-20">
        {cards === null ? (
          <div>
            <h1 className="sr-only">Loading review</h1>
            <div className="space-y-4 text-center">
              <Skeleton className="mx-auto h-3 w-32" />
              <Skeleton className="mx-auto h-10 w-3/4" />
              <Skeleton className="mx-auto h-10 w-2/3" />
              <Skeleton className="mx-auto h-10 w-1/2" />
              <Skeleton className="mx-auto mt-4 h-3 w-40" />
            </div>
            <div className="mt-12 grid grid-cols-1 gap-3 md:grid-cols-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
            </div>
          </div>
        ) : total === 0 ? (
          <div className="text-center">
            <h1 className="font-display text-4xl font-semibold">Nothing due today.</h1>
            <p className="mt-3 font-serif-reading text-lg text-muted-foreground">
              Complete more reflections to generate review prompts. Each completed reflection gives you 3 interview-style cards to rehearse.
            </p>
            <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground/80">
              Tip: Each completed reflection generates 3 interview-style review cards automatically.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Button asChild><Link to="/reflections">Write a reflection</Link></Button>
              <Button variant="outline" asChild><Link to="/dashboard">Back to dashboard</Link></Button>
            </div>
          </div>
        ) : !card ? (
          <div className="text-center">
            <h1 className="font-display text-4xl font-semibold">All done for today.</h1>
            <p className="mt-3 text-lg text-muted-foreground">
              {completed} card{completed === 1 ? "" : "s"} reviewed.
              {nextDate && ` Next review: ${new Date(nextDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}.`}
            </p>
            <blockquote className="mx-auto mt-8 max-w-md border-l-2 border-accent pl-4 text-left font-serif-reading italic text-muted-foreground">
              {tip}
            </blockquote>
            <div className="mt-8 flex justify-center gap-3">
              <Button asChild><Link to="/dashboard">Back to dashboard</Link></Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {card.card_type.replace(/_/g, " ")}
              </p>
              <h1 className="mt-4 font-serif-reading text-3xl leading-snug md:text-4xl">
                {card.prompt_text}
              </h1>
              <p className="mt-6 text-sm text-muted-foreground">
                {card.books?.title} {card.books?.author && <>· <span>{card.books.author}</span></>}
              </p>
            </div>

            <div className="mt-12">
              <button
                onClick={() => setShowRef((s) => !s)}
                className="mx-auto flex items-center gap-1 text-sm text-accent hover:underline"
              >
                {showRef ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showRef ? "Hide my reflection" : "Show my reflection"}
              </button>
              {showRef && card.reflections && (
                <div className="mt-4 space-y-3 rounded-xl border border-border bg-card p-5 font-serif-reading text-sm shadow-warm">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Argument</div>
                    <p className="mt-1">{card.reflections.argument_summary}</p>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Counterargument</div>
                    <p className="mt-1">{card.reflections.counterargument}</p>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Interview point</div>
                    <p className="mt-1">{card.reflections.interview_point}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-12 grid grid-cols-1 gap-3 md:grid-cols-3">
              {[
                { q: 1, label: "Hard", sub: "Show again soon", style: "border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30" },
                { q: 3, label: "Good", sub: "I remembered", style: "border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30" },
                { q: 5, label: "Easy", sub: "I nailed it", style: "border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" },
              ].map((b) => (
                <button
                  key={b.q}
                  onClick={() => rate(b.q)}
                  className={cn("min-h-[48px] rounded-xl border-2 bg-card p-4 text-left transition-quill shadow-warm", b.style)}
                >
                  <div className="font-display text-lg font-semibold">{b.label}</div>
                  <div className="text-xs text-muted-foreground">{b.sub}</div>
                </button>
              ))}
            </div>

            {showHint && (
              <p className="mt-8 text-center text-[11px] text-muted-foreground">
                Keyboard: Space to reveal · 1 Hard · 2 Good · 3 Easy
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
