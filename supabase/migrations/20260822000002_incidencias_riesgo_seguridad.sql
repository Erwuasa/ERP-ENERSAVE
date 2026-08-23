-- Extiende tipos de incidencia para alertas automáticas de seguridad runtime
alter table public.incidencias drop constraint if exists incidencias_tipo_check;

alter table public.incidencias
  add constraint incidencias_tipo_check check (
    tipo in (
      'Tarifa Incorrecta',
      'Retraso de Firma',
      'Error de CUPS',
      'Reclamación Distribuidora',
      'Incidencia Cartera',
      'Riesgo de Seguridad'
    )
  );
