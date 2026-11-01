-- Restore the request status column for deployments created from an older schema.
ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS status request_status NOT NULL DEFAULT 'pending';

NOTIFY pgrst, 'reload schema';
