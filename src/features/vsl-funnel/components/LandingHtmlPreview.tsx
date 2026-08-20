interface Props {
  html: string;
  title: string;
}

// Preview navegable del código pegado completo (no solo el video) — un
// iframe sandboxeado con srcdoc, nunca dangerouslySetInnerHTML en el DOM
// principal ni un Blob URL (srcdoc es lo seguro para HTML arbitrario
// pegado por el usuario: nunca toca el document real del Hub).
// allow-scripts + allow-same-origin + allow-forms para que el JS propio de
// la landing (tracking a vsl_events, calendario de GHL embebido) corra
// dentro del iframe aislado. Altura fija con scroll interno — son páginas
// largas, no tiene sentido intentar que quepan enteras.
export function LandingHtmlPreview({ html, title }: Props) {
  if (!html.trim()) {
    return (
      <div className="h-[300px] rounded-lg border border-dashed border-border/50 flex items-center justify-center text-xs text-muted-foreground">
        Sin código pegado todavía
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden bg-white" style={{ height: '550px' }}>
      <iframe
        srcDoc={html}
        title={`Preview de ${title}`}
        sandbox="allow-scripts allow-same-origin allow-forms"
        className="w-full h-full"
        style={{ border: 'none' }}
      />
    </div>
  );
}
