-- Elimina el Árbol de Iteraciones (CreativeTree.tsx + src/features/creative-tree/),
-- reemplazado por VSL Funnel > Historial (creative_iteration_log, pasada 2).
-- Contenido real presente antes de este DROP (verificado, no eran datos de
-- prueba): creative_nodes tenía 46 filas (42 de Raúl Galindo, 4 de Adolfo
-- Blasco) y hypothesis_history tenía 4 filas (3 abiertas de Raúl, 1 cerrada
-- de Adolfo con resultado real). Eliminación confirmada explícitamente por
-- el usuario sin necesidad de exportar ese contenido.

-- angles.creative_node_id es la única columna fuera de este árbol que
-- referencia creative_nodes — queda huérfana sin el Árbol de Iteraciones
-- (TabAngulos.tsx, el único código que la leía/escribía, también se elimina
-- en esta pasada), así que se dropea junto con las tablas.
ALTER TABLE public.angles DROP COLUMN creative_node_id;

-- hypothesis_history referencia clients/angles/creative_nodes con NO ACTION
-- — se dropea primero para no chocar con la FK hacia creative_nodes.
DROP TABLE public.hypothesis_history;

DROP TABLE public.creative_nodes;
