-- Enable UUID extension (run once in public schema)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Garages (tenants)
CREATE TABLE public.garages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Users (linked to auth.users)
CREATE TABLE public.users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  garage_id  UUID NOT NULL REFERENCES public.garages(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('admin','mechanic')),
  full_name  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Customers
CREATE TABLE public.customers (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  garage_id  UUID NOT NULL REFERENCES public.garages(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  phone      TEXT,
  email      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Vehicles
CREATE TABLE public.vehicles (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  garage_id    UUID NOT NULL REFERENCES public.garages(id) ON DELETE CASCADE,
  customer_id  UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  make         TEXT,
  model        TEXT,
  year         INTEGER,
  vin          TEXT,  -- Vehicle Identification Number
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Jobs (repair orders)
CREATE TABLE public.jobs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  garage_id           UUID NOT NULL REFERENCES public.garages(id) ON DELETE CASCADE,
  vehicle_id          UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status              TEXT NOT NULL CHECK (status IN ('pending','in_progress','waiting_parts','done')),
  description         TEXT,
  notes               TEXT,
  assigned_mechanic_id UUID REFERENCES public.users(id),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Invoices
CREATE TABLE public.invoices (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  garage_id  UUID NOT NULL REFERENCES public.garages(id) ON DELETE CASCADE,
  job_id     UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total      NUMERIC(12,2),
  status     TEXT NOT NULL CHECK (status IN ('unpaid','paid')),
  notes      TEXT
);

-- 7. Parts (inventory items)
CREATE TABLE public.parts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  garage_id  UUID NOT NULL REFERENCES public.garages(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  price      NUMERIC(10,2) NOT NULL,
  stock      INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Job_Parts (parts used in jobs)
CREATE TABLE public.job_parts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id     UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  part_id    UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Notifications (service reminders, alerts)
CREATE TABLE public.notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  garage_id    UUID NOT NULL REFERENCES public.garages(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES public.users(id),
  message      TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Audit_Logs (for tracking changes)
CREATE TABLE public.audit_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  garage_id    UUID NOT NULL REFERENCES public.garages(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES public.users(id),
  action       TEXT NOT NULL,   -- e.g. 'CREATE_JOB', 'UPDATE_STATUS'
  table_name   TEXT NOT NULL,
  record_id    UUID,            -- ID of affected record
  details      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes to speed up common queries
CREATE INDEX ON public.jobs (garage_id, status);
CREATE INDEX ON public.customers (garage_id);
CREATE INDEX ON public.vehicles (garage_id);
CREATE INDEX ON public.invoices (garage_id);
CREATE INDEX ON public.parts (garage_id);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.garages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ROW LEVEL SECURITY POLICIES --

-- 1. Garages: only allow selecting the one that user belongs to
CREATE POLICY "Select own garage" ON public.garages 
  FOR SELECT USING (id = (SELECT garage_id FROM public.users WHERE id = auth.uid()));

-- 2. Users: users can see/edit their own record; admin can see users in same garage
CREATE POLICY "User can select own profile" ON public.users 
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "Admin can select all users in garage" ON public.users
  FOR SELECT USING (
    id <> auth.uid() AND 
    garage_id = (SELECT garage_id FROM public.users WHERE id = auth.uid()) AND
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );
-- Similarly for INSERT/UPDATE:
CREATE POLICY "Insert user in own garage" ON public.users 
  FOR INSERT WITH CHECK (garage_id = (SELECT garage_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Admin can insert/update users" ON public.users 
  FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

-- 3. Customers/Vehicles: all staff in a garage can access
CREATE POLICY "Staff can view customers" ON public.customers
  FOR SELECT USING (garage_id = (SELECT garage_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Staff can manage customers" ON public.customers 
  FOR ALL USING (garage_id = (SELECT garage_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Staff can view vehicles" ON public.vehicles
  FOR SELECT USING (garage_id = (SELECT garage_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Staff can manage vehicles" ON public.vehicles 
  FOR ALL USING (garage_id = (SELECT garage_id FROM public.users WHERE id = auth.uid()));

-- 4. Jobs: admins can do all in their garage; mechanics see only their assigned jobs
CREATE POLICY "Admin: view all jobs" ON public.jobs
  FOR SELECT USING (
    garage_id = (SELECT garage_id FROM public.users WHERE id = auth.uid()) AND
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );
CREATE POLICY "Mechanic: view own jobs" ON public.jobs
  FOR SELECT USING (
    garage_id = (SELECT garage_id FROM public.users WHERE id = auth.uid()) AND
    assigned_mechanic_id = auth.uid()
  );
CREATE POLICY "Admin: manage jobs" ON public.jobs
  FOR ALL USING (
    garage_id = (SELECT garage_id FROM public.users WHERE id = auth.uid()) AND
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );
CREATE POLICY "Mechanic: update status of own jobs" ON public.jobs
  FOR UPDATE USING (
    garage_id = (SELECT garage_id FROM public.users WHERE id = auth.uid()) AND
    assigned_mechanic_id = auth.uid()
  );

-- 5. Invoices: only admin (or admin+mechanic to view) in same garage
CREATE POLICY "Staff: view invoices" ON public.invoices
  FOR SELECT USING (garage_id = (SELECT garage_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Admin: manage invoices" ON public.invoices
  FOR ALL USING (garage_id = (SELECT garage_id FROM public.users WHERE id = auth.uid()) 
                 AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

-- 6. Parts & Job_Parts: all staff in a garage
CREATE POLICY "Staff: access parts" ON public.parts
  FOR ALL USING (garage_id = (SELECT garage_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Staff: access job_parts" ON public.job_parts
  FOR ALL USING (
    (SELECT garage_id FROM public.jobs WHERE id = job_parts.job_id) = 
      (SELECT garage_id FROM public.users WHERE id = auth.uid())
  );

-- 7. Notifications & Audit: only admins can insert, staff can view in garage
CREATE POLICY "Staff: view notifications" ON public.notifications
  FOR SELECT USING (garage_id = (SELECT garage_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Admin: send notifications" ON public.notifications
  FOR INSERT WITH CHECK (
    garage_id = (SELECT garage_id FROM public.users WHERE id = auth.uid()) AND
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );
CREATE POLICY "Staff: view audit_logs" ON public.audit_logs
  FOR SELECT USING (garage_id = (SELECT garage_id FROM public.users WHERE id = auth.uid()));
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

-- ENABLE REALTIME
-- This allows the dashboard to update instantly when new jobs or bookings arrive
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
