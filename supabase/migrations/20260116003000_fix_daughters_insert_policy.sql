-- without requiring a parent session, while keeping parent control for updates.

DROP POLICY IF EXISTS "daughters_insert_self" ON public.daughters;

CREATE POLICY "daughters_insert_self"
ON public.daughters
FOR INSERT
WITH CHECK (id = auth.uid());
