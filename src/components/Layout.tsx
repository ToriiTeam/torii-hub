import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  CheckSquare,
  DollarSign,
  PhoneCall,
  Handshake,
  FileText,
  Users,
  MessageSquare,
  Menu,
  LogOut,
  Bell,
  ChevronLeft,
  User,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Productividad', href: '/tareas', icon: CheckSquare },
  { name: 'Finanzas', href: '/finanzas', icon: DollarSign },
  { name: 'Setters', href: '/setters', icon: PhoneCall },
  { name: 'Closers', href: '/closers', icon: Handshake },
  { name: 'Documentación', href: '/documentos', icon: FileText },
  { name: 'Clientes', href: '/clientes', icon: Users },
  { name: 'Disponibilidad', href: '/disponibilidad', icon: MessageSquare },
  { name: 'Reportes', href: '/reportes', icon: FileText },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const NavItems = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="space-y-1 px-2">
      {navigation.map((item) => {
        const isActive = location.pathname === item.href;
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
            {/* Notifications */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground">
                    3
                  </Badge>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0 bg-card border-border">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold">Notificaciones</h3>
                </div>
                <div className="p-2 space-y-1">
                  <div className="p-3 rounded-lg hover:bg-secondary/50 cursor-pointer">
                    <p className="text-sm font-medium">Tarea próxima a vencer</p>
                    <p className="text-xs text-muted-foreground">Revisar propuesta cliente ABC - mañana</p>
                  </div>
                  <div className="p-3 rounded-lg hover:bg-secondary/50 cursor-pointer">
                    <p className="text-sm font-medium">Pago pendiente</p>
                    <p className="text-xs text-muted-foreground">Cuota TechStart vence en 3 días</p>
                  </div>
                  <div className="p-3 rounded-lg hover:bg-secondary/50 cursor-pointer">
                    <p className="text-sm font-medium">Nuevo anuncio</p>
                    <p className="text-xs text-muted-foreground">Reunión de equipo viernes</p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

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
