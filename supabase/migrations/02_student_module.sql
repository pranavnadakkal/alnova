-- =============================================================
-- Migration: Student Module Extensions
-- Adds messaging, session booking, and enhanced profile fields
-- =============================================================

-- 1. Extend profiles table with new columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS graduation_year INTEGER,
  ADD COLUMN IF NOT EXISTS target_roles TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS years_of_experience INTEGER,
  ADD COLUMN IF NOT EXISTS open_to_referrals BOOLEAN DEFAULT true;

-- 2. Conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.users(id) NOT NULL,
  alumni_id UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(student_id, alumni_id)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Alumni can view their conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = alumni_id);

CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id OR auth.uid() = alumni_id);

-- 3. Messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.users(id) NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conversation participants can view messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.student_id = auth.uid() OR c.alumni_id = auth.uid())
    )
  );

CREATE POLICY "Conversation participants can send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.student_id = auth.uid() OR c.alumni_id = auth.uid())
    )
  );

CREATE POLICY "Recipients can mark messages as read"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (c.student_id = auth.uid() OR c.alumni_id = auth.uid())
    )
  );

-- Index for fast message retrieval
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id, created_at);

-- 4. Mentorship Sessions table
CREATE TABLE public.mentorship_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.users(id) NOT NULL,
  alumni_id UUID REFERENCES public.users(id) NOT NULL,
  proposed_date TIMESTAMPTZ NOT NULL,
  topic TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'declined')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.mentorship_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their sessions"
  ON public.mentorship_sessions FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Alumni can view sessions assigned to them"
  ON public.mentorship_sessions FOR SELECT
  USING (auth.uid() = alumni_id);

CREATE POLICY "Students can create sessions"
  ON public.mentorship_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Alumni can update session status"
  ON public.mentorship_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = alumni_id);

-- 5. Alumni Availability table
CREATE TABLE public.alumni_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumni_id UUID REFERENCES public.users(id) NOT NULL,
  available_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_booked BOOLEAN DEFAULT false
);

ALTER TABLE public.alumni_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view alumni availability"
  ON public.alumni_availability FOR SELECT
  USING (true);

CREATE POLICY "Alumni can manage their availability"
  ON public.alumni_availability FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = alumni_id);

CREATE POLICY "Alumni can update their availability"
  ON public.alumni_availability FOR UPDATE
  TO authenticated
  USING (auth.uid() = alumni_id);

CREATE POLICY "Alumni can delete their availability"
  ON public.alumni_availability FOR DELETE
  TO authenticated
  USING (auth.uid() = alumni_id);

-- Enable Realtime for messages (so clients get instant updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
