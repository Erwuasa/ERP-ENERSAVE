-- Referencia legible de contrato (ej. NH - 837)

alter table public.contratos_equipo
  add column if not exists referencia text;

create unique index if not exists idx_contratos_equipo_referencia
  on public.contratos_equipo (referencia)
  where referencia is not null;

comment on column public.contratos_equipo.referencia is
  'Identificador legible del contrato: dos letras, guión y tres dígitos (ej. NH - 837).';
