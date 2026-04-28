-- 11. Booking Requests (Public facing holding area)
CREATE TABLE public.booking_requests (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  garage_id           UUID NOT NULL REFERENCES public.garages(id) ON DELETE CASCADE,
  customer_name       TEXT NOT NULL,
  customer_phone      TEXT,
  customer_email      TEXT,
  vehicle_make        TEXT NOT NULL,
  vehicle_model       TEXT NOT NULL,
  vehicle_year        INTEGER,
  issue_description   TEXT NOT NULL,
  preferred_date      DATE,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

-- Allow ANYONE (unauthenticated) to insert a booking request
-- By checking if the garage_id exists in public.garages
CREATE POLICY "Anyone can submit a booking request" ON public.booking_requests
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.garages WHERE id = garage_id)
  );

-- Allow STAFF to view booking requests for their garage
CREATE POLICY "Staff can view booking requests" ON public.booking_requests
  FOR SELECT USING (
    garage_id = (SELECT garage_id FROM public.users WHERE id = auth.uid())
  );

-- Allow STAFF to update booking requests for their garage (e.g. mark as approved)
CREATE POLICY "Staff can manage booking requests" ON public.booking_requests
  FOR UPDATE USING (
    garage_id = (SELECT garage_id FROM public.users WHERE id = auth.uid())
  );
CREATE POLICY "Staff can delete booking requests" ON public.booking_requests
  FOR DELETE USING (
    garage_id = (SELECT garage_id FROM public.users WHERE id = auth.uid())
  );

-- Index for fast lookup by garage
CREATE INDEX ON public.booking_requests (garage_id, status);
