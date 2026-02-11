
-- Rate limiting table for login attempts
CREATE TABLE public.login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_login_attempts_identifier_time ON public.login_attempts (identifier, attempted_at DESC);

-- Auto-cleanup: delete attempts older than 1 hour
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.login_attempts WHERE attempted_at < now() - interval '1 hour';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cleanup_login_attempts
AFTER INSERT ON public.login_attempts
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_old_login_attempts();

-- RLS: no direct access, only via service role in edge function
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
-- No policies = no public access, service role bypasses RLS
