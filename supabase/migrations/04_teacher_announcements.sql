-- Teacher announcements shared with students and alumni.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'teacher';

CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  event_date TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal', 'important', 'urgent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS event_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view announcements" ON public.announcements;
CREATE POLICY "Authenticated users can view announcements"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Teachers can create announcements" ON public.announcements;
CREATE POLICY "Teachers can create announcements"
  ON public.announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'teacher'
    )
  );

DROP POLICY IF EXISTS "Teachers can update their announcements" ON public.announcements;
CREATE POLICY "Teachers can update their announcements"
  ON public.announcements FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Teachers can delete their announcements" ON public.announcements;
CREATE POLICY "Teachers can delete their announcements"
  ON public.announcements FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

CREATE INDEX IF NOT EXISTS announcements_created_at_idx
  ON public.announcements (created_at DESC);
