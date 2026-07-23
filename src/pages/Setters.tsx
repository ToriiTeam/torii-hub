import { Card, CardContent } from '@/components/ui/card';
import { PhoneCall } from 'lucide-react';

// The real automated setting flow (formulario GHL → agenda → webhook →
// Supabase) isn't wired up yet — this is a placeholder until it is. The
// previous setter CRM (people/performance/payments) that used to live here
// was moved to SettersLegacy.tsx (unrouted) rather than deleted.
export default function Setters() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Setting</h1>
      </div>

      <Card className="bg-card border-border/50">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <PhoneCall className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground max-w-md">
            En construcción — el flujo automático (formulario GHL → agenda → webhook → Supabase) todavía no está conectado.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
