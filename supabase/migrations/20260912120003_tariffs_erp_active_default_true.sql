-- Todas las tarifas activas en comparador ERP por defecto; tramitación puede desactivar.
ALTER TABLE public.tariffs
  ALTER COLUMN erp_active SET DEFAULT true;

UPDATE public.tariffs
SET erp_active = true
WHERE erp_active IS NOT TRUE;
