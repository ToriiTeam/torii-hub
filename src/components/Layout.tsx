import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ClientNavSection } from '@/components/ClientNavSection';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, isTomorrow, isPast, addDays, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CheckSquare,
  DollarSign,
  PhoneCall,
  Handshake,
  FileText,
  Users,
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

// 3 bloques visuales — "Torii" (vistas de portfolio completo, cada una con
// su propio selector interno de cliente/Torii), "Clientes" (la ficha por
// asesor, con sus tabs internos), "Otros" (el resto). Puramente de
// presentación: ninguna de estas rutas cambia de comportamiento por estar
// agrupada distinto.
const navigationTorii: NavItem[] = [
  { name: 'Dashboard Ejecutivo', href: '/dashboard', icon: Gauge },
  { name: 'Finanzas', href: '/finanzas', icon: DollarSign },
  { name: 'Closing', href: '/closers', icon: Handshake },
  { name: 'Setting', href: '/setters', icon: PhoneCall },
  { name: 'VSL', href: '/vsl-tracking', icon: Video },
  { name: 'Meta Ads', href: '/meta-ads', icon: BarChart2 },
  { name: 'Máquina de Cierres', href: '/maquina-cierres', icon: ShoppingCart },
  { name: 'Contenido Orgánico', href: '/contenido', icon: Sprout },
  { name: 'Tareas', href: '/tareas', icon: CheckSquare },
];

const navigationClientes: NavItem[] = [
  { name: 'Clientes', href: '/clientes', icon: Users },
];

const navigationOtros: NavItem[] = [
  { name: 'Portal', href: '/portal', icon: Globe },
  { name: 'Reportes', href: '/reportes', icon: FileText },
  // academy.* RLS only recognizes profiles.role='admin' (via
  // academy.is_portal_admin()), not moderator — see AuthContext's isAdmin
  // comment. Gated narrower than the rest of the sidebar on purpose.
  { name: 'Academia', href: '/academia', icon: GraduationCap, adminOnly: true },
];

const navSections = [
  { label: 'Torii', items: navigationTorii },
  { label: 'Clientes', items: navigationClientes },
  { label: 'Otros', items: navigationOtros },
];

interface LayoutProps {
  children: React.ReactNode;
}

// Auditor role sees exactly these 2 sections — see App.tsx, which also
// makes every other route unreachable for them, not just hidden here.
const AUDITOR_NAV_HREFS = ['/dashboard', '/meta-ads', '/vsl-tracking'];

export default function Layout({ children }: LayoutProps) {
  const { profile, signOut, isAuditor, isAdmin } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: isAuditor
        ? section.items.filter((item) => AUDITOR_NAV_HREFS.includes(item.href))
        : section.items.filter((item) => !item.adminOnly || isAdmin),
    }))
    .filter((section) => section.items.length > 0);

  useEffect(() => {
    if (isAuditor) return; // auditor has no Tareas access — nothing to notify about
    fetchTasks();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('tasks-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        () => fetchTasks()
      )
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

      return {
        id: task.id,
        title: task.title,
        urgency,
        icon,
        priority: task.priority
      };
    });
  };

  const notifications = getNotifications();

  const NavItems = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="px-2">
      {visibleSections.map((section) => (
        <div
          key={section.label}
          className="space-y-1 pt-4 mt-1 border-t border-sidebar-border first:border-t-0 first:mt-0 first:pt-0"
        >
          {!collapsed && (
            <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {section.label}
            </div>
          )}
          {section.label === 'Clientes' ? (
            collapsed ? (
              // Selector rico no entra en modo colapsado — fallback simple,
              // mismo comportamiento que tenía el NavLink único de antes.
              <NavLink
                to="/clientes"
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  location.pathname.startsWith('/clientes')
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <Users className="h-5 w-5 flex-shrink-0" />
              </NavLink>
            ) : (
              <ClientNavSection />
            )
          ) : (
            section.items.map((item) => {
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
            })
          )}
        </div>
      ))}
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
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {!collapsed && (
            <h1 className="text-xl font-bold tracking-wider">TORII</h1>
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
            <h1 className="text-xl font-bold tracking-wider">TORII</h1>
          </div>
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
