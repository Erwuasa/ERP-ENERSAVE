-- Activa tarifa en comparador ERP (independiente de web_visible e is_active AT)
ALTER TABLE public.tariffs
  ADD COLUMN IF NOT EXISTS erp_active boolean NOT NULL DEFAULT true;

UPDATE public.tariffs SET erp_active = true WHERE erp_active IS NOT TRUE;

COMMENT ON COLUMN public.tariffs.erp_active IS
  'Si true, la tarifa entra en el comparador interno del ERP EnerSave. Curación manual por tramitación/superadmin.';

-- Publicar en web y activar en ERP son acciones distintas
CREATE OR REPLACE FUNCTION public.update_tariff_web_settings_v1(
  p_tariff_id uuid,
  p_web_visible boolean,
  p_web_alias text DEFAULT NULL,
  p_erp_active boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.tariffs;
BEGIN
  IF NOT private.is_marco_retributivo_manager() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.tariffs
  SET
    web_visible = p_web_visible,
    web_alias = NULLIF(trim(p_web_alias), ''),
    erp_active = COALESCE(p_erp_active, erp_active),
    updated_at = now()
  WHERE id = p_tariff_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tarifa no encontrada';
  END IF;

  RETURN jsonb_build_object(
    'web_visible', v_row.web_visible,
    'web_alias', v_row.web_alias,
    'erp_active', v_row.erp_active
  );
END;
$$;
