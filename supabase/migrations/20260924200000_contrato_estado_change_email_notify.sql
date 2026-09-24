-- Notifica por email al comercial cuando cambia contratos_equipo.estado.
-- Auth edge: vault secret contract-estado-notify-secret (Bearer) = CONTRATO_ESTADO_NOTIFY_SECRET en la función.

create or replace function private.invoke_contract_estado_notify(
  p_contrato_id uuid,
  p_estado_anterior text,
  p_estado_nuevo text
)
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  req_id bigint;
  secret text;
begin
  if p_contrato_id is null or p_estado_nuevo is null or btrim(p_estado_nuevo) = '' then
    return null;
  end if;

  if p_estado_anterior is not distinct from p_estado_nuevo then
    return null;
  end if;

  select decrypted_secret into secret
  from vault.decrypted_secrets
  where name = 'contract-estado-notify-secret'
  limit 1;

  if secret is null or btrim(secret) = '' then
    raise warning 'contract-estado-notify: falta vault secret contract-estado-notify-secret';
    return null;
  end if;

  select net.http_post(
    url := 'https://unxrvwuaqhwogwvynoyq.supabase.co/functions/v1/notify-contract-estado-change',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || secret
    ),
    body := jsonb_build_object(
      'contrato_id', p_contrato_id,
      'estado_anterior', coalesce(p_estado_anterior, ''),
      'estado_nuevo', p_estado_nuevo
    ),
    timeout_milliseconds := 15000
  )
  into req_id;

  return req_id;
end;
$$;

revoke all on function private.invoke_contract_estado_notify(uuid, text, text) from public;

create or replace function public.trg_contratos_equipo_estado_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.estado is distinct from old.estado then
    perform private.invoke_contract_estado_notify(new.id, old.estado, new.estado);
  end if;
  return new;
end;
$$;

drop trigger if exists contratos_equipo_estado_notify on public.contratos_equipo;

create trigger contratos_equipo_estado_notify
  after update of estado on public.contratos_equipo
  for each row
  execute function public.trg_contratos_equipo_estado_notify();

comment on function private.invoke_contract_estado_notify(uuid, text, text) is
  'Encola email solo al user_profiles del comercial_id del contrato (Edge Function notify-contract-estado-change).';
