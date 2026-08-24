-- Habilita Realtime en contratos_equipo para avisos de tramitación (INSERT).

alter table public.contratos_equipo replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.contratos_equipo;
exception
  when duplicate_object then null;
end $$;
