-- Helper functions for profile roles
CREATE OR REPLACE FUNCTION public.get_user_role(user_telegram_id text)
RETURNS public.user_role_enum
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT role
  FROM public.profiles
  WHERE telegram_id = user_telegram_id;
$$;

CREATE OR REPLACE FUNCTION public.is_user_admin(user_telegram_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT public.get_user_role(user_telegram_id) = 'admin';
$$;
