-- Marco retributivo: enlace AT Enterprise + metadatos de comisión del colaborador

alter table public.marco_retributivo
  add column if not exists at_marco_id text,
  add column if not exists at_rate_id uuid,
  add column if not exists collaborator_min numeric(12, 4),
  add column if not exists collaborator_max numeric(12, 4),
  add column if not exists at_kwh_min numeric(14, 2),
  add column if not exists at_kwh_max numeric(14, 2),
  add column if not exists at_commission_type text,
  add column if not exists at_mr_count integer,
  add column if not exists source text not null default 'manual',
  add column if not exists at_synced_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'marco_retributivo_source_check'
      and conrelid = 'public.marco_retributivo'::regclass
  ) then
    alter table public.marco_retributivo
      add constraint marco_retributivo_source_check
      check (source in ('manual', 'at'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'marco_retributivo_at_marco_id_key'
      and conrelid = 'public.marco_retributivo'::regclass
  ) then
    alter table public.marco_retributivo
      add constraint marco_retributivo_at_marco_id_key unique (at_marco_id);
  end if;
end $$;

create index if not exists marco_retributivo_at_rate_id_idx
  on public.marco_retributivo (at_rate_id)
  where at_rate_id is not null;

create index if not exists marco_retributivo_source_idx
  on public.marco_retributivo (source);

comment on column public.marco_retributivo.at_marco_id is
  'Clave estable AT (id de marco o fingerprint rate+tramo). UNIQUE, NULL = alta manual.';
comment on column public.marco_retributivo.at_rate_id is
  'UUID de tarifa AT (rates.id). Se enlaza a tariffs.at_rate_id.';
comment on column public.marco_retributivo.source is
  'manual = alta ERP; at = sincronizado desde AT Enterprise.';
comment on column public.marco_retributivo.collaborator_min is
  'Comisión mínima del colaborador (AT no expone la base de matriz).';
comment on column public.marco_retributivo.collaborator_max is
  'Comisión máxima del colaborador para esa tarifa/tramo.';
