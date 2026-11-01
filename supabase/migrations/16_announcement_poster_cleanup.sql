CREATE OR REPLACE FUNCTION public.delete_announcement_poster()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  old_path TEXT;
BEGIN
  IF OLD.poster_url IS NULL OR OLD.poster_url = '' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.poster_url = OLD.poster_url THEN
    RETURN NEW;
  END IF;

  old_path := split_part(
    split_part(OLD.poster_url, '/announcement-posters/', 2),
    '?',
    1
  );

  IF old_path <> '' THEN
    DELETE FROM storage.objects
    WHERE bucket_id = 'announcement-posters' AND name = old_path;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS cleanup_announcement_poster ON public.announcements;
CREATE TRIGGER cleanup_announcement_poster
  BEFORE UPDATE OF poster_url OR DELETE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.delete_announcement_poster();

NOTIFY pgrst, 'reload schema';
