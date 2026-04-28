-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Garages (tenants)
CREATE TABLE IF NOT EXISTS public.garages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Users (staff; links to auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  garage_id UUID NOT NULL REFERENCES public.garages(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin','mechanic')),
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Customers (people)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  garage_id UUID NOT NULL REFERENCES public.garages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Vehicles
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  garage_id UUID NOT NULL REFERENCES public.garages(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  make TEXT,
  model TEXT,
  year INT,
  vin TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Bookings (reservation slots)
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  garage_id UUID NOT NULL REFERENCES public.garages(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','confirmed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Jobs (repair orders)
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  garage_id UUID NOT NULL REFERENCES public.garages(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id),
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending','in_progress','waiting_parts','done')),
  assigned_mechanic_id UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  garage_id UUID NOT NULL REFERENCES public.garages(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  total NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('unpaid','paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Parts (inventory items)
CREATE TABLE IF NOT EXISTS public.parts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  garage_id UUID NOT NULL REFERENCES public.garages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(9,2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Job_Parts (parts used in jobs)
CREATE TABLE IF NOT EXISTS public.job_parts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Notifications (reminders/alerts)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  garage_id UUID NOT NULL REFERENCES public.garages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  message TEXT NOT NULL,
  send_at TIMESTAMPTZ,
  sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Audit_Logs (activity logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  garage_id UUID NOT NULL REFERENCES public.garages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_garage ON public.users (garage_id);
CREATE INDEX IF NOT EXISTS idx_customers_garage ON public.customers (garage_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_garage ON public.vehicles (garage_id);
CREATE INDEX IF NOT EXISTS idx_bookings_garage_time ON public.bookings (garage_id, start_time);
CREATE INDEX IF NOT EXISTS idx_jobs_garage_status ON public.jobs (garage_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_garage ON public.invoices (garage_id);
CREATE INDEX IF NOT EXISTS idx_parts_garage ON public.parts (garage_id);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.garages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- HELPER: Get current garage ID
CREATE OR REPLACE FUNCTION public.current_garage() RETURNS UUID AS $$
  SELECT garage_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- POLICIES
DROP POLICY IF EXISTS "Users: select own or admin" ON public.users;
CREATE POLICY "Users: select own or admin" ON public.users FOR SELECT USING (
  id = auth.uid() OR (current_garage() = garage_id AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin')
);

DROP POLICY IF EXISTS "Users: admin manage" ON public.users;
CREATE POLICY "Users: admin manage" ON public.users FOR ALL USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Users: insert own profile" ON public.users;
CREATE POLICY "Users: insert own profile" ON public.users FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Customers: in own garage" ON public.customers;
CREATE POLICY "Customers: in own garage" ON public.customers FOR ALL USING (garage_id = current_garage());

DROP POLICY IF EXISTS "Vehicles: in own garage" ON public.vehicles;
CREATE POLICY "Vehicles: in own garage" ON public.vehicles FOR ALL USING (garage_id = current_garage());

DROP POLICY IF EXISTS "Bookings: garage access" ON public.bookings;
CREATE POLICY "Bookings: garage access" ON public.bookings FOR ALL USING (garage_id = current_garage());

DROP POLICY IF EXISTS "Jobs: admin all jobs" ON public.jobs;
CREATE POLICY "Jobs: admin all jobs" ON public.jobs FOR SELECT USING (
  current_garage() = garage_id AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Jobs: mechanic own jobs" ON public.jobs;
CREATE POLICY "Jobs: mechanic own jobs" ON public.jobs FOR SELECT USING (
  current_garage() = garage_id AND assigned_mechanic_id = auth.uid()
);

DROP POLICY IF EXISTS "Jobs: admin manage" ON public.jobs;
CREATE POLICY "Jobs: admin manage" ON public.jobs FOR ALL USING (
  current_garage() = garage_id AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Jobs: mechanic update status" ON public.jobs;
CREATE POLICY "Jobs: mechanic update status" ON public.jobs FOR UPDATE USING (
  current_garage() = garage_id AND assigned_mechanic_id = auth.uid()
);

DROP POLICY IF EXISTS "Invoices: garage view" ON public.invoices;
CREATE POLICY "Invoices: garage view" ON public.invoices FOR SELECT USING (garage_id = current_garage());

DROP POLICY IF EXISTS "Invoices: admin manage" ON public.invoices;
CREATE POLICY "Invoices: admin manage" ON public.invoices FOR ALL USING (
  garage_id = current_garage() AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Parts: garage access" ON public.parts;
CREATE POLICY "Parts: garage access" ON public.parts FOR ALL USING (garage_id = current_garage());

DROP POLICY IF EXISTS "Job_Parts: via jobs' garage" ON public.job_parts;
CREATE POLICY "Job_Parts: via jobs' garage" ON public.job_parts FOR ALL USING (
  (SELECT garage_id FROM public.jobs WHERE id = job_parts.job_id) = current_garage()
);

DROP POLICY IF EXISTS "Notifications: view own garage" ON public.notifications;
CREATE POLICY "Notifications: view own garage" ON public.notifications FOR SELECT USING (garage_id = current_garage());

DROP POLICY IF EXISTS "Notifications: admin send" ON public.notifications;
CREATE POLICY "Notifications: admin send" ON public.notifications FOR INSERT WITH CHECK (
  garage_id = current_garage() AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Audit: view own garage" ON public.audit_logs;
CREATE POLICY "Audit: view own garage" ON public.audit_logs FOR SELECT USING (garage_id = current_garage());
