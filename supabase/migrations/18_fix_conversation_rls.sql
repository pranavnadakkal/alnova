-- Replace legacy recursive conversation policies with direct ownership checks.
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF to_regclass('public.conversation_participants') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY';
  END IF;
END
$$;

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname, schemaname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('conversation_participants', 'conversations')
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  END LOOP;
END
$$;

CREATE POLICY conversations_select
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid() OR alumni_id = auth.uid());

DO $$
BEGIN
  IF to_regclass('public.conversation_participants') IS NOT NULL THEN
    EXECUTE $policy$
      CREATE POLICY conversation_participants_select
        ON public.conversation_participants
        FOR SELECT
        TO authenticated
        USING (profile_id = auth.uid())
    $policy$;
    EXECUTE $policy$
      CREATE POLICY conversation_participants_insert
        ON public.conversation_participants
        FOR INSERT
        TO authenticated
        WITH CHECK (profile_id = auth.uid())
    $policy$;
  END IF;
END
$$;

NOTIFY pgrst, 'reload schema';
