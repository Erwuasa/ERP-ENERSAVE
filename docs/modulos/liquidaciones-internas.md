# ESPECIFICACIÓN TÉCNICA Y REGLAS DE AGENTE: LIQUIDACIONES INTERNAS (`/erp/liquidaciones/internas`)

## 1. Alcance, Rol y Arquitectura del Módulo
La pantalla `/erp/liquidaciones/internas` representa la cuenta de resultados económica del comercial dentro del ERP. Cada fila corresponde a un registro contable en `settlements` vinculado a un expediente de `contratos_equipo`. El importe mostrado al comercial es exclusivamente su cuota neta pactada (`user_profiles.commission_percentage` sobre el 100 % liquidado por EnerSave), nunca el importe bruto facturado a la comercializadora.

Esta pantalla está completamente desacoplada de la cola de liquidaciones externas (`/erp/liquidaciones/externas`), que gestiona la deuda comercializadora-EnerSave y los pagos certificados por tramitación. Por seguridad financiera, la ruta está envuelta en `SensitiveScreenShell`: el comercial solo accede a sus propios datos, el jefe a su equipo, y superadmin/tramitación disponen de visión global con filtros de acotación.

---

## 2. Control de Acceso y Visibilidad por Roles (RBAC)
La visibilidad se orquesta mediante `filterSettlementsForRole` (`src/lib/liquidaciones-internas.ts`):
* **Comercial:** Acceso exclusivo a filas donde `settlement.comercialId` coincide con su ID de usuario.
* **Jefe Comercial:** Acceso a sus comisiones directas y a las de los perfiles cuyo `managerId` sea él. Dispone de un conmutador para alternar entre «Solo yo» y «Equipo».
* **Superadmin y Tramitación:** Acceso al histórico global. Disponen del selector `LIQUIDACIONES_ADMIN_SCOPE_OPTIONS` con cuatro alcances: *Todos*, *Por comercial*, *Por director comercial* y *Por equipo de director*. Si se selecciona una modalidad específica sin elegir persona, la tabla permanece vacía.
* **Identidad de Fila:** El comercial asignado es siempre el del contrato (`contract.comercialId`). Si en registros antiguos figura el texto plano `AT`, se sustituye dinámicamente por el `fullName` del perfil.

---

## 3. Motor de Cálculo y Resolución de Comisiones
La función `resolveLiquidacionComisionComercial` determina el importe aplicable en este orden:
1. **Retrocomisión (Clawback):** Si `tipoEvento = 'retrocomision'`, `montoExterno < 0` o la descripción contiene «retrocomisi», el importe es `montoExterno` en negativo.
2. **Importe Externo de Contrato:** Si el contrato presenta `montoExterno > 0` y está `ACTIVADO`, o el settlement está en estado `pendiente`, se toma dicho `montoExterno`.
3. **Cálculo por Marco Retributivo:** Se localiza el tramo con `resolveMarcoCatalogEntry` (compañía, tarifa, tipo y `marcoEntryId`) y `computeComisionBreakdown` aplica el `commissionPercentage` del perfil. Si el perfil carece de porcentaje, la fila se cataloga como «Sin porcentaje» para revisión de superadmin, excluyéndose del KPI de cobro confirmado.
4. **Fallback:** Si el marco no arroja un valor superior a 0, se toma `settlement.montoExterno`.

### Reglas Específicas
* **Alegación Resuelta:** Una alegación con `comisionAjustada` numérica sustituye el importe en la tabla y en los KPIs mediante `resolveEffectiveComision`. El valor original se preserva para auditoría en el chat.
* **Comisiones Fee:** En comisiones tipo fee (`fee_energia` / `fee_potencia`), el marco devuelve `0 €` y la descripción del porcentaje. Queda prohibido pintar este caso como un cobro monetario confirmado.
* **Tarifas sin Tramo Enertech:** Compañías sin comisiones sincronizadas (como Gana Energía, Endesa o Iberdrola) muestran la comisión en blanco, nunca como 0 € silencioso, a la espera de tramo o ajuste manual.

---

## 4. Filtros, Columnas y Calendario de Cobro

### 4.1. Filtros y Ejes Temporales
* **Rango Predeterminado:** Del día 1 del mes en curso a la fecha actual (`defaultLiquidacionesDateRange`).
* **Ejes de Fecha:** La vista permite conmutar entre fecha de alta del settlement (`settlement.createdAt`), fecha de activación del contrato o fecha esperada de cobro (eje predeterminado para el comercial).
* **Buscador y Compañías:** Búsqueda reactiva por cliente, CUPS o referencia. Filtro desplegable por comercializadora con recuento por marca; si la marca seleccionada deja de tener registros por otros filtros, vuelve automáticamente a *Todos*.

### 4.2. Calendario de Cobro
La función `getExpectedCobroDate` fija el vencimiento estimado:
* **Residencial:** Día 10 del mes siguiente a la activación.
* **PYME y Otros:** Día 31 del mes siguiente a la activación.

**Comportamiento de Filas:**
* Fila pendiente con fecha de cobro hoy o futura: Permanece en pendientes con badge `Programado`.
* Fila pendiente con fecha rebasada: Muestra badge `Vencido` en tono de alerta y computa en el KPI de vencidos.
* Fila pagada: Se traslada a cobrados. Las retrocomisiones no entran en el calendario de cobro.

### 4.3. Columnas de la Tabla
ID de contrato, Cliente / CUPS, Dirección, Segmento / Peaje (extraído de `contract.atr` o deducido de la tarifa: `2.0TD`, `3.0TD`, etc.), Compañía / Tarifa, Activación, Baja, Comercial (visible para jefes y administración) y Comisión efectiva. Junto al importe figura el badge de estado (`Pendiente` o `Pagado`). Los importes negativos van en rojo.

---

## 5. Cuadro de Mando de KPIs

Las tarjetas superiores actúan como filtros reactivos sobre la tabla al hacer clic:

### KPIs Principales (Todos los perfiles)
* **Liquidaciones Totales (`computeKpiLiquidacionesTotales`):** Suma de filas pagadas menos retrocomisiones aplicadas.
* **Pendientes de Cobro (`computeKpiPendientesCobro`):** Suma de comisiones positivas en estado distinto de `pagado`, excluyendo retrocomisiones.
* **Retrocomisiones (Clawback):** Suma de movimientos negativos. Solo visible si el usuario posee el permiso `viewRetrocommissions` (`canViewRetrocommissions`).

### KPIs Avanzados (Jefes, Tramitación y Superadmin)
* **Devengado:** Total de comisión generada en el periodo (pagada o pendiente), sin deducir retrocomisiones.
* **Cobrado en Caja:** Importe exacto de settlements en estado `pagado`.
* **Pendiente a Tiempo:** Importe de comisiones pendientes con fecha de cobro presente o futura.
* **Pendiente Vencido:** Importe de comisiones pendientes cuya fecha esperada de cobro ya expiró.
* **Clawback:** Importe absoluto de retrocomisiones y porcentaje que representan sobre el total devengado.
* **Alegaciones Abiertas:** Conteo e importe en disputa (`abierta` + `en_revision`). No computa como cobrado.
* **SLA Medio:** Antigüedad media en días laborables desde la apertura de alegaciones no resueltas.
* **Listo para Autofactura:** Suma de filas pendientes que cumplen las condiciones de facturación del mes.

---

## 6. Sistema de Alegaciones (`alegaciones`)

Gestiona discrepancias de liquidación sustituyendo el botón de reclamación simple:

### 6.1. Ciclo de Vida y Estados
* `abierta`: Creada por el comercial o por su jefe de equipo. Entra en la cola de tramitación.
* `en_revision`: Asignada a tramitación o superadmin para cotejo de datos.
* `resuelta`: Finalizada por tramitación o superadmin confirmando el importe original o aplicando `comisionAjustada`.

### 6.2. Reglas del Expediente
* **Motivo Obligatorio:** Requiere clasificar la causa: *Tramo mal aplicado*, *Porcentaje de perfil erróneo*, *Contrato no activado*, *Retrocomisión indebida*, *Importe duplicado* u *Otro*.
* **Unicidad:** Solo se permite un expediente por settlement; si ya existe, el botón abre el hilo existente.
* **Persistencia:** Los adjuntos deben subirse al bucket de Supabase Storage para no perderse al recargar la página.
* **Prioridad:** Expedientes abiertos más de 2 días laborables se priorizan en la cola de tramitación.
* **Colorimetría:** Ámbar para abierta, azul para en revisión y verde atenuado para resuelta.
* **Pestaña Gestión Tramitación:** Visible para administración y tramitación; unifica alegaciones pendientes y cola de autofacturas.

---

## 7. Cierre Mensual, Autofacturas y Reglas Prohibitivas

### 7.1. Procedimiento de Cierre
1. **Generación de Settlements:** Disparo de `handleGenerateMonthlyLiquidaciones` para crear los movimientos pendientes de contratos activados sin duplicar.
2. **Revisión y Disputas:** El comercial valida importes y formaliza alegaciones si detecta errores.
3. **Resolución de Cola:** Tramitación resuelve alegaciones abiertas antes del cierre definitivo.
4. **Emisión de Autofactura:** El comercial con perfil fiscal completo (`fiscalProfileComplete`) emite su autofactura agrupando filas pendientes de su mes de activación (`filterPendingAutofacturaRows`) con importes ajustados.
5. **Aislamiento de Disputas:** Las filas con alegación abierta quedan excluidas de la autofactura sin bloquear la facturación del resto de comisiones conformes.
6. **Consolidación:** Al marcarse el cobro de la comercializadora en externas, el settlement pasa a `pagado` y se consolida en la cuenta del comercial.

### 7.2. Reglas Invariantes
* **Sin llamadas a Enertech:** Los settlements son registros contables internos del ERP; su creación nunca invoca la API de Enertech.
* **Sin repartos fijos (50/20/30):** Cada liquidación liquida estrictamente el `commission_percentage` individual del comercial sobre el 100 % de EnerSave.
* **Permisos:** La visualización de retrocomisiones exige siempre la validación de `canViewRetrocommissions`.
