-- 1. Create a new storage bucket for resumes safely
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

-- (The ALTER TABLE line has been removed)

-- 2. Allow authenticated users to upload their own resumes
CREATE POLICY "Users can upload their own resumes" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'resumes' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. Allow anyone to view resumes (since they will be shared with alumni)
CREATE POLICY "Anyone can view resumes" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'resumes');

-- 4. Allow users to update their own resumes
CREATE POLICY "Users can update their own resumes" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'resumes' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Allow users to delete their own resumes
CREATE POLICY "Users can delete their own resumes" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'resumes' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);