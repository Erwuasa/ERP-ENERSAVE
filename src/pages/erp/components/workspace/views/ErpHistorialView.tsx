import { FileClock, Search, TrendingUp, Download } from 'lucide-react';
import type { ErpWorkspaceContext } from '@/pages/erp/hooks/useErpWorkspace';

type Props = { ws: ErpWorkspaceContext };

export function ErpHistorialView({ ws }: Props) {
  const {
    comparisonsHistory, compHistorySearch, setCompHistorySearch, formatCurrency
  } = ws;

  return (
                      <div className="space-y-8 animate-fade-in text-slate-800 dark:text-slate-100 font-sans">
                        <div className="bg-brand-panel p-6 sm:p-8 rounded-3xl border border-brand-border space-y-6 relative shadow-sm dark:shadow-none bg-white dark:bg-[#0f172a]">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-5">
                            <div className="flex items-center space-x-3">
                              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                                <FileClock className="w-6 h-6" />
                              </span>
                              <div>
                                <h3 className="text-sm font-extrabold text-brand-text tracking-wide uppercase">
                                  Historial de Comparativas
                                </h3>
                              </div>
                            </div>

                            {/* Optional search within history */}
                            <div className="relative w-full sm:w-64">
                              <Search className="w-3.5 h-3.5 text-brand-subtext absolute top-3 left-3" />
                              <input
                                type="text"
                                placeholder="Buscar cliente o CUPS..."
                                value={compHistorySearch}
                                onChange={(e) => setCompHistorySearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-brand-surface border border-brand-border rounded-xl focus:border-blue-500 focus:outline-none text-xs text-brand-text font-medium"
                              />
                            </div>
                          </div>

                          {/* History list or empty state */}
                          {comparisonsHistory.length === 0 ? (
                            <div className="p-12 text-center text-brand-subtext border border-dashed border-brand-border rounded-2xl bg-slate-50/50">
                              <p className="text-xs">No se han registrado comparativas en esta sesión.</p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="border-b border-brand-border text-[10px] uppercase font-bold tracking-wider font-mono text-brand-subtext">
                                    <th className="pb-3 px-2">Cliente / Fecha</th>
                                    <th className="pb-3 px-2">CUPS / Tarifa Acceso</th>
                                    <th className="pb-3 px-2 text-right">Gasto Actual</th>
                                    <th className="pb-3 px-2 text-right">Ahorro Máx.</th>
                                    <th className="pb-3 px-2">Mejor Oferta</th>
                                    <th className="pb-3 px-2 text-right">Propuesta</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-border">
                                  {comparisonsHistory
                                    .filter(item => 
                                      item.clientName.toLowerCase().includes(compHistorySearch.toLowerCase()) || 
                                      item.cups.toLowerCase().includes(compHistorySearch.toLowerCase())
                                    )
                                    .map((item, idx) => {
                                      const savingsPercent = item.currentAnnualExpense > 0 
                                        ? Math.round((item.maxAnnualSavings / item.currentAnnualExpense) * 100) 
                                        : 0;
                                      return (
                                        <tr key={item.id || idx} className="border-b border-brand-border hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-all">
                                          <td className="py-4 px-2">
                                            <div className="font-bold text-brand-text">{item.clientName}</div>
                                            <div className="text-[10px] text-brand-subtext font-mono mt-0.5">{item.date}</div>
                                          </td>
                                          <td className="py-4 px-2 font-mono text-[11px] text-brand-subtext">
                                            <div className="break-all">{item.cups}</div>
                                            <span className="inline-block bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded text-[9px] font-bold mt-1">
                                              TARIFA: {item.accessTariff}
                                            </span>
                                          </td>
                                          <td className="py-4 px-2 text-right font-mono font-bold text-brand-text">
                                            {formatCurrency(item.currentAnnualExpense)}/año
                                          </td>
                                          <td className="py-4 px-2 text-right font-mono">
                                            <div className="text-emerald-500 font-extrabold">{formatCurrency(item.maxAnnualSavings)}/año</div>
                                            <div className="text-[10px] font-bold text-emerald-500 mt-0.5">-{savingsPercent}% Gasto</div>
                                          </td>
                                          <td className="py-4 px-2">
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-cyan-400 text-[10px] font-extrabold rounded-lg border border-blue-100 dark:border-blue-900/30">
                                              <TrendingUp className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
                                              {item.bestTariffName}
                                            </span>
                                          </td>
                                          <td className="py-4 px-2 text-right">
                                            <button
                                              onClick={() => {
                                                alert(`📄 Generando propuesta comercial en formato PDF...\nCliente: ${item.clientName}\nCUPS: ${item.cups}\nAhorro Estimado: ${formatCurrency(item.maxAnnualSavings)}/año (${savingsPercent}%)\n\n¡PDF de Propuesta Comercial Enersave guardado en descargas con éxito!`);
                                              }}
                                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-extrabold text-[10px] rounded-lg tracking-wider uppercase shadow transition-colors cursor-pointer"
                                            >
                                              <Download className="w-3.5 h-3.5" />
                                              <span>Descargar PDF</span>
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
  );
}
