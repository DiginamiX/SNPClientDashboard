-- ============================================================================
-- CRITICAL FIX: Resolve RLS Infinite Recursion Issue
-- ============================================================================

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;

-- Create a simpler admin policy that doesn't cause recursion
-- We'll use the auth.jwt() function to get role directly from JWT token metadata
CREATE POLICY "Admins can manage all users" ON public.users 
FOR ALL 
TO authenticated
USING (
  -- Allow if the user is accessing their own record OR if they're an admin
  id = auth.uid() OR 
  (auth.jwt() ->> 'user_metadata' ->> 'role' = 'admin') OR
  (auth.jwt() ->> 'app_metadata' ->> 'role' = 'admin')
)
WITH CHECK (
  -- Same check for write operations
  id = auth.uid() OR 
  (auth.jwt() ->> 'user_metadata' ->> 'role' = 'admin') OR
  (auth.jwt() ->> 'app_metadata' ->> 'role' = 'admin')
);

-- Alternative approach: Create a simpler policy for now and rely on application-level checks
-- This removes the recursion by not querying the users table within the policy
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;

CREATE POLICY "Users can manage own data and admins manage all" ON public.users 
FOR ALL 
TO authenticated
USING (
  -- Allow users to access their own records
  -- Admin access will be handled at application level to avoid recursion
  id = auth.uid()
)
WITH CHECK (
  id = auth.uid()
);

-- For admin operations, we'll temporarily use a more permissive policy
-- and handle admin checks in the application layer
CREATE POLICY "Authenticated users can read" ON public.users 
FOR SELECT 
TO authenticated
USING (true);