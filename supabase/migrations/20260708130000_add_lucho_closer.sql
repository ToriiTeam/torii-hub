-- The `closers` table had exactly one row ("Benjamin"), which made him the
-- only real pick in Closers.tsx's "Nueva Agenda" roster Select for Torii's
-- own calls. The business default for the Torii account's closer should be
-- Lucho, not Benjamin — this adds him to the roster (mirroring Benjamin's
-- row shape) so the frontend default-select change in Closers.tsx has
-- someone to default to.
INSERT INTO closers (name, stage, commitment, goal)
VALUES ('Lucho', 'activo', 3, 50000);
