ALTER TABLE public.alumni_profiles
  ADD COLUMN IF NOT EXISTS monthly_session_limit INTEGER NOT NULL DEFAULT 10
  CHECK (monthly_session_limit > 0);

CREATE OR REPLACE FUNCTION public.enforce_monthly_mentorship_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  limit_value INTEGER;
  active_count INTEGER;
BEGIN
  IF NEW.status NOT IN ('pending', 'accepted') THEN
    RETURN NEW;
  END IF;

  SELECT monthly_session_limit
  INTO limit_value
  FROM public.alumni_profiles
  WHERE profile_id = NEW.alumni_id;

  IF limit_value IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO active_count
  FROM public.mentorship_sessions
  WHERE alumni_id = NEW.alumni_id
    AND status IN ('pending', 'accepted')
    AND created_at >= date_trunc('month', now())
    AND created_at < date_trunc('month', now()) + INTERVAL '1 month';

  IF active_count >= limit_value THEN
    RAISE EXCEPTION 'This alumni has reached their monthly mentorship session limit.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_monthly_mentorship_limit ON public.mentorship_sessions;
CREATE TRIGGER enforce_monthly_mentorship_limit
  BEFORE INSERT ON public.mentorship_sessions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_monthly_mentorship_limit();

NOTIFY pgrst, 'reload schema';
