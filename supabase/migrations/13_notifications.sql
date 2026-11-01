CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_unread_idx
  ON public.notifications (user_id, is_read)
  WHERE is_read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.create_notification(
  target_user_id UUID,
  notification_type TEXT,
  notification_content TEXT,
  notification_link TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF target_user_id IS NOT NULL
    AND (auth.uid() IS NULL OR target_user_id <> auth.uid()) THEN
    INSERT INTO public.notifications (user_id, type, content, link)
    VALUES (target_user_id, notification_type, notification_content, notification_link);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_new_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.type = 'mentorship' THEN
    PERFORM public.create_notification(
      NEW.alumni_id,
      'mentorship_request',
      'You received a new mentorship request.',
      '/requests'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_new_resume_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.create_notification(
    NEW.alumni_id,
    'resume_review_request',
    'You received a new resume review request.',
    '/requests'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_new_referral_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.create_notification(
    NEW.alumni_id,
    'referral_request',
    'You received a new referral request.',
    '/requests'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id UUID;
BEGIN
  SELECT CASE
    WHEN c.student_id = NEW.sender_id THEN c.alumni_id
    ELSE c.student_id
  END
  INTO recipient_id
  FROM public.conversations c
  WHERE c.id = NEW.conversation_id;

  PERFORM public.create_notification(
    recipient_id,
    'message',
    'You received a new message.',
    '/messages'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_on_request ON public.requests;
CREATE TRIGGER notifications_on_request
  AFTER INSERT ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_request();

DROP TRIGGER IF EXISTS notifications_on_resume_review ON public.resume_reviews;
CREATE TRIGGER notifications_on_resume_review
  AFTER INSERT ON public.resume_reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_resume_review();

DROP TRIGGER IF EXISTS notifications_on_referral_request ON public.referral_requests;
CREATE TRIGGER notifications_on_referral_request
  AFTER INSERT ON public.referral_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_referral_request();

DROP TRIGGER IF EXISTS notifications_on_message ON public.messages;
CREATE TRIGGER notifications_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
