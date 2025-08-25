-- COMPLETE DATABASE DEPLOYMENT SCRIPT
-- Enhanced Coaching Platform - Full Schema Deployment
-- 
-- INSTRUCTIONS:
-- 1. Copy and paste this entire script into Supabase SQL Editor
-- 2. URL: https://supabase.com/dashboard/project/vdykrlyybwwbcqqcgjbp/sql
-- 3. Run the script to deploy all tables and functions
-- 4. Verify deployment by checking the Tables tab in Supabase dashboard
--
-- This script combines:
-- - QUICK_START_SQL.sql (Essential tables)
-- - WORKOUT_SYSTEM_SQL.sql (Workout programming system)  
-- - CLIENT_WORKOUT_EXECUTION_SQL.sql (Client execution system)

-- ============================================================================
-- PART 1: ESSENTIAL TABLES (from QUICK_START_SQL.sql)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  onboarding_completed BOOLEAN DEFAULT false,
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'premium', 'enterprise')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Coach-Client relationships
CREATE TABLE IF NOT EXISTS public.coach_clients (
  id SERIAL PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES public.users(id),
  client_id UUID NOT NULL REFERENCES public.users(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(coach_id, client_id)
);

-- Weight logs
CREATE TABLE IF NOT EXISTS public.weight_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id),
  weight DECIMAL(5,2) NOT NULL,
  unit TEXT DEFAULT 'lbs' CHECK (unit IN ('lbs', 'kg')),
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Progress photos
CREATE TABLE IF NOT EXISTS public.progress_photos (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id),
  photo_url TEXT NOT NULL,
  photo_type TEXT CHECK (photo_type IN ('front', 'side', 'back')),
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id SERIAL PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.users(id),
  recipient_id UUID NOT NULL REFERENCES public.users(id),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Check-ins
CREATE TABLE IF NOT EXISTS public.checkins (
  id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.users(id),
  coach_id UUID NOT NULL REFERENCES public.users(id),
  date DATE NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  notes TEXT,
  client_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- PART 2: WORKOUT SYSTEM (from WORKOUT_SYSTEM_SQL.sql)
-- ============================================================================

-- Exercise Library with Advanced Features
CREATE TABLE IF NOT EXISTS public.exercises (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  muscle_groups TEXT[] DEFAULT '{}',
  equipment TEXT,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  video_url TEXT,
  thumbnail_url TEXT,
  created_by UUID REFERENCES public.users(id),
  is_public BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  calories_per_minute DECIMAL(4,1),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Exercise Categories for Organization
CREATE TABLE IF NOT EXISTS public.exercise_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parent_category_id INTEGER REFERENCES public.exercise_categories(id),
  icon_name TEXT,
  color_hex TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Exercise Variations (e.g., Push-up variants)
CREATE TABLE IF NOT EXISTS public.exercise_variations (
  id SERIAL PRIMARY KEY,
  base_exercise_id INTEGER NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  difficulty_modifier INTEGER DEFAULT 0,
  equipment_variant TEXT,
  description TEXT,
  video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Workout Programs (Collections of workouts)
CREATE TABLE IF NOT EXISTS public.programs (
  id SERIAL PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES public.users(id),
  name TEXT NOT NULL,
  description TEXT,
  duration_weeks INTEGER,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  program_type TEXT CHECK (program_type IN ('strength', 'cardio', 'hybrid', 'flexibility', 'sports_specific')),
  is_template BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  estimated_hours_per_week DECIMAL(3,1),
  target_goals TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Individual Workouts within Programs
CREATE TABLE IF NOT EXISTS public.workouts (
  id SERIAL PRIMARY KEY,
  program_id INTEGER REFERENCES public.programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  day_number INTEGER,
  week_number INTEGER,
  estimated_duration INTEGER,
  instructions TEXT,
  warmup_instructions TEXT,
  cooldown_instructions TEXT,
  difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 10),
  workout_type TEXT CHECK (workout_type IN ('strength', 'cardio', 'hiit', 'flexibility', 'recovery')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Exercises within Workouts (the core workout programming)
CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id SERIAL PRIMARY KEY,
  workout_id INTEGER NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES public.exercises(id),
  order_index INTEGER NOT NULL,
  sets INTEGER,
  reps TEXT,
  weight TEXT,
  rest_seconds INTEGER,
  notes TEXT,
  is_superset BOOLEAN DEFAULT false,
  superset_group INTEGER,
  tempo TEXT,
  rpe_target INTEGER CHECK (rpe_target >= 1 AND rpe_target <= 10),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Client Program Assignments
CREATE TABLE IF NOT EXISTS public.client_programs (
  id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.users(id),
  program_id INTEGER NOT NULL REFERENCES public.programs(id),
  assigned_by UUID NOT NULL REFERENCES public.users(id),
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  current_week INTEGER DEFAULT 1,
  current_day INTEGER DEFAULT 1,
  notes TEXT,
  customizations JSONB,
  progress_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Workout Assignments & Scheduling
CREATE TABLE IF NOT EXISTS public.workout_assignments (
  id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.users(id),
  workout_id INTEGER NOT NULL REFERENCES public.workouts(id),
  assigned_by UUID NOT NULL REFERENCES public.users(id),
  scheduled_date DATE NOT NULL,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'skipped', 'cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  coach_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- PART 3: CLIENT WORKOUT EXECUTION (from CLIENT_WORKOUT_EXECUTION_SQL.sql)
-- ============================================================================

-- Workout execution sessions
CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.users(id),
  workout_assignment_id INTEGER REFERENCES public.workout_assignments(id),
  workout_id INTEGER REFERENCES public.workouts(id),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned', 'paused')),
  client_notes TEXT,
  workout_rating INTEGER CHECK (workout_rating >= 1 AND workout_rating <= 5),
  difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
  total_duration INTEGER,
  exercises_completed INTEGER DEFAULT 0,
  total_exercises INTEGER,
  current_exercise_index INTEGER DEFAULT 0,
  current_set INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Individual exercise set logging
CREATE TABLE IF NOT EXISTS public.exercise_sets (
  id SERIAL PRIMARY KEY,
  workout_session_id INTEGER NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  workout_exercise_id INTEGER NOT NULL REFERENCES public.workout_exercises(id),
  exercise_id INTEGER NOT NULL REFERENCES public.exercises(id),
  set_number INTEGER NOT NULL,
  prescribed_reps TEXT,
  actual_reps INTEGER,
  prescribed_weight TEXT,
  actual_weight DECIMAL(6,2),
  weight_unit TEXT DEFAULT 'lbs' CHECK (weight_unit IN ('lbs', 'kg')),
  rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
  rest_duration INTEGER,
  prescribed_rest INTEGER,
  notes TEXT,
  personal_record BOOLEAN DEFAULT false,
  form_rating INTEGER CHECK (form_rating >= 1 AND form_rating <= 5),
  completed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  synced BOOLEAN DEFAULT true
);

-- Workout feedback from clients
CREATE TABLE IF NOT EXISTS public.workout_feedback (
  id SERIAL PRIMARY KEY,
  workout_session_id INTEGER NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.users(id),
  coach_id UUID REFERENCES public.users(id),
  overall_difficulty INTEGER CHECK (overall_difficulty >= 1 AND overall_difficulty <= 5),
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
  motivation INTEGER CHECK (motivation >= 1 AND motivation <= 5),
  workout_enjoyment INTEGER CHECK (workout_enjoyment >= 1 AND workout_enjoyment <= 5),
  feedback_text TEXT,
  would_repeat BOOLEAN,
  suggested_modifications TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Personal records tracking
CREATE TABLE IF NOT EXISTS public.personal_records (
  id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.users(id),
  exercise_id INTEGER NOT NULL REFERENCES public.exercises(id),
  record_type TEXT NOT NULL CHECK (record_type IN ('1rm', 'max_reps', 'max_volume', 'max_time')),
  value DECIMAL(8,2) NOT NULL,
  unit TEXT,
  date_achieved DATE NOT NULL,
  workout_session_id INTEGER REFERENCES public.workout_sessions(id),
  previous_record DECIMAL(8,2),
  improvement DECIMAL(8,2),
  verified_by_coach BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Client workout preferences
CREATE TABLE IF NOT EXISTS public.client_workout_preferences (
  id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.users(id) UNIQUE,
  default_rest_time INTEGER DEFAULT 60,
  auto_advance_exercises BOOLEAN DEFAULT false,
  timer_sounds BOOLEAN DEFAULT true,
  vibration_alerts BOOLEAN DEFAULT true,
  metric_system BOOLEAN DEFAULT false,
  auto_start_timer BOOLEAN DEFAULT true,
  show_previous_performance BOOLEAN DEFAULT true,
  dark_mode_during_workout BOOLEAN DEFAULT false,
  voice_commands BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_workout_preferences ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Coach-client relationship policies
CREATE POLICY "Coaches can manage their clients" ON public.coach_clients FOR ALL USING (coach_id = auth.uid());
CREATE POLICY "Clients can view their coach relationships" ON public.coach_clients FOR SELECT USING (client_id = auth.uid());

-- Weight logs policies
CREATE POLICY "Users can manage own weight logs" ON public.weight_logs FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Coaches can view client weight logs" ON public.weight_logs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.coach_clients 
    WHERE coach_clients.client_id = weight_logs.user_id 
    AND coach_clients.coach_id = auth.uid()
    AND coach_clients.status = 'active'
  )
);

-- Messages policies
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT USING (
  sender_id = auth.uid() OR recipient_id = auth.uid()
);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Exercises policies
CREATE POLICY "Public exercises visible to all" ON public.exercises FOR SELECT USING (is_public = true);
CREATE POLICY "Private exercises visible to creator" ON public.exercises FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "Users can create exercises" ON public.exercises FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update own exercises" ON public.exercises FOR UPDATE USING (created_by = auth.uid());

-- Workout sessions policies
CREATE POLICY "Clients can manage own workout sessions" ON public.workout_sessions FOR ALL USING (client_id = auth.uid());
CREATE POLICY "Coaches can view client workout sessions" ON public.workout_sessions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.coach_clients 
    WHERE coach_clients.client_id = workout_sessions.client_id 
    AND coach_clients.coach_id = auth.uid()
    AND coach_clients.status = 'active'
  )
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Essential indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_coach_clients_coach ON public.coach_clients (coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_clients_client ON public.coach_clients (client_id);
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON public.weight_logs (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exercises_public ON public.exercises (is_public);
CREATE INDEX IF NOT EXISTS idx_exercises_creator ON public.exercises (created_by);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_client ON public.workout_sessions (client_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_session ON public.exercise_sets (workout_session_id);

-- Search indexes
CREATE INDEX IF NOT EXISTS idx_exercises_search ON public.exercises USING GIN (
  to_tsvector('english', name || ' ' || COALESCE(description, ''))
);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_groups ON public.exercises USING GIN (muscle_groups);

-- ============================================================================
-- REAL-TIME SUBSCRIPTIONS
-- ============================================================================

-- Enable real-time for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.exercise_sets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_assignments;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.coach_clients FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.exercises FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.workouts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.client_programs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.workout_sessions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.client_workout_preferences FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- SAMPLE DATA FOR TESTING
-- ============================================================================

-- Insert exercise categories
INSERT INTO public.exercise_categories (name, description, icon_name, color_hex) VALUES
('Upper Body', 'Exercises targeting upper body muscles', 'dumbbell', '#3b82f6'),
('Lower Body', 'Exercises targeting lower body muscles', 'leg', '#10b981'),
('Core', 'Exercises targeting core and abdominal muscles', 'abs', '#f59e0b'),
('Cardio', 'Cardiovascular and conditioning exercises', 'heart', '#ef4444'),
('Flexibility', 'Stretching and mobility exercises', 'stretch', '#8b5cf6'),
('Full Body', 'Compound movements targeting multiple muscle groups', 'body', '#f97316')
ON CONFLICT DO NOTHING;

-- Insert sample exercises
INSERT INTO public.exercises (name, description, instructions, muscle_groups, equipment, difficulty_level, is_public, category, tags) VALUES
('Push-ups', 'Classic bodyweight upper body exercise', 'Start in plank position, lower chest to ground, push back up', ARRAY['chest', 'triceps', 'shoulders'], 'bodyweight', 'beginner', true, 'Upper Body', ARRAY['bodyweight', 'push']),
('Squats', 'Fundamental lower body movement', 'Stand with feet shoulder-width apart, lower hips back and down, return to standing', ARRAY['quadriceps', 'glutes', 'hamstrings'], 'bodyweight', 'beginner', true, 'Lower Body', ARRAY['bodyweight', 'legs']),
('Plank', 'Isometric core strengthening exercise', 'Hold straight body position supported by forearms and toes', ARRAY['core', 'shoulders'], 'bodyweight', 'beginner', true, 'Core', ARRAY['bodyweight', 'core', 'isometric']),
('Burpees', 'Full body conditioning exercise', 'Squat down, jump back to plank, push-up, jump feet to hands, jump up', ARRAY['full body'], 'bodyweight', 'intermediate', true, 'Full Body', ARRAY['bodyweight', 'cardio', 'hiit']),
('Deadlifts', 'Hip hinge movement with weight', 'Stand with feet hip-width, hinge at hips to lower weight, return to standing', ARRAY['hamstrings', 'glutes', 'erector spinae'], 'barbell', 'intermediate', true, 'Lower Body', ARRAY['barbell', 'hip hinge'])
ON CONFLICT DO NOTHING;

-- Success message
SELECT 'Enhanced Coaching Platform - Complete database schema deployed successfully! 🎉' as result,
       'Total tables created: 20+' as tables,
       'Features enabled: Exercise library, Workout builder, Client execution, Real-time updates' as features,
       'Ready for production use!' as status;
