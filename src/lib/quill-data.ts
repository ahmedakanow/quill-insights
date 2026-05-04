// Static reference data for Quill

export const SUBJECTS = [
  "PPE",
  "Medicine",
  "English",
  "Law",
  "Natural Sciences",
  "History",
  "Mathematics",
  "Computer Science",
  "Engineering",
  "Economics",
  "HSPS",
  "Classics",
  "Philosophy",
  "Modern Languages",
] as const;

export type Subject = (typeof SUBJECTS)[number];

export const DAILY_QUOTES = [
  {
    text: "The unexamined life is not worth living.",
    author: "Socrates",
  },
  {
    text: "Education is the kindling of a flame, not the filling of a vessel.",
    author: "Plutarch",
  },
  {
    text: "All that is gold does not glitter; not all those who wander are lost.",
    author: "J. R. R. Tolkien, Merton College, Oxford",
  },
  {
    text: "It is the mark of an educated mind to be able to entertain a thought without accepting it.",
    author: "Aristotle",
  },
  {
    text: "Reading furnishes the mind only with materials of knowledge; it is thinking that makes what we read ours.",
    author: "John Locke, Christ Church, Oxford",
  },
  {
    text: "There is no real teacher who in practice does not believe in the existence of the soul.",
    author: "George Steiner, Churchill College, Cambridge",
  },
  {
    text: "I have learned, in whatsoever state I am, therewith to be content.",
    author: "Saint Paul, quoted in the Cambridge college graces",
  },
];

export const ACHIEVEMENT_DEFS: Record<
  string,
  { title: string; description: string; icon: string }
> = {
  first_chapter: {
    title: "First Chapter",
    description: "Open your first book and start reading.",
    icon: "BookOpen",
  },
  deep_reader: {
    title: "Deep Reader",
    description: "Finish your first book.",
    icon: "BookCheck",
  },
  reflective_mind: {
    title: "Reflective Mind",
    description: "Write your first complete reflection.",
    icon: "PenLine",
  },
  five_down: {
    title: "Five Down",
    description: "Finish five books.",
    icon: "Library",
  },
  counter_arguer: {
    title: "Counter-Arguer",
    description: "Write three reflections with counterarguments over 100 words.",
    icon: "MessageSquareDashed",
  },
  cross_connector: {
    title: "Cross-Connector",
    description: "Reference another book in three different reflections.",
    icon: "Link",
  },
  statement_starter: {
    title: "Statement Starter",
    description: "Add content to all five personal statement sections.",
    icon: "FileText",
  },
  consistent_reader: {
    title: "Consistent Reader",
    description: "Meet your daily reading goal five days in a single week.",
    icon: "CalendarCheck",
  },
  century_club: {
    title: "Century Club",
    description: "Read for 100 total hours.",
    icon: "Clock",
  },
};

export const PS_SECTIONS = [
  {
    key: "hook" as const,
    label: "Hook",
    prompt: "Open with a moment that sparked your intellectual curiosity.",
    order: 0,
  },
  {
    key: "subject_engagement_a" as const,
    label: "Subject Engagement A",
    prompt: "Your deepest area of reading and thinking.",
    order: 1,
  },
  {
    key: "subject_engagement_b" as const,
    label: "Subject Engagement B",
    prompt: "A second thread showing breadth.",
    order: 2,
  },
  {
    key: "skills_and_growth" as const,
    label: "Skills & Growth",
    prompt: "What has your reading taught you about how you think?",
    order: 3,
  },
  {
    key: "conclusion" as const,
    label: "Conclusion",
    prompt: "Why this subject, at this level, now?",
    order: 4,
  },
];

export type PSSectionKey = (typeof PS_SECTIONS)[number]["key"];

export function getDailyQuote() {
  const day = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return DAILY_QUOTES[day % DAILY_QUOTES.length];
}

export function difficultyClass(d: string) {
  if (d === "accessible") return "text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/40 border-emerald-300/40";
  if (d === "intermediate") return "text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40 border-amber-300/40";
  return "text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/40 border-rose-300/40";
}

export function categoryLabel(c: string) {
  return (
    {
      super_curricular: "Super-curricular",
      core_text: "Core text",
      wider_reading: "Wider reading",
      interview_prep: "Interview prep",
    } as Record<string, string>
  )[c] ?? c;
}
