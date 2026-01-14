-- ETAPA 1: Helper + Policies Essenciais

-- 1) Função helper current_family_id()
CREATE OR REPLACE FUNCTION public.current_family_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 2) Tabela de convites para adicionar filhas
CREATE TABLE IF NOT EXISTS public.invites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  token text UNIQUE NOT NULL,
  family_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'child',
  display_name text NOT NULL,
  email text NOT NULL,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Políticas para invites
CREATE POLICY "Parents can manage family invites" ON public.invites
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.family_id = invites.family_id
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.family_id = invites.family_id
  )
);

-- Política para usar convite (público para signup)
CREATE POLICY "Anyone can view valid invites" ON public.invites
FOR SELECT USING (
  expires_at > now() AND used_at IS NULL
);

-- 3) PROFILES - Corrigir políticas
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Parents can view family profiles" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
FOR SELECT USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.family_id = public.profiles.family_id
  )
);

CREATE POLICY "profiles_insert_self" ON public.profiles
FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_parent" ON public.profiles
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.family_id = public.profiles.family_id
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.family_id = public.profiles.family_id
  )
);

-- 4) DAUGHTERS - Corrigir políticas
DROP POLICY IF EXISTS "Daughters can view their own data" ON public.daughters;
DROP POLICY IF EXISTS "Parents can view family daughters" ON public.daughters;
DROP POLICY IF EXISTS "Parents can update family daughters" ON public.daughters;

CREATE POLICY "daughters_select_child" ON public.daughters
FOR SELECT USING (id = auth.uid());

CREATE POLICY "daughters_parent_all" ON public.daughters
FOR ALL USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p_parent
    JOIN public.profiles p_daughter ON p_daughter.id = public.daughters.id
    WHERE p_parent.id = auth.uid()
      AND p_parent.role = 'parent'
      AND p_parent.family_id = p_daughter.family_id
  )
) WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p_parent
    JOIN public.profiles p_daughter ON p_daughter.id = public.daughters.id
    WHERE p_parent.id = auth.uid()
      AND p_parent.role = 'parent'
      AND p_parent.family_id = p_daughter.family_id
  )
);

-- 5) TASKS - Corrigir políticas
DROP POLICY IF EXISTS "Family members can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Parents can manage tasks" ON public.tasks;

CREATE POLICY "tasks_parent_crud" ON public.tasks
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.family_id = public.tasks.family_id
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.family_id = public.tasks.family_id
  )
);

CREATE POLICY "tasks_child_select" ON public.tasks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.family_id = public.tasks.family_id
  )
);

-- 6) TASK_INSTANCES - Corrigir políticas
DROP POLICY IF EXISTS "Daughters can view their task instances" ON public.task_instances;
DROP POLICY IF EXISTS "Daughters can update their task instances" ON public.task_instances;
DROP POLICY IF EXISTS "Parents can manage family task instances" ON public.task_instances;
DROP POLICY IF EXISTS "Parents can view family task instances" ON public.task_instances;

CREATE POLICY "ti_child_select" ON public.task_instances
FOR SELECT USING (daughter_id = auth.uid());

CREATE POLICY "ti_child_update" ON public.task_instances
FOR UPDATE USING (daughter_id = auth.uid())
WITH CHECK (daughter_id = auth.uid());

CREATE POLICY "ti_parent_all" ON public.task_instances
FOR ALL USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p_parent
    JOIN public.profiles p_d ON p_d.id = public.task_instances.daughter_id
    WHERE p_parent.id = auth.uid()
      AND p_parent.role = 'parent'
      AND p_parent.family_id = p_d.family_id
  )
) WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p_parent
    JOIN public.profiles p_d ON p_d.id = public.task_instances.daughter_id
    WHERE p_parent.id = auth.uid()
      AND p_parent.role = 'parent'
      AND p_parent.family_id = p_d.family_id
  )
);

-- 7) SUBMISSIONS - Corrigir políticas
DROP POLICY IF EXISTS "Daughters can create submissions" ON public.submissions;
DROP POLICY IF EXISTS "Parents can update family submissions" ON public.submissions;
DROP POLICY IF EXISTS "Parents can view family submissions" ON public.submissions;
DROP POLICY IF EXISTS "Users can view their submissions" ON public.submissions;

CREATE POLICY "sub_child_insert" ON public.submissions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.task_instances ti
    WHERE ti.id = public.submissions.task_instance_id
      AND ti.daughter_id = auth.uid()
  )
);

CREATE POLICY "sub_child_select" ON public.submissions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.task_instances ti
    WHERE ti.id = public.submissions.task_instance_id
      AND ti.daughter_id = auth.uid()
  )
);

CREATE POLICY "sub_parent_moderate" ON public.submissions
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.task_instances ti
    JOIN public.profiles p_parent ON p_parent.id = auth.uid()
    JOIN public.profiles p_d ON p_d.id = ti.daughter_id
    WHERE p_parent.role = 'parent'
      AND p_parent.family_id = p_d.family_id
      AND ti.id = public.submissions.task_instance_id
  )
);

CREATE POLICY "sub_parent_update" ON public.submissions
FOR UPDATE USING (
  EXISTS (
    SELECT 1
    FROM public.task_instances ti
    JOIN public.profiles p_parent ON p_parent.id = auth.uid()
    JOIN public.profiles p_d ON p_d.id = ti.daughter_id
    WHERE p_parent.role = 'parent'
      AND p_parent.family_id = p_d.family_id
      AND ti.id = public.submissions.task_instance_id
  )
) WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.task_instances ti
    JOIN public.profiles p_parent ON p_parent.id = auth.uid()
    JOIN public.profiles p_d ON p_d.id = ti.daughter_id
    WHERE p_parent.role = 'parent'
      AND p_parent.family_id = p_d.family_id
      AND ti.id = public.submissions.task_instance_id
  )
);

-- 8) TRANSACTIONS - Corrigir políticas
DROP POLICY IF EXISTS "Daughters can view their transactions" ON public.transactions;
DROP POLICY IF EXISTS "Parents can create family transactions" ON public.transactions;
DROP POLICY IF EXISTS "Parents can view family transactions" ON public.transactions;

CREATE POLICY "tx_child_select" ON public.transactions
FOR SELECT USING (daughter_id = auth.uid());

CREATE POLICY "tx_parent_all" ON public.transactions
FOR ALL USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p_parent
    JOIN public.profiles p_d ON p_d.id = public.transactions.daughter_id
    WHERE p_parent.id = auth.uid()
      AND p_parent.role = 'parent'
      AND p_parent.family_id = p_d.family_id
  )
) WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p_parent
    JOIN public.profiles p_d ON p_d.id = public.transactions.daughter_id
    WHERE p_parent.id = auth.uid()
      AND p_parent.role = 'parent'
      AND p_parent.family_id = p_d.family_id
  )
);