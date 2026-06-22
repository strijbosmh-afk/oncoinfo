CREATE TABLE IF NOT EXISTS public.ai_generation_cache (
  cache_key text PRIMARY KEY,
  content jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

ALTER TABLE public.ai_generation_cache ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ai_generation_cache FROM anon, authenticated;
GRANT ALL ON public.ai_generation_cache TO service_role;

CREATE INDEX IF NOT EXISTS idx_ai_generation_cache_expires_at
  ON public.ai_generation_cache (expires_at);
