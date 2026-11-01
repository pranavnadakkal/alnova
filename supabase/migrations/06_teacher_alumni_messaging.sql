-- Allow teachers to use the student side of conversations, but only with alumni.

DROP POLICY IF EXISTS conversations_insert ON public.conversations;
CREATE POLICY conversations_insert
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = student_id OR auth.uid() = alumni_id)
    AND EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = alumni_id
        AND users.role = 'alumni'
    )
  );
