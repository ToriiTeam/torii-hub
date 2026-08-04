import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldAlert } from 'lucide-react';
import TabContenido from '@/components/academia/TabContenido';
import TabExamenes from '@/components/academia/TabExamenes';
import TabReflexiones from '@/components/academia/TabReflexiones';
import TabProgreso from '@/components/academia/TabProgreso';

const TABS = [
  { value: 'contenido', label: 'Contenido' },
  { value: 'examenes', label: 'Exámenes' },
  { value: 'reflexiones', label: 'Reflexiones' },
  { value: 'progreso', label: 'Progreso' },
];

export default function Academia() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('contenido');

  // academy.* RLS only recognizes profiles.role='admin' — see AuthContext's
  // isAdmin comment. This is a second line of defense (the sidebar link is
  // already hidden for non-admins), for anyone hitting the URL directly.
  if (isAdmin === undefined) {
    return <div className="h-64 rounded-lg bg-secondary/40 animate-pulse" />;
  }

  if (!isAdmin) {
    return (
      <Card className="bg-card border-border/50">
        <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
          <ShieldAlert className="h-10 w-10 opacity-40" />
          Esta sección está disponible solo para administradores.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Academia</h1>
        <p className="text-sm text-muted-foreground">Contenido, exámenes, reflexiones y progreso de los equipos de los clientes</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-secondary/50 flex-wrap h-auto gap-1">
          {TABS.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-sm">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="contenido"><TabContenido /></TabsContent>
        <TabsContent value="examenes"><TabExamenes /></TabsContent>
        <TabsContent value="reflexiones"><TabReflexiones /></TabsContent>
        <TabsContent value="progreso"><TabProgreso /></TabsContent>
      </Tabs>
    </div>
  );
}
