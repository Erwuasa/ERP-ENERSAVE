-- Avisos: destinatarios dirigidos, visto_por uuid[], helpers RLS y envío programado.
-- Reutiliza tipo (info/importante/urgente) como prioridad; no duplica columna.

begin;

-- ---------------------------------------------------------------------------
-- 1. Columnas de destinatario y envío programado
-- ---------------------------------------------------------------------------
alter table public.avisos
  add column if not exists destinatario_tipo text not null default 'todos'
    check (destinatario_tipo in ('todos', 'usuario', 'equipo')),
  add column if not exists destinatario_ids uuid[] not null default '{}',
  add column if not exists fecha_envio_programada timestamptz;

-- ---------------------------------------------------------------------------
-- 2. visto_por: text[] → uuid[]
-- ---------------------------------------------------------------------------
alter table public.avisos
  alter column visto_por drop default,
  alter column visto_por type uuid[] using visto_por::uuid[],
  alter column visto_por set default '{}'::uuid[];

-- ---------------------------------------------------------------------------
-- 3. Helpers de acceso (mismo estilo que private.can_access_contrato)
-- ---------------------------------------------------------------------------
create or replace function private.can_view_aviso(
  p_destinatario_tipo text,
  p_destinatario_ids uuid[],
  p_publicado_por uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    coalesce((select private.current_role()), '') in ('superadmin', 'tramitacion')
    or p_destinatario_tipo = 'todos'
    or auth.uid() = any(p_destinatario_ids)
    or (
      p_destinatario_tipo = 'equipo'
      and p_publicado_por in (
        select manager_id from public.user_profiles where id = auth.uid()
        union
        select id from public.user_profiles where id = auth.uid()
      )
    );
$$;

create or replace function private.can_send_aviso(
  p_destinatario_tipo text,
  p_destinatario_ids uuid[]
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    coalesce((select private.current_role()), '') = 'superadmin'
    or (
      coalesce((select private.current_role()), '') = 'jefe_comercial'
      and p_destinatario_tipo in ('usuario', 'equipo')
      and p_destinatario_ids <@ coalesce((
        select array_agg(id) from public.user_profiles
        where manager_id = auth.uid()
      ), array[]::uuid[])
    );
$$;

-- ---------------------------------------------------------------------------
-- 4. Policies RLS
-- ---------------------------------------------------------------------------
drop policy if exists avisos_select on public.avisos;
create policy avisos_select on public.avisos
  for select to authenticated
  using (
    (fecha_envio_programada is null or fecha_envio_programada <= now())
    and private.can_view_aviso(destinatario_tipo, destinatario_ids, publicado_por)
  );

drop policy if exists avisos_insert on public.avisos;
create policy avisos_insert on public.avisos
  for insert to authenticated
  with check (
    publicado_por = auth.uid()
    and private.can_send_aviso(destinatario_tipo, destinatario_ids)
  );

-- Update solo para marcar visto_por; cualquier autenticado puede marcar su lectura.
drop policy if exists avisos_update on public.avisos;
create policy avisos_update on public.avisos
  for update to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- 5. Índice para avisos no vistos al login (filtro por fecha de envío)
-- ---------------------------------------------------------------------------
create index if not exists idx_avisos_fecha_envio on public.avisos (fecha_envio_programada);

commit;
