-- Ventas triggers: updated_at, fase audit timeline, dias_en_fase
-- DATA-01: client must NOT insert cambio_fase activities manually

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

comment on function public.handle_updated_at() is 'Sets updated_at to UTC now on row update';

create or replace function public.handle_fase_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.fase is distinct from old.fase then
    new.fase_changed_at := timezone('utc', now());
    new.dias_en_fase := 0;
    insert into public.actividades_ventas (
      prospecto_id,
      comercial_id,
      comercial_name,
      tipo,
      titulo,
      descripcion,
      metadata
    ) values (
      new.id,
      coalesce(new.comercial_id, old.comercial_id),
      new.comercial_name,
      'cambio_fase',
      'Cambio de fase',
      format('%s → %s', old.fase, new.fase),
      jsonb_build_object('fase_anterior', old.fase, 'fase_nueva', new.fase)
    );
  end if;
  return new;
end;
$$;

comment on function public.handle_fase_change() is 'On prospecto fase change: reset SLA counters and insert actividades_ventas cambio_fase row';

create or replace function public.handle_dias_en_fase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.dias_en_fase := floor(
    extract(epoch from (timezone('utc', now()) - new.fase_changed_at)) / 86400
  )::integer;
  return new;
end;
$$;

comment on function public.handle_dias_en_fase() is 'Computes dias_en_fase from fase_changed_at on prospecto insert/update';

drop trigger if exists trigger_prospectos_updated_at on public.prospectos;
create trigger trigger_prospectos_updated_at
  before update on public.prospectos
  for each row
  execute function public.handle_updated_at();

drop trigger if exists trigger_prospectos_fase_change on public.prospectos;
create trigger trigger_prospectos_fase_change
  before update on public.prospectos
  for each row
  execute function public.handle_fase_change();

drop trigger if exists trigger_prospectos_dias_en_fase on public.prospectos;
create trigger trigger_prospectos_dias_en_fase
  before insert or update on public.prospectos
  for each row
  execute function public.handle_dias_en_fase();

drop trigger if exists trigger_tareas_ventas_updated_at on public.tareas_ventas;
create trigger trigger_tareas_ventas_updated_at
  before update on public.tareas_ventas
  for each row
  execute function public.handle_updated_at();
