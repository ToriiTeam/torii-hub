import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// Header nav rediseño (punto B): las subsecciones y sub-subsecciones que
// antes vivían como TabsList duplicadas dentro del área de contenido
// (ClienteDetalle.tsx, TabDeliveryOS.tsx, TabVSLFunnel.tsx,
// ContenidoOrganico.tsx) ahora se pintan en el header gris de Layout.tsx.
// El sidebar de secciones fijas NO pasa por acá — sigue siendo
// Layout.tsx::clientNavItems/navigationTorii, sin cambios.
//
// Mecanismo: Layout.tsx vive por ENCIMA de las rutas (no puede leer el
// estado local de tabs de un componente 3 niveles más adentro), así que los
// componentes de contenido "publican" su fila de tabs acá vía
// useRegisterSubsection/useRegisterSubsubsection, y Layout la lee vía
// useHeaderNav() para pintarla. Dos niveles nada más (subsección y
// sub-subsección) — es todo lo que pide el rediseño; no hay un tercer
// nivel en ningún lugar del árbol de navegación actual.
export interface HeaderNavRow {
  items: { value: string; label: string }[];
  activeValue: string;
  onChange: (value: string) => void;
}

interface HeaderNavContextValue {
  subsectionRow: HeaderNavRow | null;
  subsubsectionRow: HeaderNavRow | null;
  setSubsectionRow: (row: HeaderNavRow | null) => void;
  setSubsubsectionRow: (row: HeaderNavRow | null) => void;
}

const HeaderNavContext = createContext<HeaderNavContextValue | null>(null);

export function HeaderNavProvider({ children }: { children: ReactNode }) {
  const [subsectionRow, setSubsectionRow] = useState<HeaderNavRow | null>(null);
  const [subsubsectionRow, setSubsubsectionRow] = useState<HeaderNavRow | null>(null);

  return (
    <HeaderNavContext.Provider value={{ subsectionRow, subsubsectionRow, setSubsectionRow, setSubsubsectionRow }}>
      {children}
    </HeaderNavContext.Provider>
  );
}

export function useHeaderNav(): HeaderNavContextValue {
  const ctx = useContext(HeaderNavContext);
  if (!ctx) throw new Error('useHeaderNav must be used within HeaderNavProvider');
  return ctx;
}

// Registra una fila de "subsección" (primer nivel debajo de la sección del
// sidebar — ej. Resumen/Información/VSL Funnel/Social Funnel de Delivery
// OS, o los 7 sub-tabs de VSL Funnel de Torii, que no tiene wrapper propio).
// Se limpia sola al desmontar o cuando `row` pasa a null (ej. un sub-tab sin
// subsección propia). El array `items` se espera estable (const a nivel de
// módulo) — solo activeValue/onChange determinan cuándo re-publicar.
export function useRegisterSubsection(row: HeaderNavRow | null) {
  const { setSubsectionRow } = useHeaderNav();
  useEffect(() => {
    // row === null significa "no soy dueño de esta fila ahora mismo" (ej.
    // TabVSLFunnel/ContenidoOrganico cuando headerLevel !== 'subsection') —
    // NO hay que tocar el estado compartido en ese caso: si lo hiciéramos
    // (setSubsectionRow(null) eager en el mount), pisaríamos lo que el
    // dueño real de la fila (ej. TabDeliveryOS) ya había registrado, y la
    // fila de subsección desaparecería al entrar a una sub-subsección.
    // El cleanup de abajo solo se registra (y por lo tanto solo puede
    // correr) cuando este mismo effect corrió antes con un row no-nulo —
    // así, si este componente pasa legítimamente de tener la fila a no
    // tenerla más (unmount, o row vuelve a null en un re-render), React
    // ejecuta ese cleanup previo antes de este nuevo run y limpia bien.
    if (!row) return;
    setSubsectionRow(row);
    return () => setSubsectionRow(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.activeValue, row?.onChange, row?.items]);
}

// Igual que arriba, un nivel más profundo (ej. las 6 sub-subsecciones de
// Información, las 7 de VSL Funnel, las 5 de Social Funnel).
export function useRegisterSubsubsection(row: HeaderNavRow | null) {
  const { setSubsubsectionRow } = useHeaderNav();
  useEffect(() => {
    // Mismo criterio que useRegisterSubsection arriba.
    if (!row) return;
    setSubsubsectionRow(row);
    return () => setSubsubsectionRow(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.activeValue, row?.onChange, row?.items]);
}
