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
  { text: "Take your time and consider your answers. Speed of response won't impress.", author: "Oxford admissions guidance" },
  { text: "We examine applicants' thinking skills and ability to solve problems.", author: "Cambridge Homerton, Admissions Tutor" },
  { text: "Your experience of activities and your reflections are more important than the number.", author: "Cambridge admissions guidance" },
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
  interview_ready: {
    title: "Interview Ready",
    description: "Complete 10 daily review sessions.",
    icon: "GraduationCap",
  },
  risk_free: {
    title: "Risk Free",
    description: "All books mentioned in your personal statement pass the risk audit.",
    icon: "ShieldCheck",
  },
};

export const PS_SECTIONS = [
  {
    key: "motivation" as const,
    label: "Why this subject?",
    prompt: "What sparked your interest? What reading, experiences, or ideas drew you to this subject?",
    order: 0,
  },
  {
    key: "studies_preparation" as const,
    label: "How have your studies prepared you?",
    prompt: "What have you learned from your A-Levels, coursework, or EPQ that prepares you for university-level study?",
    order: 1,
  },
  {
    key: "outside_preparation" as const,
    label: "What else have you done?",
    prompt: "Super-curricular reading, lectures, podcasts, essay competitions — and what you learned from them.",
    order: 2,
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
