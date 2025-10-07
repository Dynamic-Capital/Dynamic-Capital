-- Enable realtime for plan_channels to broadcast subscription channel updates
ALTER TABLE public.plan_channels REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.plan_channels;
