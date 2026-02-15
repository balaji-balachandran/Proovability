
CREATE TABLE public.bounties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author TEXT NOT NULL,
  performance_threshold JSONB,
  description TEXT NOT NULL,
  contract TEXT,
  prize INTEGER NOT NULL DEFAULT 0,
  expiration TIMESTAMP WITH TIME ZONE,
  training_data TEXT,
  image_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bounties ENABLE ROW LEVEL SECURITY;

-- Public read access for bounties
CREATE POLICY "Anyone can view bounties"
  ON public.bounties FOR SELECT
  USING (true);
