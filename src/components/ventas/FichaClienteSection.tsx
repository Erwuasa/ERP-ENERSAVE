import type { Prospecto } from "../../lib/ventas/types"

interface FichaClienteSectionProps {
  prospecto: Prospecto
}

function formatDireccion(prospecto: Prospecto): string | undefined {
  const parts = [
    prospecto.direccion,
    prospecto.codigoPostal,
    prospecto.poblacion,
    prospecto.provincia,
  ]
    .filter(Boolean)
    .join(", ")
  return parts || undefined
}

export function FichaClienteSection({ prospecto }: FichaClienteSectionProps) {
  const direccion = formatDireccion(prospecto)

  return (
    <section
      className="rounded-lg border border-brand-border bg-brand-panel/50 p-3 space-y-2"
      aria-label="Datos del cliente"
    >
      <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-subtext">
        Cliente
      </h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <dt className="text-[10px] font-mono uppercase text-brand-subtext">Nombre</dt>
          <dd className="text-brand-text font-semibold">{prospecto.nombre}</dd>
        </div>
        {prospecto.telefono && (
          <div>
            <dt className="text-[10px] font-mono uppercase text-brand-subtext">Teléfono</dt>
            <dd>
              <a
                href={`tel:${prospecto.telefono.replace(/\s/g, "")}`}
                className="font-mono text-cyan-600 dark:text-cyan-400 hover:underline"
              >
                {prospecto.telefono}
              </a>
            </dd>
          </div>
        )}
        {prospecto.email && (
          <div>
            <dt className="text-[10px] font-mono uppercase text-brand-subtext">Email</dt>
            <dd>
              <a
                href={`mailto:${prospecto.email}`}
                className="text-brand-text hover:text-cyan-600 dark:hover:text-cyan-400"
              >
                {prospecto.email}
              </a>
            </dd>
          </div>
        )}
        {prospecto.nif && (
          <div>
            <dt className="text-[10px] font-mono uppercase text-brand-subtext">NIF</dt>
            <dd className="font-mono text-brand-text">{prospecto.nif}</dd>
          </div>
        )}
        {direccion && (
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-mono uppercase text-brand-subtext">Dirección</dt>
            <dd className="text-brand-text">{direccion}</dd>
          </div>
        )}
        {prospecto.cups && (
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-mono uppercase text-brand-subtext">CUPS</dt>
            <dd className="font-mono text-[11px] text-brand-text break-all">{prospecto.cups}</dd>
          </div>
        )}
        {prospecto.companiaActual && (
          <div>
            <dt className="text-[10px] font-mono uppercase text-brand-subtext">Compañía actual</dt>
            <dd className="text-brand-text">{prospecto.companiaActual}</dd>
          </div>
        )}
        {prospecto.tarifaActual && (
          <div>
            <dt className="text-[10px] font-mono uppercase text-brand-subtext">Tarifa actual</dt>
            <dd className="text-brand-text">{prospecto.tarifaActual}</dd>
          </div>
        )}
        {prospecto.consumoAnualKwh != null && (
          <div>
            <dt className="text-[10px] font-mono uppercase text-brand-subtext">Consumo anual</dt>
            <dd className="text-brand-text">{prospecto.consumoAnualKwh} kWh</dd>
          </div>
        )}
      </dl>
    </section>
  )
}
