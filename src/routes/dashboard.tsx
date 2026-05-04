import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { BookCard, type BookCardData } from "@/components/book-card";
import { EmptyState } from "@/components/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { getDailyQuote } from "@/lib/quill-data";
import { buildMilestones, daysBetween, formatMilestoneDate, nextMilestone } from "@/lib/timeline";
import { BookOpen, Brain, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  component: () => <RequireAuth><AppShell><Dashboard /></AppShell></RequireAuth>,
});

function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [reading, setReading] = useState<Array<BookCardData & { progress: number }>>([]);
  const [recommended, setRecommended] = useState<BookCardData[]>([]);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [weekDays, setWeekDays] = useState<boolean[]>([]);
  const [stats, setStats] = useState({ finished: 0, reflections: 0, hours: 0 });
  const [recentReflections, setRecentReflections] = useState<any[]>([]);
  const [dueReviews, setDueReviews] = useState(0);
  const quote = getDailyQuote();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setProfile(prof);

      // Continue reading
      const { data: rp } = await supabase
        .from("reading_progress")
        .select("scroll_position, books(*)")
        .eq("user_id", user.id)
        .eq("status", "reading")
        .order("last_read_at", { ascending: false });
      setReading(
        (rp ?? []).filter((r: any) => r.books).map((r: any) => ({ ...r.books, progress: r.scroll_position })),
      );

      // Recommendations: same subject, not started
      if (prof?.target_subject) {
        const { data: rpAll } = await supabase
          .from("reading_progress")
          .select("book_id")
          .eq("user_id", user.id);
        const seenIds = new Set((rpAll ?? []).map((r: any) => r.book_id));
        const { data: books } = await supabase
          .from("books")
          .select("*")
          .contains("subjects", [prof.target_subject])
          .limit(8);
        setRecommended((books ?? []).filter((b) => !seenIds.has(b.id)).slice(0, 4));
      }

      // Sessions today + last 7 days
      const today = new Date().toISOString().slice(0, 10);
      const { data: sessions } = await supabase
        .from("reading_sessions")
        .select("duration_minutes, session_date")
        .eq("user_id", user.id);
      const byDay = new Map<string, number>();
      (sessions ?? []).forEach((s: any) => byDay.set(s.session_date, (byDay.get(s.session_date) ?? 0) + s.duration_minutes));
      setTodayMinutes(byDay.get(today) ?? 0);
      const goal = prof?.daily_reading_goal_minutes ?? 30;
      const days: boolean[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const k = d.toISOString().slice(0, 10);
        days.push((byDay.get(k) ?? 0) >= goal);
      }
      setWeekDays(days);

      const totalMin = (sessions ?? []).reduce((s: number, x: any) => s + x.duration_minutes, 0);

      const { count: finishedCount } = await supabase
        .from("reading_progress").select("*", { count: "exact", head: true })
        .eq("user_id", user.id).eq("status", "finished");
      const { count: refCount, data: recentRefs } = await supabase
        .from("reflections").select("*, books(title, author)", { count: "exact" })
        .eq("user_id", user.id).order("updated_at", { ascending: false }).limit(3);
      setStats({ finished: finishedCount ?? 0, reflections: refCount ?? 0, hours: Math.round(totalMin / 60) });
      setRecentReflections(recentRefs ?? []);

      const todayStr = new Date().toISOString().slice(0, 10);
      const { count: dueCount } = await supabase
        .from("review_cards")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .lte("next_review_date", todayStr);
      setDueReviews(dueCount ?? 0);
    })();
  }, [user]);

  const goal = profile?.daily_reading_goal_minutes ?? 30;
  const pct = Math.min(1, todayMinutes / goal);
  const C = 2 * Math.PI * 56;

  const today = new Date();
  const interviewDate = profile?.interview_date ? new Date(profile.interview_date) : null;
  const milestones = buildMilestones(profile?.year_group, interviewDate, today);
  const upcoming = nextMilestone(milestones, today);
  // Show only the 4 nearest (last past + next 3 upcoming) for compactness
  const upcomingIdx = upcoming ? milestones.findIndex((m) => m.key === upcoming.key) : milestones.length;
  const tlStart = Math.max(0, upcomingIdx - 1);
  const tlSlice = milestones.slice(tlStart, tlStart + 4);

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-8 lg:px-8">
      {/* Oxbridge Timeline */}
      <section className="rounded-xl border border-border bg-card p-6 shadow-warm">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-lg font-semibold">Oxbridge timeline</h2>
          <Link to="/timeline" className="text-xs text-accent underline-offset-4 hover:underline">View full timeline</Link>
        </div>
        {!upcoming ? (
          <p className="text-sm text-muted-foreground">Offers season — good luck!</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-4">
            {tlSlice.map((m) => {
              const days = daysBetween(today, new Date(m.date));
              const isPast = days < 0;
              const isNext = upcoming.key === m.key;
              return (
                <div key={m.key} className={cn(
                  "rounded-lg border p-3 transition-quill",
                  isNext ? "border-accent bg-accent/5" : "border-border bg-background/40",
                )}>
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
                    <span>{formatMilestoneDate(new Date(m.date))}</span>
                    {isPast && <Check className="h-3 w-3 text-emerald-500" />}
                  </div>
                  <div className="mt-1 font-display text-sm font-semibold">{m.label}</div>
                  <div className={cn("mt-1 text-xs", isNext ? "text-accent font-medium" : "text-muted-foreground")}>
                    {isPast ? "Passed" : `${days} days away`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Daily review CTA */}
      {dueReviews > 0 && (
        <section className="flex items-center justify-between rounded-xl border-2 border-accent bg-accent/5 p-5 shadow-warm">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-foreground">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-base font-semibold">Daily review</div>
              <div className="text-sm text-muted-foreground">
                You have {dueReviews} interview prompt{dueReviews === 1 ? "" : "s"} to review today.
              </div>
            </div>
          </div>
          <Button asChild><Link to="/review">Start review</Link></Button>
        </section>
      )}

      {/* Welcome */}
      <section>
        <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold md:text-4xl">
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.
        </h1>
        <blockquote className="mt-3 max-w-2xl border-l-2 border-accent pl-4 font-serif-reading italic text-muted-foreground">
          "{quote.text}" <span className="not-italic">— {quote.author}</span>
        </blockquote>
      </section>

      {/* Goal ring + week tracker */}
      <section className="grid gap-6 rounded-xl border border-border bg-card p-6 shadow-warm md:grid-cols-2">
        <div className="flex items-center gap-6">
          <div className="relative h-32 w-32">
            <svg viewBox="0 0 128 128" className="h-32 w-32 -rotate-90">
              <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor" className="text-muted" strokeWidth="10" />
              <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor" className="text-accent" strokeWidth="10"
                strokeDasharray={C} strokeDashoffset={C * (1 - pct)} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <div className="font-display text-2xl font-semibold">{Math.round(pct * 100)}%</div>
                <div className="text-[10px] uppercase text-muted-foreground">today</div>
              </div>
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Today's reading goal</div>
            <div className="font-display text-2xl font-semibold">{todayMinutes} of {goal} min</div>
          </div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">This week</div>
          <div className="mt-3 flex items-center gap-3">
            {weekDays.map((met, i) => {
              const isToday = i === weekDays.length - 1;
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className={`h-7 w-7 rounded-full border-2 ${met ? "bg-accent border-accent" : "border-border"} ${isToday ? "ring-2 ring-accent/40 ring-offset-2 ring-offset-card" : ""}`} />
                  <span className="text-[10px] text-muted-foreground">{["S","M","T","W","T","F","S"][(new Date().getDay() - 6 + i + 7) % 7]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Continue reading */}
      <section>
        <h2 className="mb-4 font-display text-2xl font-semibold">Continue reading</h2>
        {reading.length === 0 ? (
          <EmptyState icon={BookOpen} title="Nothing in progress" message="Pick a book from the library to start your reading practice." ctaLabel="Browse the library" ctaTo="/library" />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {reading.slice(0, 4).map((b) => (<BookCard key={b.id} book={b} status="reading" progress={b.progress} />))}
          </div>
        )}
      </section>

      {/* Recommended */}
      {profile?.target_subject && (
        <section>
          <h2 className="mb-4 font-display text-2xl font-semibold">Recommended for {profile.target_subject}</h2>
          {recommended.length === 0 ? (
            <p className="text-sm text-muted-foreground">No new recommendations — you've started everything we've got for this subject.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {recommended.map((b) => (<BookCard key={b.id} book={b} />))}
            </div>
          )}
        </section>
      )}

      {/* Recent reflections */}
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-semibold">Recent reflections</h2>
          <Link to="/reflections" className="text-xs text-accent underline-offset-4 hover:underline">View all</Link>
        </div>
        {recentReflections.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reflections yet. Finish a book and write your first.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {recentReflections.map((r) => (
              <li key={r.id} className="flex items-center justify-between p-4">
                <div>
                  <div className="font-display text-base font-semibold">{r.books?.title}</div>
                  <div className="text-xs text-muted-foreground">{r.books?.author} · {new Date(r.updated_at).toLocaleDateString()}</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${r.is_complete ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"}`}>
                  {r.is_complete ? "Complete" : "In progress"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { l: "Books finished", v: stats.finished },
          { l: "Reflections", v: stats.reflections },
          { l: "Reading hours", v: stats.hours },
          { l: "Daily goal", v: `${goal}m` },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border border-border bg-card p-4 shadow-warm">
            <div className="text-xs uppercase text-muted-foreground tracking-wide">{s.l}</div>
            <div className="mt-1 font-display text-3xl font-semibold">{s.v}</div>
          </div>
        ))}
      </section>

      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm"><Link to="/achievements">View achievements</Link></Button>
      </div>
    </div>
  );
}
