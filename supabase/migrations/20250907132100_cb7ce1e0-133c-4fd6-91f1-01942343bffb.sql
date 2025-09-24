-- Add a payment_intents table to handle currency and amount selection before payment
CREATE TABLE public.payment_intents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  method TEXT NOT NULL,
  expected_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  pay_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own payment intents" 
ON public.payment_intents 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Service role can manage payment intents" 
ON public.payment_intents 
FOR ALL 
USING (true);

-- Update bot_content with exchange rate and popular plan
INSERT INTO public.bot_content (content_key, content_value, content_type, description) VALUES
('usd_mvr_rate', '17.5', 'number', 'Exchange rate from USD to MVR'),
('popular_plan_id', '', 'text', 'ID of the most popular plan based on analytics')
ON CONFLICT (content_key) DO UPDATE SET
content_value = EXCLUDED.content_value,
updated_at = now();

-- Create trigger for updated_at
CREATE TRIGGER update_payment_intents_updated_at
BEFORE UPDATE ON public.payment_intents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
