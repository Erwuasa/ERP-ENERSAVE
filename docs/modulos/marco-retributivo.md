# ESPECIFICACIÓN TÉCNICA Y REGLAS DE AGENTE: MARCO RETRIBUTIVO (`/erp/marco-retributivo`)

## 1. Información General y Propósito del Módulo
El módulo `/erp/marco-retributivo` centraliza las condiciones económicas y comisiones pactadas con las comercializadoras para la retribución de agentes y brokers. La pantalla cruza el catálogo de tarifas de luz activas en `enertech_precios` con las matrices de comisiones almacenadas en `enertech_comisiones`. Su diseño está optimizado para gestionar un volumen de datos masivo (~19.100 filas de comisiones) garantizando un rendimiento fluido mediante virtualización de DOM y cargas concurrentes controladas.

---

## 2. Origen de Datos y Reglas de Cruce (Weaving Engine)
El sistema opera exclusivamente sobre las tablas sincronizadas de Enertech (`enertech_precios`, `enertech_comercializadoras` y `enertech_comisiones`), sin depender de tablas legacy de AT:
* **Filtro de Comercializadoras:** El selector solo lista compañías que tienen tarifas de luz en `enertech_precios`. Se excluyen comercializadoras sin oferta activa o dedicadas únicamente a placas, baterías o cargadores.
* **Cruce Tarifa ↔ Comisión (`weaveMarcoTariffsWithCommissions`):**
  1. Coincidencia por nombre comercial de campaña y peaje de acceso. Si la comisión carece de peaje explícito, aplica a todos los peajes de esa campaña.
  2. Si el nombre de la comisión es la raíz de la tarifa (ej. `TARIFA NOCHE LUZ ECO` → `Tarifa Noche Luz`) y no existe otra tarifa con el nombre largo, se vinculan automáticamente.
  3. Comisiones por niveles (`BASE`, `ONE`, `SUPRA` en Naturgy Pymes): se asocian a las tarifas cuyo nombre finalice en dicho nivel, aplicando `BASE` al resto.
  4. Homogeneización de nombres: `NEON` y `NEÓN` son la misma compañía; `NORDY` enlaza con `NORDY PYMES` y `NORDY RESIDENCIAL`.
  5. Símbolos como `+` al inicio o textos entre paréntesis (`+Estocolmo I`, `ESTABLE PLUS SUPER (N1)`) no impiden el cruce.
  6. Tarifas sin registro en `enertech_comisiones` (ej. Gana Energía, Endesa o Iberdrola) se muestran en la tabla con la condición informativa *"Sin comisión Enertech"*.

---

## 3. Lógica de Tramos y Cálculo de Comisiones
La tabla expande una fila independiente por cada tramo de consumo anual asociado a una tarifa:
* **Comisión Fija por Contrato (`eur_cups` / tramo vacío):** Importe fijo que se percibe por formalizar el contrato, independientemente del volumen consumido (ej. 120,00 € por contrato).
* **Comisión Variable por Consumo (`eur_mwh` / `eur_kwh`):** Retribución ligada a umbrales de consumo anual (ej. `10000- kWh` o `14 €/MWh desde 10 MWh`). En comparador y liquidaciones, el importe resulta de multiplicar todo el consumo anual en MWh por el valor del tramo aplicable.
* **Comisiones Fee (`fee_energia` / `fee_potencia`):** Si `comision_eur` es nulo pero `importe_comercial` contiene un porcentaje (ej. `1,25 % fee energía`), el sistema renderiza la comisión como porcentaje comercial y no como 0 €.
* **Porcentaje del Comercial:** Lo que visualiza y percibe cada usuario es su `user_profiles.commission_percentage` aplicado sobre el 100% del importe liquidado por EnerSave.

---

## 4. Arquitectura de Interfaz, Filtros y Virtualización

### 4.1. Toolbar y Filtros Reactivos
* **Selector de Compañía:** Dropdown interactivo que muestra el conteo real de tarifas activas por comercializadora (este contador se recalcula reactivamente si se filtran peajes o segmentos). Al seleccionar una compañía, se vacía el buscador libre para listar inmediatamente sus tarifas.
* **Filtros Conmutables (Toggle):** Pulsar un filtro ya activo (Tipo, Segmento, Peaje o Compañía) lo desactiva inmediatamente.
* **Buscador con Paginación:** El buscador libre y el filtrado por compañía paginan las tarifas en bloques de 12 elementos.

### 4.2. Virtualización de Tabla (Escritorio) y Modo Mobile
* **Escritorio (`>= md`):** El `<tbody>` de `MarcoRetributivoTable` está virtualizado con `@tanstack/react-virtual` (`useVirtualizer` con `measureElement` dinámico y filas espaciadoras). Solo monta en el DOM las 20–30 filas visibles en el viewport más sobreescaneo, evitando el colapso del navegador ante miles de tramos calculados.
* **Dispositivos Móviles y Tablets (`< md`):** Por debajo de 768px la tabla se transforma en tarjetas apiladas virtualizadas que contienen el logotipo, compañía, tarifa, badges de peaje/segmento, tramos de comisión y acciones. El toolbar de filtros utiliza `flex-wrap` con `min-w-0` para evitar desbordamientos horizontales.

---

## 5. Mutaciones y CRUD Manual en Supabase
Las operaciones de creación, edición y borrado de comisiones (`createMarcoEntry`, `updateMarcoEntry`, `deleteMarcoEntry`) se ejecutan contra `enertech_comisiones` restringidas por RLS a `superadmin` y `tramitacion`:
* **Invariante de API:** Los datos oficiales sincronizados de Enertech siempre prevalecen.
* **Creación Manual:** Inserta con `source = 'manual'` y clave sintética `manual:<uuid>`. El motor de sincronización (`enertech-sync-engine.ts`) excluye explícitamente las filas con `source='manual'` de su cálculo de registros eliminados, asegurando que sobrevivan indefinidamente a los syncs automáticos de cada 6 horas.
* **Edición de Filas de API:** Modificar una fila originada por la API no altera su `source` (`'api'`), por lo que el siguiente sync la sobrescribirá con el valor oficial de Enertech.
* **Borrado:** Borrar una fila de API aplica un borrado blando (`removed_at`); si la API vuelve a enviarla, el sync la reactiva. Borrar una fila manual ejecuta un borrado físico (`DELETE`).

---

## 6. Rendimiento y Caché de Red
Para prevenir bloqueos por timeout en Postgres (`error 57014`), la lectura de comisiones implementa un pool con límite de concurrencia a 4 páginas simultáneas (`runWithConcurrencyLimit`) y reintentos automáticos (`fetchEnertechComisionesPageWithRetry`). Las lecturas de tabla y auditoría de duplicados comparten una caché en memoria de 15 segundos (`fetchAllEnertechComisionesCached`), la cual se invalida inmediatamente tras cualquier operación de guardado o borrado manual.
