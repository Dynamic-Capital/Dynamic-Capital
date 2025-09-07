-- Enable realtime for contact_links table
ALTER TABLE public.contact_links REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_links;