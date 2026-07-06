import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AnaliticasView } from '@/features/maquina-cierres/components/AnaliticasView';
import { ClientesGestionView } from '@/features/maquina-cierres/components/ClientesGestionView';

export default function MaquinaCierres() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Máquina de Cierres</h1>
        <p className="text-muted-foreground">Downsell de USD 98 — línea de negocio propia, no una landing más de la agencia</p>
      </div>

      <Tabs defaultValue="analiticas">
        <TabsList>
          <TabsTrigger value="analiticas">Analíticas</TabsTrigger>
          <TabsTrigger value="clientes">Gestión de Clientes</TabsTrigger>
        </TabsList>

        <TabsContent value="analiticas" className="mt-4">
          <AnaliticasView />
        </TabsContent>

        <TabsContent value="clientes" className="mt-4">
          <ClientesGestionView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
