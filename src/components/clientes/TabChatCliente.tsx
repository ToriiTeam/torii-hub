import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { initials } from '@/lib/academia';
import { CalendarClock, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Client } from '@/pages/ClienteDetalle';

interface Props {
  client: Client;
}

interface ChatMessageRow {
  id: string;
  client_id: string;
  sender_type: 'staff' | 'client' | 'system';
  sender_name: string;
  sender_user_id: string | null;
  texto: string;
  related_call_id: string | null;
  created_at: string;
}

interface CloserCallRow {
  id: string;
  lead_name: string | null;
  fecha_llamada: string | null;
  hora_llamada: string | null;
  estado_cita: string | null;
  cancelada: boolean;
}

// Solo estos dos valores de estado_cita mapean a "Confirmada" — el resto
// (new/null/cualquier otro) cae en "Pendiente". cancelada=true siempre
// gana y muestra "Cancelada" sin importar estado_cita.
const ESTADO_CONFIRMADO = new Set(['confirmed', 'showed']);

function pillEstado(call: CloserCallRow): { label: string; className: string } {
  if (call.cancelada) return { label: 'Cancelada', className: 'bg-destructive/12 text-destructive' };
  if (call.estado_cita && ESTADO_CONFIRMADO.has(call.estado_cita)) {
    return { label: 'Confirmada', className: 'bg-emerald-500/12 text-emerald-500' };
  }
  return { label: 'Pendiente', className: 'bg-amber-500/12 text-amber-500' };
}

function formatCallDate(call: CloserCallRow): string {
  if (!call.fecha_llamada) return 'Sin fecha';
  const fecha = format(parseISO(call.fecha_llamada), "d MMM", { locale: es });
  return call.hora_llamada ? `${fecha} · ${call.hora_llamada}` : fecha;
}

function dayLabel(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d)) return 'Hoy';
  if (isYesterday(d)) return 'Ayer';
  return format(d, "EEEE d 'de' MMMM", { locale: es });
}

export default function TabChatCliente({ client }: Props) {
  const { session, profile } = useAuth();
  const clientId = client.id;
  const userId = session?.user?.id ?? null;

  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [calls, setCalls] = useState<CloserCallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [msgsRes, callsRes] = await Promise.all([
        supabase
          .from('chat_messages')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: true }),
        supabase
          .from('client_closer_calls')
          .select('id, lead_name, fecha_llamada, hora_llamada, estado_cita, cancelada')
          .eq('client_id', clientId)
          .order('fecha_llamada', { ascending: false, nullsFirst: false })
          .order('hora_llamada', { ascending: false, nullsFirst: false })
          .limit(8),
      ]);
      if (msgsRes.error) console.error('[TabChatCliente] load messages failed:', msgsRes.error.message);
      if (callsRes.error) console.error('[TabChatCliente] load calls failed:', callsRes.error.message);
      setMessages((msgsRes.data as ChatMessageRow[] | null) ?? []);
      setCalls((callsRes.data as CloserCallRow[] | null) ?? []);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Realtime: INSERT/DELETE de chat_messages de este cliente. El filtro
  // client_id=eq.<id> scopea la suscripción — nunca recibe mensajes de otro
  // cliente. El insert propio ya está en pantalla por el optimista de
  // handleSend, así que acá se evita duplicarlo comparando por id.
  useEffect(() => {
    const channel = supabase
      .channel(`chat_messages:${clientId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `client_id=eq.${clientId}` },
        (payload) => {
          const row = payload.new as ChatMessageRow;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
          // Un mensaje de sistema nuevo puede traer related_call_id de una
          // cita que la carga inicial de `calls` todavía no tiene (recién
          // upserteada por el webhook) — refresca la agenda para que el
          // highlight coordinado tenga la card disponible.
          if (row.sender_type === 'system' && row.related_call_id) {
            supabase
              .from('client_closer_calls')
              .select('id, lead_name, fecha_llamada, hora_llamada, estado_cita, cancelada')
              .eq('client_id', clientId)
              .order('fecha_llamada', { ascending: false, nullsFirst: false })
              .order('hora_llamada', { ascending: false, nullsFirst: false })
              .limit(8)
              .then(({ data }) => { if (data) setCalls(data as CloserCallRow[]); });
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_messages', filter: `client_id=eq.${clientId}` },
        (payload) => {
          const oldRow = payload.old as { id: string };
          setMessages((prev) => prev.filter((m) => m.id !== oldRow.id));
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clientId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const lastSystemCallId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.sender_type === 'system' && m.related_call_id) return m.related_call_id;
    }
    return null;
  }, [messages]);

  const groupedByDay = useMemo(() => {
    const groups: { day: string; items: ChatMessageRow[] }[] = [];
    for (const msg of messages) {
      const dayKey = msg.created_at.slice(0, 10);
      const last = groups[groups.length - 1];
      if (last && last.day === dayKey) last.items.push(msg);
      else groups.push({ day: dayKey, items: [msg] });
    }
    return groups;
  }, [messages]);

  async function handleSend() {
    const trimmed = texto.trim();
    if (!trimmed || !userId) return;
    setSending(true);
    const senderName = profile?.name || session?.user?.email || 'Staff';
    // Insert optimista — no se espera el roundtrip de Realtime para que el
    // propio mensaje aparezca. La suscripción de arriba lo deduplica por id
    // cuando el evento INSERT llegue.
    const optimistic: ChatMessageRow = {
      id: `optimistic-${Date.now()}`,
      client_id: clientId,
      sender_type: 'staff',
      sender_name: senderName,
      sender_user_id: userId,
      texto: trimmed,
      related_call_id: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setTexto('');
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({ client_id: clientId, sender_type: 'staff', sender_name: senderName, sender_user_id: userId, texto: trimmed })
        .select('*')
        .single();
      if (error) throw error;
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? (data as ChatMessageRow) : m)));
    } catch (err) {
      console.error('[TabChatCliente] send failed:', err);
      toast.error('No se pudo enviar el mensaje');
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(id: string) {
    const prev = messages;
    setMessages((cur) => cur.filter((m) => m.id !== id));
    const { error } = await supabase.from('chat_messages').delete().eq('id', id);
    if (error) {
      console.error('[TabChatCliente] delete failed:', error.message);
      toast.error('No se pudo borrar el mensaje');
      setMessages(prev);
    }
  }

  const proximas7dias = useMemo(() => {
    const now = new Date();
    const limite = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return calls.filter((c) => {
      if (!c.fecha_llamada || c.cancelada) return false;
      const d = parseISO(c.fecha_llamada);
      return d >= now && d <= limite;
    }).length;
  }, [calls]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-5">
        <div className="h-[560px] rounded-2xl bg-secondary/40 animate-pulse" />
        <div className="h-[560px] rounded-2xl bg-secondary/40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-5 items-start">
      {/* Columna izquierda — chat */}
      <Card className="flex flex-col h-[640px]">
        <CardHeader className="flex-row items-center gap-3 border-b border-border/50 pb-3.5">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{initials(client.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">Equipo · {client.name}</p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              En tiempo real
            </div>
          </div>
        </CardHeader>

        <CardContent ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-4">
          {groupedByDay.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Todavía no hay mensajes en este chat.</p>
          ) : (
            groupedByDay.map((group) => (
              <div key={group.day} className="space-y-3">
                <div className="flex items-center justify-center">
                  <span className="text-[11px] font-semibold text-muted-foreground bg-secondary/60 rounded-full px-3 py-0.5">
                    {dayLabel(group.day)}
                  </span>
                </div>
                {group.items.map((msg) => (
                  <ChatBubble
                    key={msg.id}
                    msg={msg}
                    isOwn={msg.sender_user_id === userId}
                    highlighted={msg.sender_type === 'system' && msg.related_call_id === lastSystemCallId}
                    onDelete={() => handleDelete(msg.id)}
                  />
                ))}
              </div>
            ))
          )}
        </CardContent>

        <div className="border-t border-border/50 p-3.5 flex items-end gap-2">
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Escribí un mensaje…"
            className="min-h-[40px] max-h-[120px] resize-none bg-secondary/50"
          />
          <Button onClick={handleSend} disabled={!texto.trim() || sending} size="icon" className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Columna derecha — agenda automática */}
      <Card className="h-[640px] flex flex-col">
        <CardHeader className="flex-row items-center justify-between border-b border-border/50 pb-3.5">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Agenda automática</p>
          </div>
          <Badge variant="secondary">{proximas7dias} próx. 7 días</Badge>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto py-4 space-y-2.5">
          {calls.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Sin citas registradas para este cliente.</p>
          ) : (
            calls.map((call) => {
              const pill = pillEstado(call);
              const highlighted = call.id === lastSystemCallId;
              return (
                <div
                  key={call.id}
                  className={cn(
                    'rounded-xl border border-border/50 bg-secondary/30 p-3 flex items-start gap-2.5',
                    highlighted && 'border-amber-500/50 bg-amber-500/[0.06]',
                  )}
                >
                  <CalendarClock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{call.lead_name || 'Sin nombre'}</p>
                    <p className="text-xs text-muted-foreground">{formatCallDate(call)}</p>
                  </div>
                  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0', pill.className)}>
                    {pill.label}
                  </span>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ChatBubble({
  msg, isOwn, highlighted, onDelete,
}: { msg: ChatMessageRow; isOwn: boolean; highlighted: boolean; onDelete: () => void }) {
  const isSystem = msg.sender_type === 'system';

  return (
    <div className={cn('group flex items-start gap-2', isOwn && !isSystem && 'flex-row-reverse')}>
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback
          className={cn(
            'text-[10px] font-bold',
            isSystem ? 'bg-amber-500/15 text-amber-500' : isOwn ? 'bg-primary/15 text-primary' : 'bg-secondary text-secondary-foreground',
          )}
        >
          {isSystem ? '🤖' : initials(msg.sender_name)}
        </AvatarFallback>
      </Avatar>

      <div className={cn('flex flex-col max-w-[75%]', isOwn && !isSystem && 'items-end')}>
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[11px] text-muted-foreground font-medium">{msg.sender_name}</span>
          {isSystem && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-amber-500/15 text-amber-600 border-amber-500/30">
              IA
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground/60">{format(parseISO(msg.created_at), 'HH:mm')}</span>
        </div>

        <div className="relative">
          <div
            className={cn(
              'rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
              isSystem
                ? cn('bg-amber-500/10 border border-amber-500/25 text-foreground', highlighted && 'ring-1 ring-amber-500/60')
                : isOwn
                  ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground',
            )}
          >
            {msg.texto}
          </div>

          {isOwn && !isSystem && (
            <button
              onClick={onDelete}
              className="absolute -left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              aria-label="Borrar mensaje"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
