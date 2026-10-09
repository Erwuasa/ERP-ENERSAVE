-- Fix: enertech_precios.company_id and enertech_comisiones.company_id were never backed by a
-- foreign key to enertech_comercializadoras.id. PostgREST can only resolve the embedded-resource
-- syntax used by src/lib/supabase/tariffs-catalog.ts and src/lib/supabase/marco-retributivo.ts
-- (`enertech_comercializadoras ( ... )` inside a `.select()`) when a real FK exists in the schema
-- cache; without one, every request fails with PGRST200 ("Could not find a relationship...") and
-- both screens degrade to "no rows" (the Marco Retributivo page reported empty by the user, and
-- very likely Tarifas/Productos too, which uses the identical pattern against enertech_precios).
--
-- No orphan company_id values exist in either table (checked before writing this migration), so
-- the FKs can be added directly without cleanup. ON DELETE SET NULL: a comercializadora removed
-- from the Enertech feed should not take its precios/comisiones rows down with it — company_id
-- simply goes back to "unknown", same as the many rows that never resolved a company at all.

alter table public.enertech_precios
  add constraint enertech_precios_company_id_fkey
  foreign key (company_id) references public.enertech_comercializadoras (id)
  on delete set null;

alter table public.enertech_comisiones
  add constraint enertech_comisiones_company_id_fkey
  foreign key (company_id) references public.enertech_comercializadoras (id)
  on delete set null;
