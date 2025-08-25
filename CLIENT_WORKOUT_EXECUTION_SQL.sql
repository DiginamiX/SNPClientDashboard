-- Client Workout Execution Schema Extensions
-- Copy and paste this AFTER running WORKOUT_SYSTEM_SQL.sql
-- URL: https://supabase.com/dashboard/project/vdykrlyybwwbcqqcgjbp/sql

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
  total_duration INTEGER, -- minutes
  exercises_completed INTEGER DEFAULT 0,
  total_exercises INTEGER,
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
  prescribed_reps TEXT, -- e.g., "8-12", "AMRAP"
  actual_reps INTEGER,
  prescribed_weight TEXT, -- e.g., "75% 1RM", "135 lbs"
  actual_weight DECIMAL(6,2),
  weight_unit TEXT DEFAULT 'lbs' CHECK (weight_unit IN ('lbs', 'kg')),
  rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10), -- Rate of Perceived Exertion
  rest_duration INTEGER, -- seconds actually rested
  prescribed_rest INTEGER, -- seconds prescribed
  notes TEXT,
  personal_record BOOLEAN DEFAULT false,
  form_rating INTEGER CHECK (form_rating >= 1 AND form_rating <= 5),
  completed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  synced BOOLEAN DEFAULT true -- for offline capability
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
  unit TEXT, -- lbs, kg, seconds, etc.
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
  default_rest_time INTEGER DEFAULT 60, -- seconds
  auto_advance_exercises BOOLEAN DEFAULT false,
  timer_sounds BOOLEAN DEFAULT true,
  vibration_alerts BOOLEAN DEFAULT true,
  metric_system BOOLEAN DEFAULT false, -- true for kg, false for lbs
  auto_start_timer BOOLEAN DEFAULT true,
  show_previous_performance BOOLEAN DEFAULT true,
  dark_mode_during_workout BOOLEAN DEFAULT false,
  voice_commands BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Workout streaks and achievements
CREATE TABLE IF NOT EXISTS public.client_achievements (
  id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.users(id),
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  description TEXT,
  earned_date DATE NOT NULL,
  workout_session_id INTEGER REFERENCES public.workout_sessions(id),
  badge_icon TEXT,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Offline workout cache
CREATE TABLE IF NOT EXISTS public.offline_workout_cache (
  id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.users(id),
  workout_id INTEGER NOT NULL REFERENCES public.workouts(id),
  workout_data JSONB NOT NULL,
  exercise_data JSONB NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ,
  version INTEGER DEFAULT 1
);

-- Enable Row Level Security
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_workout_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_workout_cache ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies

-- Workout sessions: clients can manage their own, coaches can view their clients'
CREATE POLICY "Clients can manage own workout sessions" ON public.workout_sessions 
  FOR ALL USING (client_id = auth.uid());

CREATE POLICY "Coaches can view client workout sessions" ON public.workout_sessions 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.coach_clients 
      WHERE coach_clients.client_id = workout_sessions.client_id 
      AND coach_clients.coach_id = auth.uid()
      AND coach_clients.status = 'active'
    )
  );

-- Exercise sets: same as workout sessions
CREATE POLICY "Clients can manage own exercise sets" ON public.exercise_sets 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions 
      WHERE workout_sessions.id = exercise_sets.workout_session_id 
      AND workout_sessions.client_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view client exercise sets" ON public.exercise_sets 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions 
      JOIN public.coach_clients ON coach_clients.client_id = workout_sessions.client_id
      WHERE workout_sessions.id = exercise_sets.workout_session_id 
      AND coach_clients.coach_id = auth.uid()
      AND coach_clients.status = 'active'
    )
  );

-- Workout feedback: clients create, coaches can view
CREATE POLICY "Clients can manage own workout feedback" ON public.workout_feedback 
  FOR ALL USING (client_id = auth.uid());

CREATE POLICY "Coaches can view client workout feedback" ON public.workout_feedback 
  FOR SELECT USING (coach_id = auth.uid());

-- Personal records: clients manage own, coaches can view
CREATE POLICY "Clients can manage own personal records" ON public.personal_records 
  FOR ALL USING (client_id = auth.uid());

CREATE POLICY "Coaches can view client personal records" ON public.personal_records 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.coach_clients 
      WHERE coach_clients.client_id = personal_records.client_id 
      AND coach_clients.coach_id = auth.uid()
      AND coach_clients.status = 'active'
    )
  );

-- Client preferences: only client can manage
CREATE POLICY "Clients can manage own workout preferences" ON public.client_workout_preferences 
  FOR ALL USING (client_id = auth.uid());

-- Achievements: clients can view own, coaches can view clients'
CREATE POLICY "Clients can view own achievements" ON public.client_achievements 
  FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Coaches can view client achievements" ON public.client_achievements 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.coach_clients 
      WHERE coach_clients.client_id = client_achievements.client_id 
      AND coach_clients.coach_id = auth.uid()
      AND coach_clients.status = 'active'
    )
  );

-- Offline cache: only client can manage
CREATE POLICY "Clients can manage own workout cache" ON public.offline_workout_cache 
  FOR ALL USING (client_id = auth.uid());

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.exercise_sets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE public.personal_records;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_workout_sessions_client ON public.workout_sessions (client_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_status ON public.workout_sessions (client_id, status);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON public.workout_sessions (client_id, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_exercise_sets_session ON public.exercise_sets (workout_session_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_exercise ON public.exercise_sets (exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_client_exercise ON public.exercise_sets (workout_session_id, exercise_id);

CREATE INDEX IF NOT EXISTS idx_personal_records_client ON public.personal_records (client_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_exercise ON public.personal_records (client_id, exercise_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_date ON public.personal_records (client_id, date_achieved DESC);

CREATE INDEX IF NOT EXISTS idx_workout_feedback_client ON public.workout_feedback (client_id);
CREATE INDEX IF NOT EXISTS idx_workout_feedback_coach ON public.workout_feedback (coach_id);

CREATE INDEX IF NOT EXISTS idx_offline_cache_client ON public.offline_workout_cache (client_id);
CREATE INDEX IF NOT EXISTS idx_offline_cache_workout ON public.offline_workout_cache (client_id, workout_id);

-- Updated at triggers
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.workout_sessions 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.client_workout_preferences 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insert default preferences for existing users
INSERT INTO public.client_workout_preferences (client_id)
SELECT id FROM public.users 
WHERE role = 'user' 
AND id NOT IN (SELECT client_id FROM public.client_workout_preferences)
ON CONFLICT DO NOTHING;

-- Success message
SELECT 'Client Workout Execution System - Database schema ready for mobile workout execution!' as result;
