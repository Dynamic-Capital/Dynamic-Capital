-- Restrict plan channel access to subscribed users
-- 1) Drop public read policy if exists
DROP POLICY IF EXISTS "Public can view plan channels" ON public.plan_channels;

-- 2) Only allow authenticated users with active subscription to view
CREATE POLICY "Subscribed users can view plan channels"
  ON public.plan_channels
  FOR SELECT
  TO authenticated
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM public.user_subscriptions us
      WHERE us.bot_user_id = auth.uid()
        AND us.plan_id = plan_channels.plan_id
        AND us.is_active = true
    )
  );
