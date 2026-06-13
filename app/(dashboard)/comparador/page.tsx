"use client";

import React, { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calculator,
  Zap,
  Building2,
  User,
  ChevronRight,
  Sparkles,
  Info,
  CheckCircle2,
  ChevronDown,
  Check,
  ArrowRight,
  Coins,
  Shield,
} from "lucide-react";
import { compareTariffs, ComparePayload, TariffResult } from "../../actions/compareTariffs";

// ==========================================
// ZOD VALIDATION SCHEMA DEFINITION
// ==========================================
const comparadorSchema = z.object({
  segment: z.enum(["residencial", "pyme"]),
  accessTariff: z.enum(["2.0TD", "3.0TD", "6.0TD"]),
  potencia: z.object({
    p1: z.coerce.number().min(0.1, { message: "La potencia P1 es obligatoria" }),
    p2: z.coerce.number().min(0.1, { message: "La potencia P2 es obligatoria" }),
    p3: z.coerce.number().optional().default(0),
    p4: z.coerce.number().optional().default(0),
    p5: z.coerce.number().optional().default(0),
    p6: z.coerce.number().optional().default(0),
  }),
  consumo: z.object({
    p1: z.coerce.number().min(0, { message: "P1 no puede ser negativo" }),
    p2: z.coerce.number().min(0, { message: "P2 no puede ser negativo" }),
    p3: z.coerce.number().min(0, { message: "P3 no puede ser negativo" }),
    p4: z.coerce.number().optional().default(0),
    p5: z.coerce.number().optional().default(0),
    p6: z.coerce.number().optional().default(0),
  }),
  rentMeterCost: z.coerce.number().optional().default(1.84),
  currentBillAmount: z.coerce.number().optional().default(0),
});

type FormValues = z.infer<typeof comparadorSchema>;

export default function ComparadorPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TariffResult[] | null>(null);
  const [summary, setSummary] = useState<any | null>(null);
  const [activeRateType, setActiveRateType] = useState<string>("2.0TD");

  // React Hook Form initialization
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(comparadorSchema),
    defaultValues: {
      segment: "residencial",
      accessTariff: "2.0TD",
      potencia: { p1: 4.6, p2: 4.6, p3: 0, p4: 0, p5: 0, p6: 0 },
      consumo: { p1: 1200, p2: 900, p3: 1500, p4: 0, p5: 0, p6: 0 },
      rentMeterCost: 1.84,
      currentBillAmount: 85,
    },
  });

  // Watch the selected access tariff to animate layout changes reactively
  const watchedAccessTariff = useWatch({
    control,
    name: "accessTariff",
  });

  // Track active rate type for UI triggers
  React.useEffect(() => {
    setActiveRateType(watchedAccessTariff);
  }, [watchedAccessTariff]);

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setResults(null);
    setSummary(null);

    try {
      // Call Next.js Server Action securely
      const response = await compareTariffs(data as ComparePayload);
      if (response.success) {
        setResults(response.options);
        setSummary(response.summary);
      }
    } catch (err) {
      console.error("Error running Server Action:", err);
    } finally {
      setLoading(false);
    }
  };

  // Stagger helper animations for Framer Motion cascade
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.98 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 100, damping: 15 },
    },
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <div className="w-full max-w-7xl mx-auto px-4 py-8 md:py-12 space-y-10">
        
        {/* ==========================================
            BREADCRUMBS & BANNER HEADER
            ========================================== */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-8">
          <div>
            <div className="flex items-center space-x-2 text-[11px] font-mono text-cyan-400 uppercase tracking-widest">
              <span>Asesoría Energética</span>
              <span>•</span>
              <span className="text-slate-400">Comparador Multiatribución</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mt-2 tracking-tight flex items-center gap-3">
              Comparador Tarifario Pro
              <span className="text-xs font-mono bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full uppercase font-normal tracking-wide">
                Server Actions v14
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl">
              Compara la factura actual del cliente directamente con las últimas tarifas vigentes de Iberdrola, Endesa, Naturgy o nuestra marca oficial.
            </p>
          </div>
          
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 flex items-center space-x-3 shrink-0">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <div className="text-left font-mono text-xs">
              <span className="text-slate-500 block uppercase font-bold text-[9px]">Lógica Segura</span>
              <span className="text-emerald-400 font-bold block">100% Server Calculated</span>
            </div>
          </div>
        </div>

        {/* ==========================================
            MAIN CONTENT SPLIT GRID
            ========================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT AREA: HOOK FORM CONTAINER */}
          <div className="lg:col-span-5 bg-slate-900/60 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 backdrop-blur-xl relative shadow-2xl">
            <div className="absolute top-0 left-10 w-40 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
            
            <div className="flex items-center space-x-3 pb-2 border-b border-white/5">
              <Calculator className="w-6 h-6 text-cyan-400" />
              <h2 className="text-lg font-bold text-white uppercase tracking-wider text-sm font-mono">
                Datos de la última factura
              </h2>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              {/* SEGMENT SELECTION */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                  Sectores de Consumo (Segmento)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="relative flex items-center justify-center p-3 rounded-xl border border-white/5 bg-slate-950 hover:bg-slate-900 cursor-pointer transition-all">
                    <input
                      type="radio"
                      value="residencial"
                      {...register("segment")}
                      className="absolute right-3 top-3 w-4 h-4 text-cyan-500 bg-slate-950 border-white/10 focus:ring-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center space-y-1.5 py-1">
                      <User className="w-5 h-5 text-cyan-400" />
                      <span className="text-xs font-semibold text-slate-200">Residencial / Hogar</span>
                    </div>
                  </label>

                  <label className="relative flex items-center justify-center p-3 rounded-xl border border-white/5 bg-slate-950 hover:bg-slate-900 cursor-pointer transition-all">
                    <input
                      type="radio"
                      value="pyme"
                      {...register("segment")}
                      className="absolute right-3 top-3 w-4 h-4 text-amber-500 bg-slate-950 border-white/10 focus:ring-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center space-y-1.5 py-1">
                      <Building2 className="w-5 h-5 text-amber-400" />
                      <span className="text-xs font-semibold text-slate-200">PYME / Industrial</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* ACCESS TARIFF SELECTION */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                  Tarifa de Acceso Distribuidores
                </label>
                <select
                  {...register("accessTariff")}
                  className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl focus:border-cyan-400 focus:outline-none transition-all font-mono text-sm font-bold text-slate-100"
                >
                  <option value="2.0TD">2.0TD (Hasta 15 kW - Pequeño Consumo / Hogar)</option>
                  <option value="3.0TD">3.0TD (Más de 15 kW - pyme / Comercios)</option>
                  <option value="6.0TD">6.0TD (Alta Tensión - Gran Empresa / Fábricas)</option>
                </select>
                <p className="text-[10px] text-slate-500 font-mono italic">
                  * Cambiar la tarifa desplegará de forma reactiva las casillas de periodos extras.
                </p>
              </div>

              {/* POTENCIA CONTRATADA SECTION */}
              <div className="space-y-3 p-4 bg-slate-950 border border-white/5 rounded-2xl">
                <span className="text-xs font-bold uppercase font-mono text-cyan-400 tracking-wider flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> Potencias Contratadas (kW)
                </span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 block font-bold font-mono">P1 (Punta)</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register("potencia.p1")}
                      className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-xs font-mono focus:border-cyan-400 text-slate-100"
                    />
                    {errors.potencia?.p1 && (
                      <span className="text-[10px] text-rose-400 block font-mono">{errors.potencia.p1.message}</span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 block font-bold font-mono">P2 (Valle)</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register("potencia.p2")}
                      className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-xs font-mono focus:border-cyan-400 text-slate-100"
                    />
                    {errors.potencia?.p2 && (
                      <span className="text-[10px] text-rose-400 block font-mono">{errors.potencia.p2.message}</span>
                    )}
                  </div>
                </div>

                {/* DYNAMIC UNFOLDING OF P3-P6 VIA FRAMER MOTION (FOR 3.0TD & 6.0TD) */}
                <AnimatePresence initial={false}>
                  {(activeRateType === "3.0TD" || activeRateType === "6.0TD") && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                      className="overflow-hidden space-y-3 pt-3 border-t border-white/5 mt-3"
                    >
                      <span className="text-[10px] text-slate-400 block font-mono uppercase tracking-wide">
                        Periodos de Alta Capacidad P3 a P6
                      </span>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 font-mono block">P3</label>
                          <input
                            type="number"
                            step="0.01"
                            {...register("potencia.p3")}
                            className="w-full px-2 py-1 bg-slate-900 border border-white/10 rounded text-xs font-mono focus:border-cyan-400"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 font-mono block">P4</label>
                          <input
                            type="number"
                            step="0.01"
                            {...register("potencia.p4")}
                            className="w-full px-2 py-1 bg-slate-900 border border-white/10 rounded text-xs font-mono focus:border-cyan-400"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 font-mono block">P5</label>
                          <input
                            type="number"
                            step="0.01"
                            {...register("potencia.p5")}
                            className="w-full px-2 py-1 bg-slate-900 border border-white/10 rounded text-xs font-mono focus:border-cyan-400"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 font-mono block">P6</label>
                          <input
                            type="number"
                            step="0.01"
                            {...register("potencia.p6")}
                            className="w-full px-2 py-1 bg-slate-900 border border-white/10 rounded text-xs font-mono focus:border-cyan-400"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* CONSUMO ANUAL / HISTORICO SECTION */}
              <div className="space-y-3 p-4 bg-slate-950 border border-white/5 rounded-2xl">
                <span className="text-xs font-bold uppercase font-mono text-cyan-400 tracking-wider flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5" /> Consumo Histórico (kWh/año)
                </span>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 block font-bold font-mono">P1 (Punta)</label>
                    <input
                      type="number"
                      {...register("consumo.p1")}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded text-xs font-mono focus:border-cyan-400"
                    />
                    {errors.consumo?.p1 && (
                      <span className="text-[10px] text-rose-400 block font-mono">{errors.consumo.p1.message}</span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 block font-bold font-mono">P2 (Llano)</label>
                    <input
                      type="number"
                      {...register("consumo.p2")}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded text-xs font-mono focus:border-cyan-400"
                    />
                    {errors.consumo?.p2 && (
                      <span className="text-[10px] text-rose-400 block font-mono">{errors.consumo.p2.message}</span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 block font-bold font-mono">P3 (Valle)</label>
                    <input
                      type="number"
                      {...register("consumo.p3")}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded text-xs font-mono focus:border-cyan-400"
                    />
                    {errors.consumo?.p3 && (
                      <span className="text-[10px] text-rose-400 block font-mono">{errors.consumo.p3.message}</span>
                    )}
                  </div>
                </div>

                {/* DYNAMIC UNFOLDING CONSUMO P4-P6 FOR pyMEs */}
                <AnimatePresence initial={false}>
                  {(activeRateType === "3.0TD" || activeRateType === "6.0TD") && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                      className="overflow-hidden space-y-3 pt-3 border-t border-white/5 mt-3"
                    >
                      <span className="text-[10px] text-slate-400 block font-mono uppercase tracking-wide">
                        Consumo en Periodos de PYMEs P4 a P6
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 font-mono block">P4 (Wh)</label>
                          <input
                            type="number"
                            {...register("consumo.p4")}
                            className="w-full px-2 py-1 bg-slate-900 border border-white/10 rounded text-xs font-mono focus:border-cyan-400"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 font-mono block">P5 (Wh)</label>
                          <input
                            type="number"
                            {...register("consumo.p5")}
                            className="w-full px-2 py-1 bg-slate-900 border border-white/10 rounded text-xs font-mono focus:border-cyan-400"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 font-mono block">P6 (Wh)</label>
                          <input
                            type="number"
                            {...register("consumo.p6")}
                            className="w-full px-2 py-1 bg-slate-900 border border-white/10 rounded text-xs font-mono focus:border-cyan-400"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* OPTIONAL EXTRAS */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-300 block font-bold font-mono uppercase">
                    Alquiler Contador (€/mes)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("rentMeterCost")}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs font-mono focus:border-cyan-400 text-slate-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-300 block font-bold font-mono uppercase">
                    Factura Mensual Actual (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("currentBillAmount")}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-xs font-mono focus:border-emerald-400 text-slate-300"
                  />
                </div>
              </div>

              {/* ACTION CALL TRIGGER */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl font-bold uppercase text-xs tracking-wider transition-all cursor-pointer relative overflow-hidden bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:scale-[1.01] hover:shadow-cyan-400/25 active:scale-95 shadow-lg group text-slate-950 font-black flex items-center justify-center space-x-2"
              >
                {/* Embedded dynamic shimmer action */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer transition-transform pointer-events-none" />
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Ejecutar Server Action de Comparación</span>
                    <ArrowRight className="w-4 h-4 text-slate-950" />
                  </>
                )}
              </button>

            </form>
          </div>

          {/* RIGHT AREA: RESULTS GRID DISPLAY */}
          <div className="lg:col-span-7 space-y-6">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-slate-900/40 border border-white/5 rounded-3xl p-12 flex flex-col items-center justify-center text-center space-y-4"
                >
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
                    <Sparkles className="w-6 h-6 text-cyan-400 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">Analizando Base de Datos Tarifaria...</h3>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      Consultando precios de las principales comercializadoras a nivel nacional y estimando el porcentaje real de rentabilidad.
                    </p>
                  </div>
                </motion.div>
              ) : results && summary ? (
                <motion.div
                  key="results"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-6"
                >
                  
                  {/* FLOATING SUCCESS HIGHLIGHT DETAILS */}
                  <motion.div
                    variants={itemVariants}
                    className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-emerald-950 border border-emerald-500/20 shadow-xl relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-mono text-emerald-400 tracking-widest font-black">
                          ¡Simulación completada con éxito!
                        </span>
                        <h3 className="text-2xl font-black text-white">
                          Ahorro Máximo del: <span className="text-emerald-400">{summary.maxSavingsPercentage.toFixed(1)}%</span>
                        </h3>
                        <p className="text-xs text-slate-300">
                          Tarifa recomendada: <strong className="text-white">{summary.bestTariffName}</strong> por la comercializadora <strong className="text-cyan-400">{summary.bestTariffCompany}</strong>.
                        </p>
                      </div>
                      
                      <div className="bg-emerald-500/10 text-emerald-400 p-2.5 rounded-xl border border-emerald-500/20">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/5 text-xs font-mono">
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[9px]">Gasto Anual Actual Cliente:</span>
                        <span className="text-rose-400 font-extrabold text-sm">{summary.currentAnnualExpense.toLocaleString("es-ES")} €/año</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-bold text-[9px]">Ahorro Neto Conseguido:</span>
                        <span className="text-emerald-400 font-extrabold text-sm font-black">+{summary.maxAnnualSavings.toLocaleString("es-ES")} €/año</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* HEADER LISTINGS TITLE */}
                  <div className="flex items-center justify-between px-2 pt-2">
                    <span className="text-xs font-bold uppercase font-mono tracking-widest text-slate-400">
                      Las 3 Mejores Alternativas
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono italic">
                      Ordenadas por menor costo total
                    </span>
                  </div>

                  {/* RECOMMENDATION TARIFS LIST IN CASCADE */}
                  {results.map((opt) => (
                    <motion.div
                      key={opt.id}
                      variants={itemVariants}
                      className={`relative rounded-3xl p-6 border transition-all ${
                        opt.isBestOption
                          ? "bg-slate-900 border-cyan-400/35 shadow-cyan-500/5 shadow-2xl"
                          : "bg-slate-900/60 border-white/5 hover:border-white/10"
                      }`}
                    >
                      {/* Brand highlight banner style */}
                      {opt.isBestOption && (
                        <div className="absolute top-0 right-10 -translate-y-1/2 px-3 py-1 bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 text-[10px] font-mono font-bold rounded-full uppercase tracking-wider shadow">
                          Nuestra Oferta ERP Inteligente
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                              opt.companyName === "EnerLuz" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" :
                              opt.companyName === "Iberdrola" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                              opt.companyName === "Endesa" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                              "bg-indigo-500/15 text-indigo-400"
                            }`}>
                              {opt.companyName}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              Tarifa: {opt.tariffName}
                            </span>
                          </div>

                          <div className="mt-2.5">
                            <span className="text-[10px] font-mono text-slate-500 block uppercase">Costo Estimado Neto</span>
                            <div className="flex items-baseline space-x-1">
                              <span className="text-2xl font-black text-white font-mono">
                                {opt.monthlyCost} €
                              </span>
                              <span className="text-xs text-slate-400">/ mes</span>
                              <span className="text-xs text-slate-500 font-mono ml-2">
                                ({opt.annualCost.toLocaleString("es-ES")} €/año)
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-left sm:text-right space-y-1 shrink-0 bg-slate-950/40 p-3 rounded-2xl border border-white/5">
                          <span className="text-[10px] font-mono text-slate-500 block uppercase">Ahorro Estimado</span>
                          <span className="text-lg font-black text-emerald-400 block font-mono">
                            -{opt.savingsAnnual} €/año
                          </span>
                          <span className="text-[10px] text-emerald-300 font-mono font-bold block bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                            Ahorro del {opt.savingsPercentage}%
                          </span>
                        </div>
                      </div>

                      {/* TECHNICAL BREAKDOWN COLLAPSIBLE GRID */}
                      <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px] font-mono text-slate-400 bg-slate-950/20 p-2.5 rounded-xl">
                        <div>
                          <span className="text-[9px] text-slate-500 block uppercase">P. Potencia:</span>
                          <span className="text-slate-200">{opt.potenciaBreakdown} €/año</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 block uppercase">P. Energía/Consumo:</span>
                          <span className="text-slate-200">{opt.consumoBreakdown} €/año</span>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-[9px] text-slate-500 block uppercase">Coste Alquiler:</span>
                          <span className="text-slate-200">{opt.rentCostAnnual} €/año</span>
                        </div>
                      </div>

                      {/* GENERATE CONTRACT HIGHLIGHT ACTION BUTTON */}
                      <div className="mt-5 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            alert(`Simulación de Contrato iniciada:\nSe ha preguardado un borrador del contrato para el cliente usando la tarifa optimizada "${opt.tariffName}".`);
                          }}
                          className={`px-5 py-2.5 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer flex items-center space-x-1.5 ${
                            opt.isBestOption
                              ? "bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black shadow-lg shadow-cyan-400/15 ring-2 ring-cyan-400/30"
                              : "bg-slate-950 hover:bg-slate-850 hover:text-white text-slate-300 border border-white/10"
                          }`}
                        >
                          <span>Generar Contrato</span>
                          <ChevronRight className="w-3.5 h-3.5" />
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
                  className="bg-slate-900/10 border border-dashed border-white/10 rounded-3xl p-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-4"
                >
                  <div className="p-4 bg-slate-900 border border-white/5 rounded-2xl text-slate-400 animate-pulse">
                    <Calculator className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest font-mono">
                      Esperando Datos de Entrada
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mt-1 mx-auto leading-relaxed">
                      Completa el formulario de la izquierda con los periodos de potencia contratada y consumo para procesar de forma inmediata el Server Action tarifas.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </div>
    </div>
  );
}
