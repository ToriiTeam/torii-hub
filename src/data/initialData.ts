import { 
  Task, FixedCost, VariableCost, Income, Payment, 
  Setter, Closer, Document, Client, ClientObjective, 
  Announcement, TeamMember, SetterActivity, CloserActivity, 
  ClientPayment, TimeAuditTask, StrategicTask 
} from '@/types/torii';

// ========== CLIENTS (Sheet 1 Structure) ==========
export const initialClients: Client[] = [
  { 
    id: '1', 
    name: 'TechStart Inc', 
    offerType: 'DFY', 
    startDate: '2024-11-01', 
    endDate: '2025-10-31',
    status: 'activo', 
    paymentType: 'Cuotas', 
    totalInstallments: 12,
    paidInstallments: 2,
    installmentAmount: 450,
    nextDueDate: '2025-01-01',
    platform: 'Stripe',
    platformFee: 2.9,
    country: 'USA',
    notes: 'Cliente premium, renovación anual',
    email: 'contact@techstart.com',
    phone: '+1 555-0101'
  },
  { 
    id: '2', 
    name: 'MegaCorp Solutions', 
    offerType: 'DWY', 
    startDate: '2024-10-15', 
    status: 'activo', 
    paymentType: 'Upfront', 
    totalInstallments: 1,
    paidInstallments: 1,
    installmentAmount: 8500,
    platform: 'Transfer',
    platformFee: 0,
    country: 'México',
    email: 'info@megacorp.com'
  },
  { 
    id: '3', 
    name: 'StartupX', 
    offerType: 'DWY', 
    startDate: '2024-12-01',
    status: 'activo', 
    paymentType: 'Mensual', 
    totalInstallments: 6,
    paidInstallments: 1,
    installmentAmount: 350,
    nextDueDate: '2025-01-01',
    platform: 'Binance',
    platformFee: 1,
    country: 'Argentina',
    email: 'hello@startupx.io'
  },
  { 
    id: '4', 
    name: 'GrowthCo', 
    offerType: 'DFY', 
    startDate: '2024-09-20', 
    status: 'activo', 
    paymentType: 'Cuotas', 
    totalInstallments: 6,
    paidInstallments: 4,
    installmentAmount: 600,
    nextDueDate: '2025-01-20',
    platform: 'Stripe',
    platformFee: 2.9,
    country: 'España',
    email: 'sales@growthco.com'
  },
  { 
    id: '5', 
    name: 'MediaPlus', 
    offerType: 'DFY', 
    startDate: '2024-08-01',
    endDate: '2025-01-31',
    status: 'activo', 
    paymentType: 'Mensual', 
    totalInstallments: 6,
    paidInstallments: 5,
    installmentAmount: 700,
    nextDueDate: '2025-01-01',
    platform: 'Transfer',
    platformFee: 0,
    country: 'Chile',
    email: 'contact@mediaplus.com'
  },
  { 
    id: '6', 
    name: 'DataDrive', 
    offerType: 'DWY', 
    startDate: '2024-12-10',
    status: 'pausado', 
    paymentType: 'Cuotas', 
    totalInstallments: 3,
    paidInstallments: 0,
    installmentAmount: 1000,
    nextDueDate: '2025-01-10',
    platform: 'Binance',
    platformFee: 1,
    country: 'Colombia',
    notes: 'Esperando confirmación de arranque'
  },
  { 
    id: '7', 
    name: 'CloudFirst', 
    offerType: 'DFY', 
    startDate: '2024-03-01',
    endDate: '2024-09-01',
    status: 'finalizado', 
    paymentType: 'Cuotas', 
    totalInstallments: 6,
    paidInstallments: 6,
    installmentAmount: 500,
    platform: 'Stripe',
    platformFee: 2.9,
    country: 'USA',
    notes: 'Proyecto completado exitosamente'
  },
  { 
    id: '8', 
    name: 'ScaleUp Labs', 
    offerType: 'DWY', 
    startDate: '2024-12-05',
    status: 'activo', 
    paymentType: 'Upfront', 
    totalInstallments: 1,
    paidInstallments: 1,
    installmentAmount: 2500,
    platform: 'Transfer',
    platformFee: 0,
    country: 'Perú',
    email: 'team@scaleup.com'
  },
];

// ========== TIME AUDIT TASKS (Sheet 2 Structure) ==========
export const initialTimeAuditTasks: TimeAuditTask[] = [
  { id: '1', taskName: 'Preparar reuniones', hoursPerWeek: '0:20', category: '1-Admin', energy: 'Neutral', knowledge: 2, impact: 3, delegationCost: 1, score: 6.01, xds: 'X' },
  { id: '2', taskName: 'Reuniones de venta', hoursPerWeek: '6:10', category: '4-Ejecutivo', energy: 'Me Da Energía', knowledge: 1, impact: 1, delegationCost: 2, score: 4.13, xds: 'S+D' },
  { id: '3', taskName: 'Reuniones de equipo', hoursPerWeek: '4:00', category: '3-Manager', energy: 'Me Da Energía', knowledge: 2, impact: 3, delegationCost: 4, score: 9.08, xds: 'S+D' },
  { id: '4', taskName: 'Prospectar', hoursPerWeek: '9:37', category: '2-Técnico', energy: 'Me Da Energía', knowledge: 4, impact: 1, delegationCost: 4, score: 9.20, xds: 'D' },
  { id: '5', taskName: 'Tareas operativas de clientes', hoursPerWeek: '3:58', category: '2-Técnico', energy: 'Neutral', knowledge: 4, impact: 4, delegationCost: 4, score: 12.08, xds: 'S+D' },
  { id: '6', taskName: 'Reuniones de formaciones', hoursPerWeek: '6:54', category: '4-Ejecutivo', energy: 'Me Da Energía', knowledge: 5, impact: 3, delegationCost: 3, score: 11.14, xds: 'X' },
  { id: '7', taskName: 'Contenido de nutrición', hoursPerWeek: '1:00', category: '4-Ejecutivo', energy: 'Me Da Energía', knowledge: 5, impact: 3, delegationCost: 3, score: 11.02, xds: 'X' },
  { id: '8', taskName: 'Planificación diaria', hoursPerWeek: '1:40', category: '1-Admin', energy: 'Neutral', knowledge: 4, impact: 2, delegationCost: 1, score: 7.03, xds: 'X' },
  { id: '9', taskName: 'Planificación semanal', hoursPerWeek: '0:40', category: '1-Admin', energy: 'Me Da Energía', knowledge: 4, impact: 2, delegationCost: 1, score: 7.01, xds: 'X' },
  { id: '10', taskName: 'Revisión de métricas', hoursPerWeek: '1:00', category: '3-Manager', energy: 'Neutral', knowledge: 2, impact: 3, delegationCost: 3, score: 8.04, xds: 'X' },
  { id: '11', taskName: 'Momentum de visión', hoursPerWeek: '1:49', category: '4-Ejecutivo', energy: 'Me Da Energía', knowledge: 1, impact: 2, delegationCost: 1, score: 4.08, xds: 'X' },
  { id: '12', taskName: 'Tareas operativas generales', hoursPerWeek: '3:48', category: '4-Ejecutivo', energy: 'Neutral', knowledge: 3, impact: 3, delegationCost: 3, score: 9.08, xds: 'S+D' },
];

// ========== STRATEGIC TASKS (Sheet 3 Structure) ==========
export const initialStrategicTasks: StrategicTask[] = [
  { id: '1', title: 'Definir oferta única por nicho', completed: false },
  { id: '2', title: 'Ajustar pitch comercial y presentación de venta', completed: false },
  { id: '3', title: 'Mapear paso a paso la entrega de servicio', completed: false },
  { id: '4', title: 'Detectar fugas pasadas', completed: false },
  { id: '5', title: 'Rol y responsabilidades de Benja dentro de Seiiki y de Torii', completed: false },
  { id: '6', title: 'Página de agenda + formulario mínimo', completed: false },
  { id: '7', title: 'SOP del grupo de Whatsapp post agenda', completed: false },
  { id: '8', title: 'Página de gracias', completed: false },
];

// ========== LEGACY TASKS (keep for compatibility) ==========
export const initialTasks: Task[] = [
  {
    id: '1',
    title: 'Revisar propuesta cliente ABC',
    description: 'Revisar y ajustar la propuesta comercial para el cliente ABC Corp',
    priority: 'alta',
    status: 'pendiente',
    responsibleId: '1',
    dueDate: '2024-12-20',
    tags: ['ventas', 'propuesta'],
    createdAt: '2024-12-15',
  },
  {
    id: '2',
    title: 'Llamada de seguimiento con leads',
    description: 'Realizar seguimiento a los 5 leads de la semana pasada',
    priority: 'media',
    status: 'en_progreso',
    responsibleId: '2',
    dueDate: '2024-12-18',
    tags: ['setters', 'leads'],
    createdAt: '2024-12-14',
  },
];

export const initialFixedCosts: FixedCost[] = [
  { id: '1', name: 'Oficina Virtual', amount: 150, frequency: 'mensual', category: 'Infraestructura', paymentDate: 1 },
  { id: '2', name: 'Software CRM', amount: 99, frequency: 'mensual', category: 'Software', paymentDate: 5 },
  { id: '3', name: 'Herramientas Marketing', amount: 250, frequency: 'mensual', category: 'Marketing', paymentDate: 10 },
  { id: '4', name: 'Salario Base Setters', amount: 2000, frequency: 'mensual', category: 'Nómina', paymentDate: 30 },
  { id: '5', name: 'Contador', amount: 300, frequency: 'mensual', category: 'Servicios', paymentDate: 15 },
];

export const initialVariableCosts: VariableCost[] = [
  { id: '1', name: 'Publicidad Facebook', amount: 500, date: '2024-12-01', category: 'Marketing', description: 'Campaña Q4' },
  { id: '2', name: 'Comisiones Closers', amount: 1200, date: '2024-12-05', category: 'Nómina', description: 'Comisiones diciembre' },
];

export const initialIncomes: Income[] = [
  { id: '1', source: 'Contrato TechStart', amount: 5000, date: '2024-12-01', clientId: '1', type: 'recurrente' },
  { id: '2', source: 'Proyecto MegaCorp', amount: 8500, date: '2024-12-05', clientId: '2', type: 'unico' },
];

export const initialPayments: Payment[] = [
  { id: '1', name: 'Cuota TechStart', amount: 2500, dueDate: '2024-12-20', status: 'pendiente', type: 'cobrar' },
  { id: '2', name: 'Pago Proveedor Design', amount: 800, dueDate: '2024-12-18', status: 'pendiente', type: 'pagar' },
];

export const initialSetters: Setter[] = [
  { id: '1', name: 'María López', metrics: { calls: 45, leads: 12, appointments: 8, confirmed: 6 }, goal: 10 },
  { id: '2', name: 'Juan Pérez', metrics: { calls: 38, leads: 9, appointments: 5, confirmed: 4 }, goal: 10 },
  { id: '3', name: 'Laura Sánchez', metrics: { calls: 52, leads: 15, appointments: 10, confirmed: 8 }, goal: 10 },
];

export const initialSetterActivities: SetterActivity[] = [];

export const initialClosers: Closer[] = [
  { id: '1', name: 'Roberto Díaz', metrics: { meetings: 12, proposals: 8, closed: 5, totalValue: 42000 }, goal: 50000 },
  { id: '2', name: 'Patricia Gómez', metrics: { meetings: 15, proposals: 10, closed: 7, totalValue: 58000 }, goal: 50000 },
];

export const initialCloserActivities: CloserActivity[] = [];

export const initialDocuments: Document[] = [
  { id: '1', name: 'Contrato TechStart 2024.pdf', category: 'contratos', uploadDate: '2024-12-01', tags: ['cliente', 'activo'], favorite: true, fileType: 'pdf' },
  { id: '2', name: 'SOP Proceso de Ventas.docx', category: 'sops', uploadDate: '2024-11-15', tags: ['ventas', 'proceso'], favorite: true, fileType: 'docx' },
];

export const initialClientObjectives: ClientObjective[] = [
  { id: '1', clientId: '1', title: 'Aumentar leads 50%', status: 'en_progreso', progress: 65 },
  { id: '2', clientId: '1', title: 'Implementar CRM', status: 'completado', progress: 100 },
];

export const initialClientPayments: ClientPayment[] = [
  { id: '1', clientId: '1', amount: 450, date: '2024-12-01', status: 'pagado', concept: 'Cuota 1/12' },
  { id: '2', clientId: '1', amount: 450, date: '2025-01-01', status: 'pendiente', concept: 'Cuota 2/12' },
];

export const initialAnnouncements: Announcement[] = [
  { id: '1', title: 'Reunión de equipo viernes', content: 'No olvidar la reunión semanal este viernes a las 10am.', authorId: '1', date: '2024-12-16', important: true },
];

export const initialTeamMembers: TeamMember[] = [
  { id: '1', userId: '1', status: 'disponible', workSchedule: { start: '09:00', end: '18:00' } },
  { id: '2', userId: '2', status: 'ocupado', workSchedule: { start: '10:00', end: '19:00' } },
  { id: '3', userId: '3', status: 'disponible', workSchedule: { start: '09:00', end: '17:00' } },
];

// Helper to get user names
export const userNames: Record<string, string> = {
  '1': 'Admin Torii',
  '2': 'Carlos Mendez',
  '3': 'Ana García',
};
