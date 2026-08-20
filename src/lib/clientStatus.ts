// Estado de un cliente (clients.status) — colores y labels compartidos por
// toda la UI que pinta este campo (ficha de cliente, grilla de Clientes,
// alta de cliente). Extraído de ClienteDetalle.tsx/Clientes.tsx, que tenían
// la misma definición duplicada.
export type ClientStatus = 'active' | 'paused' | 'finished' | 'cancelled';

export const statusColors: Record<ClientStatus, string> = {
  active: 'bg-success/20 text-success',
  paused: 'bg-warning/20 text-warning',
  finished: 'bg-info/20 text-info',
  cancelled: 'bg-destructive/20 text-destructive',
};

export const statusLabels: Record<ClientStatus, string> = {
  active: 'Activo',
  paused: 'Pausado',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
};
