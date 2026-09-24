-- Realtime: comisión visible (user_profiles.commission_percentage) para comerciales en sesión.

alter table public.user_profiles replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.user_profiles;
exception
  when duplicate_object then null;
end $$;
