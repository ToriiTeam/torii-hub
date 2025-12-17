// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'socio';
  avatar?: string;
}

// ========== CLIENT TYPES (Sheet 1 - Clientes/Pagos) ==========
export type OfferType = 'DWY' | 'DFY';
export type ClientStatus = 'activo' | 'pausado' | 'finalizado' | 'cancelado';
export type PaymentType = 'Upfront' | 'Mensual' | 'Cuotas';
export type PaymentPlatform = 'Stripe' | 'Binance' | 'Transfer';

export interface Client {
  id: string;
  name: string;
  offerType: OfferType;
  startDate: string;
  endDate?: string;
  status: ClientStatus;
  paymentType: PaymentType;
  totalInstallments: number;
  paidInstallments: number;
  installmentAmount: number;
  nextDueDate?: string;
  platform: PaymentPlatform;
  platformFee: number;
  country: string;
  notes?: string;
  email?: string;
  phone?: string;
}

// ========== TIME AUDIT TASK TYPES (Sheet 2 - Auditoría de Tiempo) ==========
export type TaskCategory = '1-Admin' | '2-Técnico' | '3-Manager' | '4-Ejecutivo';
export type EnergyLevel = 'Me Da Energía' | 'Neutral' | 'Me Quita Energía';
export type DelegationDecision = 'X' | 'S+D' | 'D';

export interface TimeAuditTask {
  id: string;
  taskName: string;
  hoursPerWeek: string; // Format: "H:MM"
  category: TaskCategory;
  energy: EnergyLevel;
  knowledge: number; // 1-5
  impact: number; // 1-5
  delegationCost: number; // 1-5
  score: number; // Calculated sum
  xds: DelegationDecision;
  newOwner?: string;
  processesToCreate?: string;
}

// ========== STRATEGIC TASK TYPES (Sheet 3 - Tareas Estratégicas) ==========
export interface StrategicTask {
  id: string;
  title: string;
  description?: string;
  deadline?: string;
  completed: boolean;
}

// ========== LEGACY TASK TYPE (for compatibility) ==========
export type TaskPriority = 'alta' | 'media' | 'baja';
export type TaskStatus = 'pendiente' | 'en_progreso' | 'completada';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  responsibleId: string;
  dueDate: string;
  tags: string[];
  createdAt: string;
  clientId?: string;
}

// Finance types
export interface FixedCost {
  id: string;
  name: string;
  amount: number;
  frequency: 'mensual' | 'anual';
  category: string;
  paymentDate: number;
}

export interface VariableCost {
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string;
  description: string;
}

export interface Income {
  id: string;
  source: string;
  amount: number;
  date: string;
  clientId?: string;
  type: 'unico' | 'recurrente';
}

export interface Payment {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  status: 'pendiente' | 'pagado';
  paidDate?: string;
  type: 'cobrar' | 'pagar';
}

// Setter types
export interface Setter {
  id: string;
  name: string;
  avatar?: string;
  metrics: {
    calls: number;
    leads: number;
    appointments: number;
    confirmed: number;
  };
  goal: number;
}

export interface SetterActivity {
  id: string;
  setterId: string;
  type: 'call' | 'lead' | 'appointment' | 'confirmed';
  date: string;
  notes?: string;
}

// Closer types
export interface Closer {
  id: string;
  name: string;
  avatar?: string;
  metrics: {
    meetings: number;
    proposals: number;
    closed: number;
    totalValue: number;
  };
  goal: number;
}

export interface CloserActivity {
  id: string;
  closerId: string;
  type: 'meeting' | 'proposal' | 'closed';
  clientName: string;
  value: number;
  date: string;
  notes?: string;
}

// Document types
export type DocumentCategory = 'contratos' | 'sops' | 'comprobantes' | 'propuestas' | 'legal' | 'otros';

export interface Document {
  id: string;
  name: string;
  category: DocumentCategory;
  uploadDate: string;
  description?: string;
  tags: string[];
  clientId?: string;
  favorite: boolean;
  fileType: string;
}

// Client objective types
export interface ClientObjective {
  id: string;
  clientId: string;
  title: string;
  status: 'pendiente' | 'en_progreso' | 'completado';
  progress: number;
}

export interface ClientPayment {
  id: string;
  clientId: string;
  amount: number;
  date: string;
  status: 'pendiente' | 'pagado';
  concept: string;
}

// Availability types
export type AvailabilityStatus = 'disponible' | 'ocupado' | 'ausente' | 'vacaciones';

export interface TeamMember {
  id: string;
  userId: string;
  status: AvailabilityStatus;
  workSchedule: {
    start: string;
    end: string;
  };
  timezone?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  date: string;
  important: boolean;
}

export interface Notification {
  id: string;
  type: 'task' | 'payment' | 'announcement' | 'client';
  title: string;
  message: string;
  date: string;
  read: boolean;
  link?: string;
}
