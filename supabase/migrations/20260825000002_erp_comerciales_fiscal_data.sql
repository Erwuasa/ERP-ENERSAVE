-- Datos fiscales de comerciales (autofactura) sobre user_profiles
alter table public.user_profiles
  add column if not exists dni text,
  add column if not exists direccion text,
  add column if not exists ciudad text,
  add column if not exists codigo_postal text,
  add column if not exists telefono text,
  add column if not exists iban text;
