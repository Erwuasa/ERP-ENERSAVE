-- Security advisor: function_search_path_mutable (13 functions). Pinning
-- search_path on each function closes the classic "search_path hijack"
-- vector (a malicious schema earlier in the session's search_path shadowing
-- an unqualified identifier) without changing any function's behavior.
alter function private.contrato_id_from_storage_path(text) set search_path = public, private, pg_temp;
alter function private.generate_incidencia_codigo() set search_path = public, private, pg_temp;
alter function private.norm_compania_key(text) set search_path = public, private, pg_temp;
alter function private.norm_tarifa_key(text) set search_path = public, private, pg_temp;
alter function private.set_updated_at() set search_path = public, private, pg_temp;
alter function private.tariff_peaje_label(text) set search_path = public, private, pg_temp;

alter function public.backfill_tariff_prices_from_marco(uuid, marco_retributivo_legacy_archive) set search_path = public, private, pg_temp;
alter function public.ensure_provider_id(text) set search_path = public, private, pg_temp;
alter function public.infer_marco_segmento_from_text(text, text) set search_path = public, private, pg_temp;
alter function public.infer_tariff_segment_from_text(text, text) set search_path = public, private, pg_temp;
alter function public.leads_set_sla_defaults() set search_path = public, private, pg_temp;
alter function public.marco_compania_to_provider_name(text) set search_path = public, private, pg_temp;
alter function public.set_updated_at() set search_path = public, private, pg_temp;
