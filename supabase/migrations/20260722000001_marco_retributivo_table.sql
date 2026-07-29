-- Marco retributivo: catálogo de comisiones por compañía/tarifa (ERP)

begin;

create table if not exists public.marco_retributivo (
  id uuid primary key default gen_random_uuid(),
  compania text not null,
  tarifa text not null,
  tipo text not null check (tipo in ('luz', 'gas')),
  peaje text not null,
  segmento text not null default 'ambos' check (segmento in ('residencial', 'pyme', 'ambos')),
  condicion_1 text,
  condicion_2 text,
  condiciones text,
  comision_tipo text not null check (comision_tipo in ('fija', 'porcentaje')),
  comision_base numeric(10, 2) not null default 0,
  comision_unidad text not null check (
    comision_unidad in (
      'eur_cups',
      'porcentaje_facturado',
      'porcentaje_consumo',
      'porcentaje_termino'
    )
  ),
  vigencia_meses integer not null default 0,
  fecha_inicio date not null default current_date,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text references public.erp_comerciales (id)
);

create index if not exists marco_retributivo_compania_idx on public.marco_retributivo (compania);
create index if not exists marco_retributivo_tipo_idx on public.marco_retributivo (tipo);
create index if not exists marco_retributivo_activo_idx on public.marco_retributivo (activo) where activo = true;

comment on table public.marco_retributivo is
  'Marco retributivo EnerSave: comisiones por compañía, tarifa, peaje y segmento.';

drop trigger if exists trg_marco_retributivo_updated_at on public.marco_retributivo;
create trigger trg_marco_retributivo_updated_at
  before update on public.marco_retributivo
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

create or replace function private.is_marco_retributivo_manager()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select private.jwt_user_role() in ('superadmin', 'tramitacion');
$$;

alter table public.marco_retributivo enable row level security;

drop policy if exists marco_retributivo_select on public.marco_retributivo;
create policy marco_retributivo_select on public.marco_retributivo
  for select to authenticated
  using (
    activo = true
    or private.is_marco_retributivo_manager()
  );

drop policy if exists marco_retributivo_insert on public.marco_retributivo;
create policy marco_retributivo_insert on public.marco_retributivo
  for insert to authenticated
  with check (private.is_marco_retributivo_manager());

drop policy if exists marco_retributivo_update on public.marco_retributivo;
create policy marco_retributivo_update on public.marco_retributivo
  for update to authenticated
  using (private.is_marco_retributivo_manager())
  with check (private.is_marco_retributivo_manager());

drop policy if exists marco_retributivo_delete on public.marco_retributivo;
create policy marco_retributivo_delete on public.marco_retributivo
  for delete to authenticated
  using (private.is_marco_retributivo_manager());

-- ---------------------------------------------------------------------------
-- Seed desde catálogo TS (32 entradas)
-- ---------------------------------------------------------------------------

insert into public.marco_retributivo (
  id,
  compania,
  tarifa,
  tipo,
  peaje,
  segmento,
  condicion_1,
  condicion_2,
  condiciones,
  comision_tipo,
  comision_base,
  comision_unidad,
  vigencia_meses,
  fecha_inicio,
  activo
)
values
  ('28167512-bbda-465d-a985-da8ba94c53fa', 'Endesa', 'One Luz Indexada 3P', 'luz', '2.0TD', 'ambos', NULL, NULL, 'Residencial y negocio ≤15 kW. Alta con permanencia 2 meses.', 'porcentaje', 1.2, 'porcentaje_facturado', 2, '2026-05-01', true),
  ('12071067-fbef-4e76-a7da-6669bf605642', 'Endesa', 'One Luz Fija Directa', 'luz', '2.0TD', 'ambos', NULL, NULL, 'Potencia ≤15 kW. Pago único por CUPS activado.', 'fija', 48, 'eur_cups', 2, '2026-05-01', true),
  ('f43a41fd-96fc-4d17-a3c0-53a397151b53', 'Endesa', 'Negocio Fórmula Variable', 'luz', '3.0TD', 'ambos', NULL, NULL, 'PYME >15 kW. Requiere consumo anual >8.000 kWh.', 'fija', 145, 'eur_cups', 6, '2026-05-01', true),
  ('fccd93ad-08a6-44de-abd8-44611ec47ef5', 'Endesa', 'Industrial AT Fija', 'luz', '6.0TD', 'ambos', NULL, NULL, 'Alta tensión. Bonus trimestral +15% si se mantiene 12 meses.', 'fija', 340, 'eur_cups', 12, '2026-05-01', true),
  ('76d17373-be79-404b-a9fb-3b584a4244b4', 'Iberdrola', 'Plan Estable Luz', 'luz', '2.0TD', 'ambos', NULL, NULL, 'Permanencia 12 meses. Sin penalización tras mes 6.', 'fija', 52, 'eur_cups', 12, '2026-05-01', true),
  ('c90fdd78-713d-44bc-a286-44672024297a', 'Iberdrola', 'Plan Online Indexado', 'luz', '2.0TD', 'ambos', NULL, NULL, 'Indexado OMIE + margen gestión. Sin permanencia mínima.', 'porcentaje', 1.15, 'porcentaje_facturado', 12, '2026-05-01', true),
  ('28cc53ed-cc1c-450d-aef6-e006512f9ef1', 'Iberdrola', 'Plan 3 Grabaciones PYME', 'luz', '3.0TD', 'ambos', NULL, NULL, 'Potencia >15 kW. Documentación CIF y consumo histórico.', 'fija', 155, 'eur_cups', 12, '2026-05-01', true),
  ('62b58574-4f42-4862-a75a-b9842cc55908', 'Iberdrola', 'Alta Tensión a Medida', 'luz', '6.0TD / 6.1TD', 'ambos', NULL, NULL, 'Margen indexado industrial. Incentivo extra trimestre +15%.', 'porcentaje', 1.8, 'porcentaje_termino', 12, '2026-05-01', true),
  ('981bb214-d0fa-45b6-ab5d-aa08e97ea30b', 'Naturgy', 'Tarifa Por Uso', 'luz', '2.0TD', 'ambos', NULL, NULL, 'Residencial. Permanencia 4 meses.', 'fija', 46, 'eur_cups', 4, '2026-05-01', true),
  ('48e96259-3d2b-41cd-a7c9-8d191fed952f', 'Naturgy', 'Indexada Pool Negocios', 'luz', '3.0TD', 'ambos', NULL, NULL, 'Indexado horario. Consumo mínimo 5.000 kWh/año.', 'porcentaje', 1.25, 'porcentaje_facturado', 4, '2026-05-01', true),
  ('76cd3928-57db-4b4e-ab10-17a210640137', 'Naturgy', 'Gas & Luz Industrial Alianza', 'luz', '6.0TD', 'ambos', NULL, NULL, 'Dual fuel opcional. Revisión trimestral de margen.', 'fija', 320, 'eur_cups', 12, '2026-05-01', true),
  ('3592f10a-70cc-414d-a0a8-57e9c0e8add1', 'Niba', 'Tarifa 2.0TD Fija', 'luz', '2.0TD', 'ambos', NULL, NULL, 'Canal preferente. Permanencia 12 meses.', 'fija', 55, 'eur_cups', 12, '2026-05-01', true),
  ('2ed90358-5795-46fe-a911-386fee57b76e', 'Niba', 'Tarifa 3.0TD PYME', 'luz', '3.0TD', 'ambos', NULL, NULL, 'PYME con potencia >15 kW. Liquidación a 60 días.', 'fija', 165, 'eur_cups', 12, '2026-05-01', true),
  ('505f3fed-a689-4e43-a5d1-ccd5d950cb6b', 'Repsol', 'Luz Fija Hogar', 'luz', '2.0TD', 'ambos', NULL, NULL, 'Permanencia 4 meses. Descuento Waylet opcional.', 'fija', 44, 'eur_cups', 4, '2026-05-01', true),
  ('3da6eb0c-d943-445f-a75a-a675afd0000f', 'Repsol', 'Luz Indexada Empresas', 'luz', '3.0TD', 'ambos', NULL, NULL, 'Pool OMIE + fee gestión. Alta digital.', 'porcentaje', 1.1, 'porcentaje_facturado', 4, '2026-05-01', true),
  ('2c9b4a57-948c-4907-a6c8-7470454a758e', 'TotalEnergies', 'Tarifa A Tu Ritmo', 'luz', '2.0TD', 'ambos', NULL, NULL, 'Sin permanencia. Comisión reducida en baja anticipada.', 'fija', 42, 'eur_cups', 0, '2026-05-01', true),
  ('9655e5b8-bd53-4d10-a9bb-9ca4cec82742', 'TotalEnergies', 'PYME Fija 12 Meses', 'luz', '3.0TD', 'ambos', NULL, NULL, 'Precio energía cerrado 12 meses.', 'fija', 138, 'eur_cups', 6, '2026-05-01', true),
  ('8ff01e8c-f5a8-4cac-af64-84e5d28a44e0', 'Axpo', 'Indexada Pool Max', 'luz', '3.0TD', 'ambos', NULL, NULL, 'Industrial ligero. Consumo >10.000 kWh/año.', 'porcentaje', 1.35, 'porcentaje_termino', 6, '2026-05-01', true),
  ('8a27eda6-6aed-46b7-a983-1776b473bc49', 'Axpo', 'Industrial Pool 6.0', 'luz', '6.0TD', 'ambos', NULL, NULL, 'Alta tensión. Negociación caso a caso.', 'fija', 365, 'eur_cups', 12, '2026-05-01', true),
  ('ce6b3360-2902-478d-ae91-192cc270c4fd', 'Ignis', 'Luz Fija Residencial', 'luz', '2.0TD', 'ambos', NULL, NULL, 'Pago por CUPS. Sin requisito de consumo mínimo.', 'fija', 50, 'eur_cups', 6, '2026-05-01', true),
  ('d6e0596c-27c2-483e-a1f5-50d7c310f58b', 'Ignis', 'PYME Indexada', 'luz', '3.0TD', 'ambos', NULL, NULL, 'Indexado con tope de precio opcional.', 'porcentaje', 1.2, 'porcentaje_facturado', 6, '2026-05-01', true),
  ('418c86cc-8e62-4847-affa-94c713b2ff5a', 'Octopus', 'Flexible Octopus', 'luz', '2.0TD', 'ambos', NULL, NULL, 'Sin permanencia. Tarifa dinámica horaria.', 'porcentaje', 0.95, 'porcentaje_facturado', 0, '2026-05-01', true),
  ('d118da3a-a289-4173-a956-a7d5d091a79b', 'Octopus', 'Solar & Battery', 'luz', '2.0TD', 'ambos', NULL, NULL, 'Requiere instalación solar o batería vinculada.', 'fija', 75, 'eur_cups', 12, '2026-05-01', true),
  ('7852f0f7-7cf1-4987-a9f8-9c5e0117e5e1', 'Factorenergia', 'Factor Luz Hogar', 'luz', '2.0TD', 'ambos', NULL, NULL, 'Canal online. Permanencia 3 meses.', 'fija', 40, 'eur_cups', 3, '2026-05-01', true),
  ('2bc222a6-3aeb-41ca-abf8-619c202c20d0', 'Factorenergia', 'Factor PYME', 'luz', '3.0TD', 'ambos', NULL, NULL, 'Autónomos y PYME. Facturación electrónica obligatoria.', 'fija', 125, 'eur_cups', 6, '2026-05-01', true),
  ('de75f73c-6e01-4ece-a586-8bee663d1f41', 'Global Connect', 'Connect Luz Básica', 'luz', '2.0TD', 'ambos', NULL, NULL, 'White-label canal. Liquidación mensual.', 'fija', 47, 'eur_cups', 6, '2026-05-01', true),
  ('b5df9dbd-5eff-4bbc-ac14-e99c98f29f55', 'Global Connect', 'Connect Business 3.0', 'luz', '3.0TD', 'ambos', NULL, NULL, 'PYME multi-CUPS con descuento volumen.', 'fija', 140, 'eur_cups', 6, '2026-05-01', true),
  ('f3338868-5b69-4378-afbd-cc3f31b480c7', 'Iberdesa', 'Iberdesa Hogar Fija', 'luz', '2.0TD', 'ambos', NULL, NULL, 'Regional norte. Permanencia 6 meses.', 'fija', 43, 'eur_cups', 6, '2026-05-01', true),
  ('0d9b464d-ae54-4919-a6e6-d25224809056', 'Iberdesa', 'Iberdesa Negocios', 'luz', '3.0TD', 'ambos', NULL, NULL, 'Comercios locales. Potencia hasta 50 kW.', 'fija', 130, 'eur_cups', 6, '2026-05-01', true),
  ('303166d3-f77c-44a3-a488-19198dadbb25', 'Endesa', 'Gas Confort RL.1/2', 'gas', 'RL.1 / RL.2', 'ambos', NULL, NULL, 'Residencial canalizado. Permanencia 2 meses.', 'fija', 42, 'eur_cups', 2, '2026-05-01', true),
  ('98dadee8-9c57-4bf7-aafe-2828aef57def', 'Naturgy', 'Gas PYME RL.3', 'gas', 'RL.3', 'ambos', NULL, NULL, 'Industrial ligero. Consumo >50.000 kWh/año.', 'fija', 175, 'eur_cups', 4, '2026-05-01', true),
  ('626771d3-d108-41bf-a89b-8b23b7445324', 'Naturgy', 'Gas Indexado Canalizado', 'gas', 'RL.2 / RL.3', 'ambos', NULL, NULL, 'Margen sobre término de consumo.', 'porcentaje', 0.8, 'porcentaje_consumo', 4, '2026-05-01', true)
on conflict (id) do nothing;

commit;
