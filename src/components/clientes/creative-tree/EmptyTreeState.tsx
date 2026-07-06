import { Button } from '@/components/ui/button';
import { Plus, GitBranch } from 'lucide-react';

interface Props {
  onCreate: () => void;
}

export function EmptyTreeState({ onCreate }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
      <GitBranch className="h-10 w-10 text-muted-foreground" />
      <p className="text-muted-foreground text-sm max-w-xs">
        Todavía no hay creativos registrados para este cliente. Empezá con el primer ángulo base.
      </p>
      <Button onClick={onCreate} className="bg-primary">
        <Plus className="h-4 w-4 mr-1.5" />Agregar primer ángulo
      </Button>
    </div>
  );
}
