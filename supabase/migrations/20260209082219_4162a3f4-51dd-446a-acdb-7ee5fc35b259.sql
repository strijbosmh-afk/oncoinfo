
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'viewer');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, p.role::app_role
FROM public.profiles p
WHERE p.role IN ('admin', 'viewer')
ON CONFLICT (user_id, role) DO NOTHING;

-- Update profiles RLS: allow admins to read all profiles (for user management)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Update all existing RLS policies to use has_role function instead of profiles subquery

-- ARMS table
DROP POLICY IF EXISTS "Admins can delete arms" ON public.arms;
CREATE POLICY "Admins can delete arms"
ON public.arms FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert arms" ON public.arms;
CREATE POLICY "Admins can insert arms"
ON public.arms FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update arms" ON public.arms;
CREATE POLICY "Admins can update arms"
ON public.arms FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- DRUGS table
DROP POLICY IF EXISTS "Admins can delete drugs" ON public.drugs;
CREATE POLICY "Admins can delete drugs"
ON public.drugs FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert drugs" ON public.drugs;
CREATE POLICY "Admins can insert drugs"
ON public.drugs FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update drugs" ON public.drugs;
CREATE POLICY "Admins can update drugs"
ON public.drugs FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ENDPOINTS table
DROP POLICY IF EXISTS "Admins can delete endpoints" ON public.endpoints;
CREATE POLICY "Admins can delete endpoints"
ON public.endpoints FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert endpoints" ON public.endpoints;
CREATE POLICY "Admins can insert endpoints"
ON public.endpoints FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update endpoints" ON public.endpoints;
CREATE POLICY "Admins can update endpoints"
ON public.endpoints FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- TRIALS table
DROP POLICY IF EXISTS "Admins can delete trials" ON public.trials;
CREATE POLICY "Admins can delete trials"
ON public.trials FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert trials" ON public.trials;
CREATE POLICY "Admins can insert trials"
ON public.trials FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update trials" ON public.trials;
CREATE POLICY "Admins can update trials"
ON public.trials FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- AI_SUMMARIES table
DROP POLICY IF EXISTS "Admins can insert AI summaries" ON public.ai_summaries;
CREATE POLICY "Admins can insert AI summaries"
ON public.ai_summaries FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update AI summaries" ON public.ai_summaries;
CREATE POLICY "Admins can update AI summaries"
ON public.ai_summaries FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update handle_new_user trigger function to also create user_role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, role)
  VALUES (NEW.id, NEW.email, 'viewer');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer');
  
  RETURN NEW;
END;
$function$;
