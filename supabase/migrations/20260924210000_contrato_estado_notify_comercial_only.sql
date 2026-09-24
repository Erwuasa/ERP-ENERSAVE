-- Solo encola notificación si el contrato tiene comercial asignado (un destinatario).

create or replace function public.trg_contratos_equipo_estado_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
    and new.estado is distinct from old.estado
    and new.comercial_id is not null
  then
    perform private.invoke_contract_estado_notify(new.id, old.estado, new.estado);
  end if;
  return new;
end;
$$;

comment on function public.trg_contratos_equipo_estado_notify() is
  'Email al comercial_id del contrato cuando cambia estado (solo ese usuario).';
