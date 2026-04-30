-- ============================================================
-- 004_sync_volunteers.sql
-- Description: Updates the handle_new_user trigger to also 
-- insert into the volunteers table if the role is 'volunteer'.
-- This ensures the backend and matching algorithm continue
-- to work with the new auth flow.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- 1. Insert into user_roles (the primary RBAC table)
  INSERT INTO public.user_roles (id, role, full_name, phone, skills, organization)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'role', 'volunteer'),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    COALESCE(string_to_array(new.raw_user_meta_data->>'skills', ','), '{}'),
    new.raw_user_meta_data->>'organization'
  );

  -- 2. If the user is a volunteer, also insert into the legacy volunteers table
  --    so the matching algorithm and existing backend APIs still work.
  IF (new.raw_user_meta_data->>'role' = 'volunteer') THEN
    INSERT INTO public.volunteers (id, name, phone, email, skills)
    VALUES (
      new.id,
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'phone',
      new.email,
      COALESCE(string_to_array(new.raw_user_meta_data->>'skills', ','), '{}')
    )
    ON CONFLICT (phone) DO UPDATE SET
      id = EXCLUDED.id,
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      skills = EXCLUDED.skills;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
