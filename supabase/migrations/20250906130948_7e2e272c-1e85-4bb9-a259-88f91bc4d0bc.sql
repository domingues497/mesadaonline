-- Fix infinite recursion in profiles RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Parents can view family profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new safe policies without recursion
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid());

-- Create a security definer function to check parent role safely
CREATE OR REPLACE FUNCTION public.check_parent_role(family_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'parent' 
    AND family_id = family_id_param
  );
END;
$$;

-- Use the function for parent viewing family profiles
CREATE POLICY "Parents can view family profiles" 
ON public.profiles 
FOR SELECT 
USING (public.check_parent_role(family_id) OR id = auth.uid());