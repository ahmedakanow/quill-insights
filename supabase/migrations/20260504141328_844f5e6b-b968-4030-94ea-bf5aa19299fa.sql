ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interview_date date;

ALTER TABLE public.personal_statement_blocks DROP CONSTRAINT IF EXISTS personal_statement_blocks_section_check;

-- Delete any old-key rows whose remap target already exists for the same user
DELETE FROM public.personal_statement_blocks p
WHERE p.section IN ('hook','subject_engagement_a','subject_engagement_b','skills_and_growth','conclusion')
  AND EXISTS (
    SELECT 1 FROM public.personal_statement_blocks q
    WHERE q.user_id = p.user_id
      AND q.section = CASE
        WHEN p.section IN ('hook','subject_engagement_a') THEN 'motivation'
        WHEN p.section IN ('subject_engagement_b','skills_and_growth') THEN 'studies_preparation'
        WHEN p.section = 'conclusion' THEN 'outside_preparation'
      END
  );

-- For remaining old rows, if multiple remap to same new section for one user, keep most-recent
WITH ranked AS (
  SELECT id, user_id,
    CASE
      WHEN section IN ('hook','subject_engagement_a') THEN 'motivation'
      WHEN section IN ('subject_engagement_b','skills_and_growth') THEN 'studies_preparation'
      WHEN section = 'conclusion' THEN 'outside_preparation'
    END AS new_section,
    row_number() OVER (PARTITION BY user_id, CASE
      WHEN section IN ('hook','subject_engagement_a') THEN 'motivation'
      WHEN section IN ('subject_engagement_b','skills_and_growth') THEN 'studies_preparation'
      WHEN section = 'conclusion' THEN 'outside_preparation'
    END ORDER BY updated_at DESC) AS rn
  FROM public.personal_statement_blocks
  WHERE section IN ('hook','subject_engagement_a','subject_engagement_b','skills_and_growth','conclusion')
)
DELETE FROM public.personal_statement_blocks WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

UPDATE public.personal_statement_blocks SET section = CASE
  WHEN section IN ('hook','subject_engagement_a') THEN 'motivation'
  WHEN section IN ('subject_engagement_b','skills_and_growth') THEN 'studies_preparation'
  WHEN section = 'conclusion' THEN 'outside_preparation'
END
WHERE section IN ('hook','subject_engagement_a','subject_engagement_b','skills_and_growth','conclusion');

ALTER TABLE public.personal_statement_blocks ADD CONSTRAINT personal_statement_blocks_section_check
  CHECK (section IN ('motivation','studies_preparation','outside_preparation'));

CREATE TABLE IF NOT EXISTS public.review_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reflection_id uuid NOT NULL REFERENCES public.reflections(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  card_type text NOT NULL CHECK (card_type IN ('argument_defence','counterargument_rehearsal','cross_text_connection')),
  prompt_text text NOT NULL,
  ease_factor double precision NOT NULL DEFAULT 2.5,
  interval_days integer NOT NULL DEFAULT 1,
  repetitions integer NOT NULL DEFAULT 0,
  next_review_date date NOT NULL DEFAULT CURRENT_DATE,
  last_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_review_cards_user_due ON public.review_cards(user_id, next_review_date);
ALTER TABLE public.review_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rc_select_own ON public.review_cards;
DROP POLICY IF EXISTS rc_insert_own ON public.review_cards;
DROP POLICY IF EXISTS rc_update_own ON public.review_cards;
DROP POLICY IF EXISTS rc_delete_own ON public.review_cards;
CREATE POLICY rc_select_own ON public.review_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY rc_insert_own ON public.review_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY rc_update_own ON public.review_cards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY rc_delete_own ON public.review_cards FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.review_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  card_id uuid NOT NULL REFERENCES public.review_cards(id) ON DELETE CASCADE,
  quality integer NOT NULL CHECK (quality BETWEEN 0 AND 5),
  reviewed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.review_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rs2_select_own ON public.review_sessions;
DROP POLICY IF EXISTS rs2_insert_own ON public.review_sessions;
CREATE POLICY rs2_select_own ON public.review_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY rs2_insert_own ON public.review_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);