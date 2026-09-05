-- Notas de contrato, historial auditable unificado y bucket privado contrato-notas.
-- Adaptado a user_profiles (UUID); erp_comerciales fue eliminado en identity migration.

begin;

-- ---------------------------------------------------------------------------
-- Helpers de acceso (contrato / incidencia)
-- ---------------------------------------------------------------------------
create or replace function private.can_access_contrato(p_contrato_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    coalesce((select private.current_role()), '') in ('superadmin', 'tramitacion')
    or exists (
      select 1
      from public.contratos_equipo c
      where c.id = p_contrato_id
        and (
          c.comercial_id = private.current_comercial_id()
          or c.comercial_id in (
            select up.id
            from public.user_profiles up
            where up.manager_id = private.current_comercial_id()
          )
        )
    );
$$;

create or replace function private.can_access_incidencia(p_incidencia_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    coalesce((select private.current_role()), '') in ('superadmin', 'tramitacion')
    or exists (
      select 1
      from public.incidencias i
      where i.id = p_incidencia_id
        and (
          i.creado_por = auth.uid()
          or i.asignado_a = auth.uid()
        )
    );
$$;

create or replace function private.contrato_id_from_storage_path(p_path text)
returns uuid
language sql
immutable
as $$
  select nullif(split_part(p_path, '/', 1), '')::uuid;
$$;

-- ---------------------------------------------------------------------------
-- 1. contrato_notas
-- ---------------------------------------------------------------------------
create table if not exists public.contrato_notas (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos_equipo(id) on delete cascade,
  autor_id uuid not null references public.user_profiles(id),
  autor_nombre text not null,
  texto text not null,
  estado_en_el_momento text,
  archivos_adjuntos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_contrato_notas_contrato
  on public.contrato_notas (contrato_id, created_at desc);

alter table public.contrato_notas enable row level security;

drop policy if exists contrato_notas_select on public.contrato_notas;
create policy contrato_notas_select on public.contrato_notas
  for select to authenticated
  using (private.can_access_contrato(contrato_id));

drop policy if exists contrato_notas_insert on public.contrato_notas;
create policy contrato_notas_insert on public.contrato_notas
  for insert to authenticated
  with check (
    autor_id = auth.uid()
    and (
      coalesce((select private.current_role()), '') in ('superadmin', 'tramitacion')
      or exists (
        select 1
        from public.contratos_equipo c
        where c.id = contrato_notas.contrato_id
          and c.comercial_id = private.current_comercial_id()
      )
    )
  );

comment on table public.contrato_notas is
  'Notas internas del contrato; archivos_adjuntos es metadata JSON (paths en bucket contrato-notas).';

-- ---------------------------------------------------------------------------
-- 2. historial_cambios (contrato + incidencia)
-- ---------------------------------------------------------------------------
create table if not exists public.historial_cambios (
  id uuid primary key default gen_random_uuid(),
  entidad_tipo text not null check (entidad_tipo in ('contrato', 'incidencia')),
  entidad_id uuid not null,
  tipo_evento text not null check (
    tipo_evento in ('nota_interna', 'cambio_estado', 'documento_adjuntado')
  ),
  estado_anterior text,
  estado_nuevo text,
  motivo text,
  autor_id uuid not null references public.user_profiles(id),
  autor_nombre text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_historial_entidad
  on public.historial_cambios (entidad_tipo, entidad_id, created_at desc);

alter table public.historial_cambios enable row level security;

drop policy if exists historial_select on public.historial_cambios;
create policy historial_select on public.historial_cambios
  for select to authenticated
  using (
    coalesce((select private.current_role()), '') in ('superadmin', 'tramitacion')
    or (
      entidad_tipo = 'contrato'
      and private.can_access_contrato(entidad_id)
    )
    or (
      entidad_tipo = 'incidencia'
      and private.can_access_incidencia(entidad_id)
    )
  );

drop policy if exists historial_insert on public.historial_cambios;
create policy historial_insert on public.historial_cambios
  for insert to authenticated
  with check (true);

comment on table public.historial_cambios is
  'Historial auditable unificado para contratos e incidencias.';

-- ---------------------------------------------------------------------------
-- 3. Storage bucket contrato-notas (privado)
--    Convención de path: {contrato_id}/{nota_id}/{filename}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contrato-notas',
  'contrato-notas',
  false,
  52428800,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]::text[]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists contrato_notas_storage_select on storage.objects;
create policy contrato_notas_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'contrato-notas'
    and private.can_access_contrato(private.contrato_id_from_storage_path(name))
  );

drop policy if exists contrato_notas_storage_insert on storage.objects;
create policy contrato_notas_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'contrato-notas'
    and private.can_access_contrato(private.contrato_id_from_storage_path(name))
    and (
      coalesce((select private.current_role()), '') in ('superadmin', 'tramitacion')
      or exists (
        select 1
        from public.contratos_equipo c
        where c.id = private.contrato_id_from_storage_path(name)
          and c.comercial_id = private.current_comercial_id()
      )
    )
  );

drop policy if exists contrato_notas_storage_update on storage.objects;
create policy contrato_notas_storage_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'contrato-notas'
    and private.can_access_contrato(private.contrato_id_from_storage_path(name))
  )
  with check (
    bucket_id = 'contrato-notas'
    and private.can_access_contrato(private.contrato_id_from_storage_path(name))
  );

drop policy if exists contrato_notas_storage_delete on storage.objects;
create policy contrato_notas_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'contrato-notas'
    and private.can_access_contrato(private.contrato_id_from_storage_path(name))
    and (
      coalesce((select private.current_role()), '') in ('superadmin', 'tramitacion')
      or exists (
        select 1
        from public.contratos_equipo c
        where c.id = private.contrato_id_from_storage_path(name)
          and c.comercial_id = private.current_comercial_id()
      )
    )
  );

grant select, insert on public.contrato_notas to authenticated;
grant select, insert on public.historial_cambios to authenticated;

commit;
