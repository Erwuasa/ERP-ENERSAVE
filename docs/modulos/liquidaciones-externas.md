# ESPECIFICACIÓN TÉCNICA Y REGLAS DE AGENTE: LIQUIDACIONES EXTERNAS (`/erp/liquidaciones/externas`)

## 1. Alcance, Rol y Arquitectura del Módulo
La pantalla `/erp/liquidaciones/externas` gestiona la deuda comercializadora-EnerSave y la conciliación bancaria de comisiones mayoristas. Su función es auditar los contratos activados en `contratos_equipo` que están pendientes de liquidar por parte de cada comercializadora, cotejar los pagos recibidos (mediante liquidaciones mensuales o ficheros de liquidación) y certificar el cambio de estado a `pagado` en la tabla `settlements`.

Este módulo es el puente financiero que alimenta `/erp/liquidaciones/internas`: hasta que un settlement no es marcado como pagado en esta pantalla tras certificar el ingreso de la comercializadora, dicho movimiento permanece en estado `pendiente` (programado o vencido) en la cuenta del comercial y no puede ser consolidado como cobro de caja.

El acceso está restringido por RLS y perfiles a `superadmin` y `tramitacion`. Los jefes de equipo cuentan únicamente con lectura agregada de los nodos de su red mediante `JefeComercialNodoSection`.

---

## 2. Modelo de Conciliación y Flujo de Estados
El circuito contable mayorista se rige por la siguiente secuencia:

1. **Devengo por Activación:** Al activarse un contrato en el ERP, se genera o enlaza su registro en `settlements` en estado `pendiente` con el importe mayorista correspondiente (`montoExterno`).
2. **Cola de Pendientes por Marca (`PendingContractsPanel` / `PendingByBrandPanel`):** Agrupa los contratos activados organizados por comercializadora suministradora (Naturgy, Repsol, Niba, Axpo, TotalEnergies, etc.) que aún no han sido incluidos en una liquidación externa cerrada.
3. **Conciliación de Liquidación:** Tramitación coteja la factura o justificante emitido por la comercializadora frente a los CUPS y tramos registrados en el sistema.
4. **Certificación y Marcado de Pago:** Al validar el cobro mayorista, tramitación o superadmin marca la liquidación como `pagado`.
5. **Impacto en Cascada en Liquidaciones Internas:** La actualización a `pagado` en `settlements`:
   * Traslada la comisión neta del comercial de *Pendiente* a *Cobrado en Caja*.
   * Habilita la inclusión definitiva del movimiento en la autofactura mensual del agente.
   * Cancela la alarma de cobro vencido en el calendario de cobros.

---

## 3. Arquitectura de Interfaz y Vistas

### 3.1. Barra Superior y Métricas Globales (`LiquidacionesExternasHeader`)
Expone la visión consolidada de tesorería mayorista:
* **Total Facturado / Pendiente de Cobro:** Importe bruto acumulado que las comercializadoras adeudan a EnerSave por contratos activados.
* **Cobrado en el Periodo:** Total ingresado y conciliado durante el mes o rango de fechas seleccionado.
* **Desviaciones / Retenciones:** Importes retenidos por incidencias, discrepancias de tramo o penalizaciones aplicadas por las comercializadoras.

### 3.2. Selector de Comercializadora (`CompaniaTabsBar`)
Barra interactiva con pestañas horizontales que lista las comercializadoras activas junto a un contador dinámico de contratos pendientes de liquidación y el importe pendiente acumulado por marca. Permite conmutar la vista entre una comercializadora concreta o la vista agregada general.

### 3.3. Panel de Contratos Pendientes (`PendingContractsPanel`)
Renderiza tarjetas (`PendingContractCard`) o filas de contratos activados que aguardan pago mayorista. Cada elemento expone:
* Identificador de contrato, Cliente, CIF/DNI y código CUPS.
* Fecha de activación formal y días transcurridos desde la activación.
* Tarifa contratada, peaje de acceso y volumen de consumo anual estimado.
* Comisión mayorista teórica (100 % EnerSave según marco) y comisión neta asignada al comercial.
* Acciones: Validar cobro unitario, abrir expediente de discrepancia o marcar incidencia con la comercializadora.

### 3.4. Panel de Liquidaciones Consolidadas (`ConsolidatedLiquidationsPanel`)
Histórico de facturas de comisión emitidas a comercializadoras organizadas por periodo mensual y compañía:
* Código o número de liquidación mayorista.
* Número de contratos liquidados asociados.
* Base imponible, IVA y total de la factura de comisión.
* Estado: `Borrador`, `Emitida`, `Cobrada` o `En Disputa`.
* Acciones de exportación de desglose para contabilidad.

---

## 4. Jerarquía de Nodos y Jefes de Equipo (`JefeComercialNodoSection`)
Permite visualizar la distribución de los contratos mayoristas pendientes y cobrados estructurados por nodo organizativo:
* Agrupa las liquidaciones bajo el `managerId` de cada director o jefe de equipo.
* Permite auditar el volumen mayorista aportado por cada equipo comercial a la facturación global de EnerSave.
* Facilita a los directores comerciales supervisar el cumplimiento de los cobros de las carteras generadas por sus agentes subordinados sin acceso a la configuración contable global de la empresa.

---

## 5. Reglas Invariantes y Directivas para el Programador
1. **Desacoplamiento Estricto con Enertech:** Esta pantalla opera sobre las tablas contables locales (`settlements`, `contratos_equipo`). El marcado de pago o conciliación de comisiones **no dispara llamadas ni mutaciones hacia la API de Enertech**.
2. **Atomicidad en el Marcado a Pagado:** La acción de marcar un settlement o lote de contratos como pagado debe actualizar de forma atómica el estado `pagado`, la marca de tiempo `paid_at` y el identificador del usuario auditor en `settlements` para garantizar la consistencia en los KPIs de liquidaciones internas.
3. **Aislamiento de Retrocomisiones en Externas:** Las retrocomisiones descontadas por una comercializadora en su liquidación deben asociarse al settlement del contrato correspondiente con importe negativo, evitando desvirtuar los importes de comisiones positivas de otros suministros en la misma remesa.
4. **Permisos de Modificación:** Solo los roles `superadmin` y `tramitacion` tienen permisos de escritura para certificar cobros y cambiar estados; los demás roles operan en modo solo lectura condicionado por jerarquía RBAC.
