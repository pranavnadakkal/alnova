-- Repair public.users when the clean reset has not been applied completely.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'user_role'
  ) THEN
    CREATE TYPE public.user_role AS ENUM ('student', 'alumni', 'teacher', 'admin');
  END IF;
END
$$;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role public.user_role NOT NULL DEFAULT 'student';

UPDATE public.users
SET role = 'teacher'
WHERE email = 'teacher@example.com';
