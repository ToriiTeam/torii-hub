import Closers from '@/pages/Closers';

// Mismo componente que /closers (modo "Torii" del sidebar), con el owner
// fijado al cliente de la ficha en vez del Select interno — ver
// fixedClientId en Closers.tsx.
interface Props {
  clientId: string;
}

export default function TabClosingCliente({ clientId }: Props) {
  return <Closers fixedClientId={clientId} />;
}
