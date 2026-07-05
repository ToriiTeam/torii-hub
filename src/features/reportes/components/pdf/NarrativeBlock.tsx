interface NarrativeBlockProps {
  title: string;
  text: string;
}

export function NarrativeBlock({ title, text }: NarrativeBlockProps) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: '#1a1a1a' }}>{title}</h3>
      <div style={{ width: 32, height: 2, background: '#e5182b', marginBottom: 12 }} />
      <p style={{ fontSize: 13, lineHeight: 1.7, color: '#333', margin: 0, whiteSpace: 'pre-wrap' }}>
        {text || 'Sin contenido.'}
      </p>
    </div>
  );
}
