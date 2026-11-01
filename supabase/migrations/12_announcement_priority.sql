ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal';

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS event_date TIMESTAMPTZ;

ALTER TABLE public.announcements
  DROP CONSTRAINT IF EXISTS announcements_priority_check;

ALTER TABLE public.announcements
  ADD CONSTRAINT announcements_priority_check
  CHECK (priority IN ('normal', 'important', 'urgent'));

NOTIFY pgrst, 'reload schema';
