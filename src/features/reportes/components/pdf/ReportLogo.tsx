// Text wordmark, not an image — the only logo asset on hand has a black
// background and this PDF is white-background, so it wouldn't work here.
// Swap this for an <img> once a proper white-background/transparent logo
// file exists.
export function ReportLogo({ size = 32 }: { size?: number }) {
  return (
    <span
      style={{
        fontFamily: 'Inter, sans-serif',
        fontWeight: 700,
        fontSize: size,
        color: '#e5182b',
        letterSpacing: '0.05em',
      }}
    >
      TORII
    </span>
  );
}
