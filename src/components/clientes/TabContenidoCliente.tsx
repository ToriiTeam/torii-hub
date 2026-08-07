import ContenidoOrganico from '@/pages/ContenidoOrganico';

// Mismo componente que /contenido (modo "Torii" del sidebar), con el
// cliente fijado al de la ficha en vez del Select interno — ver
// fixedClientId en ContenidoOrganico.tsx.
interface Props {
  clientId: string;
}

export default function TabContenidoCliente({ clientId }: Props) {
  return <ContenidoOrganico fixedClientId={clientId} />;
}
