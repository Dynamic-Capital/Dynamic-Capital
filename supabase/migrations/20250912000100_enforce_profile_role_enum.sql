-- Enforce valid roles via enum
CREATE TYPE public.user_role_enum AS ENUM ('user', 'admin');

-- Backfill existing roles
UPDATE public.profiles
SET role = 'user'
WHERE role IS NULL OR role NOT IN ('user', 'admin');

-- Alter column to use enum and enforce constraint
ALTER TABLE public.profiles
  ALTER COLUMN role TYPE public.user_role_enum USING role::public.user_role_enum,
  ALTER COLUMN role SET DEFAULT 'user',
  ALTER COLUMN role SET NOT NULL;
