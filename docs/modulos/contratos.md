# ESPECIFICACIÓN TÉCNICA Y REGLAS DE AGENTE: GESTIÓN Y ALTA DE CONTRATOS (`/erp/contratos`)

## 1. Alcance y Arquitectura del Módulo
La vista `/erp/contratos` centraliza la gestión operativa, auditoría de cartera y tramitación de altas energéticas del ERP. Al abrirla no se descarga el marco completo: las recomendaciones y el desglose de comisión piden solo las campañas del peaje o de la tarifa del contrato. El módulo se compone de dos capas desacopladas: una tabla principal con buscador, filtros y cálculo dinámico de penalizaciones y renovaciones; y un asistente modal de cuatro pasos (`NuevoContratoWizard`) para registrar contratos en Supabase (`contratos_equipo`) estructurando los datos para su posterior emisión hacia la API de Enertech.

---

## 2. Barra Superior y Filtros Globales
La barra superior incluye un buscador en tiempo real con debounce que filtra simultáneamente por razón social o nombre, código CUPS (`ES...`) y documento fiscal (DNI, NIE o CIF). A su derecha incorpora el selector `Vista` para alternar entre filtros guardados (Mis contratos, Cartera de equipo o General), el botón `Exportar` (genera la descarga en `.xlsx` mediante `contracts-excel-export.ts` respetando los filtros activos) y el botón primario `+ Nuevo Contrato` (despliega el asistente de alta).

La fila de filtros secundarios aplica criterios combinados en memoria y base de datos:
* **Usuario / Comercial:** Dropdown jerárquico según el rol RBAC de la sesión activa (Superadmin, Administrador, Jefe de Equipo o Comercial).
* **Estado:** Selector multiselección con badge numérico dinámico del total de coincidencias (`ACTIVADO`, `INCIDENCIA`, `PTE FIRMA`, `TRAMITACION`, `CANCELADO`).
* **Compañía:** Filtro por comercializadora suministradora con renderizado de isotipo oficial.
* **Rango de fechas:** Selector conmutable para acotar registros por fecha de creación o de activación.

---

## 3. Tabla de Contratos y Lógica Operativa de Celdas
Cada fila representa un contrato en `contratos_equipo` y renderiza sus datos según las siguientes reglas:
* **ESTADO:** Badge semántico con colorimetría fija: verde para `ACTIVADO`, morado/rojo para `INCIDENCIA`, ámbar para `PTE FIRMA` y azul para `TRAMITACION`.
* **CLIENTE / CUPS · NIF:** Nombre y apellidos o razón social en la primera línea. Segunda línea con CUPS clickeable para copiado rápido, NIF/CIF y tipo de trámite (*Cambio de comercializadora* o *Alta nueva*).
* **COMPAÑÍA / Tarifa:** Logotipo de la comercializadora, nombre comercial de la tarifa y botón interactivo con icono de bombilla que despliega el popover informativo con los precios unitarios de potencia y energía.
* **CREACIÓN:** Fecha formal de registro en el ERP.
* **ACTIVACIÓN / Renovación:** En contratos activos expone la fecha de entrada en vigor y un contador regresivo de días restantes para la renovación anual (`contract-renewal.ts`, ej. `337 d restantes`); si no está activo muestra `—`.
* **POTENCIA:** Potencia contratada en kW.
* **DIRECCIÓN / IBAN:** Dirección del suministro en línea superior e IBAN en línea inferior.
* **CONSUMO:** Consumo anualizado o estimado en kWh.
* **PENALIZACIÓN:** Gestionado por `contract-penalty.ts`. Muestra `No aplica` si no procede penalización. Si existe penalización por rescisión anticipada de permanencia, expone el importe en texto rojo destacado acompañado del desglose explícito de la fórmula: $(P_{\text{ref}} \times \text{Consumo} \times \%) \times (M_{\text{restantes}} / 12)$.
* **COMERCIAL:** Agente comercial asignado a la venta.
* **ACCIONES (···):** Menú por fila que conecta con el drawer lateral (`ContratoDetallePanel`), notas internas, subida documental, gestión de incidencias y trámite de baja.

---

## 4. Modal de Alta (`NuevoContratoWizard`) e Integración con Enertech

### 4.1. Reglas Generales de Integración
El asistente guarda en Supabase (`contratos_equipo` y columna JSON `metadata`). No hay botón para subir el contrato: al crear uno completo, con los campos obligatorios y ya guardado en la tabla, el ERP hace `POST /clientes` y después `POST /contratos`. Un borrador no llama a la API. El estado que devuelve Enertech (por ejemplo `Pte. RGPD`) se escribe en esa fila. El webhook de Enertech vuelve a escribir el estado en el mismo contrato cuando avisa un cambio; no vuelve a subir el contrato. Si una fila ya guardada pasa a `PTE DE RGPD` y todavía no tiene id de Enertech, también se sube. Al escribir un CUPS válido en el alta, SIPS rellena el CNAE y el consumo anual. La clave de Enertech no viaja al navegador: la llama la Edge Function `enertech-alta`. La API de Enertech opera con una única clave para toda la empresa. El comercial asignado es obligatoriamente el usuario con la sesión abierta en el ERP (`nombreComercial`, campo de solo lectura; si inicia sesión Germán Bayón, el comercial se fija como Germán Bayón).

Los asteriscos en pantalla marcan estrictamente los campos obligatorios para el cuerpo del `POST` de Enertech.

### 4.2. Condición de Alta de Empresa
El alta se clasifica como empresa cuando el segmento del Paso 1 es `PYME`, o cuando el tipo de cliente seleccionado es Pyme o Comunidad de Vecinos (`isWizardCompanyClient`).

### 4.3. Campos de Cliente Residencial (y Autónomo no societario)
* **Nombre (`clientNombre`):** Obligatorio (*).
* **Apellidos (`clientApellidos`):** Obligatorio (*) si el documento es DNI o NIE.
* **DNI-NIE (`nif`):** Obligatorio (*). Validado formalmente con `classifySpanishTaxId`.
* **Nacionalidad (`nacionalidad`):** Obligatorio (*) única y exclusivamente si el documento fiscal es NIE (inicia por X, Y o Z, evaluado con `wizardShowsNacionalidad`).
* **Teléfono (`telefono`):** Opcional. Se traslada a Enertech como `movil1` si viene cumplimentado.
* **Email (`email`):** Opcional. Se envía a Enertech si viene cumplimentado.
* **Dirección fiscal, CP, localidad, provincia:** Opcionales en el cliente. El CP, localidad y provincia del suministro viajan asociados al contrato si están informados. En residencial, la razón social es opcional y no lleva asterisco.

### 4.4. Campos de Cliente Pyme o Comunidad de Vecinos
El orden en pantalla y su equivalencia con Enertech es estricto:
1. **Razón social (`razonSocial`):** Obligatorio (*). Es el `nombre` del cliente en Enertech cuando el documento es CIF.
2. **Nombre del representante (`apoderadoNombre`):** Obligatorio (*). Se traslada a `apoderadoNombre`.
3. **DNI del representante (`apoderadoDni`):** Obligatorio (*). Requiere DNI, NIE o CIF válido.
4. **Nombre (`clientNombre`):** Opcional. Contacto operativo para el ERP; no sustituye al representante legal.
5. **Apellidos (`clientApellidos`):** Opcional. Contacto operativo para el ERP.
6. **CIF (`nif`):** Obligatorio (*). Es el `dni` del cliente en Enertech.
7. **Nacionalidad (`nacionalidad`):** Obligatorio (*) solo si el documento clasifica como NIE.

### 4.5. Datos del Suministro
* **Tarifa de acceso (`peajeSegment`):** `2.0`, `3.0`, `6.1`, etc. Filtra el catálogo local; no se envía en el POST de Enertech.
* **Tarifa (`tarifa`):** Nombre comercial visible (`payload.campania`). El POST de Enertech no manda el nombre de texto: manda la clave técnica.
* **Clave de tarifa (`claveTarifa`):** Obligatorio (*). Identificador técnico `clave_tarifa` (`tf_…`). Se autorrellena al seleccionar la oferta copiando `enertech_precios.clave` mediante `resolveWizardTariffClave` y permite edición manual.
* **CUPS (`cups`):** Obligatorio (*). Código unificado de 20 o 22 caracteres con dígito de control validado.
* **CNAE (`cnae`):** Obligatorio (*). Código de actividad de hasta 5 dígitos. En altas de prueba Enertech rechaza contratos con CNAE vacío.
* **Consumo anual (`consumoAnual`):** Opcional. Se traslada como `consumption` si es mayor a 0.
* **Dirección de suministro (`direccionSuministro`):** Opcional. Se envía siempre como `direccionSuministro`. Si el texto trae número (`Calle Mayor 10`), también van `via_tipo`, `via_nombre` y `via_numero` juntos. Un `via_nombre` suelto no se envía: Enertech lo rechaza.
* **IBAN (`iban`):** Opcional. Se traslada a Enertech si está cumplimentado.
* **Potencias P1–P6 (`potenciaP1`…`potenciaP6`):** Opcionales. Se mapean a `power_p1`…`power_p6` únicamente en periodos con valor mayor a 0 kW.
* **Documentación adjunta:** En «Archivos y documentos» el primer hueco es «DNI del firmante». Ahí caen las claves `dni` y `dni_firmante` de Enertech. No hay un hueco aparte de «DNI o NIE del titular». El resto de huecos se ve siempre (CIF, factura, justo título, certificado de instalación, adenda, cambio de titularidad, grabación, otros, IBAN, visita comercial, recibo de autónomo, carta de poder, acta, carta de certificación, escrituras, boletín de placas y anexo de autoconsumo). El borde rojo sale de `GET /documentacion` (compañía, tipo de cliente, luz/gas, alta nueva y cambio de titular), no del marco. Si la consulta falla, el alta sigue y «Crear contrato» no se bloquea. El fallo de red dice «No se ha podido consultar la documentación de Enertech.» Sin datos: «Enertech no indica documentos para este caso.» Comercializadora desconocida (404): «Enertech no reconoce esta comercializadora.» Segmento ausente o no válido (400): «Falta el tipo de cliente para consultar la documentación.» Mientras carga: «Consultando documentación de Enertech…». El asistente no marca cambio de potencia ni autoconsumo, así que esos tres documentos no se ponen en rojo hasta que el formulario tenga esos filtros. Al crear el contrato, los archivos se guardan en el expediente del ERP (bucket `contrato-documentos`) y también van en `documentos` del `POST /contratos` (`filename` + `base64`, pdf/jpg/jpeg/png/webp/heic/tif/tiff, 15 MB por archivo). Un archivo que no cumple eso se omite y el alta sigue. Si Enertech rechaza el alta, el archivo sigue en el expediente. Cada fila nueva avisa por correo a `germanbayonr@gmail.com`, siempre con el asunto «Nuevo contrato en EnerSave», para que lleguen en el mismo hilo.

---

## 5. Especificación de Endpoints Enertech

### 5.1. `POST /clientes`
El documento fiscal (`nif`) debe validarse mediante `classifySpanishTaxId`:
* **DNI:** Obligatorios `nombre`, `apellido1`, `dni`. Opcionales `apellido2`, `email`, `movil1`. Regla: `apellido1` es la primera palabra de Apellidos y el resto va a `apellido2`.
* **NIE:** Obligatorios `nombre`, `apellido1`, `dni`, `nacionalidad`. Opcionales `apellido2`, `email`, `movil1`.
* **CIF:** Obligatorios `nombre` (razón social), `dni` (el CIF), `apoderadoNombre` y `apoderadoDni`. Opcionales `email`, `movil1`.
* **Salida obligatoria:** La respuesta devuelve un entero `clientId` (> 0). Este campo no se escribe en el formulario, pero es imprescindible para la llamada de contrato.

### 5.2. `POST /contratos`
* **Campos del body:** `clientId` (obtenido de la respuesta de cliente), `cups` (con control algorítmico), `cnae` (texto no vacío) y `clave_tarifa` (cadena `tf_…`).
* **Campos condicionales:** `cp`, `poblacion`, `provincia`, `direccionSuministro`, `iban` (solo si tienen valor); `via_tipo` + `via_nombre` + `via_numero` solo si los tres salen de la dirección; `consumption` (si es mayor a 0); y `power_p1`…`power_p6` (solo periodos mayores a 0 kW).
* **Documentos:** `documentos` es un array de `{ filename, base64 }`. Solo se envía si hay al menos un archivo válido. Si se omite y la matriz de Enertech los exige, el contrato se crea igual y puede quedar en incidencia. El base64 no se guarda en el log: la función `enertech-alta` lo quita y deja el recuento y el tamaño. Si la suma de los base64 pasa de 20 MB, la función responde 413 con «Documentos superan el límite permitido (20 MB)» y no llama a Enertech. Un DNI, NIE o CIF inválido, un NIE sin nacionalidad o un CIF sin apoderado lo rechaza el formulario antes de esa llamada (`buildEnertechClienteBody`) y el asistente lo enseña en el aviso de error; esas validaciones no crean fila en `enertech_outbound_events`. Un rechazo de Enertech (documento ya existente, CUPS o tarifa) sí queda en Logs, pestaña Salientes. Si Enertech crea el contrato y el ERP no puede guardar el id, la fila queda `orphan` en la pestaña Reconciliación.
* **Nota comercializadora:** La comercializadora no se envía en el body; Enertech la deduce automáticamente desde la clave de tarifa.

---

## 6. Persistencia en Supabase (`contratos_equipo`)
Al pulsar guardar en el asistente, el ERP ejecuta `formToTeamContractInsert` guardando en columnas fijas y en el objeto JSON `metadata`:
* **Columnas nativas:** `client_name` (razón social si es empresa), `nif`, `cups`, `compania`, `tarifa`, `telefono`, `email`, `iban`, `direccion_fiscal`, `codigo_postal`, `poblacion`, `provincia`, `direccion_suministro`, `tipo_cliente`, `comercial_id`, `comercial_name`, `nombre_comercial` y `wizard_segment`.
* **Claves dentro de `metadata`:** `razon_social`, `contact_nombre`, `contact_apellidos`, `nacionalidad`, `apoderado_nombre`, `apoderado_dni`, `cnae`, `clave_tarifa` y `potencia_p1`…`potencia_p6`.
* **Lectura y edición:** Al editar, `mapRowToContract` extrae estas claves de `metadata` y `contractToNewContractForm` reconstituye el estado íntegro del formulario.

---

## 7. Mapa de Funciones del Repositorio
* `isWizardCompanyClient` (`src/lib/contract-registration.ts`): Determina si el asistente renderiza razón social y representante.
* `wizardShowsNacionalidad` (`src/lib/contract-registration.ts`): Obliga al campo nacionalidad si el documento es NIE.
* `buildContractWizardMetadata` (`src/lib/contract-registration.ts`): Serializa CNAE, nacionalidad, apoderado, clave y razón social dentro de `metadata`.
* `contractToNewContractForm` (`src/lib/contract-registration.ts`): Hidrata el formulario de edición recuperando las claves desde `metadata`.
* `buildClientNameFromForm` (`src/lib/contract-registration.ts`): Fija el nombre guardado como razón social en pymes o comunidades.
* `resolveWizardTariffClave` (`src/lib/contract-tariff-filter.ts`): Copia `enertech_precios.clave` según la tarifa y peaje activos.
* `classifySpanishTaxId` (`src/lib/enertech/contract-alta.ts`): Clasifica y valida DNI, NIE o CIF con dígito de control.
* `buildEnertechClienteBody` (`src/lib/enertech/contract-alta.ts`): Construye el payload de `POST /clientes`.
* `buildEnertechContratoBody` (`src/lib/enertech/contract-alta.ts`): Construye el payload de `POST /contratos`.
* `mapContractSourceToEnertechAlta` (`src/lib/enertech/contract-alta.ts`): Orquesta la transformación de formulario a ambos bodies de Enertech.
* `formToTeamContractInsert` (`src/lib/supabase/contracts.ts`): Inserta la fila en base de datos inyectando `metadata`.
* `mapRowToContract` (`src/lib/supabase/contracts.ts`): Mapea las claves de `metadata` al abrir el expediente.
* Entorno de pruebas API: `npm run enertech:alta-prueba` (apunta a `https://devintranet.enertechcore.com/v1`; credenciales de producción no admitidas).
