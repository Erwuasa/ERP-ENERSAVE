-- Invitación al área customer desde la bandeja de leads web.

alter table public.leads
  add column if not exists erp_invited_at timestamptz,
  add column if not exists erp_invited_by uuid references public.user_profiles (id) on delete set null;

create index if not exists leads_erp_invited_at_idx on public.leads (erp_invited_at);

comment on column public.leads.erp_invited_at is
  'Momento en que se invitó al lead al área customer del ERP.';
comment on column public.leads.erp_invited_by is
  'Staff que envió la invitación al área customer.';
