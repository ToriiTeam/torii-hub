-- Corrects the 11 of 12 'Otro ingreso' rows that were originally 'unico' or
-- 'recurrente' (frequency, not origin) and got miscategorized into 'Otro
-- ingreso' by the normalization in 20260707120000. Mapping verified by hand
-- against the original xlsx tracker (fecha + monto + nombre) — see
-- conversation history. Matched by id (not source, since some names repeat
-- across different rows) with amount/date as a belt-and-suspenders guard
-- against an id typo silently touching the wrong row.
--
-- legacy_frequency is intentionally left NULL forever: the 'unico'/
-- 'recurrente' concept doesn't survive anywhere else and is confirmed
-- unrecoverable (see 20260707130000_incomes_legacy_frequency.sql).

UPDATE public.incomes SET type = 'Cliente'
WHERE id = 'ce7929a6-ada8-46f4-9c0d-15d38a3b76f6' AND amount = 700 AND date = '2025-12-12'; -- Fernanda Casares

UPDATE public.incomes SET type = 'Cliente'
WHERE id = '283eeb7e-9121-4297-ac13-7065a763dba8' AND amount = 1000 AND date = '2025-12-23'; -- Teresa Gamón

UPDATE public.incomes SET type = 'Cliente'
WHERE id = '66e24e53-c625-455f-a636-0aabc20daeca' AND amount = 300 AND date = '2025-12-26'; -- Raquel

UPDATE public.incomes SET type = 'Aporte de capital'
WHERE id = '460e8f34-de49-42fa-acab-565697333244' AND amount = 322 AND date = '2025-12-10'; -- Benjamín

UPDATE public.incomes SET type = 'Aporte de capital'
WHERE id = 'b60f6637-e372-49c7-95ca-49e652f16466' AND amount = 300 AND date = '2025-12-20'; -- Benjamin

UPDATE public.incomes SET type = 'Aporte de capital'
WHERE id = '72c1c548-fe2b-436d-a881-4fabce78e799' AND amount = 300 AND date = '2025-12-20'; -- Luciano

UPDATE public.incomes SET type = 'Aporte de capital'
WHERE id = 'e7be7c2c-bd95-4091-b899-717c69edd541' AND amount = 600 AND date = '2025-12-10'; -- Luciano

UPDATE public.incomes SET type = 'Cliente'
WHERE id = '7ff0f302-3fc0-4b2e-ac9c-30edd227ff67' AND amount = 1500 AND date = '2026-01-06'; -- Lorena Grundy

UPDATE public.incomes SET type = 'Cliente'
WHERE id = '53b67ffc-e1f8-4425-8404-33bdbe931182' AND amount = 700 AND date = '2026-01-05'; -- Salvador Luna

UPDATE public.incomes SET type = 'Cliente'
WHERE id = 'f907aff6-ffa0-4823-9b0c-1fec9fddcdfa' AND amount = 1000 AND date = '2026-01-05'; -- Marino López

UPDATE public.incomes SET type = 'Aporte de capital'
WHERE id = '150f17c7-db75-451c-8d8f-496aa16fc592' AND amount = 130 AND date = '2026-01-28'; -- Luciano Mariani

-- 325e9f21-d28a-44d7-ab54-b94d65926723 (Tere Gamon, 175, 2026-03-13) stays
-- 'Otro ingreso' — confirmed correct: "lo que nos debía de ADS". No-op,
-- listed here for a complete audit trail of the review.
