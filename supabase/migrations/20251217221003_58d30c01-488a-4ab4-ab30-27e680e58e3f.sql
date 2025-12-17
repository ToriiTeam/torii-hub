-- Create enum types
CREATE TYPE public.task_status AS ENUM ('pendiente', 'en_progreso', 'completada');
CREATE TYPE public.task_priority AS ENUM ('alta', 'media', 'baja');
CREATE TYPE public.client_status AS ENUM ('activo', 'pausado', 'finalizado', 'cancelado');
CREATE TYPE public.offer_type AS ENUM ('DWY', 'DFY');
CREATE TYPE public.payment_type AS ENUM ('Upfront', 'Mensual', 'Cuotas');
CREATE TYPE public.payment_platform AS ENUM ('Stripe', 'Binance', 'Transfer');
CREATE TYPE public.setter_stage AS ENUM ('nuevo', 'entrenamiento', 'activo', 'senior', 'lider');
CREATE TYPE public.closer_stage AS ENUM ('nuevo', 'entrenamiento', 'activo', 'senior', 'lider');
CREATE TYPE public.call_status AS ENUM ('pendiente', 'realizada', 'no_asistio', 'reagendada', 'cancelada');
CREATE TYPE public.lead_status AS ENUM ('nuevo', 'calificado', 'no_calificado', 'cerrado', 'perdido');
CREATE TYPE public.document_category AS ENUM ('contratos', 'sops', 'comprobantes', 'propuestas', 'legal', 'otros');
CREATE TYPE public.availability_status AS ENUM ('disponible', 'ocupado', 'ausente', 'vacaciones');

-- Team Users table (team members, not auth users)
CREATE TABLE public.team_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT DEFAULT 'miembro',
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Strategic Tasks
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority public.task_priority DEFAULT 'media',
  status public.task_status DEFAULT 'pendiente',
  due_date DATE,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Task assignees (many-to-many)
CREATE TABLE public.task_assignees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.team_users(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(task_id, user_id)
);

-- Time Audit Tasks
CREATE TABLE public.time_audit_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_name TEXT NOT NULL,
  hours_per_week TEXT,
  category TEXT,
  energy TEXT,
  knowledge INTEGER DEFAULT 1,
  impact INTEGER DEFAULT 1,
  delegation_cost INTEGER DEFAULT 1,
  score INTEGER DEFAULT 0,
  xds TEXT,
  new_owner TEXT,
  processes_to_create TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Clients
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  offer_type public.offer_type DEFAULT 'DFY',
  start_date DATE,
  end_date DATE,
  status public.client_status DEFAULT 'activo',
  payment_type public.payment_type DEFAULT 'Mensual',
  total_installments INTEGER DEFAULT 1,
  paid_installments INTEGER DEFAULT 0,
  installment_amount DECIMAL(10,2) DEFAULT 0,
  next_due_date DATE,
  platform public.payment_platform DEFAULT 'Stripe',
  platform_fee DECIMAL(5,2) DEFAULT 0,
  country TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Client Products (what was sold)
CREATE TABLE public.client_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  product_name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  sold_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Client Tasks
CREATE TABLE public.client_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status public.task_status DEFAULT 'pendiente',
  progress INTEGER DEFAULT 0,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fixed Costs
CREATE TABLE public.fixed_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  frequency TEXT DEFAULT 'mensual',
  category TEXT,
  payment_date INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Variable Costs
CREATE TABLE public.variable_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  category TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Income
CREATE TABLE public.incomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  type TEXT DEFAULT 'unico',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Monthly Accounting
CREATE TABLE public.monthly_accounting (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  total_income DECIMAL(10,2) DEFAULT 0,
  total_fixed_costs DECIMAL(10,2) DEFAULT 0,
  total_variable_costs DECIMAL(10,2) DEFAULT 0,
  net_profit DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(year, month)
);

-- Setters
CREATE TABLE public.setters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  stage public.setter_stage DEFAULT 'nuevo',
  commitment INTEGER DEFAULT 3,
  goal INTEGER DEFAULT 10,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Setter Meetings
CREATE TABLE public.setter_meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setter_id UUID REFERENCES public.setters(id) ON DELETE CASCADE NOT NULL,
  lead_name TEXT NOT NULL,
  lead_email TEXT,
  lead_phone TEXT,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  attended BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Closers
CREATE TABLE public.closers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  stage public.closer_stage DEFAULT 'nuevo',
  commitment INTEGER DEFAULT 3,
  goal INTEGER DEFAULT 5,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Closer Calls (detailed lead tracking)
CREATE TABLE public.closer_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  closer_id UUID REFERENCES public.closers(id) ON DELETE CASCADE NOT NULL,
  lead_name TEXT NOT NULL,
  lead_email TEXT,
  lead_phone TEXT,
  first_call_attended BOOLEAN DEFAULT false,
  qualified BOOLEAN,
  first_call_status public.call_status DEFAULT 'pendiente',
  first_call_date TIMESTAMP WITH TIME ZONE,
  rescheduled_date TIMESTAMP WITH TIME ZONE,
  second_call_status public.call_status,
  second_call_date TIMESTAMP WITH TIME ZONE,
  paid BOOLEAN DEFAULT false,
  price DECIMAL(10,2),
  objections TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Call Recordings
CREATE TABLE public.call_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  closer_id UUID REFERENCES public.closers(id) ON DELETE CASCADE,
  call_id UUID REFERENCES public.closer_calls(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_url TEXT,
  file_size INTEGER,
  duration INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Documents
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category public.document_category DEFAULT 'otros',
  description TEXT,
  tags TEXT[],
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  favorite BOOLEAN DEFAULT false,
  file_type TEXT,
  file_url TEXT,
  file_content TEXT,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Announcements
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES public.team_users(id) ON DELETE SET NULL,
  important BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Team Availability
CREATE TABLE public.team_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.team_users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  status public.availability_status DEFAULT 'disponible',
  work_schedule_start TEXT DEFAULT '09:00',
  work_schedule_end TEXT DEFAULT '18:00',
  timezone TEXT DEFAULT 'America/Argentina/Buenos_Aires',
  last_active TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User Performance (daily tracking like Google Sheet)
CREATE TABLE public.user_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.team_users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  target INTEGER DEFAULT 10,
  actual INTEGER DEFAULT 0,
  morning_routine BOOLEAN DEFAULT false,
  desk_order BOOLEAN DEFAULT false,
  cold_shower BOOLEAN DEFAULT false,
  exercise BOOLEAN DEFAULT false,
  meditation BOOLEAN DEFAULT false,
  accountability BOOLEAN DEFAULT false,
  daily_planning BOOLEAN DEFAULT false,
  focus_hours_logged BOOLEAN DEFAULT false,
  success_tracker BOOLEAN DEFAULT false,
  time_tracking BOOLEAN DEFAULT false,
  weekly_planning BOOLEAN DEFAULT false,
  mentoring BOOLEAN DEFAULT false,
  weekly_tasks_complete BOOLEAN DEFAULT false,
  program_content BOOLEAN DEFAULT false,
  wake_time TEXT,
  sleep_time TEXT,
  focus_hours TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.team_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_audit_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variable_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_accounting ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setter_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closer_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_performance ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (all data accessible to logged in users)
CREATE POLICY "Allow all for authenticated users" ON public.team_users FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.task_assignees FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.time_audit_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.client_products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.client_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.fixed_costs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.variable_costs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.incomes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.monthly_accounting FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.setters FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.setter_meetings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.closers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.closer_calls FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.call_recordings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.announcements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.team_availability FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.user_performance FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_team_users_updated_at BEFORE UPDATE ON public.team_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_client_tasks_updated_at BEFORE UPDATE ON public.client_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_setters_updated_at BEFORE UPDATE ON public.setters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_closers_updated_at BEFORE UPDATE ON public.closers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_closer_calls_updated_at BEFORE UPDATE ON public.closer_calls FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_team_availability_updated_at BEFORE UPDATE ON public.team_availability FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();