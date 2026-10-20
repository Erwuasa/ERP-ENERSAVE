-- Permite al staff actualizar SOLO los campos de reconciliación en sus propias filas.
-- El resto de columnas (request_body, http_status, response_body, IDs…) son inmutables
-- desde el cliente; solo la Edge Function (service role) puede escribirlas.
create policy "staff_update_own_reconciliation"
  on public.enertech_outbound_events
  for update
  to authenticated
  using (
    private.is_staff()
    and user_id = auth.uid()
  )
  with check (
    private.is_staff()
    and user_id = auth.uid()
  );
