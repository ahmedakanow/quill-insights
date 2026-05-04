import { supabase } from "@/integrations/supabase/client";

export type CardType = "argument_defence" | "counterargument_rehearsal" | "cross_text_connection";

function firstSentence(s: string | null | undefined): string {
  if (!s) return "";
  const t = s.trim();
  const m = t.match(/^[^.!?]+[.!?]/);
  return (m ? m[0] : t.slice(0, 200)).trim();
}

export function buildPrompts(
  reflection: { counterargument?: string | null },
  book: { title: string; author: string },
): { type: CardType; prompt: string }[] {
  const ct = firstSentence(reflection.counterargument);
  const counterPrompt = ct.length >= 20
    ? `A tutor says your view on "${book.title}" is: "${ct}" — and challenges that reading. How do you respond?`
    : `A tutor challenges your reading of "${book.title}". What's the strongest objection to the author's argument, and how would you defend your position?`;

  return [
    {
      type: "argument_defence",
      prompt: `In 30 seconds, summarise the central argument of "${book.title}" by ${book.author}. What evidence convinced you?`,
    },
    { type: "counterargument_rehearsal", prompt: counterPrompt },
    {
      type: "cross_text_connection",
      prompt: `Compare "${book.title}" to another text you've read. Where do they agree? Where do they disagree?`,
    },
  ];
}

/**
 * Idempotently generate the 3 review cards for a completed reflection.
 * Returns number of new cards inserted.
 */
export async function ensureReviewCards(
  userId: string,
  reflectionId: string,
  bookId: string,
): Promise<number> {
  const { data: existing } = await supabase
    .from("review_cards")
    .select("id")
    .eq("user_id", userId)
    .eq("reflection_id", reflectionId)
    .limit(1);
  if (existing && existing.length > 0) return 0;

  const { data: reflection } = await supabase
    .from("reflections")
    .select("counterargument, books(title, author)")
    .eq("id", reflectionId)
    .maybeSingle();
  if (!reflection?.books) return 0;
  const book = reflection.books as any;

  const prompts = buildPrompts(reflection as any, book);
  const rows = prompts.map((p) => ({
    user_id: userId,
    reflection_id: reflectionId,
    book_id: bookId,
    card_type: p.type,
    prompt_text: p.prompt,
  }));
  const { error } = await supabase.from("review_cards").insert(rows);
  if (error) return 0;
  return rows.length;
}

/** SM-2 algorithm. quality 0..5. */
export function applySm2(
  card: { ease_factor: number; interval_days: number; repetitions: number },
  quality: number,
): { ease_factor: number; interval_days: number; repetitions: number; next_review_date: string } {
  let { ease_factor, interval_days, repetitions } = card;
  if (quality < 3) {
    repetitions = 0;
    interval_days = 1;
  } else {
    if (repetitions === 0) interval_days = 1;
    else if (repetitions === 1) interval_days = 3;
    else interval_days = Math.round(interval_days * ease_factor);
    repetitions += 1;
  }
  ease_factor = Math.max(
    1.3,
    ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );
  const next = new Date();
  next.setDate(next.getDate() + interval_days);
  return {
    ease_factor,
    interval_days,
    repetitions,
    next_review_date: next.toISOString().slice(0, 10),
  };
}
