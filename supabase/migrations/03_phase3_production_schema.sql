-- =============================================================
-- Migration: Phase 3 Production Schema
-- Core Tables, Messaging, and Workflows
-- =============================================================

-- 1. Create Enums if not existing
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('student', 'alumni', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.request_status AS ENUM ('pending', 'accepted', 'completed', 'declined');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.referral_status AS ENUM ('pending', 'submitted', 'referred', 'declined');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.resume_review_status AS ENUM ('pending', 'in_review', 'completed', 'declined');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Skills Table
CREATE TABLE IF NOT EXISTS public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT
);

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Skills are viewable by all authenticated users"
  ON public.skills FOR SELECT USING (true);

-- 3. Student Profiles Extension Table
CREATE TABLE IF NOT EXISTS public.student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  major TEXT,
  graduation_year INTEGER,
  target_roles TEXT[] DEFAULT '{}',
  resume_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Student profiles are viewable by everyone"
  ON public.student_profiles FOR SELECT USING (true);
CREATE POLICY "Students can update their student profile"
  ON public.student_profiles FOR ALL USING (auth.uid() = profile_id);

-- 4. Alumni Profiles Extension Table
CREATE TABLE IF NOT EXISTS public.alumni_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  company TEXT,
  job_title TEXT,
  industry TEXT,
  years_of_experience INTEGER,
  open_to_referrals BOOLEAN DEFAULT true NOT NULL,
  open_to_mentorship BOOLEAN DEFAULT true NOT NULL,
  is_verified BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.alumni_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Alumni profiles are viewable by everyone"
  ON public.alumni_profiles FOR SELECT USING (true);
CREATE POLICY "Alumni can update their alumni profile"
  ON public.alumni_profiles FOR ALL USING (auth.uid() = profile_id);

-- 5. Profile Skills (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.profile_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(profile_id, skill_id)
);

ALTER TABLE public.profile_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profile skills viewable by everyone"
  ON public.profile_skills FOR SELECT USING (true);
CREATE POLICY "Users can manage their skills"
  ON public.profile_skills FOR ALL USING (auth.uid() = profile_id);

-- 6. Messaging: Conversation Participants
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID NOT NULL,
  last_read_at TIMESTAMPTZ,
  UNIQUE(conversation_id, profile_id)
);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Conversation participants can view their participation"
  ON public.conversation_participants FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can join conversations"
  ON public.conversation_participants FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- 7. Workflows: Mentorship Sessions
CREATE TABLE IF NOT EXISTS public.mentorship_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  alumni_id UUID NOT NULL,
  topic TEXT NOT NULL,
  pitch TEXT,
  message TEXT,
  proposed_date TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'declined')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.mentorship_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view their mentorship sessions"
  ON public.mentorship_sessions FOR SELECT
  USING (auth.uid() = student_id OR auth.uid() = alumni_id);
CREATE POLICY "Students can request mentorship sessions"
  ON public.mentorship_sessions FOR INSERT
  WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Participants can update mentorship sessions"
  ON public.mentorship_sessions FOR UPDATE
  USING (auth.uid() = student_id OR auth.uid() = alumni_id);

-- 8. Workflows: Resume Reviews
CREATE TABLE IF NOT EXISTS public.resume_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  alumni_id UUID NOT NULL,
  resume_url TEXT NOT NULL,
  notes TEXT,
  feedback TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'completed', 'declined')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.resume_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view their resume reviews"
  ON public.resume_reviews FOR SELECT
  USING (auth.uid() = student_id OR auth.uid() = alumni_id);
CREATE POLICY "Students can submit resume reviews"
  ON public.resume_reviews FOR INSERT
  WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Participants can update resume reviews"
  ON public.resume_reviews FOR UPDATE
  USING (auth.uid() = student_id OR auth.uid() = alumni_id);

-- 9. Workflows: Referral Requests
CREATE TABLE IF NOT EXISTS public.referral_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  alumni_id UUID NOT NULL,
  company TEXT NOT NULL,
  job_title TEXT,
  job_url TEXT,
  resume_url TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'referred', 'declined')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.referral_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view their referral requests"
  ON public.referral_requests FOR SELECT
  USING (auth.uid() = student_id OR auth.uid() = alumni_id);
CREATE POLICY "Students can submit referral requests"
  ON public.referral_requests FOR INSERT
  WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Participants can update referral requests"
  ON public.referral_requests FOR UPDATE
  USING (auth.uid() = student_id OR auth.uid() = alumni_id);

-- 10. Enable Realtime Publications
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentorship_sessions;
