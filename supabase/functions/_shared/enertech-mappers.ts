// Pure mappers: one raw Enertech row -> the columns of its enertech_* mirror table.
// The full raw row always goes to `payload`, so a field we did not anticipate is never lost.

import { asBool, asInt, asString, isRecord, pick, type JsonRecord } from './enertech-extract.ts'

export interface MappedRow {
  /** String form of the primary key, used to match against existing rows. */
  key: string
  /** Typed columns, including the primary key column. */
  columns: JsonRecord
  /** `actualizado_en` for change tracking, when the entity has one. */
  actualizadoEn: string | null
  payload: JsonRecord
}

export type RowMapper = (raw: JsonRecord) => MappedRow | null

export const mapComercializadora: RowMapper = (raw) => {
  const id = pick(raw, ['id', 'id_company', 'id_comercializadora', 'company_id'], asInt)
  if (id === null) return null
  const nombre = pick(raw, ['nombre', 'name', 'comercializadora', 'razon_social'], asString)
  return { key: String(id), columns: { id, nombre }, actualizadoEn: null, payload: raw }
}

export const mapTarifaAcceso: RowMapper = (raw) => {
  const idRate = pick(raw, ['id_rate', 'id'], asInt)
  if (idRate === null) return null
  const producto = pick(raw, ['producto'], asString)
  return {
    key: String(idRate),
    columns: { id_rate: idRate, nombre: pick(raw, ['nombre', 'name'], asString), producto },
    actualizadoEn: null,
    payload: raw,
  }
}

/** Shared by /precios and /comisiones: both carry `clave`, `id` and `actualizado_en`. */
export const mapFeedRow: RowMapper = (raw) => {
  const id = asInt(raw.id)
  const clave = asString(raw.clave) ?? (id !== null ? `id:${id}` : null)
  if (clave === null) return null
  const actualizadoEn = asString(raw.actualizado_en)
  return {
    key: clave,
    columns: {
      clave,
      id,
      actualizado_en: actualizadoEn,
      company_id: pick(raw, ['id_company', 'company', 'company_id', 'id_comercializadora'], asInt),
      producto: pick(raw, ['producto', 'tipo_producto'], asString),
      tipo: pick(raw, ['tipo', 'modalidad'], asString),
    },
    actualizadoEn,
    payload: raw,
  }
}

export const mapCliente: RowMapper = (raw) => {
  const id = asInt(raw.id_customer)
  if (id === null) return null
  return {
    key: String(id),
    columns: {
      id_customer: id,
      nombre: asString(raw.nombre),
      dni_cif: asString(raw.dni_cif),
      email: asString(raw.email),
      telefono: asString(raw.telefono),
      rgpd: asBool(raw.rgpd),
      fecha_alta: asString(raw.fecha_alta),
    },
    actualizadoEn: null,
    payload: raw,
  }
}

export const mapContrato: RowMapper = (raw) => {
  const id = asInt(raw.id_contract)
  if (id === null) return null
  const cliente = isRecord(raw.cliente) ? raw.cliente : {}
  const estado = isRecord(raw.estado) ? raw.estado : {}
  const fechaActualizacion = asString(raw.fecha_actualizacion)
  return {
    key: String(id),
    columns: {
      id_contract: id,
      cups: asString(raw.cups),
      cliente_id: asInt(cliente.id),
      cliente_nombre: asString(cliente.nombre),
      compania: asString(raw.compania),
      producto: asString(raw.producto),
      estado_id: asInt(estado.id),
      estado_nombre: asString(estado.nombre),
      estado_final: asBool(estado.final),
      incidencia: asString(raw.incidencia),
      fecha_contrato: asString(raw.fecha_contrato),
      fecha_alta: asString(raw.fecha_alta),
      fecha_actualizacion: fechaActualizacion,
      actualizado_en: fechaActualizacion,
    },
    actualizadoEn: fechaActualizacion,
    payload: raw,
  }
}
