-- Create storage bucket for task proofs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('task-proofs', 'task-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for task proof uploads
CREATE POLICY "Users can upload task proofs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'task-proofs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view task proofs" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'task-proofs');

-- Allow task proof updates (for replacing images)
CREATE POLICY "Users can update their task proofs" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'task-proofs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow task proof deletions
CREATE POLICY "Users can delete their task proofs" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'task-proofs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);