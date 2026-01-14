-- Fix the profiles table to remove foreign key constraint to auth.users
-- This should prevent the foreign key violation errors

-- First, check if there's an existing foreign key constraint
DO $$
BEGIN
  -- Try to drop the foreign key constraint if it exists
  BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
  EXCEPTION
    WHEN undefined_object THEN
      -- Constraint doesn't exist, continue
      NULL;
  END;
END $$;

-- Ensure the profiles table structure is correct
-- The id column should just be a UUID without foreign key to auth.users
ALTER TABLE public.profiles ALTER COLUMN id SET NOT NULL;