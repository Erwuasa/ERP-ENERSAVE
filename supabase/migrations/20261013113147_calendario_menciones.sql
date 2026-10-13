-- Mencionar a otros usuarios en un evento del calendario.
-- Quien está en `menciones` lo ve en su calendario. Solo el dueño (o superadmin) lo edita.

begin;

alter table public.calendario_eventos
  add column if not exists menciones uuid[] not null default '{}';

create index if not exists calendario_eventos_menciones_idx
  on public.calendario_eventos using gin (menciones);

drop policy if exists calendario_select on public.calendario_eventos;
create policy calendario_select on public.calendario_eventos
  for select to authenticated
  using (
    private.current_role() = 'superadmin'
    or usuario_id = private.current_comercial_id()
    or private.current_comercial_id() = any (menciones)
    or (
      private.current_role() = 'jefe_comercial'
      and (
        usuario_id in (
          select id from public.user_profiles
          where id = private.current_comercial_id()
             or manager_id = private.current_comercial_id()
        )
        or menciones && (
          select coalesce(array_agg(id), '{}'::uuid[])
          from public.user_profiles
          where manager_id = private.current_comercial_id()
        )
      )
    )
  );

commit;
