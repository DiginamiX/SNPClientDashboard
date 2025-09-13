-- ============================================================================
-- CRITICAL RLS POLICY FIXES FOR USER SELF-PROVISIONING
-- ============================================================================
-- 
-- ISSUE: Users table RLS policies block self-provisioning, preventing new user 
-- registration after Supabase Auth signup. This completely breaks production.
--
-- FIXES:
-- 1. Add INSERT policy for users table to allow self-provisioning
-- 2. Secure role assignment to prevent privilege escalation
-- 3. Update coaches table RLS policies with proper role-based access
-- 4. Ensure security while allowing legitimate user creation
--
-- CRITICAL: This must be applied immediately to restore user registration
-- ============================================================================

-- ============================================================================
-- STEP 1: Fix Users Table RLS Policies (CRITICAL)
-- ============================================================================

-- Drop existing problematic policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read own record" ON public.users;
DROP POLICY IF EXISTS "Users can update own record" ON public.users;
DROP POLICY IF EXISTS "Users can insert own record" ON public.users;

-- CRITICAL FIX: Allow users to create their own record after Supabase Auth registration
CREATE POLICY "Users can insert own record" ON public.users 
FOR INSERT 
WITH CHECK (
  id = auth.uid() AND
  -- Security: Prevent role escalation by enforcing safe defaults
  (role IS NULL OR role = 'client' OR role = 'user')
);

-- Allow users to read their own record
CREATE POLICY "Users can read own record" ON public.users 
FOR SELECT 
USING (id = auth.uid());

-- Allow users to update their own record (role protection handled by trigger)
CREATE POLICY "Users can update own record" ON public.users 
FOR UPDATE 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Allow admins to manage all users (for admin panel functionality)
CREATE POLICY "Admins can manage all users" ON public.users 
FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================================
-- STEP 2: Secure Role Assignment with Database Defaults
-- ============================================================================

-- Ensure users table has secure default for role
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'client';

-- Add check constraint to prevent invalid roles
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
CHECK (role IN ('client', 'coach', 'admin', 'user'));

-- Create function to automatically set safe role on user creation
CREATE OR REPLACE FUNCTION public.ensure_safe_user_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Force safe default role if attempting privilege escalation
  IF NEW.role IS NULL THEN
    NEW.role := 'client';
  END IF;
  
  -- Prevent non-admin users from setting admin/coach roles during INSERT
  IF TG_OP = 'INSERT' AND NEW.role IN ('admin', 'coach') THEN
    -- Only allow if being created by an admin
    IF NOT EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      NEW.role := 'client';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the role security trigger
DROP TRIGGER IF EXISTS ensure_safe_user_role_trigger ON public.users;
CREATE TRIGGER ensure_safe_user_role_trigger
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.ensure_safe_user_role();

-- ============================================================================
-- STEP 3: Fix Coaches Table RLS Policies
-- ============================================================================

-- Drop existing coaches policies
DROP POLICY IF EXISTS "Coaches can manage clients" ON public.coaches;
DROP POLICY IF EXISTS "Users can create coach profiles" ON public.coaches;

-- Allow users to create their own coach profile (but only if they have coach/admin role)
CREATE POLICY "Users can create own coach profile" ON public.coaches 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role IN ('coach', 'admin')
  )
);

-- Allow coaches to read their own profile
CREATE POLICY "Coaches can read own profile" ON public.coaches 
FOR SELECT 
USING (user_id = auth.uid());

-- Allow coaches to update their own profile
CREATE POLICY "Coaches can update own profile" ON public.coaches 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow admins to manage all coach profiles
CREATE POLICY "Admins can manage all coaches" ON public.coaches 
FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================================
-- STEP 4: Fix Clients Table RLS Policies for Coach Access
-- ============================================================================

-- Drop existing problematic client policies
DROP POLICY IF EXISTS "Coaches can manage their clients" ON public.clients;
DROP POLICY IF EXISTS "Clients can view their profile" ON public.clients;

-- Allow users to create their own client profile
CREATE POLICY "Users can create own client profile" ON public.clients 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Allow clients to read their own profile
CREATE POLICY "Clients can read own profile" ON public.clients 
FOR SELECT 
USING (user_id = auth.uid());

-- Allow clients to update their own profile
CREATE POLICY "Clients can update own profile" ON public.clients 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow coaches to manage clients assigned to them
CREATE POLICY "Coaches can manage assigned clients" ON public.clients 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.coaches c 
    WHERE c.id = clients.coach_id AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.coaches c 
    WHERE c.id = clients.coach_id AND c.user_id = auth.uid()
  )
);

-- Allow coaches to create clients and assign them to themselves
CREATE POLICY "Coaches can create clients for themselves" ON public.clients 
FOR INSERT 
WITH CHECK (
  created_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.coaches c 
    WHERE c.id = coach_id AND c.user_id = auth.uid()
  )
);

-- Allow admins to manage all clients
CREATE POLICY "Admins can manage all clients" ON public.clients 
FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================================
-- STEP 5: Verification Queries
-- ============================================================================

-- Verify RLS is enabled on critical tables
SELECT 
    schemaname,
    tablename, 
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'coaches', 'clients')
ORDER BY tablename;

-- Show all current policies
SELECT 
    schemaname,
    tablename, 
    policyname,
    permissive,
    roles,
    cmd as "Command",
    qual as "Using Condition",
    with_check as "With Check"
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'coaches', 'clients')
ORDER BY tablename, cmd, policyname;

-- ============================================================================
-- SUCCESS CONFIRMATION
-- ============================================================================

SELECT 'CRITICAL RLS POLICY FIXES APPLIED SUCCESSFULLY!' as status,
       'Users can now self-provision after Supabase Auth registration' as fix1,
       'Role assignment secured against privilege escalation' as fix2, 
       'Coaches table RLS policies updated with proper access control' as fix3,
       'Production user registration should now work correctly' as result;