-- Marco retributivo: timeouts (57014) al leer enertech_comisiones.
--
-- 1) Las políticas SELECT de las tablas Enertech llamaban a private."current_role"() por cada fila
--    (la función hace dos subconsultas a user_profiles). Con 19k filas cada consulta con filtro sobre
--    payload tardaba ~3,3 s y, en paralelo, vencía el statement_timeout (8 s de `authenticated`).
--    Envuelta en (select ...) Postgres la evalúa una vez por consulta (initplan). Mismos permisos.
-- 2) La pantalla buscaba comisiones con `payload->>campania ilike ...` (un barrido por consulta).
--    Se añade un índice por campaña y un RPC que busca por igualdad/prefijo usándolo.

alter policy enertech_comisiones_select_staff on public.enertech_comisiones
  using ((select private."current_role"()) = any (array['superadmin','tramitacion','comercial','jefe_comercial']));

alter policy enertech_precios_select_staff on public.enertech_precios
  using ((select private."current_role"()) = any (array['superadmin','tramitacion','comercial','jefe_comercial']));

alter policy enertech_comercializadoras_select_staff on public.enertech_comercializadoras
  using ((select private."current_role"()) = any (array['superadmin','tramitacion','comercial','jefe_comercial']));

create index if not exists enertech_comisiones_campania_lower_idx
  on public.enertech_comisiones ((lower(payload->>'campania') collate "C"))
  where removed_at is null;

-- Comisiones cuya campaña coincide (sin distinguir mayúsculas) con alguno de `p_exact` o empieza
-- por alguno de `p_prefixes`. SECURITY INVOKER: se aplica la RLS del usuario que llama.
create or replace function public.list_marco_commissions_v1(
  p_prefixes text[] default '{}',
  p_exact text[] default '{}'
)
returns table (
  clave text,
  company_id integer,
  payload jsonb,
  enertech_comercializadoras jsonb
)
language sql
stable
security invoker
set search_path = public
as $$
  with hits as (
    select c.clave
    from public.enertech_comisiones c
    where c.removed_at is null
      and lower(c.payload->>'campania') collate "C" = any (
        array(select lower(x) collate "C" from unnest(coalesce(p_exact, '{}')) x)
      )
    union
    select m.clave
    from unnest(coalesce(p_prefixes, '{}')) p
    cross join lateral (
      select c.clave
      from public.enertech_comisiones c
      where c.removed_at is null
        and lower(c.payload->>'campania') collate "C" >= (lower(p) collate "C")
        and lower(c.payload->>'campania') collate "C" < (lower(p) || chr(1114111)) collate "C"
    ) m
  )
  select c.clave,
         c.company_id::integer,
         c.payload::jsonb,
         case when co.id is null then null
              else jsonb_build_object('nombre', co.nombre, 'logo_url', co.logo_url) end
  from hits h
  join public.enertech_comisiones c on c.clave = h.clave
  left join public.enertech_comercializadoras co on co.id = c.company_id
  limit 5000;
$$;

grant execute on function public.list_marco_commissions_v1(text[], text[]) to authenticated;
