-- Adicionar policy de INSERT para families (necessária para signup de parents)
CREATE POLICY "families_insert_auth" ON public.families
FOR INSERT 
TO authenticated
WITH CHECK (true);