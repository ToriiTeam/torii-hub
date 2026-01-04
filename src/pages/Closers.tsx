import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Handshake, DollarSign, TrendingUp, Edit2, Trash2, Star, Award, Phone, PhoneCall, Upload, FileAudio, CheckCircle, XCircle, Clock, Target, Percent } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type CloserStage = 'nuevo' | 'entrenamiento' | 'activo' | 'senior' | 'lider';
type CallStatus = 'pendiente' | 'realizada' | 'no_asistio' | 'reagendada' | 'cancelada';

interface Closer {
  id: string;
  name: string;
  avatar?: string;
  stage: CloserStage;
  commitment: number;
  goal: number;
  notes?: string;
}

interface CloserCall {
  id: string;
  closer_id: string;
  lead_name: string;
  lead_email?: string;
  lead_phone?: string;
  first_call_date?: string;
  first_call_status: CallStatus;
  first_call_attended: boolean;
  second_call_date?: string;
  second_call_status?: CallStatus;
  qualified?: boolean;
  objections?: string;
  notes?: string;
  paid: boolean;
  price?: number;
  rescheduled_date?: string;
  last_followup_date?: string;
  next_followup_date?: string;
  followup_notes?: string;
  followup_count: number;
}

interface CallRecording {
  id: string;
  call_id?: string;
  closer_id?: string;
  file_name: string;
  file_url?: string;
  file_size?: number;
  duration?: number;
  uploaded_at: string;
}

const stageLabels: Record<CloserStage, string> = {
  nuevo: 'Nuevo',
  entrenamiento: 'En Entrenamiento',
  activo: 'Activo',
  senior: 'Senior',
  lider: 'Líder'
};

const stageColors: Record<CloserStage, string> = {
  nuevo: 'bg-muted text-muted-foreground',
  entrenamiento: 'bg-info/20 text-info',
  activo: 'bg-success/20 text-success',
  senior: 'bg-warning/20 text-warning',
  lider: 'bg-primary/20 text-primary'
};

const statusLabels: Record<CallStatus, string> = {
  pendiente: 'Pendiente',
  realizada: 'Realizada',
  no_asistio: 'No Asistió',
  reagendada: 'Reagendada',
  cancelada: 'Cancelada'
};

const statusIcons: Record<CallStatus, React.ReactNode> = {
  pendiente: <Clock className="h-4 w-4 text-warning" />,
  realizada: <CheckCircle className="h-4 w-4 text-success" />,
  no_asistio: <XCircle className="h-4 w-4 text-destructive" />,
  reagendada: <Clock className="h-4 w-4 text-info" />,
  cancelada: <XCircle className="h-4 w-4 text-muted-foreground" />
};

export default function Closers() {
  const [closers, setClosers] = useState<Closer[]>([]);
  const [calls, setCalls] = useState<CloserCall[]>([]);
  const [recordings, setRecordings] = useState<CallRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCloserDialogOpen, setIsCloserDialogOpen] = useState(false);
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [editingCloser, setEditingCloser] = useState<Closer | null>(null);
  const [editingCall, setEditingCall] = useState<CloserCall | null>(null);
  const [selectedCloserId, setSelectedCloserId] = useState<string | null>(null);
  const [uploadingCallId, setUploadingCallId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [closerForm, setCloserForm] = useState({
    name: '',
    stage: 'nuevo' as CloserStage,
    commitment: '3',
    goal: '50000',
    notes: ''
  });

  const [callForm, setCallForm] = useState({
    closer_id: '',
    lead_name: '',
    lead_email: '',
    lead_phone: '',
    first_call_date: '',
    first_call_status: 'pendiente' as CallStatus,
    first_call_attended: false,
    second_call_date: '',
    second_call_status: '' as CallStatus | '' | 'none',
    rescheduled_date: '',
    qualified: false,
    objections: '',
    notes: '',
    paid: false,
    price: '',
    last_followup_date: '',
    next_followup_date: '',
    followup_notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [closersRes, callsRes, recordingsRes] = await Promise.all([
      supabase.from('closers').select('*').order('name'),
      supabase.from('closer_calls').select('*').order('first_call_date', { ascending: false }),
      supabase.from('call_recordings').select('*').order('uploaded_at', { ascending: false })
    ]);
    
    if (closersRes.data) setClosers(closersRes.data as Closer[]);
    if (callsRes.data) setCalls(callsRes.data.map(c => ({ ...c, followup_count: c.followup_count || 0 })) as CloserCall[]);
    if (recordingsRes.data) setRecordings(recordingsRes.data as CallRecording[]);
    setLoading(false);
  };

  // Métricas de Closing
  const totalCalls = calls.length;
  const totalAttended = calls.filter(c => c.first_call_attended).length;
  const totalQualified = calls.filter(c => c.qualified).length;
  const totalClosed = calls.filter(c => c.paid).length;
  const totalValue = calls.filter(c => c.paid).reduce((sum, c) => sum + (c.price || 0), 0);
  
  // Show Up Rate: % de llamadas atendidas
  const showUpRate = totalCalls > 0 ? Math.round((totalAttended / totalCalls) * 100) : 0;
  
  // Close Rate: % de cierres sobre llamadas atendidas
  const closeRate = totalAttended > 0 ? Math.round((totalClosed / totalAttended) * 100) : 0;
  
  // AOV (Average Order Value): Valor promedio de cierre
  const aov = totalClosed > 0 ? Math.round(totalValue / totalClosed) : 0;
  
  // Qualification Rate: % de calificados sobre atendidos
  const qualificationRate = totalAttended > 0 ? Math.round((totalQualified / totalAttended) * 100) : 0;

  const getCloserMetrics = (closerId: string) => {
    const closerCalls = calls.filter(c => c.closer_id === closerId);
    const firstCalls = closerCalls.filter(c => c.first_call_attended).length;
    const secondCalls = closerCalls.filter(c => c.second_call_status === 'realizada').length;
    const qualified = closerCalls.filter(c => c.qualified).length;
    const closed = closerCalls.filter(c => c.paid).length;
    const totalValue = closerCalls.filter(c => c.paid).reduce((sum, c) => sum + (c.price || 0), 0);
    const showUp = closerCalls.length > 0 ? Math.round((firstCalls / closerCalls.length) * 100) : 0;
    const closeRt = firstCalls > 0 ? Math.round((closed / firstCalls) * 100) : 0;
    return { firstCalls, secondCalls, qualified, closed, totalValue, showUp, closeRate: closeRt };
  };

  const avgCommitment = closers.length ? (closers.reduce((sum, c) => sum + c.commitment, 0) / closers.length).toFixed(1) : '0';

  const handleCloserSubmit = async () => {
    if (!closerForm.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    const data = {
      name: closerForm.name,
      stage: closerForm.stage,
      commitment: parseInt(closerForm.commitment) || 3,
      goal: parseInt(closerForm.goal) || 50000,
      notes: closerForm.notes || null
    };

    if (editingCloser) {
      const { error } = await supabase.from('closers').update(data).eq('id', editingCloser.id);
      if (error) { toast.error('Error al actualizar'); return; }
      toast.success('Closer actualizado');
    } else {
      const { error } = await supabase.from('closers').insert(data);
      if (error) { toast.error('Error al crear'); return; }
      toast.success('Closer agregado');
    }
    
    resetCloserForm();
    fetchData();
  };

  const resetCloserForm = () => {
    setCloserForm({ name: '', stage: 'nuevo', commitment: '3', goal: '50000', notes: '' });
    setEditingCloser(null);
    setIsCloserDialogOpen(false);
  };

  const editCloser = (closer: Closer) => {
    setEditingCloser(closer);
    setCloserForm({
      name: closer.name,
      stage: closer.stage,
      commitment: closer.commitment.toString(),
      goal: closer.goal.toString(),
      notes: closer.notes || ''
    });
    setIsCloserDialogOpen(true);
  };

  const deleteCloser = async (id: string) => {
    const { error } = await supabase.from('closers').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar'); return; }
    toast.success('Closer eliminado');
    fetchData();
  };

  const handleCallSubmit = async () => {
    if (!callForm.closer_id) {
      toast.error('Debes seleccionar un closer');
      return;
    }
    if (!callForm.lead_name.trim()) {
      toast.error('El nombre del lead es requerido');
      return;
    }

    const data = {
      closer_id: callForm.closer_id,
      lead_name: callForm.lead_name,
      lead_email: callForm.lead_email || null,
      lead_phone: callForm.lead_phone || null,
      first_call_date: callForm.first_call_date || null,
      first_call_status: callForm.first_call_status as CallStatus,
      first_call_attended: callForm.first_call_attended,
      second_call_date: callForm.second_call_date || null,
      second_call_status: ['none', ''].includes(callForm.second_call_status) ? null : callForm.second_call_status as CallStatus,
      rescheduled_date: callForm.rescheduled_date || null,
      qualified: callForm.qualified,
      objections: callForm.objections || null,
      notes: callForm.notes || null,
      paid: callForm.paid,
      price: callForm.price ? parseFloat(callForm.price) : null,
      last_followup_date: callForm.last_followup_date || null,
      next_followup_date: callForm.next_followup_date || null,
      followup_notes: callForm.followup_notes || null,
      followup_count: editingCall ? (editingCall.followup_count || 0) + (callForm.last_followup_date && callForm.last_followup_date !== editingCall.last_followup_date ? 1 : 0) : 0
    };

    if (editingCall) {
      const { error } = await supabase.from('closer_calls').update(data).eq('id', editingCall.id);
      if (error) { 
        console.error('Error updating call:', error);
        toast.error('Error al actualizar: ' + error.message); 
        return; 
      }
      toast.success('Llamada actualizada');
    } else {
      const { error } = await supabase.from('closer_calls').insert(data);
      if (error) { 
        console.error('Error creating call:', error);
        toast.error('Error al crear: ' + error.message); 
        return; 
      }
      toast.success('Llamada registrada');
    }
    
    resetCallForm();
    fetchData();
  };

  const resetCallForm = () => {
    setCallForm({
      closer_id: selectedCloserId || '',
      lead_name: '',
      lead_email: '',
      lead_phone: '',
      first_call_date: '',
      first_call_status: 'pendiente',
      first_call_attended: false,
      second_call_date: '',
      second_call_status: '',
      rescheduled_date: '',
      qualified: false,
      objections: '',
      notes: '',
      paid: false,
      price: '',
      last_followup_date: '',
      next_followup_date: '',
      followup_notes: ''
    });
    setEditingCall(null);
    setIsCallDialogOpen(false);
  };

  const editCall = (call: CloserCall) => {
    setEditingCall(call);
    setCallForm({
      closer_id: call.closer_id,
      lead_name: call.lead_name,
      lead_email: call.lead_email || '',
      lead_phone: call.lead_phone || '',
      first_call_date: call.first_call_date ? call.first_call_date.slice(0, 16) : '',
      first_call_status: call.first_call_status,
      first_call_attended: call.first_call_attended,
      second_call_date: call.second_call_date ? call.second_call_date.slice(0, 16) : '',
      second_call_status: call.second_call_status || '',
      rescheduled_date: call.rescheduled_date ? call.rescheduled_date.slice(0, 16) : '',
      qualified: call.qualified || false,
      objections: call.objections || '',
      notes: call.notes || '',
      paid: call.paid,
      price: call.price?.toString() || '',
      last_followup_date: call.last_followup_date ? call.last_followup_date.slice(0, 16) : '',
      next_followup_date: call.next_followup_date ? call.next_followup_date.slice(0, 16) : '',
      followup_notes: call.followup_notes || ''
    });
    setIsCallDialogOpen(true);
  };

  const deleteCall = async (id: string) => {
    const { error } = await supabase.from('closer_calls').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar'); return; }
    toast.success('Llamada eliminada');
    fetchData();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingCallId) return;

    const call = calls.find(c => c.id === uploadingCallId);
    if (!call) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${uploadingCallId}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('call-recordings')
      .upload(fileName, file);

    if (uploadError) {
      toast.error('Error al subir archivo');
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('call-recordings')
      .getPublicUrl(fileName);

    const { error } = await supabase.from('call_recordings').insert({
      call_id: uploadingCallId,
      closer_id: call.closer_id,
      file_name: file.name,
      file_url: publicUrl,
      file_size: file.size
    });

    if (error) {
      toast.error('Error al guardar registro');
      return;
    }

    toast.success('Grabación subida');
    setUploadingCallId(null);
    fetchData();
  };

  const deleteRecording = async (id: string, fileName: string) => {
    await supabase.storage.from('call-recordings').remove([fileName]);
    const { error } = await supabase.from('call_recordings').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar'); return; }
    toast.success('Grabación eliminada');
    fetchData();
  };

  const renderCommitmentStars = (value: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={cn("h-3 w-3", i <= value ? "fill-warning text-warning" : "text-muted-foreground/30")} />
      ))}
    </div>
  );

  const filteredCalls = selectedCloserId ? calls.filter(c => c.closer_id === selectedCloserId) : calls;
  const filteredRecordings = selectedCloserId ? recordings.filter(r => r.closer_id === selectedCloserId) : recordings;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Closers</h1>
          <p className="text-muted-foreground">Métricas de ventas, llamadas y grabaciones</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCallDialogOpen} onOpenChange={(open) => { setIsCallDialogOpen(open); if (!open) resetCallForm(); }}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => setCallForm(prev => ({ ...prev, closer_id: selectedCloserId || '' }))}>
                <PhoneCall className="h-4 w-4 mr-2" />Registrar Llamada
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingCall ? 'Editar' : 'Registrar'} Llamada</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Closer *</Label>
                    <Select value={callForm.closer_id} onValueChange={v => setCallForm({ ...callForm, closer_id: v })}>
                      <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Seleccionar closer" /></SelectTrigger>
                      <SelectContent>
                        {closers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Nombre del Lead *</Label>
                    <Input value={callForm.lead_name} onChange={e => setCallForm({ ...callForm, lead_name: e.target.value })} className="bg-secondary/50" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={callForm.lead_email} onChange={e => setCallForm({ ...callForm, lead_email: e.target.value })} className="bg-secondary/50" />
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <Input value={callForm.lead_phone} onChange={e => setCallForm({ ...callForm, lead_phone: e.target.value })} className="bg-secondary/50" />
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Primera Llamada</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Fecha Agendada</Label>
                      <Input type="datetime-local" value={callForm.first_call_date} onChange={e => setCallForm({ ...callForm, first_call_date: e.target.value })} className="bg-secondary/50" />
                    </div>
                    <div>
                      <Label>Estado</Label>
                      <Select value={callForm.first_call_status} onValueChange={v => setCallForm({ ...callForm, first_call_status: v as CallStatus })}>
                        <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={callForm.first_call_attended} onCheckedChange={(c) => setCallForm({ ...callForm, first_call_attended: !!c })} />
                      <Label className="cursor-pointer">Atendida</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={callForm.qualified} onCheckedChange={(c) => setCallForm({ ...callForm, qualified: !!c })} />
                      <Label className="cursor-pointer">Calificado</Label>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Segunda Llamada / Reagendamiento</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Fecha Reagendada</Label>
                      <Input type="datetime-local" value={callForm.rescheduled_date} onChange={e => setCallForm({ ...callForm, rescheduled_date: e.target.value })} className="bg-secondary/50" />
                    </div>
                    <div>
                      <Label>Segunda Llamada</Label>
                      <Input type="datetime-local" value={callForm.second_call_date} onChange={e => setCallForm({ ...callForm, second_call_date: e.target.value })} className="bg-secondary/50" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <Label>Estado 2da Llamada</Label>
                    <Select value={callForm.second_call_status} onValueChange={v => setCallForm({ ...callForm, second_call_status: v as CallStatus })}>
                      <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Sin segunda llamada" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin segunda llamada</SelectItem>
                        {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Seguimientos</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Último Seguimiento</Label>
                      <Input type="datetime-local" value={callForm.last_followup_date} onChange={e => setCallForm({ ...callForm, last_followup_date: e.target.value })} className="bg-secondary/50" />
                    </div>
                    <div>
                      <Label>Próximo Seguimiento</Label>
                      <Input type="datetime-local" value={callForm.next_followup_date} onChange={e => setCallForm({ ...callForm, next_followup_date: e.target.value })} className="bg-secondary/50" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <Label>Notas de Seguimiento</Label>
                    <Textarea value={callForm.followup_notes} onChange={e => setCallForm({ ...callForm, followup_notes: e.target.value })} className="bg-secondary/50" placeholder="Notas del seguimiento..." />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Cierre</h4>
                  <div className="flex items-center gap-2 mb-3">
                    <Checkbox checked={callForm.paid} onCheckedChange={(c) => setCallForm({ ...callForm, paid: !!c })} />
                    <Label className="cursor-pointer">Pagado / Cerrado</Label>
                  </div>
                  {callForm.paid && (
                    <div>
                      <Label>Precio ($)</Label>
                      <Input type="number" value={callForm.price} onChange={e => setCallForm({ ...callForm, price: e.target.value })} className="bg-secondary/50" placeholder="Valor del cierre" />
                    </div>
                  )}
                </div>

                <div>
                  <Label>Objeciones</Label>
                  <Textarea value={callForm.objections} onChange={e => setCallForm({ ...callForm, objections: e.target.value })} className="bg-secondary/50" placeholder="Objeciones del lead..." />
                </div>
                <div>
                  <Label>Notas</Label>
                  <Textarea value={callForm.notes} onChange={e => setCallForm({ ...callForm, notes: e.target.value })} className="bg-secondary/50" placeholder="Observaciones..." />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={resetCallForm}>Cancelar</Button>
                  <Button onClick={handleCallSubmit} className="bg-primary">{editingCall ? 'Guardar' : 'Registrar'}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isCloserDialogOpen} onOpenChange={(open) => { setIsCloserDialogOpen(open); if (!open) resetCloserForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-primary"><Plus className="h-4 w-4 mr-2" />Agregar Closer</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-md">
              <DialogHeader><DialogTitle>{editingCloser ? 'Editar' : 'Agregar'} Closer</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Nombre *</Label>
                  <Input value={closerForm.name} onChange={e => setCloserForm({ ...closerForm, name: e.target.value })} className="bg-secondary/50" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Etapa</Label>
                    <Select value={closerForm.stage} onValueChange={v => setCloserForm({ ...closerForm, stage: v as CloserStage })}>
                      <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(stageLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Compromiso (1-5)</Label>
                    <Input type="number" min="1" max="5" value={closerForm.commitment} onChange={e => setCloserForm({ ...closerForm, commitment: e.target.value })} className="bg-secondary/50" />
                  </div>
                </div>
                <div>
                  <Label>Meta ($)</Label>
                  <Input type="number" value={closerForm.goal} onChange={e => setCloserForm({ ...closerForm, goal: e.target.value })} className="bg-secondary/50" />
                </div>
                <div>
                  <Label>Notas</Label>
                  <Input value={closerForm.notes} onChange={e => setCloserForm({ ...closerForm, notes: e.target.value })} placeholder="Observaciones..." className="bg-secondary/50" />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={resetCloserForm}>Cancelar</Button>
                  <Button onClick={handleCloserSubmit} className="bg-primary">{editingCloser ? 'Guardar' : 'Agregar'}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards - Métricas de Closing */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <Phone className="h-6 w-6 mx-auto mb-1 text-info" />
            <p className="text-xl font-bold">{totalCalls}</p>
            <p className="text-xs text-muted-foreground">Llamadas</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <Target className="h-6 w-6 mx-auto mb-1 text-warning" />
            <p className="text-xl font-bold">{showUpRate}%</p>
            <p className="text-xs text-muted-foreground">Show Up Rate</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <Handshake className="h-6 w-6 mx-auto mb-1 text-info" />
            <p className="text-xl font-bold">{totalQualified}</p>
            <p className="text-xs text-muted-foreground">Calificados</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <Percent className="h-6 w-6 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold">{qualificationRate}%</p>
            <p className="text-xs text-muted-foreground">Qual. Rate</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-1 text-success" />
            <p className="text-xl font-bold">{totalClosed}</p>
            <p className="text-xs text-muted-foreground">Cierres</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <Percent className="h-6 w-6 mx-auto mb-1 text-success" />
            <p className="text-xl font-bold">{closeRate}%</p>
            <p className="text-xs text-muted-foreground">Close Rate</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold">${aov.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">AOV</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 mx-auto mb-1 text-success" />
            <p className="text-xl font-bold">${totalValue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Ventas</p>
          </CardContent>
        </Card>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="audio/*,video/*" onChange={handleFileUpload} />

      <Tabs defaultValue="closers" className="space-y-4">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="closers">Closers</TabsTrigger>
          <TabsTrigger value="calls">Llamadas</TabsTrigger>
          <TabsTrigger value="recordings">Grabaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="closers" className="space-y-4">
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-base">Performance por Closer</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={closers.map(c => {
                    const m = getCloserMetrics(c.id);
                    return { name: c.name.split(' ')[0], llamadas: m.firstCalls, cierres: m.closed, valor: m.totalValue / 1000 };
                  })}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="llamadas" fill="hsl(var(--info))" name="Llamadas" />
                    <Bar dataKey="cierres" fill="hsl(var(--success))" name="Cierres" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {closers.map((closer, i) => {
              const m = getCloserMetrics(closer.id);
              return (
                <Card key={closer.id} className={cn("bg-card border-border/50 cursor-pointer transition-all", selectedCloserId === closer.id && "ring-2 ring-primary")} onClick={() => setSelectedCloserId(selectedCloserId === closer.id ? null : closer.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-warning/20 flex items-center justify-center text-lg font-bold">
                        {closer.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{closer.name}</h3>
                          <Badge className="bg-warning/20 text-warning border-0 text-xs">#{i + 1}</Badge>
                          <Badge className={cn('text-xs border-0', stageColors[closer.stage])}>{stageLabels[closer.stage]}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{m.firstCalls} llamadas</span>
                          <span>{m.showUp}% show up</span>
                          <span>{m.qualified} calificados</span>
                          <span>{m.closed} cierres</span>
                          <span>{m.closeRate}% close rate</span>
                          <span>${m.totalValue.toLocaleString()}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs">Compromiso:</span>
                            {renderCommitmentStars(closer.commitment)}
                          </div>
                        </div>
                        {closer.notes && <p className="text-xs text-muted-foreground mt-1 italic">{closer.notes}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground mb-1">Meta: ${closer.goal.toLocaleString()}</p>
                        <Progress value={(m.totalValue / closer.goal) * 100} className="h-2 w-32" />
                        <p className="text-xs text-muted-foreground mt-1">{((m.totalValue / closer.goal) * 100).toFixed(0)}%</p>
                      </div>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editCloser(closer)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteCloser(closer.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {closers.length === 0 && (
              <Card className="bg-card border-border/50">
                <CardContent className="p-8 text-center text-muted-foreground">
                  No hay closers. Agrega uno para comenzar.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="calls" className="space-y-4">
          {selectedCloserId && (
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline">Filtrado por: {closers.find(c => c.id === selectedCloserId)?.name}</Badge>
              <Button variant="ghost" size="sm" onClick={() => setSelectedCloserId(null)}>Limpiar filtro</Button>
            </div>
          )}
          <Card className="bg-card border-border/50">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Closer</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>F. Agendada</TableHead>
                    <TableHead>1ra Llamada</TableHead>
                    <TableHead>Calificó</TableHead>
                    <TableHead>Reagendó</TableHead>
                    <TableHead>2da Llamada</TableHead>
                    <TableHead>Últ. Seguim.</TableHead>
                    <TableHead>Próx. Seguim.</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCalls.map(call => {
                    const closer = closers.find(c => c.id === call.closer_id);
                    return (
                      <TableRow key={call.id}>
                        <TableCell className="font-medium">{closer?.name || '-'}</TableCell>
                        <TableCell>
                          <div>{call.lead_name}</div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{call.lead_email || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{call.lead_phone || '-'}</TableCell>
                        <TableCell>
                          {call.first_call_date ? format(new Date(call.first_call_date), "dd/MM HH:mm") : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {statusIcons[call.first_call_status]}
                            <span className="text-xs">{call.first_call_attended ? 'Sí' : 'No'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {call.qualified ? (
                            <Badge className="bg-success/20 text-success border-0 text-xs">Sí</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">No</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {call.rescheduled_date ? (
                            <span className="text-xs">{format(new Date(call.rescheduled_date), "dd/MM HH:mm")}</span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {call.second_call_date && call.second_call_status ? (
                            <div className="flex items-center gap-1">
                              {statusIcons[call.second_call_status]}
                              <span className="text-xs">{format(new Date(call.second_call_date), "dd/MM")}</span>
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {call.last_followup_date ? (
                            <span className="text-xs">{format(new Date(call.last_followup_date), "dd/MM")}</span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {call.next_followup_date ? (
                            <span className="text-xs text-warning">{format(new Date(call.next_followup_date), "dd/MM")}</span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {call.paid ? (
                            <Badge className="bg-success/20 text-success border-0">Cerrado</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">{statusLabels[call.first_call_status]}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {call.paid && call.price ? `$${call.price.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setUploadingCallId(call.id); fileInputRef.current?.click(); }}>
                              <Upload className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editCall(call)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteCall(call.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredCalls.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">
                        No hay llamadas registradas
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recordings" className="space-y-4">
          {selectedCloserId && (
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline">Filtrado por: {closers.find(c => c.id === selectedCloserId)?.name}</Badge>
              <Button variant="ghost" size="sm" onClick={() => setSelectedCloserId(null)}>Limpiar filtro</Button>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRecordings.map(rec => {
              const closer = closers.find(c => c.id === rec.closer_id);
              const call = calls.find(c => c.id === rec.call_id);
              return (
                <Card key={rec.id} className="bg-card border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <FileAudio className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{rec.file_name}</p>
                        <p className="text-sm text-muted-foreground">{closer?.name}</p>
                        {call && <p className="text-xs text-muted-foreground">Lead: {call.lead_name}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(rec.uploaded_at), "dd MMM yyyy", { locale: es })}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {rec.file_url && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={rec.file_url} target="_blank" rel="noopener noreferrer">
                              <FileAudio className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteRecording(rec.id, rec.file_name)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filteredRecordings.length === 0 && (
              <Card className="bg-card border-border/50 col-span-full">
                <CardContent className="p-8 text-center text-muted-foreground">
                  No hay grabaciones
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
