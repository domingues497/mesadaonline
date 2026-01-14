-- Corrigir RLS policies com recursão infinita usando security definer functions

-- 1. Criar função security definer para verificar se usuário é parent da família
CREATE OR REPLACE FUNCTION public.is_family_parent(_family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'parent'
      AND family_id = _family_id
  );
$$;

-- 2. Criar função para obter family_id do usuário atual
CREATE OR REPLACE FUNCTION public.get_user_family_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 3. Dropar policies problemáticas
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_parent" ON public.profiles;

-- 4. Criar nova policy de SELECT sem recursão
CREATE POLICY "profiles_select_fixed" ON public.profiles
FOR SELECT
USING (
  -- Usuário pode ver seu próprio perfil
  id = auth.uid()
  OR
  -- Parent pode ver perfis da sua família
  (
    family_id = public.get_user_family_id()
    AND public.is_family_parent(family_id)
  )
);

-- 5. Criar policy para UPDATE próprio perfil
CREATE POLICY "profiles_update_self" ON public.profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());