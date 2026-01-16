-- Add assignees column to tasks table to store specific daughters IDs
ALTER TABLE public.tasks 
ADD COLUMN assignees UUID[] DEFAULT NULL;

-- Update the create-task-instances function logic (via code, not migration) but ensure RLS allows reading this column
-- (RLS usually allows select * so it should be fine if policies are correctly set)
