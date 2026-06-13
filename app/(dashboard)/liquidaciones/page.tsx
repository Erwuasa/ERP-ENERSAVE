"use client";

import React, { useState, useEffect } from "react";
import { 
  DollarSign, 
  Wallet, 
  TrendingUp, 
  Users, 
  CheckCircle, 
  ArrowRight, 
  Percent, 
  Coins, 
  Award,
  Zap,
  Clock,
  ShieldCheck,
  ZapOff
} from "lucide-react";
import { getUsers, UserProfile } from "../../actions/userActions";
import { distributeCommissions, getSettlements, SettlementRecord, DistributionResult } from "../../actions/settlementActions";

export default function LiquidacionesPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [distResult, setDistResult] = useState<DistributionResult | null>(null);

  // Simulation variables for entering test parameters in NextJS dashboard view
  const [testContractId, setTestContractId] = useState("con-test-99");
  const [testClientName, setTestClientName] = useState("Fruterías Unidas S.A.");
  const [testComercialId, setTestComercialId] = useState("");
  const [testConsumo, setTestConsumo] = useState(48000);
  const [testPotencia, setTestPotencia] = useState(25);
  const [testTipo, setTestTipo] = useState<"luz" | "gas">("luz");

  useEffect(() => {
    async function loadData() {
      try {
        const usersResp = await getUsers();
        const settlementsResp = await getSettlements();
        if (usersResp.success) {
          setUsers(usersResp.users);
          // Set first commercial as default test target
          const commercial = usersResp.users.find(u => u.role === "comercial");
          if (commercial) {
            setTestComercialId(commercial.id);
          }
        }
        if (settlementsResp.success) {
          setSettlements(settlementsResp.settlements);
        }
      } catch (err) {
        console.error("Error loading mock data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Recalculate KPIs based on settlements and users database state
  // Let's assume Empresa total sales volume is €3,200.00 as baseline + active settlements
  const totalInternalEmpresa = settlements.reduce((sum, s) => sum + s.montoInterno, 0); // Total margin coming from retailers
  const paidSettlementsTotal = settlements.filter(s => s.estado === "pagado").reduce((sum, s) => sum + s.montoExterno, 0);
  const pendingSettlementsTotal = settlements.filter(s => s.estado === "pendiente").reduce((sum, s) => sum + s.montoExterno, 0);
  
  // Beneficio Total Empresa (Total received or processed from energy provider)
  const beneficioTotalEmpresa = totalInternalEmpresa;
  
  // Liquidaciones pendientes to our sales network
  const liquidacionesPendientesRed = pendingSettlementsTotal;
  
  // Beneficio Neto (Company retains what is left after team commission allocations)
  const beneficioNeto = beneficioTotalEmpresa - (paidSettlementsTotal + pendingSettlementsTotal);

  // Group Pending Payments by Jefe Comercial / Manager
  const groupPendingByJefe = () => {
    // Collect all jefe/superadmin profiles
    const managers = users.filter(u => u.role === "jefe_comercial" || u.role === "superadmin");
    
    return managers.map(manager => {
      // Find team members who report to this manager
      const teamUserIds = users.filter(u => u.managerId === manager.id).map(u => u.id);
      
      // Let's assume settlements with their comercialId matching team members or the manager himself
      const relatedIds = [...teamUserIds, manager.id];
      const pendingItems = settlements.filter(s => s.estado === "pendiente" && relatedIds.includes(s.comercialId));
      const pendingTotal = pendingItems.reduce((sum, s) => sum + s.montoExterno, 0);

      return {
        managerId: manager.id,
        managerName: manager.fullName,
        role: manager.role,
        pendingTotal: Math.round(pendingTotal * 100) / 100,
        teamCount: teamUserIds.length,
        items: pendingItems
      };
    }).filter(item => item.pendingTotal > 0);
  };

  const groupedManagers = groupPendingByJefe();

  const handleTestDistribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testComercialId) return;

    const res = await distributeCommissions({
      contractId: testContractId,
      clientName: testClientName,
      comercialId: testComercialId,
      consumoKwh: testConsumo,
      potenciaKw: testPotencia,
      tipo: testTipo
    });

    if (res.success) {
      setDistResult(res);
      // Update settlements array to display output instantly
      setSettlements(prev => [...res.insertedRecords, ...prev]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8 flex items-center justify-center font-mono text-xs">
        Cargando Marco Retributivo Ener-ERP...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10 space-y-10 font-sans">
      
      {/* Header info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-6 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 text-[10px] uppercase font-bold font-mono tracking-widest bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              Auditoría Interna ERP
            </span>
          </div>
          <h1 className="text-2xl font-black mt-2 tracking-tight uppercase font-sans">
            Liquidaciones & Marco Retributivo
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Control de comisiones por comercializadoras energéticas. Distribución de comisiones de luz y gas aplicando split multinivel en base a consumo anual (kWh) y potencia de suministro (kW).
          </p>
        </div>
        
        <div className="flex items-center space-x-2 text-xs font-mono text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Políticas RLS Activas y Consolidadas en Supabase</span>
        </div>
      </div>

      {/* KPI Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* KPI 1 - Beneficio Total */}
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                Beneficio Total Empresa (Bruto)
              </span>
              <p className="text-3xl font-black tracking-tight mt-1 text-white">
                {beneficioTotalEmpresa.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €
              </p>
              <p className="text-[10px] text-slate-400 font-mono mt-2">
                Ingresos acumulados desde comercializadoras
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-white/5 text-cyan-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* KPI 2 - Pendiente a Red */}
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                Liquidaciones Pendientes Red
              </span>
              <p className="text-3xl font-black tracking-tight mt-1 text-amber-400">
                {liquidacionesPendientesRed.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €
              </p>
              <p className="text-[10px] text-slate-400 font-mono mt-2">
                Comisión a pagar a Agentes y Jefes {settlements.filter(s=>s.estado==="pendiente").length} liqs.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-white/5 text-amber-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* KPI 3 - Beneficio Neto */}
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase">
                Beneficio Neto Retenido
              </span>
              <p className="text-3xl font-black tracking-tight mt-1 text-emerald-400">
                {beneficioNeto.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €
              </p>
              <p className="text-[10px] text-slate-400 font-mono mt-2">
                Resultado neto tras reparto multinivel de red (30%)
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-white/5 text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

      </div>

      {/* Main Grid: Grouped by Jefe Comercial & Test Tool */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Span: Payments grouped by Jefe Comercial */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-white/5 rounded-2xl p-6 space-y-4">
            <div>
              <h2 className="text-sm font-extrabold uppercase font-mono tracking-wider text-white">
                Pagos Pendientes Agrupados por Jefe Comercial
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Aprobación agregada y control de gastos consolidado por supervisor jerárquico.
              </p>
            </div>

            {groupedManagers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 font-mono border border-dashed border-white/10 rounded-xl">
                Ninguna liquidación de comisión pendiente asignada bajo directivos activos.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-500 font-mono">
                      <th className="pb-3 uppercase tracking-wider text-[10px]">Jefe Comercial</th>
                      <th className="pb-3 uppercase tracking-wider text-[10px] text-center">Fuerza de Ventas</th>
                      <th className="pb-3 uppercase tracking-wider text-[10px] text-center">Comisiones Pendientes</th>
                      <th className="pb-3 uppercase tracking-wider text-[10px] text-right">Sumatorio Total</th>
                      <th className="pb-3 text-right text-[10px] uppercase font-bold tracking-wider">Detalles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedManagers.map((grp, idx) => (
                      <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.01]">
                        <td className="py-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-7 h-7 rounded bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs uppercase">
                              {grp.managerName.substring(0, 2)}
                            </div>
                            <div>
                              <p className="font-bold text-white text-xs">{grp.managerName}</p>
                              <p className="text-[10px] text-indigo-400 font-mono">Jefe Comercial</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-center font-mono">
                          {grp.teamCount} asesores asignados
                        </td>
                        <td className="py-4 text-center font-mono">
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/15">
                            {grp.items.length} pendientes
                          </span>
                        </td>
                        <td className="py-4 text-right font-mono text-emerald-400 font-bold text-sm">
                          {grp.pendingTotal.toLocaleString("es-ES")} €
                        </td>
                        <td className="py-4 text-right">
                          <button className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-white/10 text-[10px] font-mono text-slate-300">
                            Examinar Lista
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* List of Individual Settlements */}
          <div className="bg-slate-900 border border-white/5 rounded-2xl p-6 space-y-4">
            <div>
              <h2 className="text-sm font-extrabold uppercase font-mono tracking-wider text-white">
                Historial de Liquidaciones Individuales
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Todas las comisiones registradas en la tabla de liquidaciones del ERP.
              </p>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 text-slate-500 font-mono text-[9px] uppercase">
                    <th className="pb-3">Cód. Liquidación</th>
                    <th className="pb-3">Comercial / Beneficiario</th>
                    <th className="pb-3">Tipo</th>
                    <th className="pb-3">Detalle / Concepto</th>
                    <th className="pb-3 text-center">Neto Recibido</th>
                    <th className="pb-3 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.map((s, idx) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.01]">
                      <td className="py-3 font-mono text-slate-500">
                        {s.id}
                      </td>
                      <td className="py-3 font-bold text-slate-300">
                        {s.comercialName === "Cargando Asesor..." 
                          ? (users.find(u => u.id === s.comercialId)?.fullName || "Asesor General") 
                          : s.comercialName}
                      </td>
                      <td className="py-3">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                          s.tipo === "luz" ? "bg-cyan-500/10 text-cyan-400" : "bg-amber-500/10 text-amber-500"
                        }`}>
                          {s.tipo}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400 text-[11px] max-w-xs truncate">
                        {s.descripcion}
                      </td>
                      <td className="py-3 text-center font-mono font-black text-amber-400">
                        {s.montoExterno.toFixed(2)} €
                      </td>
                      <td className="py-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          s.estado === "pagado" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}>
                          {s.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Span: Split Commission Simulator */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center space-x-2 text-cyan-400">
              <Coins className="w-5 h-5" />
              <h3 className="text-sm font-extrabold uppercase font-mono tracking-wider text-white">
                Simulador de Split Multinivel
              </h3>
            </div>
            <p className="text-slate-400 text-xs">
              Simula la activación de un contrato y el cálculo dinámico automático de la comisión multinivel.
            </p>

            <form onSubmit={handleTestDistribution} className="space-y-3 text-xs">
              
              <div>
                <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                  ID del Contrato
                </label>
                <input 
                  type="text" 
                  value={testContractId} 
                  onChange={e => setTestContractId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                  Razón Social / Cliente
                </label>
                <input 
                  type="text" 
                  value={testClientName} 
                  onChange={e => setTestClientName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                    Tipo de Contrato
                  </label>
                  <select 
                    value={testTipo} 
                    onChange={e => setTestTipo(e.target.value as any)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-slate-100 font-mono font-bold"
                  >
                    <option value="luz">💡 LUZ</option>
                    <option value="gas">🔥 GAS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                    Asesor de Cierre
                  </label>
                  <select 
                    value={testComercialId} 
                    onChange={e => setTestComercialId(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-slate-100 font-mono"
                  >
                    {users.filter(u => u.role === "comercial").map(u => (
                      <option key={u.id} value={u.id}>{u.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                    Consumo Estimado (kWh)
                  </label>
                  <input 
                    type="number" 
                    value={testConsumo} 
                    onChange={e => setTestConsumo(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                    Potencia Contratada (kW)
                  </label>
                  <input 
                    type="number" 
                    value={testPotencia} 
                    onChange={e => setTestPotencia(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 font-sans hover:opacity-90 transition-opacity p-2.5 text-slate-950 rounded-xl font-extrabold flex items-center justify-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4 text-slate-950" />
                  <span>Simular Activación de Contrato</span>
                </button>
              </div>

            </form>

            {/* Simulated Live Output */}
            {distResult && (
              <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-emerald-500/20 space-y-3 text-xs font-mono">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-bold text-[10px] uppercase">¡Reparto Calculado OK!</span>
                </div>
                
                <div className="space-y-1 text-slate-300 text-[10px] border-b border-white/10 pb-2">
                  <div className="flex justify-between">
                    <span>Comisión Bruta Total:</span>
                    <span className="text-white font-bold">{distResult.totalCommission.toFixed(2)} €</span>
                  </div>
                  <p className="text-[8px] text-slate-500">
                    Fórmula ({testTipo === "luz" ? "Luz" : "Gas"}): {testConsumo} kWh * {testTipo === "luz" ? "0.015" : "0.012"} + {testPotencia} kW * {testTipo === "luz" ? "5.50" : "4.00"}
                  </p>
                </div>

                {/* Split list */}
                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between text-yellow-400 font-semibold">
                    <span>Comercial (50%):</span>
                    <span>{distResult.comercialShare.toFixed(2)} €</span>
                  </div>
                  <p className="text-[8px] text-slate-400 pl-2">Beneficiario: {distResult.comercialName}</p>

                  <div className="flex justify-between text-cyan-400 font-semibold">
                    <span>Jefe Red Override (20%):</span>
                    <span>{distResult.jefeShare.toFixed(2)} €</span>
                  </div>
                  <p className="text-[8px] text-slate-400 pl-2">Supervisor: {distResult.jefeName}</p>

                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>Empresa Superadmin (30%):</span>
                    <span>{distResult.superadminShare.toFixed(2)} €</span>
                  </div>
                </div>

                <div className="text-[8px] text-slate-400 bg-slate-900 p-2 rounded border border-white/5 space-y-1">
                  <p className="font-bold uppercase text-[7px] text-emerald-500">Registros en Supabase "liquidaciones":</p>
                  <p className="truncate">Insertando fila comercial: +{distResult.comercialShare} €</p>
                  {distResult.jefeShare > 0 && <p className="truncate">Insertando fila jefe: +{distResult.jefeShare} €</p>}
                </div>
              </div>
            )}

          </div>

          <div className="bg-slate-900 border border-white/5 rounded-2xl p-6 text-xs text-slate-400 space-y-3">
            <h4 className="font-bold text-white uppercase text-[10px] tracking-widest font-mono">
              Marco Regulatorio & Retribución
            </h4>
            <p className="leading-relaxed">
              Las liquidaciones están protegidas bajo las directivas RLS de PostgreSQL de Supabase. Ningún comercial puede acceder o inspeccionar las override commissions del Jefe Comercial ni las company pools de Superadmin.
            </p>
            <div className="p-2.5 rounded bg-slate-950 font-mono text-[9px] text-slate-400 space-y-1 border border-white/5">
              <span className="text-amber-500 font-bold block uppercase text-[8px]">Comisiones Establecidas:</span>
              <span>• Tarifa Indexada Luz: 50% Asesor | 20% Director | 30% Plataforma</span>
              <span>• Tarifa Fija Gas: Diferencial de Potencia + Consumo Escalado</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
