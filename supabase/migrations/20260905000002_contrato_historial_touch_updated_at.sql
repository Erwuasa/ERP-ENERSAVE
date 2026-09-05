-- Al registrar un evento en historial_cambios, actualizar updated_at del contrato
-- para que el filtro "Última modificación" refleje notas, documentos y cambios de estado.

create or replace function public.touch_contrato_on_historial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.entidad_tipo = 'contrato' then
    update public.contratos_equipo
    set updated_at = now()
    where id = new.entidad_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_historial_touch_contrato on public.historial_cambios;
create trigger trg_historial_touch_contrato
  after insert on public.historial_cambios
  for each row
  execute function public.touch_contrato_on_historial();
