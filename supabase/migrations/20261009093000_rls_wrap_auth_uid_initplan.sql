-- Performance advisor: auth_rls_initplan. Wrapping auth.uid() as
-- (select auth.uid()) lets Postgres evaluate it once per query instead of
-- once per row. ALTER POLICY only rewrites USING/WITH CHECK, so command,
-- roles and the rest of each policy's logic (including existing
-- private.*() calls, which are left untouched) stay exactly as they were.

alter policy avisos_delete on public.avisos
  using (publicado_por = (select auth.uid()));

alter policy avisos_insert on public.avisos
  with check (
    (publicado_por = (select auth.uid()))
    and private.can_send_aviso(destinatario_tipo, destinatario_ids)
  );

alter policy contrato_notas_insert on public.contrato_notas
  with check (
    (autor_id = (select auth.uid()))
    and (
      (coalesce((select private."current_role"()), ''::text) = any (array['superadmin'::text, 'tramitacion'::text]))
      or (exists (
        select 1 from contratos_equipo c
        where c.id = contrato_notas.contrato_id
          and c.comercial_id = private.current_comercial_id()
      ))
    )
  );

alter policy enertech_sips_consultas_select_own on public.enertech_sips_consultas
  using (solicitado_por = (select auth.uid()));

alter policy enertech_sips_consultas_select_superadmin on public.enertech_sips_consultas
  using (
    exists (
      select 1 from user_profiles up
      where up.id = (select auth.uid()) and up.role = 'superadmin'::text
    )
  );

alter policy leads_select_authenticated on public.leads
  using (
    (auth_user_id = (select auth.uid()))
    or ((select private.current_comercial_id()) is not null)
  );

alter policy staff_invitations_ops_admin on public.staff_invitations
  using (
    exists (
      select 1 from user_profiles up
      where up.id = (select auth.uid())
        and up.role = any (array['superadmin'::text, 'tramitacion'::text])
    )
  )
  with check (
    exists (
      select 1 from user_profiles up
      where up.id = (select auth.uid())
        and up.role = any (array['superadmin'::text, 'tramitacion'::text])
    )
  );

alter policy user_profiles_insert_own_customer on public.user_profiles
  with check ((id = (select auth.uid())) and (role = 'customer'::text));

alter policy user_profiles_select_own on public.user_profiles
  using ((id = (select auth.uid())) or private.is_staff());
