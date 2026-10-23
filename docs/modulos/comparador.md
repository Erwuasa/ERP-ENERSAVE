# ESPECIFICACIÓN TÉCNICA Y REGLAS DE AGENTE: COMPARADOR DE TARIFAS (`/erp/comparador`)

## 1. Información General y Propósito del Módulo
El Comparador de Tarifas es el motor de simulación y tarificación en tiempo real del ERP. Su función es recibir los datos de un suministro eléctrico (captura manual o extracción automatizada IA/OCR), contrastarlos contra el catálogo de tarifas de comercializadoras activas (`enertech_precios`) y cruzar los resultados con el Marco Retributivo (`enertech_comisiones`) para determinar el coste exacto, los impuestos regulados, el ahorro frente a la factura actual y la comisión comercial asignada.

La pantalla opera con dos paneles sincronizados: el panel izquierdo para la captura de parámetros del suministro y el panel derecho para la visualización, filtrado y conversión de ofertas. Las comisiones se piden solo para las tarifas del peaje elegido, no para las ~19.000 filas de `enertech_comisiones`.

---

## 2. Panel Izquierdo: Captura y Comportamiento de Entradas

### 2.1. Selector de suministro y de segmento
* **Suministro:** `Luz` | `Gas`, con icono y el botón elegido en color sólido (cian o naranja). No hay etiqueta «Suministro», «Segmento» ni «Tarifa de acceso». Luz usa peajes `2.0` a `6.4`. Gas usa `RL1`, `RL2`, `RL3`, `RL4` y `RL5` (también vale `RL.1`). Una fila es de gas si el peaje es RL, si `producto` es `gas` o si el nombre lleva la palabra «gas». Así una comercializadora solo de gas (CHC) no sale en luz. No hay periodos P1–P6: un consumo en kWh, término fijo en €/día y término variable en €/kWh. `RL1` deja el segmento en residencial; `RL2` a `RL5` lo dejan en PYME.
* **Segmento:** `Residencial` | `PYME`.
* **Comportamiento:** Modifica el estado global (`segment`). Filtra el catálogo para admitir únicamente tarifas cuyo segmento coincida o aplique a `AMBOS`. Si la tarifa proviene de Enertech con segmento por defecto, el peaje de acceso manda en la asignación (`2.0TD` → Residencial; `3.0TD` a `6.4TD` → PYME; `RL1` → Residencial; `RL2` a `RL5` → PYME).

### 2.2. Tarifa de Acceso (ATR) y Adaptación Dinámica del Grid
* **Luz:** `2.0` (2.0TD), `3.0` (3.0TD), `6.1`, `6.2`, `6.3`, `6.4`.
* **Gas:** `RL1` a `RL5`. El formulario pide el kWh del periodo. El término fijo de la oferta es 1 × €/día × días. Bono social y reactiva no salen.
* **Reglas de estructura visual.** A la vista solo está la cantidad de cada periodo. El precio unitario de la factura actual va plegado, detrás del icono de cada bloque. Si la lectura de la factura trae precios, ese bloque se abre y cada precio (fondo ámbar) queda justo debajo de su kW o de su kWh, en la misma columna. El bloque crece hacia abajo y el panel hace scroll. No se encoge ni se monta sobre el bloque siguiente.
  * **Peaje 2.0:** Potencia `P1` y `P2` (kW y, si hay precio, €/kW·día). Consumo `P1`, `P2` y `P3` (kWh/día y, si hay precio, €/kWh). La etiqueta del precio es solo la unidad, sin el texto «Precio actual».
  * **Peajes 3.0 a 6.4:** Potencia `P1` a `P6` y consumo `P1` a `P6`, con el mismo par cantidad/precio.
* **Saneamiento de estado:** Al cambiar a una tarifa con menor número de periodos, los valores en periodos inactivos se limpian automáticamente a `0` para no falsear los cálculos en segundo plano.

### 2.3. Precios de la factura actual
Empiezan ocultos. El icono junto a Potencia o Consumo los despliega a mano.
* **Potencia:** precio en €/kW·día de cada periodo activo.
* **Consumo:** precio en €/kWh de cada periodo activo.
* **Factura adjunta:** al leer un PDF o una imagen, si la extracción trae precios de potencia o de energía, esos campos se rellenan y se muestran. El número de huecos sigue el peaje de la factura (2.0 o 3.0 en adelante).
* **IA:** el lector principal es la Edge Function `invoice-ai-enersave` (Gemini 2.0 Flash). Exige sesión y el secreto `GEMINI_API_KEY` en la función; no está desplegada. Si falla, se usa `invoice-ai-openai` y, si tampoco, el servicio de respaldo y el OCR local. Una factura de electricidad se queda en luz aunque la dirección o el mix digan «gas». El peaje sale de «Peaje de transporte y distribución» y el desglose rellena €/kW·día y €/kWh por periodo. Los kWh de cada periodo salen de «Consumos», no de «Lecturas reales» (el índice del contador). El «Código CUPS» rellena el campo CUPS y, si las letras de control cuadran, se consulta el SIPS para el consumo anual. «Financiación de Bono Social» rellena el bono, también cuando el importe de una pyme pasa de unos pocos euros. Un DNI con peaje 2.0TD es residencial. Una factura de gas rellena el peaje RL, el kWh, el término fijo €/día y el término variable €/kWh.
* **Uso:** reconstruyen el coste de la factura original con las mismas fórmulas que la oferta (`kW × €/kW·día × días` y `kWh × €/kWh`) y rellenan la columna «Tarifa actual» del estudio PDF.

### 2.4. Mapeo de Precios de Catálogo
* **Tarifas Monómicas (Precio fijo 24h, ej. TotalEnergies 2.0TD):** Poseen un único precio para potencia y otro para energía. El sistema replica dicho valor a todos los periodos activos: Precio Potencia $P_1 = \dots = P_n$ y Precio Energía $P_1 = \dots = P_m$.
* **Tarifas con Discriminación Completa (ej. Axpo 3.0TD):** Cada periodo ($P_1$ a $P_6$) aplica su precio independiente registrado en base de datos.

### 2.5. Otros Conceptos: Persistencia y Exclusiones
* **Conceptos Persistentes (`Alquiler Contador`, `Bono Social`, `Energía Reactiva`):** Son costes regulados del punto de suministro que el cliente continuará pagando por normativa. Se suman a la factura actual y a todas las ofertas evaluadas.
* **Conceptos No Persistentes (`Otros Costes / SVA`):** Seguros, mantenimientos o asistencias de la comercializadora saliente. Solo se computan en la factura actual del cliente y se excluyen de las nuevas ofertas; su eliminación forma parte directa del ahorro mensual conseguido.

### 2.6. Consumo Anual, Días Facturados y Descuentos
* **Consumo Anual (kWh):** No altera la factura mensual inmediata. Determina la elegibilidad técnica de la tarifa (límites de consumo de la comercializadora) y ubica el suministro en el tramo correspondiente del Marco Retributivo para comisiones. Al lado hay un CUPS: en cuanto el CUPS está completo y las letras de control cuadran, se consulta el SIPS del suministro elegido (luz o gas; primero la consulta ya guardada, y si no está, la API) y se rellena este campo. Si el SIPS trae peaje, se selecciona ese `2.0`–`6.4` o ese `RL`. Se puede corregir a mano.
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

3. **Base imponible e impuestos.** El IEE grava solo la energía neta. Alquiler, bono social y reactiva entran en la base del IVA y no en la del IEE. «Otros costes / SVA» no entra en la oferta.  
   $$\text{Conceptos persistentes} = \text{Alquiler} + \text{Bono social} + \text{Reactiva}$$  
   $$\text{Base} = TP + TE + \text{Conceptos persistentes} - \text{descuentos}$$  
   $$\text{Energía neta} = TE - \text{descuento energía}$$  
   $$\text{IEE} = \text{Energía neta} \times 0.051126963$$  
   $$\text{IVA} = (\text{Base} + \text{IEE}) \times 0.21$$  
   $$\text{Total} = \text{Base} + \text{IEE} + \text{IVA}$$  
   El desglose de la tarjeta agrupa alquiler, bono, reactiva e IEE en «Otros costes comunes con I.E.» y muestra aparte la base, el IVA y el total.

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
* **Ahorro mínimo:** selector al lado de los dos órdenes (`Todos`, `5% o más` … `30% o más`). Con `Más comisión` y `5%` salen primero las comisiones más altas, solo entre las ofertas cuyo ahorro es ese porcentaje o más. `Todos` no filtra.
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

## 5. Estudio PDF
El PDF de una oferta usa las mismas fórmulas y los mismos precios que el desglose de esa tarjeta. El total de la columna «Tarifa propuesta» es el total mensual de la oferta (IEE e IVA incluidos, una sola vez). El IEE y el IVA no vuelven a sumarse dentro de la base.

* **2.0:** la tabla de potencia lista `P1` y `P2`. La de energía lista `P1`, `P2` y `P3`.
* **3.0 a 6.4:** potencia y energía listan `P1` a `P6`.
* **Tarifa actual:** cada fila lleva la cantidad, el precio unitario y el importe del periodo que el usuario ha escrito en el comparador. Los kW y los kWh salen aunque el precio de ese periodo esté a 0. Bono social, alquiler, costes adicionales y excesos salen cuando el importe es mayor que 0. Si no hay precios unitarios, el total de esa columna sigue siendo el importe escrito en «Total factura €» y no se inventan IEE ni IVA. Si sí hay precios unitarios, el total es el calculado con IEE e IVA.
* **Tarifa propuesta:** no incluye «Otros costes / SVA». Sí incluye alquiler, bono social y reactiva. Si el alquiler del formulario está vacío o a 0, el PDF usa 1,84 €/mes, el mismo importe que la tarjeta. El total de la oferta es potencia + energía + alquiler + bono + reactiva + IEE + IVA, el mismo que el total de la tarjeta.

## 6. Historial de comparativas
Cada comparativa guardada conserva el CUPS, el logo y el nombre de la compañía de la oferta, el peaje, el total de la factura y el ahorro mensual. También guarda los campos del formulario y los precios de esa oferta. El PDF se vuelve a generar con esos datos, sin leer el catálogo actual. El historial solo muestra lo guardado en este navegador. Las comparativas antiguas de AT ya no se listan.

## 7. Directivas de Implementación Técnica
* **Precisión Numérica:** Operaciones internas con coma flotante de precisión completa (mínimo 6 decimales). El redondeo a 2 decimales (`0.01 €`) aplica exclusivamente en renderizado de UI y generación de PDFs.
* **Debounce:** Recálculo del ranking con debounce de 250 a 300 ms en inputs numéricos para mantener la fluidez de la interfaz.
* **Tolerancia a Nulos:** Inputs vacíos o borrados deben resolverse internamente como `0`, impidiendo estados `NaN`.
* **Modularización:** Componentes desacoplados en `src/components/comparador/`: `ComparadorAccessTariffChips`, `ComparadorPeriodRows`, `ComparadorEnergyFields`, `ComparadorProposalFilters` y `ComparadorOfferCard`.
