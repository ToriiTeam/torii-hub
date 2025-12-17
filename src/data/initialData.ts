import { Task, FixedCost, VariableCost, Income, Payment, Setter, Closer, Document, Client, ClientObjective, Announcement, TeamMember, SetterActivity, CloserActivity, ClientPayment } from '@/types/torii';

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
  {
    id: '3',
    title: 'Actualizar SOPs de ventas',
    description: 'Documentar el nuevo proceso de calificación de leads',
    priority: 'baja',
    status: 'completada',
    responsibleId: '3',
    dueDate: '2024-12-16',
    tags: ['documentación'],
    createdAt: '2024-12-10',
  },
  {
    id: '4',
    title: 'Preparar reporte mensual',
    description: 'Compilar métricas de setters y closers para reporte ejecutivo',
    priority: 'alta',
    status: 'pendiente',
    responsibleId: '1',
    dueDate: '2024-12-31',
    tags: ['reportes', 'métricas'],
    createdAt: '2024-12-15',
  },
  {
    id: '5',
    title: 'Onboarding cliente TechStart',
    description: 'Iniciar proceso de onboarding con documentación completa',
    priority: 'alta',
    status: 'en_progreso',
    responsibleId: '2',
    dueDate: '2024-12-22',
    tags: ['clientes', 'onboarding'],
    createdAt: '2024-12-12',
    clientId: '1',
  },
  {
    id: '6',
    title: 'Revisar contratos legales',
    description: 'Verificar términos y condiciones de nuevos contratos',
    priority: 'media',
    status: 'pendiente',
    responsibleId: '3',
    dueDate: '2024-12-25',
    tags: ['legal', 'contratos'],
    createdAt: '2024-12-16',
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
  { id: '3', name: 'Material Promocional', amount: 180, date: '2024-12-10', category: 'Marketing', description: 'Folletos y tarjetas' },
  { id: '4', name: 'Capacitación Equipo', amount: 400, date: '2024-12-12', category: 'Formación', description: 'Curso ventas online' },
];

export const initialIncomes: Income[] = [
  { id: '1', source: 'Contrato TechStart', amount: 5000, date: '2024-12-01', clientId: '1', type: 'recurrente' },
  { id: '2', source: 'Proyecto MegaCorp', amount: 8500, date: '2024-12-05', clientId: '2', type: 'unico' },
  { id: '3', source: 'Consultoría StartupX', amount: 2000, date: '2024-12-08', clientId: '3', type: 'unico' },
  { id: '4', source: 'Retainer GrowthCo', amount: 3500, date: '2024-12-10', clientId: '4', type: 'recurrente' },
  { id: '5', source: 'Contrato MediaPlus', amount: 4200, date: '2024-12-12', clientId: '5', type: 'recurrente' },
];

export const initialPayments: Payment[] = [
  { id: '1', name: 'Cuota TechStart', amount: 2500, dueDate: '2024-12-20', status: 'pendiente', type: 'cobrar' },
  { id: '2', name: 'Pago Proveedor Design', amount: 800, dueDate: '2024-12-18', status: 'pendiente', type: 'pagar' },
  { id: '3', name: 'Cuota MegaCorp', amount: 4250, dueDate: '2024-12-15', status: 'pagado', paidDate: '2024-12-14', type: 'cobrar' },
  { id: '4', name: 'Licencia Software', amount: 199, dueDate: '2024-12-25', status: 'pendiente', type: 'pagar' },
];

export const initialSetters: Setter[] = [
  { id: '1', name: 'María López', metrics: { calls: 45, leads: 12, appointments: 8, confirmed: 6 }, goal: 10 },
  { id: '2', name: 'Juan Pérez', metrics: { calls: 38, leads: 9, appointments: 5, confirmed: 4 }, goal: 10 },
  { id: '3', name: 'Laura Sánchez', metrics: { calls: 52, leads: 15, appointments: 10, confirmed: 8 }, goal: 10 },
];

export const initialSetterActivities: SetterActivity[] = [
  { id: '1', setterId: '1', type: 'call', date: '2024-12-17T10:30:00', notes: 'Cliente interesado' },
  { id: '2', setterId: '1', type: 'lead', date: '2024-12-17T11:00:00', notes: 'Lead calificado' },
  { id: '3', setterId: '2', type: 'appointment', date: '2024-12-17T14:00:00', notes: 'Cita para demo' },
  { id: '4', setterId: '3', type: 'confirmed', date: '2024-12-17T16:30:00', notes: 'Confirmado para cierre' },
];

export const initialClosers: Closer[] = [
  { id: '1', name: 'Roberto Díaz', metrics: { meetings: 12, proposals: 8, closed: 5, totalValue: 42000 }, goal: 50000 },
  { id: '2', name: 'Patricia Gómez', metrics: { meetings: 15, proposals: 10, closed: 7, totalValue: 58000 }, goal: 50000 },
];

export const initialCloserActivities: CloserActivity[] = [
  { id: '1', closerId: '1', type: 'meeting', clientName: 'TechStart', value: 0, date: '2024-12-16', notes: 'Primera reunión' },
  { id: '2', closerId: '1', type: 'closed', clientName: 'MegaCorp', value: 8500, date: '2024-12-15', notes: 'Proyecto cerrado' },
  { id: '3', closerId: '2', type: 'proposal', clientName: 'GrowthCo', value: 5000, date: '2024-12-17', notes: 'Propuesta enviada' },
];

export const initialDocuments: Document[] = [
  { id: '1', name: 'Contrato TechStart 2024.pdf', category: 'contratos', uploadDate: '2024-12-01', tags: ['cliente', 'activo'], favorite: true, fileType: 'pdf' },
  { id: '2', name: 'SOP Proceso de Ventas.docx', category: 'sops', uploadDate: '2024-11-15', tags: ['ventas', 'proceso'], favorite: true, fileType: 'docx' },
  { id: '3', name: 'Factura Diciembre.pdf', category: 'comprobantes', uploadDate: '2024-12-05', tags: ['factura'], favorite: false, fileType: 'pdf' },
  { id: '4', name: 'Propuesta MegaCorp.pptx', category: 'propuestas', uploadDate: '2024-12-03', tags: ['propuesta', 'cliente'], clientId: '2', favorite: false, fileType: 'pptx' },
  { id: '5', name: 'Términos y Condiciones.pdf', category: 'legal', uploadDate: '2024-10-20', tags: ['legal', 'términos'], favorite: true, fileType: 'pdf' },
  { id: '6', name: 'SOP Onboarding Clientes.docx', category: 'sops', uploadDate: '2024-11-20', tags: ['onboarding', 'proceso'], favorite: false, fileType: 'docx' },
  { id: '7', name: 'Recibo Publicidad FB.pdf', category: 'comprobantes', uploadDate: '2024-12-10', tags: ['marketing', 'recibo'], favorite: false, fileType: 'pdf' },
  { id: '8', name: 'Contrato Base Template.docx', category: 'contratos', uploadDate: '2024-09-01', tags: ['template', 'contrato'], favorite: true, fileType: 'docx' },
  { id: '9', name: 'Propuesta GrowthCo.pdf', category: 'propuestas', uploadDate: '2024-12-12', tags: ['propuesta'], clientId: '4', favorite: false, fileType: 'pdf' },
  { id: '10', name: 'Manual Empleados.pdf', category: 'otros', uploadDate: '2024-08-15', tags: ['rrhh', 'manual'], favorite: false, fileType: 'pdf' },
];

export const initialClients: Client[] = [
  { id: '1', name: 'TechStart Inc', company: 'TechStart Inc', email: 'contact@techstart.com', phone: '+1 555-0101', status: 'activo', contractValue: 5000, startDate: '2024-11-01', responsibleId: '1', notes: 'Cliente premium, renovación anual' },
  { id: '2', name: 'MegaCorp Solutions', company: 'MegaCorp Solutions', email: 'info@megacorp.com', phone: '+1 555-0102', status: 'activo', contractValue: 8500, startDate: '2024-10-15', responsibleId: '2' },
  { id: '3', name: 'StartupX', company: 'StartupX', email: 'hello@startupx.io', phone: '+1 555-0103', status: 'prospecto', contractValue: 2000, startDate: '2024-12-01', responsibleId: '1' },
  { id: '4', name: 'GrowthCo', company: 'GrowthCo Ltd', email: 'sales@growthco.com', phone: '+1 555-0104', status: 'activo', contractValue: 3500, startDate: '2024-09-20', responsibleId: '2' },
  { id: '5', name: 'MediaPlus', company: 'MediaPlus Agency', email: 'contact@mediaplus.com', phone: '+1 555-0105', status: 'activo', contractValue: 4200, startDate: '2024-08-01', responsibleId: '3' },
  { id: '6', name: 'DataDrive', company: 'DataDrive Analytics', email: 'info@datadrive.com', phone: '+1 555-0106', status: 'lead', contractValue: 0, startDate: '2024-12-10', responsibleId: '1' },
  { id: '7', name: 'CloudFirst', company: 'CloudFirst Tech', email: 'hello@cloudfirst.io', phone: '+1 555-0107', status: 'inactivo', contractValue: 3000, startDate: '2024-03-01', responsibleId: '2', notes: 'Pausado temporalmente' },
  { id: '8', name: 'ScaleUp Labs', company: 'ScaleUp Labs', email: 'team@scaleup.com', phone: '+1 555-0108', status: 'prospecto', contractValue: 6000, startDate: '2024-12-05', responsibleId: '3' },
];

export const initialClientObjectives: ClientObjective[] = [
  { id: '1', clientId: '1', title: 'Aumentar leads 50%', status: 'en_progreso', progress: 65 },
  { id: '2', clientId: '1', title: 'Implementar CRM', status: 'completado', progress: 100 },
  { id: '3', clientId: '2', title: 'Lanzar campaña Q4', status: 'en_progreso', progress: 80 },
  { id: '4', clientId: '4', title: 'Rediseño web', status: 'pendiente', progress: 0 },
  { id: '5', clientId: '5', title: 'Estrategia contenidos', status: 'en_progreso', progress: 40 },
];

export const initialClientPayments: ClientPayment[] = [
  { id: '1', clientId: '1', amount: 5000, date: '2024-12-01', status: 'pagado', concept: 'Mensualidad Diciembre' },
  { id: '2', clientId: '1', amount: 5000, date: '2025-01-01', status: 'pendiente', concept: 'Mensualidad Enero' },
  { id: '3', clientId: '2', amount: 8500, date: '2024-12-05', status: 'pagado', concept: 'Proyecto completo' },
  { id: '4', clientId: '4', amount: 3500, date: '2024-12-15', status: 'pendiente', concept: 'Retainer Diciembre' },
];

export const initialAnnouncements: Announcement[] = [
  { id: '1', title: 'Reunión de equipo viernes', content: 'No olvidar la reunión semanal este viernes a las 10am. Revisaremos métricas y objetivos Q1.', authorId: '1', date: '2024-12-16', important: true },
  { id: '2', title: 'Nuevo cliente cerrado', content: '¡Felicidades al equipo! Cerramos contrato con MegaCorp por $8,500.', authorId: '2', date: '2024-12-15', important: false },
  { id: '3', title: 'Vacaciones fin de año', content: 'Recordar confirmar disponibilidad para las fechas del 24-31 de diciembre.', authorId: '1', date: '2024-12-14', important: true },
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
