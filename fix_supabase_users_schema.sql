-- Fix Supabase users schema by creating a proper user profiles table
-- This separates Supabase Auth (auth.users) from custom user data (public.user_profiles)

-- First, let's create a clean user_profiles table for our custom data
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL DEFAULT 'client',
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an update trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create a function to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, first_name, last_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on the profiles table
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow service role to insert profiles (for our registration endpoint)
CREATE POLICY "Service role can insert profiles" ON public.user_profiles
  FOR INSERT WITH CHECK (true);

-- Create a view that combines auth.users with user_profiles for easy querying
CREATE OR REPLACE VIEW public.users_view AS
SELECT 
  au.id,
  au.email,
  au.created_at as auth_created_at,
  au.updated_at as auth_updated_at,
  up.username,
  up.first_name,
  up.last_name,
  up.role,
  up.avatar,
  up.created_at,
  up.updated_at
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_profiles TO anon, authenticated;
GRANT SELECT ON public.users_view TO anon, authenticated;

-- Show the final structure
SELECT 'user_profiles table created successfully' as status;
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_profiles' 
ORDER BY ordinal_position;
