-- Quick Start SQL for Enhanced Coaching Platform
-- Copy and paste this into Supabase Dashboard > SQL Editor
-- URL: https://supabase.com/dashboard/project/vdykrlyybwwbcqqcgjbp/sql

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create essential tables for immediate functionality

-- 1. Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'admin')),
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Messages table for real-time chat
CREATE TABLE IF NOT EXISTS public.messages (
  id SERIAL PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.users(id),
  recipient_id UUID NOT NULL REFERENCES public.users(id),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'workout', 'meal_plan')),
  attachment_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Weight logs for progress tracking
CREATE TABLE IF NOT EXISTS public.weight_logs (
  id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.users(id),
  weight DECIMAL(5,2) NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Progress photos
CREATE TABLE IF NOT EXISTS public.progress_photos (
  id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.users(id),
  image_url TEXT NOT NULL,
  date DATE NOT NULL,
  category TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Coach-Client relationships
CREATE TABLE IF NOT EXISTS public.coach_clients (
  id SERIAL PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES public.users(id),
  client_id UUID NOT NULL REFERENCES public.users(id),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(coach_id, client_id)
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_clients ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies

-- Users can see and edit their own profile
CREATE POLICY "Users can view own profile" ON public.users 
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users 
  FOR UPDATE USING (auth.uid() = id);

-- Messages: users can see messages they sent or received
CREATE POLICY "Users can view own messages" ON public.messages 
  FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY "Users can send messages" ON public.messages 
  FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Users can update own messages" ON public.messages 
  FOR UPDATE USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Weight logs: users can manage their own data
CREATE POLICY "Users can manage own weight logs" ON public.weight_logs 
  FOR ALL USING (client_id = auth.uid());

-- Progress photos: users can manage their own data
CREATE POLICY "Users can manage own progress photos" ON public.progress_photos 
  FOR ALL USING (client_id = auth.uid());

-- Coaches can view their clients' data
CREATE POLICY "Coaches can view client weight logs" ON public.weight_logs 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.coach_clients 
      WHERE coach_clients.client_id = weight_logs.client_id 
      AND coach_clients.coach_id = auth.uid()
      AND coach_clients.status = 'active'
    )
  );

CREATE POLICY "Coaches can view client progress photos" ON public.progress_photos 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.coach_clients 
      WHERE coach_clients.client_id = progress_photos.client_id 
      AND coach_clients.coach_id = auth.uid()
      AND coach_clients.status = 'active'
    )
  );

-- Coach-client relationships
CREATE POLICY "Coaches can manage their relationships" ON public.coach_clients 
  FOR ALL USING (coach_id = auth.uid());
CREATE POLICY "Clients can view their relationships" ON public.coach_clients 
  FOR SELECT USING (client_id = auth.uid());

-- Enable real-time for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.weight_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.progress_photos;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages (sender_id, recipient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread ON public.messages (recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_weight_logs_client_date ON public.weight_logs (client_id, date);
CREATE INDEX IF NOT EXISTS idx_progress_photos_client_date ON public.progress_photos (client_id, date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.users 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.coach_clients 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Success message
SELECT 'Enhanced Coaching Platform - Essential tables created successfully!' as result;
