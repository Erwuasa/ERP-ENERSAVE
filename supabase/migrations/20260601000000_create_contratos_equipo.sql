-- Tabla de contratos del equipo (alta desde wizard de contratación)
-- Aplicar en Supabase: SQL Editor o supabase db push

create table if not exists public.contratos_equipo (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  client_name text not null,
  cups text not null,
  tipo text not null check (tipo in ('luz', 'gas')),
  compania text not null,
  tarifa text not null,
  tipo_precio text,
  consumo_anual numeric not null default 0,
  estado text not null default 'Pendiente de firma',
  comercial_id text not null,
  comercial_name text not null,

  nif text,
  telefono text,
  email text,
  iban text,
  direccion_suministro text,
  direccion_fiscal text,
  codigo_postal text,
  poblacion text,
  provincia text,
  potencia_contratada text,
  precio_fijo_consumo numeric,
  fecha_inicio date,

  tipo_cliente text,
  forma_pago text,
  nombre_comercial text,
  jefe_equipo text,
  wizard_segment text,
  marco_entry_id text,

  monto_interno numeric not null default 0,
  monto_externo numeric not null default 0,

  comentarios_internos jsonb default '[]'::jsonb,
  documentos jsonb default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb
);

create index if not exists contratos_equipo_comercial_id_idx on public.contratos_equipo (comercial_id);
create index if not exists contratos_equipo_cups_idx on public.contratos_equipo (cups);
create index if not exists contratos_equipo_estado_idx on public.contratos_equipo (estado);

comment on table public.contratos_equipo is 'Contratos registrados por el equipo comercial desde el wizard de contratación';
