
-- Update create_family_and_parent function to support family_email and username
CREATE OR REPLACE FUNCTION public.create_family_and_parent(
  family_name TEXT,
  parent_display_name TEXT,
  parent_phone TEXT DEFAULT NULL,
  family_email TEXT DEFAULT NULL,
  parent_username TEXT DEFAULT NULL
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
  INSERT INTO public.families (name, email)
  VALUES (family_name, family_email)
  RETURNING id INTO family_id;
  
  -- Create the parent profile
  INSERT INTO public.profiles (id, family_id, role, display_name, phone, username)
  VALUES (auth.uid(), family_id, 'parent', parent_display_name, parent_phone, parent_username);
  
  -- Create default settings for the family
  INSERT INTO public.settings (family_id)
  VALUES (family_id);
  
  RETURN family_id;
END;
$$;
