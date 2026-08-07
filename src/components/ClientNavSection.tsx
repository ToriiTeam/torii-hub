import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronLeft, ChevronRight, ChevronsUpDown, ArrowRight } from 'lucide-react';

interface ClientOption {
  id: string;
  name: string;
}

// Selector persistente del bloque "Clientes" del sidebar — reemplaza el
// único NavLink que había antes. Mismo universo de clientes que
// Clientes.tsx (todos, sin filtrar status, orden alfabético) para que
// prev/next recorra exactamente la misma lista que ves en /clientes.
export function ClientNavSection() {
  const location = useLocation();
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [comboOpen, setComboOpen] = useState(false);

  useEffect(() => {
    supabase.from('clients').select('id, name').order('name')
      .then(({ data }) => setClients(data ?? []));
  }, []);

  // Cliente activo se deriva de la URL, no de estado propio — así el
  // selector siempre refleja dónde estás, incluso llegando por link directo.
  const match = location.pathname.match(/^\/clientes\/([^/]+)/);
  const rawId = match?.[1];
  const isGlobal = rawId === 'global';
  const currentId = rawId && !isGlobal ? rawId : null;
  const currentIndex = currentId ? clients.findIndex((c) => c.id === currentId) : -1;
  const currentClient = currentIndex >= 0 ? clients[currentIndex] : null;

  function goTo(id: string) {
    navigate(`/clientes/${id}`);
    setComboOpen(false);
  }

  function goPrev() {
    if (currentIndex > 0) navigate(`/clientes/${clients[currentIndex - 1].id}`);
  }

  function goNext() {
    if (currentIndex >= 0 && currentIndex < clients.length - 1) navigate(`/clientes/${clients[currentIndex + 1].id}`);
  }

  const subItems = isGlobal || !currentClient
    ? [{ label: 'Dashboard', href: '/clientes/global' }]
    : [
        { label: 'Estrategia', href: `/clientes/${currentClient.id}` },
        { label: 'Creativos', href: `/clientes/${currentClient.id}/creativos` },
        { label: 'Dashboard', href: `/clientes/${currentClient.id}/dashboard` },
        { label: 'Closing', href: `/clientes/${currentClient.id}/closing` },
        { label: 'Contenido Orgánico', href: `/clientes/${currentClient.id}/contenido` },
      ];

  return (
    <div className="space-y-1">
      {/* Selector con flechas */}
      <div className="flex items-center gap-0.5 px-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 flex-shrink-0"
          onClick={goPrev}
          disabled={currentIndex <= 0}
          title="Cliente anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Popover open={comboOpen} onOpenChange={setComboOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="flex-1 min-w-0 h-7 px-2 justify-between text-sm font-medium">
              <span className="truncate">{isGlobal || !currentClient ? 'Global' : currentClient.name}</span>
              <ChevronsUpDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar cliente..." />
              <CommandList>
                <CommandEmpty>Sin resultados.</CommandEmpty>
                <CommandGroup>
                  <CommandItem value="Global" onSelect={() => { navigate('/clientes/global'); setComboOpen(false); }}>
                    Global
                  </CommandItem>
                </CommandGroup>
                <CommandGroup>
                  {clients.map((c) => (
                    <CommandItem key={c.id} value={c.name} onSelect={() => goTo(c.id)}>
                      {c.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 flex-shrink-0"
          onClick={goNext}
          disabled={currentIndex < 0 || currentIndex >= clients.length - 1}
          title="Cliente siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Link
        to="/clientes"
        className="flex items-center gap-1 px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Ver todos <ArrowRight className="h-3 w-3" />
      </Link>

      {/* Sub-items: 1 en modo Global, 5 con un cliente activo */}
      <div className="pt-1 space-y-1">
        {subItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ml-2',
                isActive
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              {item.label}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
