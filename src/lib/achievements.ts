import { supabase } from "@/integrations/supabase/client";

async function award(userId: string, type: string) {
  await supabase.from("achievements").insert({ user_id: userId, achievement_type: type }).select();
}

export async function checkAchievements(userId: string) {
  // Pull all the data we need
  const [{ data: progress }, { data: reflections }, { data: ps }, { data: sessions }, { data: existing }, { count: reviewCount }] =
    await Promise.all([
      supabase.from("reading_progress").select("status, total_reading_minutes, book_id").eq("user_id", userId),
      supabase.from("reflections").select("*").eq("user_id", userId),
      supabase.from("personal_statement_blocks").select("section, content").eq("user_id", userId),
      supabase.from("reading_sessions").select("duration_minutes, session_date").eq("user_id", userId),
      supabase.from("achievements").select("achievement_type").eq("user_id", userId),
      supabase.from("review_sessions").select("*", { count: "exact", head: true }).eq("user_id", userId),
    ]);

  const have = new Set((existing ?? []).map((a) => a.achievement_type));
  const checks: Array<[string, boolean]> = [];

  const reading = (progress ?? []).filter((p) => p.status === "reading" || p.status === "finished");
  const finished = (progress ?? []).filter((p) => p.status === "finished");
  const completeReflections = (reflections ?? []).filter((r) => r.is_complete);

  checks.push(["first_chapter", reading.length >= 1]);
  checks.push(["deep_reader", finished.length >= 1]);
  checks.push(["reflective_mind", completeReflections.length >= 1]);
  checks.push(["five_down", finished.length >= 5]);

  const longCounters = (reflections ?? []).filter(
    (r) => (r.counterargument ?? "").trim().split(/\s+/).filter(Boolean).length > 100,
  ).length;
  checks.push(["counter_arguer", longCounters >= 3]);

  const crossConnections = (reflections ?? []).filter((r) => {
    const text = (r.connections ?? "").toLowerCase();
    // Heuristic: connections field references another book by mentioning quotes or 'by '
    return text.length > 50 && (/\bby\s+[A-Z]/.test(r.connections ?? "") || /[""].+[""]/.test(r.connections ?? ""));
  }).length;
  checks.push(["cross_connector", crossConnections >= 3]);

  const filledSections = (ps ?? []).filter((b) => (b.content ?? "").trim().length > 0).length;
  checks.push(["statement_starter", filledSections >= 5]);

  // Total hours
  const totalMinutes = (sessions ?? []).reduce((s, x) => s + (x.duration_minutes ?? 0), 0);
  checks.push(["century_club", totalMinutes >= 100 * 60]);

  // Consistent reader: 5 days meeting goal in some 7-day window
  const { data: profile } = await supabase
    .from("profiles")
    .select("daily_reading_goal_minutes")
    .eq("id", userId)
    .maybeSingle();
  const goal = profile?.daily_reading_goal_minutes ?? 30;
  const byDay = new Map<string, number>();
  (sessions ?? []).forEach((s) => {
    byDay.set(s.session_date, (byDay.get(s.session_date) ?? 0) + s.duration_minutes);
  });
  const days = Array.from(byDay.entries()).sort();
  let consistent = false;
  for (let i = 0; i < days.length; i++) {
    const startDate = new Date(days[i][0]);
    const window = days.filter(([d]) => {
      const dd = new Date(d);
      const diff = (dd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff < 7;
    });
    if (window.filter(([, m]) => m >= goal).length >= 5) {
      consistent = true;
      break;
    }
  }
  checks.push(["consistent_reader", consistent]);

  const newly: string[] = [];
  for (const [type, met] of checks) {
    if (met && !have.has(type)) {
      await award(userId, type);
      newly.push(type);
    }
  }
  return newly;
}
