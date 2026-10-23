-- Avisa a germanbayonr@gmail.com cuando se inserta un contrato.
-- Usa el mismo secreto de vault que el aviso de cambio de estado.

create or replace function private.invoke_contract_created_notify(p_contrato_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  req_id bigint;
  secret text;
begin
  if p_contrato_id is null then
    return null;
  end if;

  select decrypted_secret into secret
  from vault.decrypted_secrets
  where name = 'contract-estado-notify-secret'
  limit 1;

  if secret is null or btrim(secret) = '' then
    raise warning 'contract-created-notify: falta vault secret contract-estado-notify-secret';
    return null;
  end if;

  select net.http_post(
    url := 'https://unxrvwuaqhwogwvynoyq.supabase.co/functions/v1/notify-contract-created',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || secret
    ),
    body := jsonb_build_object('contrato_id', p_contrato_id),
    timeout_milliseconds := 15000
  )
  into req_id;

  return req_id;
end;
$$;

revoke all on function private.invoke_contract_created_notify(uuid) from public;

create or replace function public.trg_contratos_equipo_created_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform private.invoke_contract_created_notify(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists contratos_equipo_created_notify on public.contratos_equipo;

create trigger contratos_equipo_created_notify
  after insert on public.contratos_equipo
  for each row
  execute function public.trg_contratos_equipo_created_notify();

comment on function private.invoke_contract_created_notify(uuid) is
  'Encola un correo al dueño cuando se inserta un contrato (Edge Function notify-contract-created).';
