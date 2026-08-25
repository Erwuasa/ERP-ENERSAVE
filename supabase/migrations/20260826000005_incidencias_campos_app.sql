-- ============================================================
-- 5. Alinear incidencias con el tipo IncidenciaTicket de la app
--    (src/lib/incidencias.ts). Sin estas columnas, cada guardado
--    perdería el tipo de incidencia, los nombres mostrados en el
--    Kanban y la marca temporal que controla la visibilidad de
--    los estados terminales durante 7 días.
-- ============================================================

alter table public.incidencias
  add column if not exists tipo text
    check (tipo in (
      'Tarifa Incorrecta',
      'Retraso de Firma',
      'Error de CUPS',
      'Reclamación Distribuidora',
      'Incidencia Cartera'
    )),
  -- Nombres denormalizados: una incidencia puede crearse sobre un cliente
  -- que todavía no existe como fila en public.clientes (alta desde el
  -- comparador o desde un prospecto), así que cliente_id no siempre basta.
  add column if not exists cliente_nombre text,
  add column if not exists comercial_nombre text,
  -- Momento en que la incidencia entró en un estado terminal; alimenta
  -- isIncidenciaKanbanVisible(). Null mientras la incidencia sigue abierta.
  add column if not exists estado_at timestamptz;

create index if not exists idx_incidencias_tipo on public.incidencias (tipo);

-- titulo es NOT NULL y la app no tiene un campo equivalente: se rellena con
-- el tipo de incidencia, que es justo lo que se muestra como encabezado.
update public.incidencias set tipo = titulo
  where tipo is null
    and titulo in (
      'Tarifa Incorrecta',
      'Retraso de Firma',
      'Error de CUPS',
      'Reclamación Distribuidora',
      'Incidencia Cartera'
    );
