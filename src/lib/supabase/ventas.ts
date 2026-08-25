export type { VentasResult } from "./ventas-shared"
export type { ActividadVentaRow, ProspectoRow, TareaVentaRow } from "./ventas-types"

export {
  mapProspectoRow,
  buildProspectoInsert,
  listProspectos,
  getProspecto,
  createProspecto,
  purgeDescartadosExpired,
  deleteProspecto,
  updateProspecto,
  updateProspectoFase,
} from "./ventas-prospectos"

export {
  mapActividadRow,
  buildActividadInsert,
  listActividades,
  listActividadesByComercial,
  createActividad,
  createContratoCreadoActividad,
} from "./ventas-actividades"

export {
  mapTareaRow,
  buildTareaInsert,
  listTareasByProspecto,
  listTareas,
  createTarea,
  updateTarea,
} from "./ventas-tareas"
