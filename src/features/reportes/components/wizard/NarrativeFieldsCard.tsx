import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface NarrativeField {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

interface NarrativeFieldsCardProps {
  title: string;
  fields: NarrativeField[];
}

export function NarrativeFieldsCard({ title, fields }: NarrativeFieldsCardProps) {
  return (
    <Card className="bg-card border-border/50">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((f) => (
          <div key={f.label} className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{f.label}</Label>
            <Textarea
              rows={6}
              value={f.value}
              onChange={(e) => f.onChange(e.target.value)}
              placeholder={f.placeholder}
              className="bg-secondary/50 resize-none"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
