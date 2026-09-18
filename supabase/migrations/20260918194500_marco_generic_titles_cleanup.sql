-- Elimina filas del marco con títulos genéricos (sin nombre comercial de tarifa):
-- COMISION POR CONTRATO, COMISION DIRECTA, * Comisión de referencia, etc.

UPDATE marco_retributivo
SET
  activo = false,
  updated_at = now(),
  condiciones = COALESCE(condiciones, '') || ' [DESACTIVADO titulo generico 2026-09-18]'
WHERE activo = true
  AND (
    tarifa ~* '^\s*comisi[oó]n\s+(por\s+)?contrato\s*$'
    OR tarifa ~* '^\s*comisi[oó]n\s+directa\s*$'
    OR tarifa ~* 'comisi[oó]n de referencia'
    OR tarifa ~* '^\s*comisi[oó]n\s+unica\s*$'
    OR tarifa ~* '^\s*comisi[oó]n\s+fija\s*$'
    OR tarifa ~* '^\s*comisi[oó]n\s+variable\s*$'
    OR tarifa ~* '^\s*comisi[oó]n\s*$'
    OR tarifa ~* '^\s*referencia\s*$'
  );
