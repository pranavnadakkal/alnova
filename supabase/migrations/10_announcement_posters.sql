ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS poster_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('announcement-posters', 'announcement-posters', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Teachers can upload announcement posters" ON storage.objects;
CREATE POLICY "Teachers can upload announcement posters"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'announcement-posters'
    AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'teacher')
  );

DROP POLICY IF EXISTS "Anyone can view announcement posters" ON storage.objects;
CREATE POLICY "Anyone can view announcement posters"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'announcement-posters');

DROP POLICY IF EXISTS "Teachers can delete announcement posters" ON storage.objects;
CREATE POLICY "Teachers can delete announcement posters"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'announcement-posters'
    AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'teacher')
  );

NOTIFY pgrst, 'reload schema';
