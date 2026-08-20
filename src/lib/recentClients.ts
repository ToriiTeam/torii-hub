const KEY = 'torii-hub:recent-clients';
const MAX = 4;

export interface RecentClient {
  id: string;
  name: string;
}

export function getRecentClients(): RecentClient[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Más reciente primero, sin duplicados, tope de 4 — alcanza para el caso
// de uso ("los últimos con los que trabajé"), no hace falta más.
export function pushRecentClient(client: RecentClient): void {
  try {
    const current = getRecentClients().filter((c) => c.id !== client.id);
    const next = [client, ...current].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // localStorage puede fallar (modo privado, cuota) — no es crítico, se
    // pierde el historial de recientes pero el switcher sigue funcionando.
  }
}
