import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TaskTimerProps {
  taskId: string;
  taskTitle: string;
  userId?: string;
  onTimeLogged?: (taskId: string, seconds: number) => void;
  className?: string;
  compact?: boolean;
}

export function TaskTimer({ taskId, taskTitle, userId, onTimeLogged, className, compact = false }: TaskTimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [totalLoggedTime, setTotalLoggedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startedAtRef = useRef<Date | null>(null);

  // Load saved time from localStorage and fetch logged time
  useEffect(() => {
    const savedData = localStorage.getItem(`task-timer-${taskId}`);
    if (savedData) {
      const { elapsed, running, startTime, startedAt } = JSON.parse(savedData);
      if (running && startTime) {
        const additionalTime = Math.floor((Date.now() - startTime) / 1000);
        setElapsedSeconds(elapsed + additionalTime);
        startTimeRef.current = Date.now();
        startedAtRef.current = startedAt ? new Date(startedAt) : new Date();
        setIsRunning(true);
      } else {
        setElapsedSeconds(elapsed || 0);
        if (startedAt) startedAtRef.current = new Date(startedAt);
      }
    }

    // Fetch total logged time for this task
    fetchTotalLoggedTime();
  }, [taskId]);

  const fetchTotalLoggedTime = async () => {
    const { data } = await supabase
      .from('task_time_logs')
      .select('duration_seconds')
      .eq('task_id', taskId);
    
    if (data) {
      const total = data.reduce((sum, log) => sum + log.duration_seconds, 0);
      setTotalLoggedTime(total);
    }
  };

  // Save to localStorage when state changes
  useEffect(() => {
    localStorage.setItem(`task-timer-${taskId}`, JSON.stringify({
      elapsed: elapsedSeconds,
      running: isRunning,
      startTime: startTimeRef.current,
      startedAt: startedAtRef.current?.toISOString()
    }));
  }, [taskId, elapsedSeconds, isRunning]);

  // Timer interval
  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now() - (elapsedSeconds * 1000);
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (!startedAtRef.current) {
      startedAtRef.current = new Date();
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleStop = async () => {
    setIsRunning(false);
    
    if (elapsedSeconds > 0) {
      // Save to database
      const { error } = await supabase.from('task_time_logs').insert({
        task_id: taskId,
        user_id: userId || null,
        duration_seconds: elapsedSeconds,
        started_at: startedAtRef.current?.toISOString(),
        ended_at: new Date().toISOString()
      });

      if (error) {
        console.error('Error saving time log:', error);
        toast.error('Error al guardar el tiempo');
      } else {
        const formattedTime = formatTime(elapsedSeconds);
        toast.success(`Tiempo guardado: ${formattedTime}`);
        setTotalLoggedTime(prev => prev + elapsedSeconds);
        if (onTimeLogged) {
          onTimeLogged(taskId, elapsedSeconds);
        }
      }
    }
    
    setElapsedSeconds(0);
    startTimeRef.current = null;
    startedAtRef.current = null;
    localStorage.removeItem(`task-timer-${taskId}`);
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {totalLoggedTime > 0 && (
          <span className="text-xs text-muted-foreground mr-1" title="Tiempo total registrado">
            Σ{formatTime(totalLoggedTime)}
          </span>
        )}
        <span className={cn(
          "font-mono text-xs px-2 py-0.5 rounded",
          isRunning ? "bg-primary/20 text-primary animate-pulse" : "bg-muted text-muted-foreground"
        )}>
          {formatTime(elapsedSeconds)}
        </span>
        {!isRunning ? (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={(e) => { e.stopPropagation(); handleStart(); }}
            title="Iniciar cronómetro"
          >
            <Play className="h-3 w-3" />
          </Button>
        ) : (
          <>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={(e) => { e.stopPropagation(); handlePause(); }}
              title="Pausar"
            >
              <Pause className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-destructive" 
              onClick={(e) => { e.stopPropagation(); handleStop(); }}
              title="Detener y guardar"
            >
              <Square className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-2 p-4 rounded-lg border border-border bg-card", className)}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Timer className="h-4 w-4" />
        <span className="text-xs truncate max-w-32">{taskTitle}</span>
      </div>
      {totalLoggedTime > 0 && (
        <span className="text-xs text-muted-foreground">
          Total: {formatTime(totalLoggedTime)}
        </span>
      )}
      <span className={cn(
        "font-mono text-2xl font-bold",
        isRunning && "text-primary animate-pulse"
      )}>
        {formatTime(elapsedSeconds)}
      </span>
      <div className="flex items-center gap-2">
        {!isRunning ? (
          <Button onClick={handleStart} size="sm" className="gap-1">
            <Play className="h-4 w-4" />
            Iniciar
          </Button>
        ) : (
          <Button onClick={handlePause} variant="outline" size="sm" className="gap-1">
            <Pause className="h-4 w-4" />
            Pausar
          </Button>
        )}
        {elapsedSeconds > 0 && (
          <Button onClick={handleStop} variant="destructive" size="sm" className="gap-1">
            <Square className="h-4 w-4" />
            Guardar
          </Button>
        )}
      </div>
    </div>
  );
}
