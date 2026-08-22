-- Vincular leads de la web con la cuenta Auth (mismo email).
-- Canonical apply is on the unified website Supabase project.

alter table public.leads
  add column if not exists auth_user_id uuid references auth.users (id) on delete set null;

create index if not exists leads_auth_user_id_idx on public.leads (auth_user_id);
create index if not exists leads_email_lower_idx on public.leads (lower(email));
