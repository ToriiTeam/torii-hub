-- Create table for custom performance task labels
CREATE TABLE public.performance_task_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field_key TEXT NOT NULL UNIQUE,
  custom_label TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('daily', 'workflow', 'weekly')),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.performance_task_config ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write (team shared config)
CREATE POLICY "Allow all for authenticated users" 
ON public.performance_task_config 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_performance_task_config_updated_at
BEFORE UPDATE ON public.performance_task_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default tasks
INSERT INTO public.performance_task_config (field_key, custom_label, category, display_order) VALUES
-- Daily habits
('morning_routine', 'Rutina de mañana', 'daily', 1),
('desk_order', 'Orden del escritorio', 'daily', 2),
('cold_shower', 'Ducha fría', 'daily', 3),
('exercise', 'Entrenamiento', 'daily', 4),
('meditation', 'Meditación', 'daily', 5),
('accountability', 'Accountability', 'daily', 6),
-- Workflow
('daily_planning', 'Planificación diaria', 'workflow', 1),
('focus_hours_logged', '10h enfoque registradas', 'workflow', 2),
('success_tracker', 'Success tracker', 'workflow', 3),
('time_tracking', 'Medir tiempo con toggle', 'workflow', 4),
-- Weekly
('weekly_planning', 'Planificación semanal', 'weekly', 1),
('mentoring', 'Mentoría 1-a-1', 'weekly', 2),
('weekly_tasks_complete', 'Tareas semana 100%', 'weekly', 3),
('program_content', 'Contenido del programa', 'weekly', 4);