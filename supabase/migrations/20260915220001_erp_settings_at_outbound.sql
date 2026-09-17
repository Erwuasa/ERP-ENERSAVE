-- Interruptor global de envío ERP → AT (cuenta del canal).
-- Cualquier usuario del ERP puede crear/actualizar contratos; el push sale
-- siempre con la API key del channel_admin. Superadmin puede apagarlo.

create table if not exists public.erp_settings (
  id smallint primary key default 1 check (id = 1),
  at_outbound_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

comment on table public.erp_settings is
  'Ajustes globales del ERP. at_outbound_enabled corta el alta/cambio de contratos hacia el CRM de AT.';

insert into public.erp_settings (id, at_outbound_enabled)
values (1, true)
on conflict (id) do nothing;

alter table public.erp_settings enable row level security;

drop policy if exists erp_settings_select on public.erp_settings;
create policy erp_settings_select on public.erp_settings
  for select to authenticated
  using (
    private.current_role() in ('superadmin', 'tramitacion', 'comercial', 'jefe_comercial')
  );

drop policy if exists erp_settings_update on public.erp_settings;
create policy erp_settings_update on public.erp_settings
  for update to authenticated
  using (private.current_role() = 'superadmin')
  with check (private.current_role() = 'superadmin');

grant select on public.erp_settings to authenticated;
grant update (at_outbound_enabled, updated_at, updated_by) on public.erp_settings to authenticated;

create or replace function public.erp_settings_touch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.id := 1;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists erp_settings_touch on public.erp_settings;
create trigger erp_settings_touch
  before update on public.erp_settings
  for each row
  execute function public.erp_settings_touch();

alter table public.erp_settings replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.erp_settings;
exception
  when duplicate_object then null;
end $$;
