-- ============================================================
-- 6. Dos ajustes sobre los esquemas anteriores:
--    a) Permitir que la comisión llegue a la pantalla de
--       liquidaciones en cuanto el comercial da de alta el
--       contrato, sin dejarle marcarla como pagada.
--    b) La unicidad de NIF/CIF es por comercial, no global.
-- ============================================================

-- ------------------------------------------------------------
-- a) settlements: alta desde el comercial
-- ------------------------------------------------------------

-- SELECT: un jefe comercial debe ver también las liquidaciones de su equipo,
-- igual que hace filterSettlementsForRole() en la app.
-- private.accessible_comercial_ids() ya resuelve propio + equipo + superadmin.
drop policy if exists settlements_select on public.settlements;
create policy settlements_select on public.settlements
  for select to authenticated
  using (
    private.current_role() in ('superadmin', 'tramitacion')
    or comercial_id in (select private.accessible_comercial_ids())
  );

-- INSERT: al registrar un contrato la app genera la liquidación pendiente del
-- comercial que lo firma, así que ya no puede ser exclusivo de superadmin y
-- tramitación. Se acota a liquidaciones propias, en estado 'pendiente' y no
-- retrocomisión: un comercial no puede darse por pagado ni inyectar ajustes
-- negativos, que siguen siendo terreno de tramitación.
drop policy if exists settlements_insert on public.settlements;
create policy settlements_insert on public.settlements
  for insert to authenticated
  with check (
    private.current_role() in ('superadmin', 'tramitacion')
    or (
      comercial_id in (select private.accessible_comercial_ids())
      and estado = 'pendiente'
      and es_retrocomision = false
    )
  );

-- UPDATE y DELETE siguen restringidos a superadmin/tramitación: pasar a
-- 'pagado' (consolidar) y registrar la retrocomisión de una baja son acciones
-- de back office, no del comercial.

-- ------------------------------------------------------------
-- b) clientes: unicidad de NIF/CIF por comercial
-- ------------------------------------------------------------

-- El índice global impedía que dos comerciales tuvieran en su cartera al mismo
-- cliente, y la app deduplica por NIF + comercial (clientMatchKey en
-- src/lib/clients.ts). Un mismo cliente puede tener varios CUPS y, si es pyme,
-- varios CIF: eso son contratos distintos o filas distintas, no un conflicto.
drop index if exists public.idx_clientes_nif_cif;

create unique index if not exists idx_clientes_nif_cif_comercial
  on public.clientes (nif_cif, comercial_id)
  where nif_cif is not null;
