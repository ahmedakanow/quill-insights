
-- Helper function for updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  target_university TEXT CHECK (target_university IN ('oxford','cambridge','both')),
  target_subject TEXT,
  target_college TEXT,
  year_group TEXT CHECK (year_group IN ('year_12','year_13')),
  daily_reading_goal_minutes INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- books (public catalogue)
CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  description TEXT NOT NULL,
  cover_image_url TEXT,
  subjects TEXT[] NOT NULL DEFAULT '{}',
  difficulty TEXT NOT NULL CHECK (difficulty IN ('accessible','intermediate','advanced')),
  estimated_read_minutes INTEGER NOT NULL DEFAULT 60,
  category TEXT NOT NULL CHECK (category IN ('super_curricular','core_text','wider_reading','interview_prep')),
  publisher TEXT,
  content_text TEXT NOT NULL,
  chapter_titles TEXT[] NOT NULL DEFAULT '{}',
  is_free BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "books_select_authenticated" ON public.books FOR SELECT TO authenticated USING (true);

-- reading_progress
CREATE TABLE public.reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  scroll_position FLOAT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','reading','finished','want_to_read')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  total_reading_minutes INTEGER NOT NULL DEFAULT 0,
  last_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, book_id)
);
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rp_select_own" ON public.reading_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rp_insert_own" ON public.reading_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rp_update_own" ON public.reading_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "rp_delete_own" ON public.reading_progress FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER rp_updated_at BEFORE UPDATE ON public.reading_progress FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- annotations
CREATE TABLE public.annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('highlight','note','bookmark')),
  color TEXT NOT NULL DEFAULT 'yellow',
  selected_text TEXT,
  note_content TEXT,
  position_percent FLOAT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ann_select_own" ON public.annotations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ann_insert_own" ON public.annotations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ann_update_own" ON public.annotations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ann_delete_own" ON public.annotations FOR DELETE USING (auth.uid() = user_id);

-- reflections
CREATE TABLE public.reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  argument_summary TEXT NOT NULL DEFAULT '',
  evidence_used TEXT NOT NULL DEFAULT '',
  counterargument TEXT NOT NULL DEFAULT '',
  connections TEXT NOT NULL DEFAULT '',
  interview_point TEXT NOT NULL DEFAULT '',
  is_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ref_select_own" ON public.reflections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ref_insert_own" ON public.reflections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ref_update_own" ON public.reflections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ref_delete_own" ON public.reflections FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER ref_updated_at BEFORE UPDATE ON public.reflections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- personal_statement_blocks
CREATE TABLE public.personal_statement_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  section TEXT NOT NULL CHECK (section IN ('hook','subject_engagement_a','subject_engagement_b','skills_and_growth','conclusion')),
  content TEXT NOT NULL DEFAULT '',
  linked_reflection_ids UUID[] DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, section)
);
ALTER TABLE public.personal_statement_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "psb_select_own" ON public.personal_statement_blocks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "psb_insert_own" ON public.personal_statement_blocks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "psb_update_own" ON public.personal_statement_blocks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "psb_delete_own" ON public.personal_statement_blocks FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER psb_updated_at BEFORE UPDATE ON public.personal_statement_blocks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- reading_sessions
CREATE TABLE public.reading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rs_select_own" ON public.reading_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rs_insert_own" ON public.reading_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- achievements
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_type)
);
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ach_select_own" ON public.achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ach_insert_own" ON public.achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX rp_user_status_idx ON public.reading_progress(user_id, status);
CREATE INDEX ann_user_book_idx ON public.annotations(user_id, book_id);
CREATE INDEX ref_user_book_idx ON public.reflections(user_id, book_id);
CREATE INDEX rs_user_date_idx ON public.reading_sessions(user_id, session_date);
