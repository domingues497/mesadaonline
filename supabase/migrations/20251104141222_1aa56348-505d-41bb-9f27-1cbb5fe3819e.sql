-- Add family_email to families table
ALTER TABLE public.families 
ADD COLUMN email TEXT UNIQUE;

-- Add username to profiles (unique within family)
ALTER TABLE public.profiles 
ADD COLUMN username TEXT;

-- Create unique constraint for username within family
CREATE UNIQUE INDEX profiles_family_username_unique 
ON public.profiles(family_id, username) 
WHERE username IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.families.email IS 'Email principal da família usado para login';
COMMENT ON COLUMN public.profiles.username IS 'Nome de usuário único dentro da família';