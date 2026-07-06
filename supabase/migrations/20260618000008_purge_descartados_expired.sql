-- Purge prospectos in descartado fase older than 3 months (hard delete + related rows)

begin;

create or replace function public.purge_descartados_expired_v1()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_count integer := 0;
  v_deleted boolean;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  for v_id in
    select p.id
    from public.prospectos p
    where p.fase = 'descartado'
      and coalesce(p.fase_changed_at, p.updated_at, p.created_at)
        < (timezone('utc', now()) - interval '3 months')
  loop
    v_deleted := public.delete_prospecto_v1(v_id);
    if v_deleted then
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

comment on function public.purge_descartados_expired_v1() is
  'Elimina prospectos en fase descartado con más de 3 meses en archivo. Usa delete_prospecto_v1 (RLS por comercial).';

revoke all on function public.purge_descartados_expired_v1() from public;
grant execute on function public.purge_descartados_expired_v1() to authenticated;

commit;
