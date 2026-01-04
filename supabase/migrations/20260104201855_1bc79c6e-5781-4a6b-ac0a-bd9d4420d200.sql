-- ============================
-- SETTERS: Agregar nuevos campos
-- ============================

-- Crear nuevo enum para estado de setter
CREATE TYPE public.setter_status AS ENUM ('activo', 'inactivo', 'introduciendose', 'pendiente_reunion', 'calentamiento');

-- Crear enum para rendimiento de setter
CREATE TYPE public.setter_performance AS ENUM ('alto', 'medio', 'bajo', 'alto_restriccion', 'medio_restriccion', 'bajo_restriccion');

-- Agregar nuevas columnas a setters
ALTER TABLE public.setters
ADD COLUMN IF NOT EXISTS platform TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS setter_status public.setter_status DEFAULT 'activo',
ADD COLUMN IF NOT EXISTS performance public.setter_performance DEFAULT 'medio',
ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS availability_hours TEXT,
ADD COLUMN IF NOT EXISTS dedicated_hours NUMERIC DEFAULT 0;

-- Agregar campo qualified a setter_meetings para saber si la agenda fue calificada
ALTER TABLE public.setter_meetings
ADD COLUMN IF NOT EXISTS qualified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS closed BOOLEAN DEFAULT false;

-- ============================
-- CLOSER_CALLS: Agregar campos de seguimiento
-- ============================

ALTER TABLE public.closer_calls
ADD COLUMN IF NOT EXISTS last_followup_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_followup_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS followup_notes TEXT,
ADD COLUMN IF NOT EXISTS followup_count INTEGER DEFAULT 0;