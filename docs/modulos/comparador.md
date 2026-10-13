# ESPECIFICACIÓN TÉCNICA Y REGLAS DE AGENTE: COMPARADOR DE TARIFAS (`/erp/comparador`)

## 1. Información General y Propósito del Módulo
El Comparador de Tarifas es el motor de simulación y tarificación en tiempo real del ERP. Su función es recibir los datos de un suministro eléctrico (captura manual o extracción automatizada IA/OCR), contrastarlos contra el catálogo de tarifas de comercializadoras activas (`enertech_precios`) y cruzar los resultados con el Marco Retributivo (`enertech_comisiones`) para determinar el coste exacto, los impuestos regulados, el ahorro frente a la factura actual y la comisión comercial asignada.

La pantalla opera con dos paneles sincronizados: el panel izquierdo para la captura de parámetros del suministro y el panel derecho para la visualización, filtrado y conversión de ofertas.

---

## 2. Panel Izquierdo: Captura y Comportamiento de Entradas

### 2.1. Selector de Segmento
* **Opciones:** `Residencial` | `PYME`.
* **Comportamiento:** Modifica el estado global (`segment`). Filtra el catálogo para admitir únicamente tarifas cuyo segmento coincida o aplique a `AMBOS`. Si la tarifa proviene de Enertech con segmento por defecto, el peaje de acceso manda en la asignación (`2.0TD` → Residencial; `3.0TD` a `6.4TD` → PYME, salvo especificación en el nombre comercial).

### 2.2. Tarifa de Acceso (ATR) y Adaptación Dinámica del Grid
* **Opciones:** `2.0` (2.0TD), `3.0` (3.0TD), `6.1`, `6.2`, `6.3`, `6.4`.
* **Reglas de estructura visual:**
  * **Peaje 2.0:** Renderiza 2 inputs de potencia (`P1`, `P2`) y 3 inputs de consumo (`P1`, `P2`, `P3`).
  * **Peajes 3.0 a 6.4:** Renderiza 6 inputs de potencia (`P1` a `P6`) y 6 inputs de consumo (`P1` a `P6`).
* **Saneamiento de estado:** Al cambiar a una tarifa con menor número de periodos, los valores en periodos inactivos se limpian automáticamente a `0` para no falsear los cálculos en segundo plano.

### 2.3. Modal de Ajuste de Precios de Factura Actual (Botones ⚙️)
Situados junto a los encabezados de Potencia y Consumo:
* **Potencia actual:** Permite registrar los precios unitarios en €/kW·día (conmutables a €/kW·año).
* **Consumo actual:** Registra los precios en €/kWh para cada periodo activo.
* **Propósito:** Reconstruir el coste de la factura original y contrastar precios unitarios directos periodo a periodo contra las ofertas recomendadas.

### 2.4. Mapeo de Precios de Catálogo
* **Tarifas Monómicas (Precio fijo 24h, ej. TotalEnergies 2.0TD):** Poseen un único precio para potencia y otro para energía. El sistema replica dicho valor a todos los periodos activos: Precio Potencia $P_1 = \dots = P_n$ y Precio Energía $P_1 = \dots = P_m$.
* **Tarifas con Discriminación Completa (ej. Axpo 3.0TD):** Cada periodo ($P_1$ a $P_6$) aplica su precio independiente registrado en base de datos.

### 2.5. Otros Conceptos: Persistencia y Exclusiones
* **Conceptos Persistentes (`Alquiler Contador`, `Bono Social`, `Energía Reactiva`):** Son costes regulados del punto de suministro que el cliente continuará pagando por normativa. Se suman a la factura actual y a todas las ofertas evaluadas.
* **Conceptos No Persistentes (`Otros Costes / SVA`):** Seguros, mantenimientos o asistencias de la comercializadora saliente. Solo se computan en la factura actual del cliente y se excluyen de las nuevas ofertas; su eliminación forma parte directa del ahorro mensual conseguido.

### 2.6. Consumo Anual, Días Facturados y Descuentos
* **Consumo Anual (kWh):** No altera la factura mensual inmediata. Determina la elegibilidad técnica de la tarifa (límites de consumo de la comercializadora) y ubica el suministro en el tramo correspondiente del Marco Retributivo para comisiones.
* **Días Facturados:** Multiplicador temporal obligatorio para el cálculo de potencia fija (por defecto: `30`).
* **Total Factura €:** Importe final neto pagado actualmente (impuestos incluidos). Es la referencia base para calcular el ahorro.
* **Descuento Potencia (%) y Descuento Energía (%):** Bonificaciones comerciales del contrato actual que permiten calcular la factura teórica sin descuentos y demostrar la competitividad de la nueva propuesta.

---

## 3. Motor de Cálculo y Formulación Matemática

Para cada tarifa evaluada:

1. **Término de Potencia ($TP$):**  
   $$TP_{\text{oferta}} = \sum_{i=1}^{n} \left( \text{Potencia}_i \, (\text{kW}) \times \text{Precio Potencia Oferta}_i \, (€/\text{kW}\cdot\text{día}) \times \text{Días Facturados} \right)$$  
   *(Si el precio de catálogo es anual: $\text{Precio}_{\text{día}} = \text{Precio}_{\text{año}} / 365$).*

2. **Término de Energía ($TE$):**  
   $$TE_{\text{oferta}} = \sum_{j=1}^{m} \left( \text{Consumo}_j \, (\text{kWh}) \times \text{Precio Energía Oferta}_j \, (€/\text{kWh}) \right)$$  
   *(En tarifas monómicas 1P: el precio es uniforme para todo $j$).*

3. **Base Imponible e Impuestos Regulados:**  
   $$\text{Conceptos Persistentes} = \text{Alquiler Contador} + \text{Bono Social} + \text{Energía Reactiva}$$  
   $$\text{Base IEE} = TP_{\text{oferta}} + TE_{\text{oferta}}$$  
   $$\text{IEE} = \text{Base IEE} \times 0.0511269632$$  
   $$\text{Base IVA} = \text{Base IEE} + \text{IEE} + \text{Conceptos Persistentes}$$  
   $$\text{IVA} = \text{Base IVA} \times 0.21$$  
   $$\text{Total Factura Oferta} = \text{Base IVA} + \text{IVA}$$

4. **Ahorro Económico y Porcentual:**  
   $$\text{Ahorro Mensual (€)} = \text{Total Factura Actual} - \text{Total Factura Oferta}$$  
   $$\text{Ahorro Porcentual (\%)} = \left( \frac{\text{Ahorro Mensual (€)}}{\text{Total Factura Actual}} \right) \times 100$$

5. **Comisión Comercial (Marco Retributivo):**  
   Cruce por `Comercializadora`, `Tarifa`, `Segmento`, `Peaje` y `Consumo Anual`. Si el tramo es fijo, asigna el importe pactado por contrato (`POR CONTRATO`); si es variable (€/MWh o €/kWh), multiplica el consumo anual por el coeficiente correspondiente (`EN BASE AL CONSUMO`).

---

## 4. Panel Derecho: Filtros, Ordenación y Offer Cards

### 4.1. Toolbar Superior y Criterios de Filtrado
* **Contador de Resultados:** Indicador reactivo (`X ofertas`) del total de propuestas que superan los filtros técnicos y de visualización.
* **Toggle de Ordenación:**  
  * `Más ahorro` (predeterminado): Orden descendente por `Ahorro Mensual (€)`. Desempate por mayor comisión comercial.  
  * `Más comisión`: Orden descendente por la comisión percibida en euros. Desempate por mayor ahorro mensual.
* **Filtro Tipo Tarifa (`Fijo` | `Indexado`):** Valida la tipología del producto. Si el campo en base de datos es nulo, aplica una heurística de contingencia por expresión regular sobre el nombre comercial (`/indexad|variable|pass[\s-]?through|pool|flex/i` categoriza como `Indexado`; de lo contrario, `Fijo`).
* **Filtro Atributos - `Sin SVA`:** Excluye tarifas con servicios de valor añadido o mantenimientos obligatorios vinculados.
* **Filtro Atributos - `Potencia BOE`:** Aplica verificación híbrida: comprueba si el nombre comercial contiene la palabra completa `BOE` (mediante `/\bBOE\b/i`) o si los precios de potencia coinciden matemáticamente con los peajes y cargos regulados oficiales del BOE sin margen comercial añadido.

### 4.2. Anatomía de la Offer Card
* **Cabecera:** Logotipo de la compañía, nombre comercial completo de la tarifa, estrella de destacada en la oferta #1 del ranking, y accesos rápidos de guardado y descarga técnica. Badges de segmento (`Residencial` / `PYME`) y tipo (`Fijo` / `Indexado`).
* **Banner de Comisión (Ámbar):** Importe destacado en euros (`XXX,XX €`), marco aplicado (ej. *Marco retributivo · General*) y modalidad (`POR CONTRATO` o `EN BASE AL CONSUMO`).
* **Desglose de Costes e Impuestos:** Líneas para `Potencia` y `Energía`. Importe `Total: XXX,XX €` en verde de alto contraste, acompañado de la composición fiscal: `IEE e IVA incluidos · Base XX,XX € · IEE X,XX € · IVA XX,XX €`.
* **Métrica de Ahorro y Desplegable:** Etiqueta `Ahorra XX,XX €/mes (XX.XX%)` en verde si el balance es favorable, o en rojo indicando sobrecoste si resulta más cara. Acordeón `Desglose` con tabla periodo a periodo de consumos, potencias y precios aplicados.
* **Acciones de Conversión:** Botón `Contratar` (abre el Wizard de Contratación transfiriendo los datos del formulario e inyectando la tarifa seleccionada) y botón `Enviar propuesta por email` (genera el estudio de ahorro en PDF y abre el modal de envío).

---

## 5. Directivas de Implementación Técnica
* **Precisión Numérica:** Operaciones internas con coma flotante de precisión completa (mínimo 6 decimales). El redondeo a 2 decimales (`0.01 €`) aplica exclusivamente en renderizado de UI y generación de PDFs.
* **Debounce:** Recálculo del ranking con debounce de 250 a 300 ms en inputs numéricos para mantener la fluidez de la interfaz.
* **Tolerancia a Nulos:** Inputs vacíos o borrados deben resolverse internamente como `0`, impidiendo estados `NaN`.
* **Modularización:** Componentes desacoplados en `src/components/comparador/`: `ComparadorAccessTariffChips`, `ComparadorPeriodRows`, `ComparadorEnergyFields`, `ComparadorProposalFilters` y `ComparadorOfferCard`.
