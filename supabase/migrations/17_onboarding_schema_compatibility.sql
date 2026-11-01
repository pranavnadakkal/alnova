-- Onboarding does not require graduation year, so existing deployments must
-- allow it to remain unset until the profile is completed later.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_id UUID;

UPDATE public.profiles
SET user_id = id
WHERE user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_unique
  ON public.profiles (user_id);

ALTER TABLE public.student_profiles
  ALTER COLUMN graduation_year DROP NOT NULL;
