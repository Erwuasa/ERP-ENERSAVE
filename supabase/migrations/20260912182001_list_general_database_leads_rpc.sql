-- Listado de base de datos: una RPC, auth una vez, sin RLS por fila.

create or replace function public.list_general_database_leads_v1(
  p_search text default null,
  p_segment text default null,
  p_provincia text default null,
  p_localidad text default null,
  p_cnae text default null,
  p_con_telefono boolean default false,
  p_con_web boolean default false,
  p_solo_prioritarios boolean default false,
  p_empleados_min integer default null,
  p_empleados_max integer default null,
  p_limit integer default 200,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path to public
as $function$
declare
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_segment text := nullif(trim(coalesce(p_segment, '')), '');
  v_provincia text := nullif(trim(coalesce(p_provincia, '')), '');
  v_localidad text := nullif(trim(coalesce(p_localidad, '')), '');
  v_cnae text := nullif(trim(coalesce(p_cnae, '')), '');
  v_limit integer := greatest(1, least(coalesce(p_limit, 200), 500));
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if coalesce((select private.current_role()), '') not in (
    'superadmin', 'tramitacion', 'comercial', 'jefe_comercial'
  ) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'rows', coalesce(
      (
        select jsonb_agg(to_jsonb(r) order by r.created_at desc)
        from (
          select
            id,
            nombre,
            sede,
            numero_adm_seg_social,
            numero_empleados,
            cnae,
            codigo_postal,
            localidad,
            provincia,
            telefono,
            direccion_web,
            codigo_ine,
            descripcion_actividad,
            segment,
            source,
            created_at
          from public.general_database_leads
          where (v_segment is null or segment = v_segment)
            and (v_provincia is null or provincia = v_provincia)
            and (v_localidad is null or localidad = v_localidad)
            and (v_cnae is null or cnae = v_cnae)
            and (
              coalesce(p_con_telefono, false) = false
              or (telefono is not null and trim(telefono) <> '')
            )
            and (
              coalesce(p_con_web, false) = false
              or (direccion_web is not null and trim(direccion_web) <> '')
            )
            and (
              coalesce(p_solo_prioritarios, false) = false
              or source in ('campana', 'web')
            )
            and (p_empleados_min is null or numero_empleados >= p_empleados_min)
            and (p_empleados_max is null or numero_empleados <= p_empleados_max)
            and (
              v_search is null
              or nombre ilike ('%' || v_search || '%')
              or coalesce(sede, '') ilike ('%' || v_search || '%')
              or coalesce(localidad, '') ilike ('%' || v_search || '%')
              or coalesce(provincia, '') ilike ('%' || v_search || '%')
              or coalesce(cnae, '') ilike ('%' || v_search || '%')
              or coalesce(descripcion_actividad, '') ilike ('%' || v_search || '%')
              or coalesce(telefono, '') ilike ('%' || v_search || '%')
            )
          order by created_at desc
          limit v_limit
          offset v_offset
        ) r
      ),
      '[]'::jsonb
    ),
    'filter_options', public.list_general_database_filter_options_v1()
  );
end;
$function$;

grant execute on function public.list_general_database_leads_v1(
  text, text, text, text, text, boolean, boolean, boolean, integer, integer, integer, integer
) to authenticated;
