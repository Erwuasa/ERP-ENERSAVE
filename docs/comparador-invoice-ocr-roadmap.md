# Roadmap OCR / Invoice AI — comparador EnerSave

Objetivo: **cualquier factura** (2.0TD / 3.0TD / 6.x, fija / indexada, escaneada o digital) rellene el comparador con precisión en todos los campos.

## Corpus de prueba (ir ampliando)

| ID | Comercializadora | Archivo / notas | Campos críticos validados |
|----|------------------|-----------------|---------------------------|
| TE-4 | TotalEnergies | `FACTURA_4.pdf` | Total 152,38 (¿Cuánto tengo que pagar?), SVA 8,49, alquiler 0,88 |
| RE-5 | Repsol | `FACTURA_5.pdf` | 31 días, Servicios 4,20, Equipos medida 0,83, consumo P/L/V |
| NG-2 | Naturgy | `FACTURA_LUZ_nueva_2.pdf` (escaneada) | Consumo P/L/V enteros, bono 0,67, alquiler 0,93, total 51,78 |

**Proceso por factura nueva**

1. Añadir fila al corpus y fixture de texto en `src/lib/invoice-ocr-billing-lines.*.test.ts`.
2. Extraer texto (pdf.js o OCR) y anotar etiquetas reales en `docs/comparador-invoice-ai-api.md`.
3. Implementar reglas en `invoice-ocr-billing-lines.ts` + merge IA/OCR.
4. Subir PDF en comparador y verificar UI.

## Fases (GSD / ejecución incremental)

### Fase A — Billing lines (en curso)

- [x] TotalEnergies total vs electricidad-only
- [x] Repsol resumen Servicios / Equipos medida / días etiquetados
- [x] Naturgy consumo por tramo, bono explícito, alquiler con `=`
- [ ] Endesa / Iberdrola / Gana / Octopus (patrones por comercializadora)
- [ ] 3.0TD y 6.x (P4–P6 potencia y consumo)

### Fase B — Invoice AI + OCR híbrido

- [ ] Edge `ai-assistant` desplegada en Supabase EnerSave
- [ ] `.env`: quitar `VITE_INVOICE_AI_ASSISTANT_URL` placeholder; usar `SUPABASE_URL`
- [ ] Merge siempre prioriza OCR en: días, total, SVA, alquiler, bono, consumos P1–P3
- [ ] Telemetría: guardar `rawTextPreview` en dev cuando falle un campo

### Fase C — PDF escaneado

- [ ] Mejorar OCR Tesseract (escala, preprocesado) cuando pdf.js devuelve < 80 caracteres
- [ ] Tests e2e con PDFs escaneados del corpus

### Fase D — Regresión continua

- [ ] CI: `vitest` suite `invoice-ocr-billing-lines*.test.ts`
- [ ] Checklist manual comparador antes de release

## Invoice AI — configuración actual

- Clave: `VITE_INVOICE_AI_KEY` (pk-…)
- URL efectiva: `{SUPABASE_URL}/functions/v1/ai-assistant` salvo override válido
- **No usar** `VITE_INVOICE_AI_ASSISTANT_URL=https://tu-proyecto...` (invalida la IA)

Si la función no está desplegada, el comparador cae a OCR local (Tesseract en PDF escaneado).
