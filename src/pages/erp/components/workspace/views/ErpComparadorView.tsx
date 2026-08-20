import { AnimatePresence, motion } from 'motion/react';
import { Calculator, User, Building2, Zap, Coins, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import type { ErpWorkspaceContext } from '@/pages/erp/hooks/useErpWorkspace';

type Props = { ws: ErpWorkspaceContext };

export function ErpComparadorView({ ws }: Props) {
  const {
    compClient, setCompClient, compSegment, setCompSegment,
    compAccessTariff, setCompAccessTariff, compPotencias, setCompPotencias,
    compConsumos, setCompConsumos, compRentMeter, setCompRentMeter,
    compCurrentBill, setCompCurrentBill, compLoading, compResults, compSummary,
    openNewContractModal
  } = ws;

  return (
                      <div className="space-y-8 animate-fade-in text-slate-800 dark:text-slate-100 font-sans">
                        
                        {/* Comparative Input screen */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                          
                          {/* Left: Input controls */}
                          <div className="lg:col-span-5 bg-brand-panel p-6 sm:p-8 rounded-3xl border border-brand-border space-y-6 relative shadow-sm dark:shadow-none bg-white dark:bg-[#0f172a]">
                            <div className="flex items-center space-x-3 pb-3 border-b border-brand-border">
                              <Calculator className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                              <h3 className="text-sm font-extrabold text-brand-text tracking-wide uppercase">
                                Parámetros del Suministro
                              </h3>
                            </div>
                            <div className="space-y-5">
                              {/* Client field */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-mono font-bold text-brand-subtext uppercase tracking-wider">
                                  Nombre del Cliente
                                </label>
                                <input
                                  type="text"
                                  value={compClient}
                                  onChange={(e) => setCompClient(e.target.value)}
                                  placeholder="Ferretería García S.L."
                                  className="w-full px-3.5 py-2.5 bg-brand-surface border border-brand-border rounded-xl focus:border-blue-505 focus:outline-none text-xs text-brand-text font-medium"
                                />
                              </div>

                              {/* Segment selection */}
                              <div className="space-y-2">
                                <label className="block text-[10px] font-mono font-bold text-brand-subtext uppercase tracking-wider">
                                  Segmento Comercial
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                  <button
                                    type="button"
                                    onClick={() => setCompSegment('residencial')}
                                    className={`py-3 px-2 rounded-xl text-xs font-bold cursor-pointer transition-all border flex flex-col items-center gap-1.5 ${
                                      compSegment === 'residencial' 
                                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 shadow-sm' 
                                        : 'bg-brand-surface text-brand-subtext border-brand-border hover:bg-slate-100 hover:bg-brand-elevated'
                                    }`}
                                  >
                                    <User className="w-4 h-4" />
                                    <span>Residencial / Hogar</span>
                                  </button>
                                  
                                  <button
                                    type="button"
                                    onClick={() => setCompSegment('pyme')}
                                    className={`py-3 px-2 rounded-xl text-xs font-bold cursor-pointer transition-all border flex flex-col items-center gap-1.5 ${
                                      compSegment === 'pyme' 
                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/30 shadow-sm' 
                                        : 'bg-brand-surface text-brand-subtext border-brand-border hover:bg-slate-100 hover:bg-brand-elevated'
                                    }`}
                                  >
                                    <Building2 className="w-4 h-4" />
                                    <span>PYME / Industrial</span>
                                  </button>
                                </div>
                              </div>

                              {/* Access rate select */}
                              <div className="space-y-1.5">
                                <label className="block text-[10px] font-mono font-bold text-brand-subtext uppercase tracking-wider">Tarifa de Acceso</label>
                                <select
                                  value={compAccessTariff}
                                  onChange={(e) => setCompAccessTariff(e.target.value as any)}
                                  className="w-full px-3 py-2.5 bg-brand-surface border border-brand-border rounded-xl focus:border-blue-500 focus:outline-none text-xs font-mono font-bold text-brand-text cursor-pointer"
                                >
                                  <option value="2.0TD">2.0TD (≤ 15 kW - Hogar & Pequeño Comercio)</option>
                                  <option value="3.0TD">3.0TD (&gt; 15 kW - Comercios / PYME)</option>
                                  <option value="6.0TD">6.0TD (Alta Tensión - Industrial)</option>
                                </select>
                              </div>

                              {/* Potencias contratas con toggle dinámico */}
                              <div className="p-4 bg-slate-50/50 dark:bg-brand-surface/50 border border-brand-border rounded-2xl space-y-3">
                                <span className="text-[10px] font-bold font-mono text-blue-600 dark:text-blue-400 uppercase tracking-wide flex items-center gap-1">
                                  <Zap className="w-3 h-3" /> Potencia Contratada (kW)
                                </span>
                                
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[9px] text-brand-subtext block font-mono">P1 (Punta)</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={compPotencias.p1}
                                      onChange={(e) => setCompPotencias({ ...compPotencias, p1: Number(e.target.value) })}
                                      className="w-full px-2.5 py-1.5 bg-brand-surface border border-brand-border rounded-lg text-xs font-mono focus:border-blue-500 text-brand-text"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] text-brand-subtext block font-mono">P2 (Valle)</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={compPotencias.p2}
                                      onChange={(e) => setCompPotencias({ ...compPotencias, p2: Number(e.target.value) })}
                                      className="w-full px-2.5 py-1.5 bg-brand-surface border border-brand-border rounded-lg text-xs font-mono focus:border-blue-500 text-brand-text"
                                    />
                                  </div>
                                </div>

                                {/* ANIMATED EXPANSION FOR period P3-P6 */}
                                <AnimatePresence initial={false}>
                                  {(compAccessTariff === "3.0TD" || compAccessTariff === "6.0TD") && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.3 }}
                                      className="overflow-hidden space-y-2 pt-2 border-t border-brand-border"
                                    >
                                      <span className="text-[9px] text-brand-subtext block uppercase font-mono">Periodos P3 a P6</span>
                                      <div className="grid grid-cols-4 gap-2">
                                        {['p3', 'p4', 'p5', 'p6'].map((p) => (
                                          <div key={p}>
                                            <label className="text-[8px] text-zinc-500 font-mono block uppercase">{p}</label>
                                            <input
                                              type="number"
                                              step="0.1"
                                              value={(compPotencias as any)[p] || 0}
                                              onChange={(e) => setCompPotencias({ ...compPotencias, [p]: Number(e.target.value) })}
                                              className="w-full p-1 bg-brand-surface border border-brand-border rounded text-[11px] font-mono text-center text-brand-text"
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>

                              {/* Consumo histórico P1-P6 */}
                              <div className="p-4 bg-slate-50/50 dark:bg-brand-surface/50 border border-brand-border rounded-2xl space-y-3">
                                <span className="text-[10px] font-bold font-mono text-blue-600 dark:text-blue-400 uppercase tracking-wide flex items-center gap-1">
                                  <Coins className="w-3 h-3" /> Energía Consumida (kWh/año)
                                </span>
                                
                                <div className="grid grid-cols-3 gap-2">
                                  <div className="space-y-1">
                                    <label className="text-[9px] text-brand-subtext block font-mono">P1 Punta</label>
                                    <input
                                      type="number"
                                      value={compConsumos.p1}
                                      onChange={(e) => setCompConsumos({ ...compConsumos, p1: Number(e.target.value) })}
                                      className="w-full px-2 py-1 bg-brand-surface border border-brand-border rounded text-xs font-mono focus:border-blue-500 text-brand-text"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] text-brand-subtext block font-mono">P2 Llano</label>
                                    <input
                                      type="number"
                                      value={compConsumos.p2}
                                      onChange={(e) => setCompConsumos({ ...compConsumos, p2: Number(e.target.value) })}
                                      className="w-full px-2 py-1 bg-brand-surface border border-brand-border rounded text-xs font-mono focus:border-blue-500 text-brand-text"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] text-brand-subtext block font-mono">P3 Valle</label>
                                    <input
                                      type="number"
                                      value={compConsumos.p3}
                                      onChange={(e) => setCompConsumos({ ...compConsumos, p3: Number(e.target.value) })}
                                      className="w-full px-2 py-1 bg-brand-surface border border-brand-border rounded text-xs font-mono focus:border-blue-500 text-brand-text"
                                    />
                                  </div>
                                </div>

                                {/* ANIMATED EXPANSION FOR ENERGY P4-P6 */}
                                <AnimatePresence initial={false}>
                                  {(compAccessTariff === "3.0TD" || compAccessTariff === "6.0TD") && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.3 }}
                                      className="overflow-hidden space-y-2 pt-2 border-t border-brand-border"
                                    >
                                      <span className="text-[9px] text-brand-subtext block uppercase font-mono">Periodos consumo P4 a P6</span>
                                      <div className="grid grid-cols-3 gap-2">
                                        {['p4', 'p5', 'p6'].map((p) => (
                                          <div key={p}>
                                            <label className="text-[8px] text-zinc-500 font-mono block uppercase">{p}</label>
                                            <input
                                              type="number"
                                              value={(compConsumos as any)[p] || 0}
                                              onChange={(e) => setCompConsumos({ ...compConsumos, [p]: Number(e.target.value) })}
                                              className="w-full p-1 bg-brand-surface border border-brand-border rounded text-[11px] font-mono text-center text-brand-text"
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>

                              {/* Optional parameters */}
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="block text-[9px] font-mono uppercase text-brand-subtext">Contador (€/mes)</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={compRentMeter}
                                    onChange={(e) => setCompRentMeter(Number(e.target.value))}
                                    className="w-full px-3 py-1.5 bg-brand-surface border border-brand-border rounded-lg text-xs font-mono text-brand-text"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-[9px] font-mono uppercase text-brand-subtext">Factura Actual Anual (€)</label>
                                  <input
                                    type="number"
                                    value={compCurrentBill}
                                    onChange={(e) => setCompCurrentBill(Number(e.target.value))}
                                    className="w-full px-3 py-1.5 bg-brand-surface border border-brand-border rounded-lg text-xs font-mono text-brand-text"
                                  />
                                </div>
                              </div>

                              {/* Auto-calculation indicator */}
                              <div className="pt-2 border-t border-dashed border-brand-border">
                                <p className="text-[10px] text-center font-mono text-emerald-600 dark:text-emerald-400 animate-pulse uppercase tracking-wider font-extrabold flex items-center justify-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5" />
                                  Autocalculando mejor tarifa...
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Right: Results comparison with visual cards list */}
                          <div className="lg:col-span-7 space-y-6">
                            <AnimatePresence mode="wait">
                              {compLoading ? (
                                <motion.div
                                  key="loading"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="space-y-6"
                                >
                                  {/* Tarjeta de Resumen de Ahorros Skeleton */}
                                  <div className="p-6 bg-brand-panel border border-brand-border rounded-2xl space-y-4">
                                    <div className="flex justify-between items-center">
                                      <Skeleton className="h-6 w-48" />
                                      <Skeleton className="h-8 w-16 rounded-full" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                                      <div className="p-4 bg-slate-50 dark:bg-brand-surface rounded-xl border border-brand-border animate-pulse">
                                        <div className="h-4 w-24 mb-2 bg-slate-200 dark:bg-slate-700" />
                                        <div className="h-7 w-20 bg-slate-300 dark:bg-slate-600" />
                                      </div>
                                      <div className="p-4 bg-slate-50 dark:bg-brand-surface rounded-xl border border-brand-border animate-pulse">
                                        <div className="h-4 w-24 mb-2 bg-slate-200 dark:bg-slate-700" />
                                        <div className="h-7 w-20 bg-slate-300 dark:bg-slate-600" />
                                      </div>
                                      <div className="p-4 bg-slate-50 dark:bg-brand-surface rounded-xl border border-brand-border animate-pulse">
                                        <div className="h-4 w-24 mb-2 bg-slate-200 dark:bg-slate-700" />
                                        <div className="h-7 w-20 bg-slate-300 dark:bg-slate-600" />
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              ) : compResults && compSummary ? (
                                <motion.div
                                  key="results"
                                  initial="hidden"
                                  animate="show"
                                  variants={{
                                    hidden: { opacity: 0 },
                                    show: {
                                      opacity: 1,
                                      transition: { staggerChildren: 0.1 }
                                    }
                                  }}
                                  className="space-y-6"
                                >
                                  {/* Listing Title */}
                                  <div className="flex items-center justify-between px-2">
                                    <span className="text-[10px] font-bold uppercase font-mono text-brand-subtext tracking-wider">Top 3 Ofertas de Comercialización</span>
                                    <span className="text-[9px] text-brand-subtext font-mono italic">Ordenado por coste anual</span>
                                  </div>

                                  {/* Cards cascade comparison */}
                                  {compResults.map((opt, idx) => (
                                    <motion.div
                                      key={opt.id}
                                      variants={{
                                        hidden: { opacity: 0, y: 20 },
                                        show: { opacity: 1, y: 0 }
                                      }}
                                      className={`rounded-3xl p-5 border relative transition-all ${
                                        opt.isBestOption
                                          ? "bg-brand-panel border-blue-500/40 shadow-sm"
                                          : "bg-brand-panel border-brand-border hover:border-slate-300"
                                      }`}
                                    >
                                      {opt.isBestOption && (
                                        <div className="absolute top-0 right-8 -translate-y-1/2 px-2.5 py-0.5 bg-yellow-400 text-blue-950 text-[9px] font-sans font-extrabold rounded-full uppercase tracking-wider scale-95 border border-yellow-500/10">
                                          Mejor Tarifa Homologada
                                        </div>
                                      )}

                                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div>
                                          <div className="flex items-center space-x-2">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                                              opt.companyName === "EnerLuz" ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20" :
                                              opt.companyName === "Iberdrola" ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20" :
                                              "bg-slate-100 dark:bg-brand-surface text-slate-500"
                                            }`}>
                                              {opt.companyName}
                                            </span>
                                            <span className="text-xs text-brand-subtext font-mono">
                                              {opt.tariffName}
                                            </span>
                                          </div>

                                          <div className="mt-2 text-brand-text">
                                            <div className="flex items-baseline space-x-1">
                                              <span className="text-xl font-bold font-mono text-brand-text">{opt.monthlyCost} €</span>
                                              <span className="text-[10px] text-brand-subtext">/ mes</span>
                                              <span className="text-[11px] text-brand-subtext font-mono ml-2">({opt.annualCost.toLocaleString("es-ES")} €/año)</span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="bg-brand-surface p-2 rounded-xl text-left sm:text-right border border-brand-border font-mono text-xs">
                                          <span className="text-[9px] text-brand-subtext block font-bold leading-none mb-1">AHORRO NETO</span>
                                          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">-{opt.savingsAnnual} €/año</span>
                                          <span className="text-[9px] text-emerald-650 dark:text-emerald-300 font-bold block bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 mt-1">
                                            {opt.savingsPercentage}% ahorro
                                          </span>
                                        </div>
                                      </div>

                                      {/* Period breakdown breakdown */}
                                      <div className="mt-3.5 pt-3 border-t border-brand-border grid grid-cols-3 gap-2 text-[10px] font-mono text-brand-subtext">
                                        <div>
                                          <span className="text-[8px] text-brand-subtext block uppercase font-bold">P. Potencia:</span>
                                          <span className="text-brand-text font-semibold">{opt.potenciaBreakdown} €</span>
                                        </div>
                                        <div>
                                          <span className="text-[8px] text-brand-subtext block uppercase font-bold">P. Consumo:</span>
                                          <span className="text-brand-text font-semibold">{opt.consumoBreakdown} €</span>
                                        </div>
                                        <div>
                                          <span className="text-[8px] text-brand-subtext block uppercase font-bold">Alq. Contador:</span>
                                          <span className="text-brand-text font-semibold">{opt.rentCostAnnual} €</span>
                                        </div>
                                      </div>

                                      {/* Action button */}
                                      <div className="mt-4 flex justify-between items-center bg-brand-surface p-2 rounded-xl border border-brand-border">
                                        <span className="text-[10px] text-brand-subtext font-mono">¿Es conforme este ahorro?</span>
                                        <button
                                          type="button"
                                          onClick={() => openNewContractModal(opt)}
                                          className={`px-4 py-2 rounded-xl text-[10px] font-bold cursor-pointer transition-all ${
                                            opt.isBestOption
                                              ? "bg-blue-605 hover:bg-blue-700 bg-blue-600 text-white font-extrabold shadow"
                                              : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-brand-border"
                                          }`}
                                        >
                                          Generar Contrato
                                        </button>
                                      </div>
                                    </motion.div>
                                  ))}

                                </motion.div>
                              ) : (
                                <motion.div
                                  key="empty"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="bg-brand-panel border border-dashed border-brand-border rounded-3xl p-12 text-center text-brand-subtext flex flex-col items-center justify-center space-y-4 shadow-sm dark:shadow-none bg-white dark:bg-[#0f172a]"
                                >
                                  <div className="p-4 bg-slate-50 dark:bg-brand-surface border border-brand-border rounded-2xl text-blue-600 dark:text-blue-400 animate-pulse">
                                    <Calculator className="w-8 h-8" />
                                  </div>
                                  <div className="space-y-1">
                                    <h3 className="text-xs font-bold text-brand-text uppercase tracking-wider">
                                      Esperando parámetros
                                    </h3>
                                    <p className="text-xs text-brand-subtext max-w-sm mt-1 mx-auto leading-relaxed">
                                      Completa el formulario de potencia contratada y consumos históricos y pincha el botón para procesar la comparativa multi-proveedor.
                                    </p>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                        </div>

                      </div>
  );
}
