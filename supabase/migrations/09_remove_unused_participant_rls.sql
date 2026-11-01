-- The current messaging UI stores participants directly on conversations.
-- Remove the legacy participant table and its recursive RLS policies.

DROP TABLE IF EXISTS public.conversation_participants CASCADE;

NOTIFY pgrst, 'reload schema';
