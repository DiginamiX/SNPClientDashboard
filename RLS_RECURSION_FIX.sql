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
  (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
WITH CHECK (
  -- Same check for write operations
  id = auth.uid() OR 
  (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- Clean up complete - the JWT-based policy above should resolve the recursion issue