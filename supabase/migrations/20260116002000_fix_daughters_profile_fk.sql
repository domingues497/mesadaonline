-- Remove duplicate foreign key between daughters and profiles to avoid ambiguous embeds
ALTER TABLE public.daughters
DROP CONSTRAINT IF EXISTS fk_daughters_profile;

