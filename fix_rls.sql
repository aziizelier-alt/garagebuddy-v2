-- Fix for RLS recursion in public.users
CREATE OR REPLACE FUNCTION get_my_garage() 
RETURNS uuid 
AS $$ 
  SELECT garage_id FROM public.users WHERE id = auth.uid(); 
$$ LANGUAGE sql SECURITY DEFINER;

-- Drop old recursive policies
DROP POLICY IF EXISTS "Admin can select all users in garage" ON public.users;
DROP POLICY IF EXISTS "Staff can select other users in same garage" ON public.users;
DROP POLICY IF EXISTS "Admin can insert/update users" ON public.users;

-- Create safe policies
CREATE POLICY "Users can view others in same garage" 
ON public.users 
FOR SELECT 
USING (garage_id = get_my_garage());

CREATE POLICY "Admin can manage users in same garage" 
ON public.users 
FOR ALL 
USING (
  garage_id = get_my_garage() 
  AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);
