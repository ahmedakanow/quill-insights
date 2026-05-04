import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Check, Circle, CalendarDays } from "lucide-react";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { buildMilestones, daysBetween, formatMilestoneDate, nextMilestone, type Milestone } from "@/lib/timeline";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/timeline")({
  component: () => <RequireAuth><AppShell><TimelinePage /></AppShell></RequireAuth>,
});

function TimelinePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("year_group, interview_date").eq("id", user.id).maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user]);

  const today = new Date();
  const interviewDate = profile?.interview_date ? new Date(profile.interview_date) : null;
  const milestones = buildMilestones(profile?.year_group, interviewDate, today);
  const next = nextMilestone(milestones, today);
  const nextDays = next ? daysBetween(today, new Date(next.date)) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 lg:px-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Admissions timeline</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {profile?.year_group === "year_12" ? "Year 12 — applying next cycle" : "Year 13 — applying this cycle"}
        </p>
      </div>

      {next && nextDays !== null && (
        <div className="rounded-xl border-2 border-accent bg-accent/5 p-6 text-center shadow-warm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Next milestone</div>
          <div className="mt-2 font-display text-5xl font-semibold text-accent">{nextDays}</div>
          <div className="mt-1 text-sm text-muted-foreground">days until <span className="font-semibold text-foreground">{next.label}</span></div>
        </div>
      )}

      <ol className="relative space-y-3 border-l-2 border-border pl-6">
        {milestones.map((m: Milestone) => {
          const days = daysBetween(today, new Date(m.date));
          const isPast = days < 0;
          const isNext = next?.key === m.key;
          const isOpen = open === m.key;
          return (
            <li key={m.key} className="relative">
              <span className={cn(
                "absolute -left-[31px] grid h-5 w-5 place-items-center rounded-full border-2 bg-background",
                isPast ? "border-emerald-500 text-emerald-500" : isNext ? "border-accent text-accent" : "border-border text-muted-foreground",
              )}>
                {isPast ? <Check className="h-3 w-3" /> : <Circle className="h-2 w-2 fill-current" />}
              </span>
              <div className={cn(
                "rounded-xl border bg-card p-4 shadow-warm transition-quill",
                isNext && "border-accent",
              )}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display text-lg font-semibold">{m.label}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      <CalendarDays className="mr-1 inline h-3 w-3" />
                      {formatMilestoneDate(new Date(m.date))} · {isPast ? "Passed" : isNext ? "Next up" : `${days} days away`}
                    </div>
                    <p className="mt-2 text-sm">{m.description}</p>
                  </div>
                  <button
                    onClick={() => setOpen(isOpen ? null : m.key)}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded hover:bg-muted"
                    aria-label="Toggle tip"
                  >
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
                {isOpen && (
                  <div className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">
                    <p>{m.tip}</p>
                    {m.link && (
                      <Link to={m.link as any} className="mt-2 inline-block text-xs text-accent underline-offset-4 hover:underline">
                        Open in Quill →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
