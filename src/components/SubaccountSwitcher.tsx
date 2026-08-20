import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown, Building2, User } from 'lucide-react';
import { getRecentClients, pushRecentClient, type RecentClient } from '@/lib/recentClients';

interface ClientOption { id: string; name: string; }

interface Props {
  currentLabel: string;
}

// Selector global de subcuenta (estilo GHL) — buscador + Recientes + lista
// completa (Torii primero, después clientes activos). Reemplaza al viejo
// ClientNavSection.tsx: ya no hay "grilla vs cliente" dentro de una sola
// sección "Clientes" del sidebar — ahora es un salto directo entre
// subcuentas (Torii o un cliente), disponible desde cualquier pantalla.
// Salud de la cartera NO aparece acá — no es una subcuenta, es el home.
export function SubaccountSwitcher({ currentLabel }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [recents, setRecents] = useState<RecentClient[]>([]);

  useEffect(() => {
    if (!open) return;
    setRecents(getRecentClients());
    // es_interno = false: el casillero interno de Torii nunca debe aparecer
    // como subcuenta seleccionable en el switcher.
    supabase.from('clients').select('id, name').eq('status', 'active').eq('es_interno', false).order('name')
      .then(({ data }) => setClients(data ?? []));
  }, [open]);

  function goToTorii() {
    setOpen(false);
    navigate('/torii/dashboard');
  }

  function goToClient(client: ClientOption) {
    setOpen(false);
    pushRecentClient(client);
    navigate(`/c/${client.id}`);
  }

  const recentIds = new Set(recents.map((r) => r.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between h-9 bg-secondary/40 border-border/60 font-medium text-sm"
        >
          <span className="truncate">{currentLabel}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 ml-1.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar cuenta..." />
          <CommandList>
            <CommandEmpty>Sin resultados.</CommandEmpty>

            {recents.length > 0 && (
              <CommandGroup heading="Recientes">
                {recents.map((r) => (
                  <CommandItem key={`recent-${r.id}`} value={`recent ${r.name}`} onSelect={() => goToClient(r)}>
                    <User className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    {r.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandGroup heading="Cuentas">
              <CommandItem value="Torii" onSelect={goToTorii}>
                <Building2 className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                Torii
              </CommandItem>
              {clients.filter((c) => !recentIds.has(c.id)).map((c) => (
                <CommandItem key={c.id} value={c.name} onSelect={() => goToClient(c)}>
                  <User className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  {c.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
