
ALTER TABLE public.hospital_doctors 
ADD COLUMN staff_type text NOT NULL DEFAULT 'arts';

COMMENT ON COLUMN public.hospital_doctors.staff_type IS 'Type: arts, verpleging, apotheker';
