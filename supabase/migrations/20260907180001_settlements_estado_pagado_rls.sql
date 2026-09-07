-- ============================================================
-- Consolidación externa: solo tramitación/superadmin pueden
-- pasar liquidaciones a estado 'pagado'. Refuerzo con trigger
-- además de la policy settlements_update existente.
-- Realtime para reflejar cambios en Liquidaciones Internas.
-- ============================================================

create or replace function private.enforce_settlement_estado_pagado()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if new.estado = 'pagado' and (old.estado is distinct from 'pagado') then
    if private.current_role() not in ('superadmin', 'tramitacion') then
      raise exception 'Solo tramitación o superadmin pueden marcar liquidaciones como pagadas';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_settlements_estado_pagado on public.settlements;
create trigger trg_settlements_estado_pagado
  before update on public.settlements
  for each row
  execute function private.enforce_settlement_estado_pagado();

comment on trigger trg_settlements_estado_pagado on public.settlements is
  'Impide que comerciales/jefes marquen liquidaciones como pagadas; exclusivo de consolidación externa.';

drop policy if exists settlements_update on public.settlements;
create policy settlements_update on public.settlements
  for update to authenticated
  using (private.current_role() in ('superadmin', 'tramitacion'))
  with check (private.current_role() in ('superadmin', 'tramitacion'));

alter table public.settlements replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.settlements;
exception
  when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
