import { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SubaccountSwitcher } from '@/components/SubaccountSwitcher';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, isTomorrow, isPast, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CheckSquare,
  DollarSign,
  PhoneCall,
  Handshake,
  FileText,
  Menu,
  LogOut,
  Bell,
  ChevronLeft,
  User,
  AlertCircle,
  BarChart2,
  Video,
  ShoppingCart,
  Gauge,
  Sprout,
  Globe,
  GraduationCap,
  ListTree,
  LayoutDashboard,
  Map as MapIcon,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  status: string | null;
  priority: string | null;
}

// Rutas canónicas nuevas: /torii/... para portafolio (Dashboard Ejecutivo +
// lo que antes era la sección "Otros", fusionado en una sola lista — ver
// punto D), /c/:id/... para un cliente puntual. Las rutas viejas
// (/dashboard, /clientes/:id, etc.) siguen existiendo en App.tsx como
// redirects, así que un bookmark viejo o un navigate() que quedó apuntando
// a la ruta vieja en algún rincón del código sigue funcionando — solo el
// sidebar y el switcher usan las rutas nuevas directamente.
const navigationTorii: NavItem[] = [
  { name: 'Dashboard Ejecutivo', href: '/torii/dashboard', icon: Gauge },
  { name: 'Finanzas', href: '/torii/finanzas', icon: DollarSign },
  { name: 'Closing', href: '/torii/closing', icon: Handshake },
  { name: 'Setting', href: '/torii/setting', icon: PhoneCall },
  { name: 'VSL', href: '/torii/vsl-tracking', icon: Video },
  { name: 'Meta Ads', href: '/torii/meta-ads', icon: BarChart2 },
  { name: 'Máquina de Cierres', href: '/torii/maquina-cierres', icon: ShoppingCart },
  { name: 'Contenido Orgánico', href: '/torii/contenido', icon: Sprout },
  { name: 'Tareas', href: '/torii/tareas', icon: CheckSquare },
  { name: 'Portal', href: '/torii/portal', icon: Globe },
  { name: 'Reportes', href: '/torii/reportes', icon: FileText },
  { name: 'Landings', href: '/torii/landings', icon: ListTree },
  // academy.* RLS only recognizes profiles.role='admin' (via
  // academy.is_portal_admin()), not moderator — see AuthContext's isAdmin
  // comment. Gated narrower than the rest of the sidebar on purpose.
  { name: 'Academia', href: '/torii/academia', icon: GraduationCap, adminOnly: true },
];

// Auditor role: exactamente estas 3 rutas existen para este usuario — no
// solo ocultas del sidebar, genuinamente inalcanzables (ver App.tsx). Se
// dejaron sin tocar en la ruta vieja (/dashboard, /meta-ads, /vsl-tracking)
// a propósito: es un flujo separado, angosto y sensible en permisos — no
// forma parte de este rediseño de navegación de staff.
const AUDITOR_ITEMS: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Gauge },
  { name: 'Meta Ads', href: '/meta-ads', icon: BarChart2 },
  { name: 'VSL', href: '/vsl-tracking', icon: Video },
];

function clientNavItems(clientId: string): NavItem[] {
  return [
    { name: 'Dashboard', href: `/c/${clientId}`, icon: LayoutDashboard },
    { name: 'Delivery OS', href: `/c/${clientId}/delivery-os`, icon: MapIcon },
  ];
}

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { profile, signOut, isAuditor, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clientName, setClientName] = useState<string | null>(null);

  // Subcuenta activa derivada 100% de la URL — nunca de estado propio, así
  // refrescar la página o llegar por link directo deja el sidebar
  // consistente sin ningún efecto de hidratación. Layout vive por encima
  // del <Routes> anidado en App.tsx, así que no puede leer :id vía
  // useParams (ese contexto no llega hasta acá) — se extrae del pathname
  // con el mismo criterio que ya usaba el viejo ClientNavSection.tsx.
  const clientIdMatch = location.pathname.match(/^\/c\/([^/]+)/);
  const clientId = clientIdMatch?.[1] ?? null;
  const mode: 'home' | 'torii' | 'client' = clientId ? 'client' : location.pathname === '/' ? 'home' : 'torii';

  useEffect(() => {
    if (!clientId) { setClientName(null); return; }
    let cancelled = false;
    supabase.from('clients').select('name').eq('id', clientId).maybeSingle()
      .then(({ data }) => { if (!cancelled) setClientName(data?.name ?? null); });
    return () => { cancelled = true; };
  }, [clientId]);

  const visibleTorii = useMemo(
    () => navigationTorii.filter((item) => !item.adminOnly || isAdmin),
    [isAdmin],
  );

  useEffect(() => {
    if (isAuditor) return; // auditor has no Tareas access — nothing to notify about
    fetchTasks();

    const channel = supabase
      .channel('tasks-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchTasks())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTasks = async () => {
    const today = new Date();
    const nextWeek = addDays(today, 7);

    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, due_date, status, priority')
      .neq('status', 'completada')
      .not('due_date', 'is', null)
      .lte('due_date', format(nextWeek, 'yyyy-MM-dd'))
      .order('due_date', { ascending: true });

    if (!error && data) {
      setTasks(data);
    }
  };

  const getNotifications = () => {
    return tasks.map(task => {
      let urgency = '';
      let icon = null;

      if (task.due_date) {
        const dueDate = new Date(task.due_date);
        if (isPast(dueDate) && !isToday(dueDate)) {
          urgency = 'Vencida';
          icon = <AlertCircle className="h-4 w-4 text-destructive" />;
        } else if (isToday(dueDate)) {
          urgency = 'Hoy';
          icon = <AlertCircle className="h-4 w-4 text-orange-500" />;
        } else if (isTomorrow(dueDate)) {
          urgency = 'Mañana';
        } else {
          urgency = format(dueDate, "d 'de' MMM", { locale: es });
        }
      }

      return { id: task.id, title: task.title, urgency, icon, priority: task.priority };
    });
  };

  const notifications = getNotifications();

  function goHome() {
    navigate('/');
  }

  // Auditor: flujo simple y aislado, sin switcher ni modos — no forma
  // parte de este rediseño (ver comentario en AUDITOR_ITEMS).
  const navItemsToRender: NavItem[] = isAuditor
    ? AUDITOR_ITEMS
    : mode === 'torii'
    ? visibleTorii
    : mode === 'client' && clientId
    ? clientNavItems(clientId)
    : [];

  const switcherLabel = mode === 'client' ? (clientName ?? 'Cargando…') : mode === 'torii' ? 'Torii' : 'Elegir cuenta';

  const NavItems = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="px-2 space-y-1">
      {mode === 'home' && !isAuditor && !collapsed && (
        <p className="px-3 py-2 text-xs text-muted-foreground/70 leading-relaxed">
          Elegí Torii o un cliente arriba para navegar dentro de esa cuenta.
        </p>
      )}
      {navItemsToRender.map((item) => {
        const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
        return (
          <NavLink
            key={item.name}
            to={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary')} />
            {!collapsed && <span>{item.name}</span>}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col border-r border-border bg-sidebar transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo — siempre vuelve a Salud de la cartera, sin importar la subcuenta activa */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {!collapsed && (
            <button type="button" onClick={goHome} className="text-xl font-bold tracking-wider hover:text-primary transition-colors">
              TORII
            </button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
          </Button>
        </div>

        {/* Switcher de subcuenta — no aplica al flujo de auditor */}
        {!isAuditor && !collapsed && (
          <div className="px-3 pt-3">
            <SubaccountSwitcher currentLabel={switcherLabel} />
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <NavItems />
        </ScrollArea>

        {/* User info */}
        <div className="p-4 border-t border-border">
          <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{profile?.role}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar border-border">
          <div className="h-16 flex items-center px-4 border-b border-border">
            <button
              type="button"
              onClick={() => { setSidebarOpen(false); goHome(); }}
              className="text-xl font-bold tracking-wider hover:text-primary transition-colors"
            >
              TORII
            </button>
          </div>
          {!isAuditor && (
            <div className="px-3 pt-3">
              <SubaccountSwitcher currentLabel={switcherLabel} />
            </div>
          )}
          <ScrollArea className="flex-1 py-4 h-[calc(100vh-8rem)]">
            <NavItems onNavigate={() => setSidebarOpen(false)} />
          </ScrollArea>
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{profile?.role}</p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            </Sheet>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications — tied to Tareas, which auditor can't see */}
            {!isAuditor && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {notifications.length > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground">
                      {notifications.length > 9 ? '9+' : notifications.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0 bg-card border-border">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold">Notificaciones</h3>
                </div>
                <ScrollArea className="max-h-80">
                  <div className="p-2 space-y-1">
                    {notifications.length === 0 ? (
                      <div className="p-3 text-center text-muted-foreground text-sm">
                        No hay notificaciones pendientes
                      </div>
                    ) : (
                      notifications.map(notification => (
                        <div key={notification.id} className="p-3 rounded-lg hover:bg-secondary/50 cursor-pointer flex items-start gap-2">
                          {notification.icon}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{notification.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Vence: {notification.urgency}
                              {notification.priority === 'alta' && ' • Prioridad alta'}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
            )}

            {/* Logout */}
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
