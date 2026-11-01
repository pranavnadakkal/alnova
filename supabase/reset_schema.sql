-- ALNOVA clean Supabase reset
-- WARNING: This deletes ALNOVA data from public tables and storage policies.
-- It does not delete auth.users. Review this file before running it.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.referral_requests CASCADE;
DROP TABLE IF EXISTS public.resume_reviews CASCADE;
DROP TABLE IF EXISTS public.mentorship_sessions CASCADE;
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.profile_skills CASCADE;
DROP TABLE IF EXISTS public.skills CASCADE;
DROP TABLE IF EXISTS public.alumni_availability CASCADE;
DROP TABLE IF EXISTS public.requests CASCADE;
DROP TABLE IF EXISTS public.student_profiles CASCADE;
DROP TABLE IF EXISTS public.alumni_profiles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP TYPE IF EXISTS public.request_type CASCADE;
DROP TYPE IF EXISTS public.request_status CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;

CREATE TYPE public.user_role AS ENUM ('student', 'alumni', 'teacher', 'admin');
CREATE TYPE public.request_type AS ENUM ('mentorship', 'resume', 'referral');
CREATE TYPE public.request_status AS ENUM (
  'pending', 'accepted', 'completed', 'declined',
  'reviewing', 'referred', 'rejected'
);

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role public.user_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  id UUID GENERATED ALWAYS AS (user_id) STORED UNIQUE,
  full_name TEXT NOT NULL,
  bio TEXT,
  company TEXT,
  role TEXT,
  industry TEXT,
  headline TEXT,
  tech_skills TEXT[] NOT NULL DEFAULT '{}',
  linkedin_url TEXT,
  avatar_url TEXT,
  graduation_year INTEGER,
  target_roles TEXT[] NOT NULL DEFAULT '{}',
  years_of_experience INTEGER,
  open_to_referrals BOOLEAN NOT NULL DEFAULT true,
  monthly_session_limit INTEGER NOT NULL DEFAULT 10 CHECK (monthly_session_limit > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  alumni_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type public.request_type NOT NULL,
  status public.request_status NOT NULL DEFAULT 'pending',
  message TEXT NOT NULL,
  document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT
);

CREATE TABLE public.student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  major TEXT,
  graduation_year INTEGER,
  target_roles TEXT[] NOT NULL DEFAULT '{}',
  target_role TEXT,
  resume_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.alumni_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  company TEXT,
  job_title TEXT,
  industry TEXT,
  years_of_experience INTEGER,
  open_to_referrals BOOLEAN NOT NULL DEFAULT true,
  open_to_mentorship BOOLEAN NOT NULL DEFAULT true,
  is_verified BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.profile_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  UNIQUE(profile_id, skill_id)
);

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  alumni_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, alumni_id)
);

CREATE TABLE public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  UNIQUE(conversation_id, profile_id)
);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.mentorship_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  alumni_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  pitch TEXT,
  message TEXT,
  proposed_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'completed', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.resume_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  alumni_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  resume_url TEXT NOT NULL,
  notes TEXT,
  feedback TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_review', 'completed', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.referral_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  alumni_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  job_title TEXT,
  job_url TEXT,
  resume_url TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'submitted', 'referred', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.alumni_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumni_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  available_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_booked BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  poster_url TEXT,
  event_date TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal', 'important', 'urgent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY users_update ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY profiles_insert ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY requests_select ON public.requests FOR SELECT TO authenticated
  USING (
    auth.uid() = student_id
    OR auth.uid() = alumni_id
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'teacher'
    )
  );
CREATE POLICY requests_insert ON public.requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);
CREATE POLICY requests_update ON public.requests FOR UPDATE TO authenticated
  USING (auth.uid() = student_id OR auth.uid() = alumni_id);

CREATE POLICY skills_select ON public.skills FOR SELECT TO authenticated USING (true);
CREATE POLICY skills_insert ON public.skills FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY student_profiles_select ON public.student_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY student_profiles_manage ON public.student_profiles FOR ALL TO authenticated
  USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

CREATE POLICY alumni_profiles_select ON public.alumni_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY alumni_profiles_manage ON public.alumni_profiles FOR ALL TO authenticated
  USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

CREATE POLICY profile_skills_select ON public.profile_skills FOR SELECT TO authenticated USING (true);
CREATE POLICY profile_skills_manage ON public.profile_skills FOR ALL TO authenticated
  USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

CREATE POLICY conversations_select ON public.conversations FOR SELECT TO authenticated
  USING (auth.uid() = student_id OR auth.uid() = alumni_id);
CREATE POLICY conversations_insert ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (
    (auth.uid() = student_id OR auth.uid() = alumni_id)
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = alumni_id AND users.role = 'alumni'
    )
  );

CREATE POLICY conversation_participants_select ON public.conversation_participants
  FOR SELECT TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY conversation_participants_insert ON public.conversation_participants
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = profile_id);

CREATE POLICY messages_select ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
      AND (c.student_id = auth.uid() OR c.alumni_id = auth.uid())
  ));
CREATE POLICY messages_insert ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.student_id = auth.uid() OR c.alumni_id = auth.uid())
    )
  );
CREATE POLICY messages_update ON public.messages FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
      AND (c.student_id = auth.uid() OR c.alumni_id = auth.uid())
  ));

CREATE POLICY sessions_select ON public.mentorship_sessions FOR SELECT TO authenticated
  USING (auth.uid() = student_id OR auth.uid() = alumni_id);
CREATE POLICY sessions_insert ON public.mentorship_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);
CREATE POLICY sessions_update ON public.mentorship_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = student_id OR auth.uid() = alumni_id);

CREATE POLICY resume_reviews_select ON public.resume_reviews FOR SELECT TO authenticated
  USING (auth.uid() = student_id OR auth.uid() = alumni_id);
CREATE POLICY resume_reviews_insert ON public.resume_reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);
CREATE POLICY resume_reviews_update ON public.resume_reviews FOR UPDATE TO authenticated
  USING (auth.uid() = student_id OR auth.uid() = alumni_id);

CREATE POLICY referral_requests_select ON public.referral_requests FOR SELECT TO authenticated
  USING (auth.uid() = student_id OR auth.uid() = alumni_id);
CREATE POLICY referral_requests_insert ON public.referral_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);
CREATE POLICY referral_requests_update ON public.referral_requests FOR UPDATE TO authenticated
  USING (auth.uid() = student_id OR auth.uid() = alumni_id);

CREATE POLICY availability_select ON public.alumni_availability FOR SELECT TO authenticated USING (true);
CREATE POLICY availability_insert ON public.alumni_availability FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = alumni_id);
CREATE POLICY availability_update ON public.alumni_availability FOR UPDATE TO authenticated
  USING (auth.uid() = alumni_id) WITH CHECK (auth.uid() = alumni_id);
CREATE POLICY availability_delete ON public.alumni_availability FOR DELETE TO authenticated
  USING (auth.uid() = alumni_id);

CREATE POLICY announcements_select ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY announcements_insert ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );
CREATE POLICY announcements_update ON public.announcements FOR UPDATE TO authenticated
  USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY announcements_delete ON public.announcements FOR DELETE TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY notifications_select_own ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX notifications_user_created_idx
  ON public.notifications(user_id, created_at DESC);

CREATE INDEX messages_conversation_created_idx
  ON public.messages(conversation_id, created_at);
CREATE INDEX announcements_created_idx
  ON public.announcements(created_at DESC);

INSERT INTO public.users (id, email)
SELECT id, COALESCE(email, raw_user_meta_data->>'email', '')
FROM auth.users
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', ''), 'student')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Users can upload their own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own resumes" ON storage.objects;

CREATE POLICY "Users can upload their own resumes"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Anyone can view resumes"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'resumes');
CREATE POLICY "Users can update their own resumes"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own resumes"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

INSERT INTO storage.buckets (id, name, public)
VALUES ('announcement-posters', 'announcement-posters', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Teachers can upload announcement posters"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'announcement-posters'
    AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'teacher')
  );
CREATE POLICY "Anyone can view announcement posters"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'announcement-posters');
CREATE POLICY "Teachers can delete announcement posters"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'announcement-posters'
    AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'teacher')
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'announcements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
  END IF;
END
$$;
