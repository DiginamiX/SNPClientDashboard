-- Enhanced Workout System Schema for Competitive Advantage
-- Copy and paste this AFTER running QUICK_START_SQL.sql
-- URL: https://supabase.com/dashboard/project/vdykrlyybwwbcqqcgjbp/sql

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
  difficulty_modifier INTEGER DEFAULT 0, -- -2 (easier) to +2 (harder)
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
  target_goals TEXT[] DEFAULT '{}', -- weight_loss, muscle_gain, strength, endurance
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Individual Workouts within Programs
CREATE TABLE IF NOT EXISTS public.workouts (
  id SERIAL PRIMARY KEY,
  program_id INTEGER REFERENCES public.programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  day_number INTEGER, -- Day within program (1-7 for weekly, 1-N for program)
  week_number INTEGER, -- Week within program
  estimated_duration INTEGER, -- minutes
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
  order_index INTEGER NOT NULL, -- Order within workout
  sets INTEGER,
  reps TEXT, -- Support ranges like "8-12" or "AMRAP"
  weight TEXT, -- Support percentages like "75% 1RM" or fixed weight
  rest_seconds INTEGER,
  notes TEXT, -- Coach notes/cues
  is_superset BOOLEAN DEFAULT false,
  superset_group INTEGER, -- Group exercises in supersets
  tempo TEXT, -- e.g., "3-1-1-1" (eccentric-pause-concentric-pause)
  rpe_target INTEGER CHECK (rpe_target >= 1 AND rpe_target <= 10), -- Rate of Perceived Exertion
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Program Templates for Reuse
CREATE TABLE IF NOT EXISTS public.program_templates (
  id SERIAL PRIMARY KEY,
  program_id INTEGER NOT NULL REFERENCES public.programs(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_public BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES public.users(id),
  usage_count INTEGER DEFAULT 0,
  rating DECIMAL(2,1) DEFAULT 0.0,
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
  customizations JSONB, -- Client-specific modifications
  progress_data JSONB, -- Tracking data
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
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'skipped', 'cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  coach_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Workout Completion Logs
CREATE TABLE IF NOT EXISTS public.workout_logs (
  id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.users(id),
  workout_id INTEGER NOT NULL REFERENCES public.workouts(id),
  assignment_id INTEGER REFERENCES public.workout_assignments(id),
  date DATE NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'partial', 'skipped')),
  difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 10),
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
  notes TEXT,
  coach_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Individual Exercise Performance Logs
CREATE TABLE IF NOT EXISTS public.exercise_logs (
  id SERIAL PRIMARY KEY,
  workout_log_id INTEGER NOT NULL REFERENCES public.workout_logs(id) ON DELETE CASCADE,
  workout_exercise_id INTEGER NOT NULL REFERENCES public.workout_exercises(id),
  exercise_id INTEGER NOT NULL REFERENCES public.exercises(id),
  order_index INTEGER NOT NULL,
  sets_completed INTEGER,
  reps_completed INTEGER[], -- Array of reps per set
  weight_used DECIMAL[], -- Array of weights per set
  rest_time INTEGER[], -- Actual rest times between sets
  rpe_actual INTEGER[], -- Actual RPE per set
  notes TEXT,
  personal_record BOOLEAN DEFAULT false,
  form_rating INTEGER CHECK (form_rating >= 1 AND form_rating <= 5), -- Self-assessed form
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Exercise Prescription Templates (for common set/rep schemes)
CREATE TABLE IF NOT EXISTS public.exercise_prescriptions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL, -- e.g., "Strength 5x5", "Hypertrophy 3x8-12"
  description TEXT,
  sets INTEGER,
  reps TEXT,
  rest_seconds INTEGER,
  intensity_percent DECIMAL(4,1), -- % of 1RM
  rpe_target INTEGER,
  prescription_type TEXT CHECK (prescription_type IN ('strength', 'hypertrophy', 'endurance', 'power')),
  created_by UUID REFERENCES public.users(id),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_prescriptions ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies

-- Exercises: Public exercises visible to all, private to creator only
CREATE POLICY "Public exercises visible to all" ON public.exercises 
  FOR SELECT USING (is_public = true);
CREATE POLICY "Private exercises visible to creator" ON public.exercises 
  FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "Users can create exercises" ON public.exercises 
  FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update own exercises" ON public.exercises 
  FOR UPDATE USING (created_by = auth.uid());

-- Exercise Categories: Readable by all
CREATE POLICY "Exercise categories visible to all" ON public.exercise_categories 
  FOR SELECT USING (true);

-- Programs: Coaches can manage their own programs
CREATE POLICY "Coaches can manage own programs" ON public.programs 
  FOR ALL USING (coach_id = auth.uid());
CREATE POLICY "Public program templates visible to all" ON public.programs 
  FOR SELECT USING (is_public = true AND is_template = true);

-- Workouts: Accessible through program ownership
CREATE POLICY "Workouts accessible through programs" ON public.workouts 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.programs WHERE programs.id = workouts.program_id AND programs.coach_id = auth.uid())
  );

-- Client Programs: Clients can see assigned programs, coaches can manage
CREATE POLICY "Clients can view assigned programs" ON public.client_programs 
  FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "Coaches can manage client programs" ON public.client_programs 
  FOR ALL USING (assigned_by = auth.uid());

-- Workout Logs: Users can manage their own logs, coaches can view client logs
CREATE POLICY "Users can manage own workout logs" ON public.workout_logs 
  FOR ALL USING (client_id = auth.uid());
CREATE POLICY "Coaches can view client workout logs" ON public.workout_logs 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.coach_clients 
      WHERE coach_clients.client_id = workout_logs.client_id 
      AND coach_clients.coach_id = auth.uid()
      AND coach_clients.status = 'active'
    )
  );

-- Exercise Logs: Same as workout logs
CREATE POLICY "Users can manage own exercise logs" ON public.exercise_logs 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workout_logs 
      WHERE workout_logs.id = exercise_logs.workout_log_id 
      AND workout_logs.client_id = auth.uid()
    )
  );

-- Enable real-time for workout tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.exercise_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_assignments;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_exercises_search ON public.exercises USING GIN (
  to_tsvector('english', name || ' ' || COALESCE(description, ''))
);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_groups ON public.exercises USING GIN (muscle_groups);
CREATE INDEX IF NOT EXISTS idx_exercises_tags ON public.exercises USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON public.exercises (category);
CREATE INDEX IF NOT EXISTS idx_exercises_difficulty ON public.exercises (difficulty_level);
CREATE INDEX IF NOT EXISTS idx_exercises_public ON public.exercises (is_public);

CREATE INDEX IF NOT EXISTS idx_programs_coach ON public.programs (coach_id);
CREATE INDEX IF NOT EXISTS idx_programs_type ON public.programs (program_type);
CREATE INDEX IF NOT EXISTS idx_programs_public ON public.programs (is_public, is_template);

CREATE INDEX IF NOT EXISTS idx_workouts_program ON public.workouts (program_id);
CREATE INDEX IF NOT EXISTS idx_workouts_program_day ON public.workouts (program_id, week_number, day_number);

CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout ON public.workout_exercises (workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_order ON public.workout_exercises (workout_id, order_index);

CREATE INDEX IF NOT EXISTS idx_client_programs_client ON public.client_programs (client_id);
CREATE INDEX IF NOT EXISTS idx_client_programs_active ON public.client_programs (client_id, status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_workout_assignments_client_date ON public.workout_assignments (client_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_workout_assignments_status ON public.workout_assignments (status);

CREATE INDEX IF NOT EXISTS idx_workout_logs_client_date ON public.workout_logs (client_id, date);
CREATE INDEX IF NOT EXISTS idx_workout_logs_workout ON public.workout_logs (workout_id);

CREATE INDEX IF NOT EXISTS idx_exercise_logs_workout ON public.exercise_logs (workout_log_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_exercise ON public.exercise_logs (exercise_id);

-- Updated at triggers
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.exercises 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.programs 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.workouts 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.client_programs 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.workout_logs 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insert sample exercise categories
INSERT INTO public.exercise_categories (name, description, icon_name, color_hex) VALUES
('Upper Body', 'Exercises targeting upper body muscles', 'dumbbell', '#3b82f6'),
('Lower Body', 'Exercises targeting lower body muscles', 'leg', '#10b981'),
('Core', 'Exercises targeting core and abdominal muscles', 'abs', '#f59e0b'),
('Cardio', 'Cardiovascular and conditioning exercises', 'heart', '#ef4444'),
('Flexibility', 'Stretching and mobility exercises', 'stretch', '#8b5cf6'),
('Full Body', 'Compound movements targeting multiple muscle groups', 'body', '#f97316')
ON CONFLICT DO NOTHING;

-- Insert sample exercises for immediate use
INSERT INTO public.exercises (name, description, instructions, muscle_groups, equipment, difficulty_level, is_public, category, tags) VALUES
('Push-ups', 'Classic bodyweight upper body exercise', 'Start in plank position, lower chest to ground, push back up', ARRAY['chest', 'triceps', 'shoulders'], 'bodyweight', 'beginner', true, 'Upper Body', ARRAY['bodyweight', 'push']),
('Squats', 'Fundamental lower body movement', 'Stand with feet shoulder-width apart, lower hips back and down, return to standing', ARRAY['quadriceps', 'glutes', 'hamstrings'], 'bodyweight', 'beginner', true, 'Lower Body', ARRAY['bodyweight', 'legs']),
('Plank', 'Isometric core strengthening exercise', 'Hold straight body position supported by forearms and toes', ARRAY['core', 'shoulders'], 'bodyweight', 'beginner', true, 'Core', ARRAY['bodyweight', 'core', 'isometric']),
('Burpees', 'Full body conditioning exercise', 'Squat down, jump back to plank, push-up, jump feet to hands, jump up', ARRAY['full body'], 'bodyweight', 'intermediate', true, 'Full Body', ARRAY['bodyweight', 'cardio', 'hiit']),
('Deadlifts', 'Hip hinge movement with weight', 'Stand with feet hip-width, hinge at hips to lower weight, return to standing', ARRAY['hamstrings', 'glutes', 'erector spinae'], 'barbell', 'intermediate', true, 'Lower Body', ARRAY['barbell', 'hip hinge'])
ON CONFLICT DO NOTHING;

-- Success message
SELECT 'Enhanced Workout System - Advanced tables created successfully! Ready for Phase 2 implementation.' as result;
