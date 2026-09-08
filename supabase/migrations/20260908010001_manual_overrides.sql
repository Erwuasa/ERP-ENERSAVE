-- Precedence: AT sync wins unless the field was edited in the ERP.
alter table public.contratos_equipo
  add column if not exists manual_overrides jsonb not null default '{}'::jsonb;

alter table public.settlements
  add column if not exists manual_overrides jsonb not null default '{}'::jsonb;
