// Admissions timeline helpers
export type Milestone = {
  key: string;
  label: string;
  date: Date;
  description: string;
  tip: string;
  link?: string;
};

function firstMondayOfDecember(year: number) {
  const d = new Date(year, 11, 1);
  const day = d.getDay(); // 0 Sun..6 Sat
  const offset = (1 - day + 7) % 7;
  d.setDate(1 + offset);
  return d;
}

/** Returns the application year (the calendar year of the 15 October UCAS deadline). */
export function applicationYear(yearGroup: string | null | undefined, today = new Date()): number {
  const y = today.getFullYear();
  // UK academic year: Sept–Aug. If past Sept, current academic year started in y; else y-1.
  const academicStart = today.getMonth() >= 8 ? y : y - 1;
  // Year 13 applies in the academic year they're currently in → UCAS deadline is academicStart year.
  // Year 12 applies the following year.
  if (yearGroup === "year_12") return academicStart + 1;
  return academicStart;
}

export function buildMilestones(
  yearGroup: string | null | undefined,
  interviewDate: Date | null,
  today = new Date(),
): Milestone[] {
  const appYear = applicationYear(yearGroup, today);
  const interview = interviewDate ?? firstMondayOfDecember(appYear);

  return [
    {
      key: "wider_reading",
      label: "Start wider reading",
      date: new Date(appYear - 1, 5, 1), // June of previous year
      description: "Begin building your super-curricular reading list.",
      tip: "Aim for 6–10 substantive books in your subject by submission. Prioritise depth over breadth.",
      link: "/library",
    },
    {
      key: "register_tests",
      label: "Register for admissions tests",
      date: new Date(appYear, 7, 15), // mid-August
      description: "ESAT, TMUA, MAT, LNAT, UCAT registration window.",
      tip: "Check your subject's required test now — registration is your responsibility, not your school's.",
    },
    {
      key: "ucas_opens",
      label: "UCAS opens",
      date: new Date(appYear, 8, 3), // early September
      description: "You can begin your UCAS application.",
      tip: "Start drafting your personal statement now if you haven't already.",
      link: "/personal-statement",
    },
    {
      key: "ucas_deadline",
      label: "UCAS deadline",
      date: new Date(appYear, 9, 15), // 15 October
      description: "6pm. Oxbridge applications must be submitted.",
      tip: "Ensure all 3 personal statement sections are complete and reviewed. Run the PS Risk Audit.",
      link: "/personal-statement",
    },
    {
      key: "admissions_tests",
      label: "Admissions tests",
      date: new Date(appYear, 9, 25), // late October
      description: "ESAT, MAT, TMUA and others sit in late October.",
      tip: "Past papers are your best preparation. Time yourself.",
    },
    {
      key: "written_work",
      label: "Written work deadline (Oxford)",
      date: new Date(appYear, 10, 10), // 10 November
      description: "Submit graded school essays for relevant Oxford subjects.",
      tip: "Choose work that shows analytical depth, not just a high mark.",
    },
    {
      key: "invitations",
      label: "Interview invitations sent",
      date: new Date(appYear, 10, 25),
      description: "Late November — Oxbridge contacts shortlisted candidates.",
      tip: "If invited, start daily review sessions. Re-read your reflections.",
      link: "/review",
    },
    {
      key: "interviews",
      label: "Interviews",
      date: interview,
      description: "Most Oxford early Dec; Cambridge 7–18 Dec.",
      tip: "It's fine to say 'I hadn't considered that' and then work through it aloud.",
      link: "/review",
    },
    {
      key: "decisions",
      label: "Decisions",
      date: new Date(appYear + 1, 0, 14), // mid-January
      description: "Offers and rejections released mid-January.",
      tip: "Whatever the outcome, the reading and thinking you've done is yours forever.",
    },
  ];
}

export function daysBetween(a: Date, b: Date) {
  const ms = b.setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
}

export function nextMilestone(milestones: Milestone[], today = new Date()) {
  return milestones.find((m) => daysBetween(today, new Date(m.date)) >= 0) ?? null;
}

export function formatMilestoneDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
