-- Enhanced Coaching Platform Schema Migration
-- This migration creates all the tables needed for the comprehensive coaching platform

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types/enums
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('client', 'admin');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'difficulty_level') THEN
    CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'program_type') THEN
    CREATE TYPE program_type AS ENUM ('strength', 'cardio', 'hybrid', 'flexibility', 'sports_specific');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workout_status') THEN
    CREATE TYPE workout_status AS ENUM ('planned', 'in_progress', 'completed', 'skipped');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'program_status') THEN
    CREATE TYPE program_status AS ENUM ('active', 'completed', 'paused');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meal_type') THEN
    CREATE TYPE meal_type AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meal_plan_status') THEN
    CREATE TYPE meal_plan_status AS ENUM ('active', 'completed', 'paused');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'relationship_status') THEN
    CREATE TYPE relationship_status AS ENUM ('active', 'paused', 'ended');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'checkin_status') THEN
    CREATE TYPE checkin_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_type') THEN
    CREATE TYPE message_type AS ENUM ('text', 'image', 'video', 'workout', 'meal_plan');
  END IF;
END $$;

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'client',
  avatar TEXT,
  reset_token TEXT,
  reset_token_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Coaches table
CREATE TABLE IF NOT EXISTS public.coaches (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  specialization TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  coach_id INTEGER REFERENCES public.coaches(id),
  height DECIMAL(5,2), -- in cm
  starting_weight DECIMAL(5,2), -- in kg
  goal_weight DECIMAL(5,2), -- in kg
  date_of_birth DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Exercise library
CREATE TABLE IF NOT EXISTS public.exercises (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  muscle_groups TEXT[],
  equipment TEXT,
  difficulty_level difficulty_level,
  video_url TEXT,
  thumbnail_url TEXT,
  created_by UUID REFERENCES public.users(id),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Workout programs
CREATE TABLE IF NOT EXISTS public.programs (
  id SERIAL PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES public.users(id),
  name TEXT NOT NULL,
  description TEXT,
  duration_weeks INTEGER,
  difficulty_level difficulty_level,
  program_type program_type,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Individual workouts within programs
CREATE TABLE IF NOT EXISTS public.workouts (
  id SERIAL PRIMARY KEY,
  program_id INTEGER REFERENCES public.programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  day_number INTEGER,
  week_number INTEGER,
  estimated_duration INTEGER, -- in minutes
  instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Exercises within workouts
CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id SERIAL PRIMARY KEY,
  workout_id INTEGER NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES public.exercises(id),
  order_index INTEGER NOT NULL,
  sets INTEGER,
  reps TEXT, -- Can be range like "8-12"
  weight TEXT, -- Can be percentage or fixed
  rest_seconds INTEGER,
  notes TEXT,
  is_superset BOOLEAN DEFAULT false,
  superset_group INTEGER
);

-- Client program assignments
CREATE TABLE IF NOT EXISTS public.client_programs (
  id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.users(id),
  program_id INTEGER NOT NULL REFERENCES public.programs(id),
  assigned_by UUID NOT NULL REFERENCES public.users(id),
  start_date DATE NOT NULL,
  end_date DATE,
  status program_status DEFAULT 'active',
  current_week INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Workout logging
CREATE TABLE IF NOT EXISTS public.workout_logs (
  id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.users(id),
  workout_id INTEGER NOT NULL REFERENCES public.workouts(id),
  program_id INTEGER REFERENCES public.programs(id),
  date DATE NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status workout_status DEFAULT 'planned',
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Exercise performance logging
CREATE TABLE IF NOT EXISTS public.exercise_logs (
  id SERIAL PRIMARY KEY,
  workout_log_id INTEGER NOT NULL REFERENCES public.workout_logs(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES public.exercises(id),
  order_index INTEGER NOT NULL,
  sets_completed INTEGER,
  reps_completed INTEGER[],
  weight_used DECIMAL[],
  rest_time INTEGER[], -- Actual rest times in seconds
  notes TEXT,
  personal_record BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enhanced meal planning
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id SERIAL PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES public.users(id),
  name TEXT NOT NULL,
  description TEXT,
  total_calories INTEGER,
  protein_grams INTEGER,
  carbs_grams INTEGER,
  fats_grams INTEGER,
  fiber_grams INTEGER,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Individual meals
CREATE TABLE IF NOT EXISTS public.meals (
  id SERIAL PRIMARY KEY,
  meal_plan_id INTEGER NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  meal_type meal_type,
  calories INTEGER,
  protein_grams DECIMAL(6,2),
  carbs_grams DECIMAL(6,2),
  fats_grams DECIMAL(6,2),
  fiber_grams DECIMAL(6,2),
  instructions TEXT,
  image_url TEXT,
  prep_time INTEGER, -- in minutes
  order_index INTEGER
);

-- Client meal plan assignments
CREATE TABLE IF NOT EXISTS public.client_meal_plans (
  id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.users(id),
  meal_plan_id INTEGER NOT NULL REFERENCES public.meal_plans(id),
  assigned_by UUID NOT NULL REFERENCES public.users(id),
  start_date DATE NOT NULL,
  end_date DATE,
  status meal_plan_status DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Weight logs (existing table structure)
CREATE TABLE IF NOT EXISTS public.weight_logs (
  id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.users(id),
  weight DECIMAL(5,2) NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Progress photos (existing table structure)
CREATE TABLE IF NOT EXISTS public.progress_photos (
  id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.users(id),
  image_url TEXT NOT NULL,
  date DATE NOT NULL,
  category TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enhanced body measurements
CREATE TABLE IF NOT EXISTS public.body_measurements (
  id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.users(id),
  date DATE NOT NULL,
  weight DECIMAL(5,2),
  body_fat_percentage DECIMAL(4,1),
  muscle_mass DECIMAL(5,2),
  chest DECIMAL(5,2),
  waist DECIMAL(5,2),
  hips DECIMAL(5,2),
  bicep_left DECIMAL(5,2),
  bicep_right DECIMAL(5,2),
  thigh_left DECIMAL(5,2),
  thigh_right DECIMAL(5,2),
  measurements_json JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Check-ins (existing table structure)
CREATE TABLE IF NOT EXISTS public.checkins (
  id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.users(id),
  coach_id UUID NOT NULL REFERENCES public.users(id),
  date DATE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status checkin_status DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enhanced messages (existing table with enhancements)
CREATE TABLE IF NOT EXISTS public.messages (
  id SERIAL PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.users(id),
  recipient_id UUID NOT NULL REFERENCES public.users(id),
  content TEXT NOT NULL,
  message_type message_type DEFAULT 'text',
  attachment_url TEXT,
  workout_id INTEGER REFERENCES public.workouts(id),
  meal_plan_id INTEGER REFERENCES public.meal_plans(id),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Coach-Client relationships
CREATE TABLE IF NOT EXISTS public.coach_clients (
  id SERIAL PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES public.users(id),
  client_id UUID NOT NULL REFERENCES public.users(id),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status relationship_status DEFAULT 'active',
  package_type TEXT,
  billing_cycle TEXT,
  rate DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(coach_id, client_id)
);

-- Nutrition plans (legacy compatibility)
CREATE TABLE IF NOT EXISTS public.nutrition_plans (
  id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.users(id),
  coach_id UUID NOT NULL REFERENCES public.users(id),
  title TEXT NOT NULL,
  description TEXT,
  protein_target INTEGER NOT NULL,
  carbs_target INTEGER NOT NULL,
  fat_target INTEGER NOT NULL,
  calories_target INTEGER NOT NULL,
  notes TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Device integrations (existing table)
CREATE TABLE IF NOT EXISTS public.device_integrations (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_groups ON public.exercises USING GIN (muscle_groups);
CREATE INDEX IF NOT EXISTS idx_exercises_difficulty ON public.exercises (difficulty_level);
CREATE INDEX IF NOT EXISTS idx_exercises_public ON public.exercises (is_public);

CREATE INDEX IF NOT EXISTS idx_workouts_program_day ON public.workouts (program_id, day_number);
CREATE INDEX IF NOT EXISTS idx_workouts_program_week ON public.workouts (program_id, week_number);

CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout ON public.workout_exercises (workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise ON public.workout_exercises (exercise_id);

CREATE INDEX IF NOT EXISTS idx_client_programs_client ON public.client_programs (client_id);
CREATE INDEX IF NOT EXISTS idx_client_programs_active ON public.client_programs (client_id, status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_workout_logs_client_date ON public.workout_logs (client_id, date);
CREATE INDEX IF NOT EXISTS idx_workout_logs_status ON public.workout_logs (status);

CREATE INDEX IF NOT EXISTS idx_exercise_logs_workout ON public.exercise_logs (workout_log_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_exercise ON public.exercise_logs (exercise_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages (sender_id, recipient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread ON public.messages (recipient_id, is_read);

CREATE INDEX IF NOT EXISTS idx_weight_logs_client_date ON public.weight_logs (client_id, date);
CREATE INDEX IF NOT EXISTS idx_progress_photos_client_date ON public.progress_photos (client_id, date);
CREATE INDEX IF NOT EXISTS idx_body_measurements_client_date ON public.body_measurements (client_id, date);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_integrations ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies

-- Users can see and edit their own profile
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Coaches can see their coach profile
CREATE POLICY "Coaches can view own profile" ON public.coaches FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
  AND user_id = auth.uid()
);

-- Clients can see their client profile
CREATE POLICY "Clients can view own profile" ON public.clients FOR ALL USING (user_id = auth.uid());

-- Coaches can see their assigned clients
CREATE POLICY "Coaches can view assigned clients" ON public.clients FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.coach_clients 
    WHERE coach_clients.client_id = clients.user_id 
    AND coach_clients.coach_id = auth.uid()
    AND coach_clients.status = 'active'
  )
);

-- Public exercises are visible to all, private exercises only to creator
CREATE POLICY "Public exercises visible to all" ON public.exercises FOR SELECT USING (is_public = true);
CREATE POLICY "Private exercises visible to creator" ON public.exercises FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "Users can create exercises" ON public.exercises FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update own exercises" ON public.exercises FOR UPDATE USING (created_by = auth.uid());

-- Programs: coaches can manage their own programs
CREATE POLICY "Coaches can manage own programs" ON public.programs FOR ALL USING (coach_id = auth.uid());

-- Workouts: accessible through program ownership
CREATE POLICY "Workouts accessible through programs" ON public.workouts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.programs WHERE programs.id = workouts.program_id AND programs.coach_id = auth.uid())
);

-- Messages: users can see messages they sent or received
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT USING (
  sender_id = auth.uid() OR recipient_id = auth.uid()
);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Users can update own messages" ON public.messages FOR UPDATE USING (
  sender_id = auth.uid() OR recipient_id = auth.uid()
);

-- Weight logs, progress photos, body measurements: users can manage their own data
CREATE POLICY "Users can manage own weight logs" ON public.weight_logs FOR ALL USING (client_id = auth.uid());
CREATE POLICY "Users can manage own progress photos" ON public.progress_photos FOR ALL USING (client_id = auth.uid());
CREATE POLICY "Users can manage own body measurements" ON public.body_measurements FOR ALL USING (client_id = auth.uid());

-- Coaches can view their clients' data
CREATE POLICY "Coaches can view client weight logs" ON public.weight_logs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.coach_clients 
    WHERE coach_clients.client_id = weight_logs.client_id 
    AND coach_clients.coach_id = auth.uid()
    AND coach_clients.status = 'active'
  )
);

CREATE POLICY "Coaches can view client progress photos" ON public.progress_photos FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.coach_clients 
    WHERE coach_clients.client_id = progress_photos.client_id 
    AND coach_clients.coach_id = auth.uid()
    AND coach_clients.status = 'active'
  )
);

CREATE POLICY "Coaches can view client body measurements" ON public.body_measurements FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.coach_clients 
    WHERE coach_clients.client_id = body_measurements.client_id 
    AND coach_clients.coach_id = auth.uid()
    AND coach_clients.status = 'active'
  )
);

-- Enable real-time for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.exercise_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.progress_photos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.weight_logs;

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to relevant tables
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.coaches FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.exercises FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.workouts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.client_programs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.workout_logs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.meal_plans FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.coach_clients FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.nutrition_plans FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
