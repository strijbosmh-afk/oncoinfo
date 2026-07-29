-- Older versions recorded successful logins as failed attempts. Clear those
-- inaccurate counters once; the edge function now stores failures only.
TRUNCATE TABLE public.login_attempts;
