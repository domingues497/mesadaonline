-- Create families table
CREATE TABLE public.families (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('parent', 'child')),
  display_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create daughters table (additional data for child profiles)
CREATE TABLE public.daughters (
  id UUID NOT NULL PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  monthly_allowance_cents INTEGER NOT NULL DEFAULT 0,
  rewards_enabled BOOLEAN DEFAULT true,
  CONSTRAINT fk_daughters_profile FOREIGN KEY (id) REFERENCES public.profiles(id)
);

-- Create tasks table (task templates)
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  value_cents INTEGER NOT NULL DEFAULT 0 CHECK (value_cents >= 0),
  recurrence TEXT NOT NULL CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly')) DEFAULT 'none',
  attachment_required BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_instances table (actual task assignments)
CREATE TABLE public.task_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  daughter_id UUID NOT NULL REFERENCES public.daughters(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'overdue')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create submissions table (proof of task completion)
CREATE TABLE public.submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_instance_id UUID NOT NULL REFERENCES public.task_instances(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES public.profiles(id),
  proof_url TEXT,
  note TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table (financial history)
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  daughter_id UUID NOT NULL REFERENCES public.daughters(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents != 0),
  kind TEXT NOT NULL CHECK (kind IN ('allowance', 'task_approved', 'task_missed', 'adjustment')),
  memo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create settings table (family configurations)
CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL UNIQUE REFERENCES public.families(id) ON DELETE CASCADE,
  weekly_close_weekday INTEGER DEFAULT 0 CHECK (weekly_close_weekday >= 0 AND weekly_close_weekday <= 6),
  penalty_on_miss BOOLEAN DEFAULT true,
  reminder_whatsapp BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daughters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Parents can view family profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.family_id = profiles.family_id
    )
  );

-- RLS Policies for families
CREATE POLICY "Users can view their family" ON public.families
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.family_id = families.id
    )
  );

CREATE POLICY "Parents can update their family" ON public.families
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.family_id = families.id
    )
  );

-- RLS Policies for daughters
CREATE POLICY "Daughters can view their own data" ON public.daughters
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Parents can view family daughters" ON public.daughters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.family_id = (
        SELECT family_id FROM public.profiles WHERE id = daughters.id
      )
    )
  );

CREATE POLICY "Parents can update family daughters" ON public.daughters
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.family_id = (
        SELECT family_id FROM public.profiles WHERE id = daughters.id
      )
    )
  );

-- RLS Policies for tasks
CREATE POLICY "Family members can view tasks" ON public.tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.family_id = tasks.family_id
    )
  );

CREATE POLICY "Parents can manage tasks" ON public.tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.family_id = tasks.family_id
    )
  );

-- RLS Policies for task_instances
CREATE POLICY "Daughters can view their task instances" ON public.task_instances
  FOR SELECT USING (daughter_id = auth.uid());

CREATE POLICY "Daughters can update their task instances" ON public.task_instances
  FOR UPDATE USING (
    daughter_id = auth.uid()
    AND status IN ('pending', 'rejected')
  );

CREATE POLICY "Parents can view family task instances" ON public.task_instances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.daughters d ON d.id = task_instances.daughter_id
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.family_id = (
        SELECT family_id FROM public.profiles WHERE id = d.id
      )
    )
  );

CREATE POLICY "Parents can manage family task instances" ON public.task_instances
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.daughters d ON d.id = task_instances.daughter_id
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.family_id = (
        SELECT family_id FROM public.profiles WHERE id = d.id
      )
    )
  );

-- RLS Policies for submissions
CREATE POLICY "Users can view their submissions" ON public.submissions
  FOR SELECT USING (submitted_by = auth.uid());

CREATE POLICY "Daughters can create submissions" ON public.submissions
  FOR INSERT WITH CHECK (
    submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.task_instances ti
      WHERE ti.id = submissions.task_instance_id
      AND ti.daughter_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view family submissions" ON public.submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.task_instances ti ON ti.id = submissions.task_instance_id
      JOIN public.daughters d ON d.id = ti.daughter_id
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.family_id = (
        SELECT family_id FROM public.profiles WHERE id = d.id
      )
    )
  );

CREATE POLICY "Parents can update family submissions" ON public.submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.task_instances ti ON ti.id = submissions.task_instance_id
      JOIN public.daughters d ON d.id = ti.daughter_id
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.family_id = (
        SELECT family_id FROM public.profiles WHERE id = d.id
      )
    )
  );

-- RLS Policies for transactions
CREATE POLICY "Daughters can view their transactions" ON public.transactions
  FOR SELECT USING (daughter_id = auth.uid());

CREATE POLICY "Parents can view family transactions" ON public.transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.daughters d ON d.id = transactions.daughter_id
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.family_id = (
        SELECT family_id FROM public.profiles WHERE id = d.id
      )
    )
  );

CREATE POLICY "Parents can create family transactions" ON public.transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.daughters d ON d.id = transactions.daughter_id
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.family_id = (
        SELECT family_id FROM public.profiles WHERE id = d.id
      )
    )
  );

-- RLS Policies for settings
CREATE POLICY "Parents can manage family settings" ON public.settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'parent'
      AND p.family_id = settings.family_id
    )
  );

-- Create indexes for performance
CREATE INDEX idx_profiles_family_id ON public.profiles(family_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_tasks_family_id ON public.tasks(family_id);
CREATE INDEX idx_task_instances_daughter_id ON public.task_instances(daughter_id);
CREATE INDEX idx_task_instances_due_date ON public.task_instances(due_date);
CREATE INDEX idx_transactions_daughter_id ON public.transactions(daughter_id);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at);

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- This will be called after a user signs up
  -- The actual profile creation will be handled by the application
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation (placeholder)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to create a new family and parent profile
CREATE OR REPLACE FUNCTION public.create_family_and_parent(
  family_name TEXT,
  parent_display_name TEXT,
  parent_phone TEXT DEFAULT NULL
)
RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a daughter profile
CREATE OR REPLACE FUNCTION public.create_daughter_profile(
  user_id UUID,
  family_id UUID,
  display_name TEXT,
  monthly_allowance_cents INTEGER DEFAULT 0,
  phone TEXT DEFAULT NULL
)
RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on task_instances
CREATE TRIGGER update_task_instances_updated_at
  BEFORE UPDATE ON public.task_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();