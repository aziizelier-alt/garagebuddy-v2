-- Improved function to handle missing user profiles gracefully
CREATE OR REPLACE FUNCTION get_my_garage() 
RETURNS uuid 
AS $$ 
DECLARE
  gid uuid;
BEGIN
  SELECT garage_id INTO gid FROM public.users WHERE id = auth.uid();
  RETURN gid; -- Will be NULL if not found, which is safe for RLS
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
