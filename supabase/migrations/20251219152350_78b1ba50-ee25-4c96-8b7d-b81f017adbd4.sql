-- Add custom activity columns to user_performance
ALTER TABLE public.user_performance
ADD COLUMN IF NOT EXISTS custom_1 boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_2 boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_3 boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_4 boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_5 boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_6 boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_7 boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_8 boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_9 boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_10 boolean DEFAULT false;