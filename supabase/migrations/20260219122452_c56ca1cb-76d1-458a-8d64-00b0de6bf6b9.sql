-- Add last_login_at to profiles to track user's last login time
ALTER TABLE public.profiles ADD COLUMN last_login_at timestamp with time zone;

-- Allow users to update their own last_login_at
-- (already covered by existing "Users can update own profile" policy)