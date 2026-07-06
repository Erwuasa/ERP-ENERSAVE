import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Download, 
  CheckCircle, 
  Flame, 
  Lightbulb, 
  SlidersHorizontal, 
  AlertTriangle 
} from 'lucide-react';
import { toast } from 'sonner';

interface CashflowPanelProps {
  activeRole: string;
  formatCurrency: (val: number) => string;
  cashflowScenario: 'optimista' | 'realista' | 'pesimista';
  setCashflowScenario: (val: 'optimista' | 'realista' | 'pesimista') => void;
}

export const CashflowPanel: React.FC<CashflowPanelProps> = ({
  activeRole,
  formatCurrency,
  cashflowScenario,
  setCashflowScenario
}) => {
  return (
    <div className="space-y-8 animate-fade-in text-slate-800 dark:text-slate-100 font-sans">
      
      {/* Main Title & Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-brand-panel p-6 rounded-2xl border border-brand-border shadow-sm dark:shadow-none">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <DollarSign className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
              Pantalla Cashflow: Control de Flujo de Caja Corporativo
            </h2>
          </div>
          <p className="text-xs text-brand-subtext max-w-2xl leading-normal">
            Consola de supervisión de tesorería y liquidez de ENERSAVE. Permite proyectar el flujo de caja operativo del negocio derivado de las aportaciones del equipo de jefes comerciales y comerciales directos.
          </p>
        </div>

        {/* Fast Action Buttons */}
        <div className="flex items-center space-x-2 shrink-0">
          <button 
            type="button"
            onClick={() => toast.success('Proyecciones de tesorería exportadas a formato Excel (.xlsx)')}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-brand-surface dark:hover:bg-slate-850 text-brand-text border border-brand-border rounded-xl text-xs font-semibold font-mono tracking-tight cursor-pointer transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Reporte</span>
          </button>
        </div>
      </div>

      {/* Scenario Selector & Core Simulation Parameters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5 bg-slate-100 dark:bg-brand-surface/60 border border-brand-border rounded-2xl">
        <div className="space-y-1">
          <span className="block text-[10px] font-mono tracking-wider uppercase text-slate-400 font-bold">Modulador de Proyección Temporal</span>
          <div className="flex items-center gap-1.5 p-1 bg-slate-200 dark:bg-brand-surface rounded-xl border border-brand-border">
            {(['optimista', 'realista', 'pesimista'] as const).map((scen) => (
              <button
                key={scen}
                type="button"
                onClick={() => {
                  setCashflowScenario(scen);
                  toast.info(`Cargando escenario financiero: ${scen.toUpperCase()}`);
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-extrabold uppercase font-mono transition-all cursor-pointer ${
                  cashflowScenario === scen
                    ? scen === 'optimista' 
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : scen === 'realista'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-red-650 text-white shadow-sm'
                    : 'text-brand-subtext hover:text-brand-text'
                }`}
              >
                {scen === 'optimista' ? '📈 Optimista' : scen === 'realista' ? '⚖️ Realista' : '📉 Pesimista'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-xs font-mono">
          <div className="p-3 bg-brand-panel rounded-xl border border-brand-border px-4 py-2 flex flex-col justify-center min-w-[140px]">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-semibold">Tasa Descuento</span>
            <strong className="text-slate-800 dark:text-slate-150 text-sm mt-0.5">3.5% (WACC anual)</strong>
          </div>
          <div className="p-3 bg-brand-panel rounded-xl border border-brand-border px-4 py-2 flex flex-col justify-center min-w-[140px]">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-semibold">Cierre Período</span>
            <strong className="text-slate-800 dark:text-slate-150 text-sm mt-0.5">30-abr-2026</strong>
          </div>
          <div className="p-3 bg-brand-panel rounded-xl border border-brand-border px-4 py-2 justify-center flex flex-col min-w-[140px]">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-semibold">Auditoría</span>
            <strong className="text-emerald-500 text-sm mt-0.5 flex items-center gap-1">Conforme <CheckCircle className="w-3.5 h-3.5" /></strong>
          </div>
        </div>
      </div>

      {/* CORE STATS BOARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1 */}
        <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border shadow-xs dark:shadow-none space-y-2 relative overflow-hidden transition-all hover:translate-y-[ -1px]">
          <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-slate-400 block">
            Saldo en Tesorería Actual
          </span>
          <div className="flex items-baseline space-x-1.5">
            <strong className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-brand-text">
              {cashflowScenario === 'optimista' ? '55.900 €' : cashflowScenario === 'realista' ? '48.250 €' : '39.400 €'}
            </strong>
            <span className={`text-xs font-bold ${cashflowScenario === 'pesimista' ? 'text-red-500' : 'text-emerald-500'}`}>
              {cashflowScenario === 'optimista' ? '+12.1%' : cashflowScenario === 'realista' ? '+5.4%' : '-1.2%'}
            </span>
          </div>
          <p className="text-[9px] text-brand-subtext font-mono">
            {cashflowScenario === 'optimista' ? 'Cuentas bancarias en estado optimizado' : cashflowScenario === 'realista' ? 'Conciliado con cuentas bancarias hoy' : 'Tensión transitoria de circulante'}
          </p>
          <div className={`absolute bottom-0 left-0 right-0 h-1 ${cashflowScenario === 'optimista' ? 'bg-emerald-500' : cashflowScenario === 'realista' ? 'bg-blue-600' : 'bg-red-650'}`} />
        </div>

        {/* Stat 2 */}
        <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border shadow-xs dark:shadow-none space-y-2 relative overflow-hidden transition-all hover:translate-y-[-1px]">
          <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-slate-400 block">
            Flujo Neto Real (Últimos 30 días)
          </span>
          <div className="flex items-baseline space-x-1.5">
            <strong className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${cashflowScenario === 'optimista' ? 'text-emerald-500' : cashflowScenario === 'realista' ? 'text-brand-text' : 'text-red-500'}`}>
              {cashflowScenario === 'optimista' ? '+7.150 €' : cashflowScenario === 'realista' ? '-500 €' : '-8.800 €'}
            </strong>
          </div>
          <p className="text-[9px] text-brand-subtext font-mono">
            Diferencial directo de cobros liquidados v/s pagos de comisiones emitidos
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Stat 3 */}
        <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border shadow-xs dark:shadow-none space-y-2 relative overflow-hidden transition-all hover:translate-y-[-1px]">
          <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-slate-400 block">
            Mínimo Proyectado a 90 días
          </span>
          <div className="flex items-baseline space-x-1.5">
            <strong className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-brand-text">
              {cashflowScenario === 'optimista' ? '31.200 €' : cashflowScenario === 'realista' ? '28.500 €' : '24.100 €'}
            </strong>
            <span className="text-xs text-brand-subtext font-bold">Escenario</span>
          </div>
          <p className="text-[9px] text-brand-subtext font-mono">
            Piso de liquidez proyectado libre de riesgos regulatorios o impagos
          </p>
          <div className={`absolute bottom-0 left-0 right-0 h-1 ${cashflowScenario === 'optimista' ? 'bg-emerald-500' : cashflowScenario === 'realista' ? 'bg-blue-600' : 'bg-red-650'}`} />
        </div>

        {/* Stat 4 */}
        <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border shadow-xs dark:shadow-none space-y-2 relative overflow-hidden transition-all hover:translate-y-[-1px]">
          <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-slate-400 block">
            Análisis de Riesgos Activos
          </span>
          <div className="flex items-baseline space-x-1.5">
            <strong className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${cashflowScenario === 'pesimista' ? 'text-red-500' : cashflowScenario === 'realista' ? 'text-amber-500' : 'text-slate-450'}`}>
              {cashflowScenario === 'optimista' ? '1 Alerta' : cashflowScenario === 'realista' ? '3 Alertas' : '6 Alertas'}
            </strong>
          </div>
          <p className="text-[9px] text-brand-subtext font-mono">
            {cashflowScenario === 'optimista' ? 'Excellent coverage' : cashflowScenario === 'realista' ? 'Revisar cobros Axpo demorados' : 'Riesgo alto de sobrecarga'}
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
        </div>
      </div>

      {/* CORE VISUALIZATIONS ROWS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Timeline Ledger list (Left column - 7/12) */}
        <div className="lg:col-span-7 bg-brand-panel p-6 rounded-2xl border border-brand-border space-y-5 shadow-xs dark:shadow-none">
          <div className="flex justify-between items-center pb-2 border-b border-brand-border">
            <div className="space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text font-mono">
                Calendario de Flujo: Timeline de Entradas y Salidas
              </h3>
              <p className="text-[10px] text-brand-subtext">
                Muestra los movimientos de capital de las últimas semanas y cobros estimados venideros.
              </p>
            </div>
            <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-brand-surface border border-brand-border rounded text-[10px] font-mono text-slate-400">
              Caja Operativa
            </span>
          </div>

          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {[
              { title: 'Cobro de comisiones contratos Corporate (Niba)', amount: 14500, date: '01 feb', type: 'Operativo', badge: 'Confirmado', isPositive: true },
              { title: 'Pago a red comercial (Liquidaciones Ene)', amount: -6200, date: '02 feb', type: 'Operativo', badge: 'Confirmado', isPositive: false },
              { title: 'Nóminas equipo de soporte y asesores', amount: -8800, date: '03 feb', type: 'Operativo', badge: 'Confirmado', isPositive: false },
              { title: 'Cobro de mantenimiento de carteras activas', amount: 4200, date: '05 feb', type: 'Operativo', badge: 'Confirmado', isPositive: true },
              { title: 'Provisiones de impuestos Q1 (Agencia Tributaria)', amount: -5300, date: '06 feb', type: 'Financiación', badge: 'Proyectado', isPositive: false },
              { title: 'Cobro leasing de equipos informáticos comerciales', amount: 2600, date: '08 feb', type: 'Financiación', badge: 'Proyectado', isPositive: true },
              { title: 'Adquisición de medidores inteligentes de monitorización', amount: -9300, date: '10 feb', type: 'Inversión', badge: 'Proyectado', isPositive: false },
              { title: 'Cobro contratos PYMES validados por Iberdesa', amount: 7800, date: '12 feb', type: 'Operativo', badge: 'Proyectado', isPositive: true }
            ].map((item, idx) => (
              <div 
                key={idx}
                className="p-3.5 bg-brand-surface/40 border border-brand-border rounded-xl flex items-center justify-between gap-3 hover:bg-slate-200/40 dark:hover:bg-white/5 transition-all"
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold ${
                    item.isPositive 
                      ? 'bg-emerald-500/10 text-emerald-500' 
                      : 'bg-red-500/10 text-red-500'
                  }`}>
                    {item.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-150 truncate leading-tight">
                      {item.title}
                    </h4>
                    <div className="flex items-center space-x-2 mt-1 text-[9px] font-mono text-slate-400 capitalize">
                      <span>{item.date}</span>
                      <span>•</span>
                      <span className="text-blue-500 dark:text-cyan-400 font-medium">{item.type}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 font-mono space-y-1">
                  <span className={`text-xs font-black block ${item.isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                    {item.isPositive ? `+${formatCurrency(item.amount)}` : formatCurrency(item.amount)}
                  </span>
                  <span className={`inline-flex px-1.5 py-0.25 text-[8px] uppercase tracking-wide rounded font-extrabold ${
                    item.badge === 'Confirmado' 
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/25' 
                      : 'bg-amber-500/10 text-amber-500 border border-amber-500/25'
                  }`}>
                    {item.badge}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Responsive SVG Chart of Projections (Right column - 5/12) */}
        <div className="lg:col-span-5 bg-brand-panel p-6 rounded-2xl border border-brand-border space-y-5 shadow-xs dark:shadow-none flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text font-mono">
              Proyecciones: Tendencia de Caja Mensual
            </h3>
            <p className="text-[10px] text-brand-subtext leading-normal">
              Gráfica de liquidez real acumulada e impacto del escenario de riesgo <span className="text-blue-600 dark:text-cyan-400 font-bold underline capitalize">{cashflowScenario}</span>.
            </p>
          </div>

          {/* Custom Pure SVG Line Chart */}
          <div className="relative w-full h-[220px] bg-slate-100 dark:bg-brand-surface/80 border border-brand-border rounded-xl p-3 flex flex-col justify-between">
            <div className="absolute top-2 left-2 flex items-center space-x-3 text-[8px] font-mono shrink-0 select-none">
              <div className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="text-slate-400">Patrimonio Real</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                <span className="text-slate-400">Provisión Scen</span>
              </div>
            </div>

            {/* SVG Plot */}
            <svg viewBox="0 0 400 180" className="w-full h-full text-slate-300 dark:text-slate-800 animate-fade-in" fill="none">
              <line x1="30" y1="20" x2="380" y2="20" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" />
              <line x1="30" y1="60" x2="380" y2="60" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" />
              <line x1="30" y1="100" x2="380" y2="100" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" />
              <line x1="30" y1="140" x2="380" y2="140" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" />

              <text x="5" y="24" className="fill-slate-500 text-[8px] font-mono font-medium">60k</text>
              <text x="5" y="64" className="fill-slate-500 text-[8px] font-mono font-medium">40k</text>
              <text x="5" y="104" className="fill-slate-500 text-[8px] font-mono font-medium">20k</text>
              <text x="5" y="144" className="fill-slate-500 text-[8px] font-mono font-medium">0k</text>

              <path
                d="M30 130 Q 80 110, 130 100 T 230 60"
                stroke="#3b82f6"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="230" cy="60" r="4.5" fill="#3b82f6" stroke="white" strokeWidth="1.5" />

              {cashflowScenario === 'optimista' && (
                <path
                  d="M230 60 L 280 45 L 330 30 L 380 15"
                  stroke="#fb923c"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="4,4"
                  fill="none"
                />
              )}
              {cashflowScenario === 'realista' && (
                <path
                  d="M230 60 L 280 65 L 330 75 L 380 80"
                  stroke="#fb923c"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="4,4"
                  fill="none"
                />
              )}
              {cashflowScenario === 'pesimista' && (
                <path
                  d="M230 60 L 280 85 L 330 115 L 380 135"
                  stroke="#ef4444"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="4,4"
                  fill="none"
                />
              )}

              {cashflowScenario === 'optimista' && <circle cx="380" cy="15" r="4.5" fill="#10b981" />}
              {cashflowScenario === 'realista' && <circle cx="380" cy="80" r="4.5" fill="#f59e0b" />}
              {cashflowScenario === 'pesimista' && <circle cx="380" cy="135" r="4.5" fill="#ef4444" />}

              <text x="30" y="165" className="fill-slate-500 text-[8px] font-mono text-center">Sep</text>
              <text x="80" y="165" className="fill-slate-500 text-[8px] font-mono text-center">Oct</text>
              <text x="130" y="165" className="fill-slate-500 text-[8px] font-mono text-center">Nov</text>
              <text x="180" y="165" className="fill-slate-500 text-[8px] font-mono text-center">Dic</text>
              <text x="230" y="165" className="fill-slate-500 text-[8px] font-mono text-center">Ene</text>
              <text x="280" y="165" className="fill-slate-500 text-[8px] font-mono text-center">Feb</text>
              <text x="330" y="165" className="fill-slate-500 text-[8px] font-mono text-center">Mar</text>
              <text x="380" y="165" className="fill-slate-500 text-[8px] font-mono text-center">Abr</text>
            </svg>
          </div>

          <div className="p-4 rounded-xl bg-brand-surface/40 border border-brand-border space-y-3 font-mono text-[11px]">
            <span className="font-extrabold uppercase text-[9px] tracking-wider text-indigo-500 font-mono block">
              Estadísticas Agregadas Mensual
            </span>
            <div className="flex justify-between border-b border-brand-border/40 pb-1.5">
              <span className="text-slate-400">Entradas Previstas:</span>
              <span className="font-bold text-emerald-500">+29.100,00 €</span>
            </div>
            <div className="flex justify-between border-b border-brand-border/40 pb-1.5">
              <span className="text-slate-400">Gastos & Comisiones:</span>
              <span className="font-bold text-red-500">-29.600,00 €</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Proyección Acumulada:</span>
              <span className="font-bold text-blue-600 dark:text-cyan-400">
                {cashflowScenario === 'optimista' ? '38.900,00 €' : cashflowScenario === 'realista' ? '30.600,00 €' : '26.400,00 €'}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* THIRD ROW: Caja Input Simulator & Active warnings logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-4">
        
        {/* Real Simulator sliders (Left - 6/12) */}
        <div className="lg:col-span-6 bg-brand-panel p-6 rounded-2xl border border-brand-border space-y-5 shadow-xs dark:shadow-none">
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text font-mono">
              Simulador Activo: Ajuste de Variables del Circulante
            </h3>
          </div>
          
          <p className="text-[10px] text-brand-subtext leading-relaxed">
            Modifica los ratios generales de retención y plazos medios de cobro corporativos de las compañías comercializadoras para visualizar la resiliencia en tiempo real.
          </p>

          <div className="space-y-4 pt-1 font-mono">
            {/* Slider 1 */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-700 dark:text-slate-350">Porcentaje Retención Operativa:</span>
                <span className="text-emerald-500">30% (Fijo)</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="50" 
                defaultValue="30" 
                onChange={() => toast.success('Sensibilidad de retención simulada. Proyección de capital recomputada')} 
                className="w-full h-1 bg-slate-250 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 text-emerald-500" 
              />
              <div className="flex justify-between text-[9px] text-slate-400">
                <span>Agresiva (10%)</span>
                <span>Conservadora / Soporte (50%)</span>
              </div>
            </div>

            {/* Slider 2 */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-700 dark:text-slate-350">Días Medios de Pago (Compañías):</span>
                <span className="text-blue-500">18 días</span>
              </div>
              <input 
                type="range" 
                min="5" 
                max="45" 
                defaultValue="18" 
                onChange={() => toast.success('Retraso simulado de contratos activados. El piso de tesorería disminuye en -2.400 €')} 
                className="w-full h-1 bg-slate-250 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" 
              />
              <div className="flex justify-between text-[9px] text-slate-400">
                <span>Críticos (5d)</span>
                <span>Demora Sector (45d)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Bulletins (Right - 6/12) */}
        <div className="lg:col-span-6 bg-brand-panel p-6 rounded-2xl border border-brand-border space-y-4 shadow-xs dark:shadow-none">
          <div className="flex items-center space-x-2 pb-1 border-b border-brand-border/60">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text font-mono">
              Alertas de Liquidez y Tesorería
            </h3>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5">
              <span className="px-1.5 py-0.5 bg-red-600 text-white font-mono text-[8px] font-bold rounded shrink-0">ALTA</span>
              <div className="text-[10px] space-y-1 text-slate-755 dark:text-slate-300 font-sans leading-relaxed">
                <strong className="text-slate-900 dark:text-white font-bold block">Pago Liquidación Impuestos Q1 (Abril 22)</strong>
                Reclamación de IVA devengado de transacciones intercompañía. Salida estimada neta: <span className="font-mono text-red-500 font-bold">-5.300,00 €</span>. Asegurar fondos en banco central.
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5">
              <span className="px-1.5 py-0.5 bg-amber-600 text-white font-mono text-[8px] font-bold rounded shrink-0">MEDIA</span>
              <div className="text-[10px] space-y-1 text-slate-755 dark:text-slate-300 font-sans leading-relaxed">
                <strong className="text-slate-900 dark:text-white font-bold block">Retraso Auditado en Validación Axpo</strong>
                La comercializadora Axpo cuenta con un retraso medio de firma sobre 4 contratos pymes activos de su nodo. Impacto en caja demorado a finales de mes: <span className="font-mono text-amber-600 font-bold">1.840,00 €</span>.
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
