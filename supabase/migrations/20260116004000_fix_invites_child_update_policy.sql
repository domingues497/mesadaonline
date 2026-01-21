-- Allow newly created child (or any family member) to marcar convite como usado
-- após o signup, sem depender de uma sessão de responsável.

CREATE POLICY "invites_child_mark_used"
ON public.invites
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.family_id = public.invites.family_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.family_id = public.invites.family_id
  )
);

