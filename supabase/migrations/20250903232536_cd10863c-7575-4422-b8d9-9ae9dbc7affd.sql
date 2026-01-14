-- Fix security warnings by setting search_path on all functions

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This will be called after a user signs up
  -- The actual profile creation will be handled by the application
  RETURN NEW;
END;
$$;

-- Update create_family_and_parent function
CREATE OR REPLACE FUNCTION public.create_family_and_parent(
  family_name TEXT,
  parent_display_name TEXT,
  parent_phone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  family_id UUID;
BEGIN
  -- Create the family
  INSERT INTO public.families (name)
  VALUES (family_name)
  RETURNING id INTO family_id;
  
  -- Create the parent profile
  INSERT INTO public.profiles (id, family_id, role, display_name, phone)
  VALUES (auth.uid(), family_id, 'parent', parent_display_name, parent_phone);
  
  -- Create default settings for the family
  INSERT INTO public.settings (family_id)
  VALUES (family_id);
  
  RETURN family_id;
END;
$$;

-- Update create_daughter_profile function
CREATE OR REPLACE FUNCTION public.create_daughter_profile(
  user_id UUID,
  family_id UUID,
  display_name TEXT,
  monthly_allowance_cents INTEGER DEFAULT 0,
  phone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  daughter_id UUID;
BEGIN
  -- Verify the caller is a parent of the family
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'parent'
    AND family_id = create_daughter_profile.family_id
  ) THEN
    RAISE EXCEPTION 'Only parents can create daughter profiles';
  END IF;
  
  -- Create the daughter profile
  INSERT INTO public.profiles (id, family_id, role, display_name, phone)
  VALUES (user_id, family_id, 'child', display_name, phone)
  RETURNING id INTO daughter_id;
  
  -- Create the daughter record with allowance settings
  INSERT INTO public.daughters (id, monthly_allowance_cents)
  VALUES (daughter_id, monthly_allowance_cents);
  
  RETURN daughter_id;
END;
$$;

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;