-- Add recurrence support fields to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS recurrence_day INTEGER;

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS recurrence_time TEXT;

