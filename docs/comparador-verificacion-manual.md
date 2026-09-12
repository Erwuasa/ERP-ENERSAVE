# Comparador en vivo — guía de verificación manual

Prerrequisitos: dev server (`npm run dev`), Supabase con catálogo AT cargado, módulo **Comparador**.

## Paso 1 — Segmento PYME + peaje 3.0

1. Abre el comparador.
2. Selecciona **PYME / Industrial**.
3. Pulsa el chip **3.0** en tarifa de acceso.
4. Espera a que cargue el ranking (derecha).

**Esperado:** solo tarifas del catálogo `segment=pyme` y `access_tariff=3.0TD`. No debe aparecer ninguna tarifa claramente residencial 2.0TD (nombres/peajes de hogar).

## Paso 2 — Potencia P1 con coma

1. En **Potencia por periodo**, escribe `5,5` en P1.
2. Observa P2–P6.

**Esperado:** todos muestran `5,5` (valor interno 5.5). El ranking se recalcula sin error.

## Paso 3 — P3 independiente

1. Con P1 en 5,5, edita **P3** manualmente a `7,2`.
2. Cambia P1 a `6`.

**Esperado:** P2, P4, P5, P6 pasan a `6`; **P3 permanece en 7,2**.

## Paso 4 — Filtro Sin SVA

1. Activa el chip **Sin SVA** (filtros de propuestas, columna derecha).

**Esperado:** desaparecen tarifas con SVA mensual > 0 del ranking. Al desactivar el filtro, vuelven a mostrarse.

## Paso 5 — Consumo sin desglose completo

1. Desactiva filtros extra.
2. Deja potencias con valores razonables.
3. Pon consumo solo en **P1** (ej. `9000`) y deja P2–P6 en `0` o vacío.

**Esperado:**
- Badge ámbar de estimación visible.
- Ranking **no vacío** (skeleton breve al cambiar peaje, luego tarjetas).

## Paso 6 — Desglose completo P1–P6

1. Rellena potencia y consumo en **todos** los periodos visibles (6 en 3.0TD).
2. Observa badge y orden del ranking.
3. Cambia un consumo alto en P1 (ej. subir mucho) y comprueba que el coste del top cambia.

**Esperado:**
- Badge de estimación **desaparece** (precisión exacta en ranking).
- El orden/coste del top se actualiza al modificar datos.

## Automatizado

Los pasos 1–6 tienen cobertura en:

`src/lib/comparador-flujo-verificacion.test.ts`

Ejecutar:

```bash
npm run test -- --run src/lib/comparador-flujo-verificacion.test.ts
```
