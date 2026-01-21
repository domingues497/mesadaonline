-- Create a secure function to mark invites as used
-- This bypasses RLS policies to allow new users (children) to close their invites
CREATE OR REPLACE FUNCTION public.mark_invite_used(invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.invites
  SET used_at = now()
  WHERE id = invite_id
  AND used_at IS NULL; -- Prevent double usage safety check
END;
$$;
