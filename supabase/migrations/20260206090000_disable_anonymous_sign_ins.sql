-- Disable anonymous sign-ins per Supabase Security Advisor lint 0012.
-- Anonymous sign-ins create unaudited users which bypass critical access
-- controls. Turning the flag off ensures only explicit authentication flows
-- can create sessions.
update auth.config
set allow_anonymous_sign_ins = false
where id = 1
  and coalesce(allow_anonymous_sign_ins, true);
