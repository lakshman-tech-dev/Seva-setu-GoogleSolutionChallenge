-- ============================================================
-- 003_add_rbac_roles.sql
-- Description: Creates a user_roles table that links to Supabase
-- auth.users to store the role ('coordinator' or 'volunteer').
-- ============================================================

-- Create the user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id           UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role         TEXT NOT NULL CHECK (role IN ('coordinator', 'volunteer')),
  full_name    TEXT,
  phone        TEXT,
  skills       TEXT[] DEFAULT '{}',
  organization TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Turn on Row Level Security (RLS) for the table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own role
CREATE POLICY "Users can read their own role"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = id);

-- Allow service role to do anything
CREATE POLICY "Service role can manage roles"
  ON public.user_roles
  USING (true)
  WITH CHECK (true);

-- Function to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_roles (id, role, full_name, phone, skills, organization)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'role', 'volunteer'),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    COALESCE(string_to_array(new.raw_user_meta_data->>'skills', ','), '{}'),
    new.raw_user_meta_data->>'organization'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function after a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
