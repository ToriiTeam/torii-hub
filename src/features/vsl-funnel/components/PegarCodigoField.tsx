import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { extractYoutubeFromHtml } from '@/features/vsl-funnel/lib/extractYoutubeFromHtml';

interface Props {
  label?: string;
  codigoPegado: string;
  videoEmbedUrl: string | null;
  onChange: (codigoPegado: string, videoEmbedUrl: string | null) => void;
}

// Textarea de código pegado + preview del video que extractYoutubeFromHtml
// detecta en él. La extracción corre en onBlur (no en cada tecla) — si no
// encuentra nada, el video_embed_url anterior queda como estaba, nunca se
// borra por un pegado parcial o un código sin iframe todavía.
export function PegarCodigoField({ label = 'Código pegado (HTML)', codigoPegado, videoEmbedUrl, onChange }: Props) {
  function handleBlur() {
    if (!codigoPegado.trim()) return;
    const extracted = extractYoutubeFromHtml(codigoPegado);
    if (extracted) onChange(codigoPegado, extracted);
  }

  return (
    <div className="space-y-2">
      <div>
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Textarea
          value={codigoPegado}
          onChange={(e) => onChange(e.target.value, videoEmbedUrl)}
          onBlur={handleBlur}
          rows={3}
          placeholder="Pegá acá el código embed (iframe de YouTube)..."
          className="bg-secondary/50 mt-1 font-mono text-xs resize-none"
        />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Video detectado</Label>
        {videoEmbedUrl ? (
          <div className="mt-1 aspect-video rounded-lg overflow-hidden border border-border/50 bg-black">
            <iframe src={videoEmbedUrl} className="w-full h-full" allowFullScreen title="Video preview" />
          </div>
        ) : (
          <div className="mt-1 aspect-video rounded-lg border border-dashed border-border/50 flex items-center justify-center text-xs text-muted-foreground">
            Sin video detectado en el código pegado
          </div>
        )}
      </div>
    </div>
  );
}
