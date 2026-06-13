'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Flame, Lightbulb, Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'; // or imported directly from your utils

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Instancia de cliente de Supabase para Next.js (App Router)
  const supabase = createClientComponentClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Redirección exitosa manejada por middleware de Next.js
      window.location.href = '/dashboard';
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de autenticación. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row font-sans text-slate-100 antialiased overflow-hidden">
      
      {/* SECCIÓN IZQUIERDA: DISEÑO VISUAL CORE ANIMADO (Energía Luz y Gas) */}
      <div className="relative md:w-1/2 flex flex-col justify-between p-8 m:p-12 md:p-16 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 overflow-hidden border-b md:border-b-0 md:border-r border-slate-800">
        
        {/* Elemento de luz de fondo animado */}
        <div className="absolute top-1/4 left-1/4 -translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 translate-y-1/2 translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        
        {/* Red de partículas de fondo simuladas */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff04_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />

        {/* LOGO DE LA EMPRESA */}
        <div className="relative z-10 flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-500 to-amber-500 rounded-2xl shadow-lg shadow-cyan-500/20">
            <div className="flex space-x-0.5 items-center justify-center">
              <Lightbulb className="w-5 h-5 text-slate-950 stroke-[2.5]" />
              <Flame className="w-5 h-5 text-slate-950 stroke-[2.5] -ml-1" />
            </div>
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              ENER_ERP
            </span>
            <span className="block text-[10px] tracking-widest text-cyan-400 uppercase font-mono leading-none mt-0.5">
              COMMERCIALIZER CORE
            </span>
          </div>
        </div>

        {/* TEXTO DE INTRODUCCIÓN Y BENEFICIOS */}
        <div className="relative z-10 my-auto py-12 md:py-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <span className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/50 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs text-slate-300 font-mono">Control de Redes v2.4.0</span>
            </span>

            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
              La central de control para <br />
              <span className="bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-400 bg-clip-text text-transparent">
                Asesorías de Energía
              </span>
            </h1>

            <p className="text-slate-400 text-base max-w-md leading-relaxed">
              Gestiona inteligentemente contratos residenciales e industriales de Luz y Gas, calcula liquidaciones de red y optimiza los márgenes de comercialización en tiempo real.
            </p>

            {/* Tarjetas de estadísticas o KPIs */}
            <div className="grid grid-cols-2 gap-4 pt-4 max-w-sm">
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
                <p className="text-[11px] font-mono uppercase text-slate-500">CONTRATOS LUZ</p>
                <p className="text-lg font-bold text-cyan-400">99.8% Eficacia</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
                <p className="text-[11px] font-mono uppercase text-slate-500">COMISIÓN EXTRAS</p>
                <p className="text-lg font-bold text-amber-500">Liquidación 24h</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* PIE DE PÁGINA IZQUIERDO */}
        <div className="relative z-10 text-xs text-slate-500 font-mono">
          © {new Date().getFullYear()} ENER_ERP Technologies. Todos los derechos reservados.
        </div>
      </div>

      {/* SECCIÓN DERECHA: FORMULARIO DE ACCESO PROFESIONAL */}
      <div className="md:w-1/2 flex items-center justify-center p-8 sm:p-12 md:p-16 bg-slate-950">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md space-y-8"
        >
          {/* Cabecera del formulario */}
          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Ingresar al Hub
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              Introduce tus credenciales para acceder a la intranet comercial.
            </p>
          </div>

          {/* MENSAJES DE ERROR */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-3"
            >
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-300 leading-relaxed font-mono">
                {errorMsg}
              </p>
            </motion.div>
          )}

          {/* FORMULARIO */}
          <form onSubmit={handleLogin} className="space-y-6">
            
            {/* Campo Email */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider">
                Dirección de Email
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                  <Mail className="w-5 h-5 stroke-[1.8]" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@ener-erp.com"
                  className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/15 focus:outline-none text-slate-100 placeholder-slate-600 transition-all font-sans"
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider">
                  Contraseña
                </label>
                <a href="#recuperar" className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline font-mono">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                  <Lock className="w-5 h-5 stroke-[1.8]" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-11 pr-12 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/15 focus:outline-none text-slate-100 placeholder-slate-600 transition-all font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 stroke-[1.8]" />
                  ) : (
                    <Eye className="w-5 h-5 stroke-[1.8]" />
                  )}
                </button>
              </div>
            </div>

            {/* BOTÓN CON EFECTO SHIMMER (BRILLO INTEGRADO) */}
            <button
              id="login_submit_btn"
              type="submit"
              disabled={loading}
              className="relative w-full py-3.5 bg-gradient-to-r from-cyan-500 via-cyan-400 to-emerald-500 hover:from-cyan-400 hover:via-emerald-400 hover:to-emerald-400 text-slate-950 font-bold rounded-xl transition-all shadow-lg hover:shadow-cyan-400/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 flex items-center justify-center space-x-2 border border-cyan-300/20 cursor-pointer overflow-hidden group disabled:opacity-50"
            >
              {/* Efecto de Brillo Deslizante (Shimmer Line) */}
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] transition-transform pointer-events-none" />

              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="font-semibold text-sm">Entrar a la Plataforma</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* Ayuda de Autenticación */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-center">
            <p className="text-xs text-slate-500 font-sans">
              ¿Tu agencia u oficina no tiene cuenta activa? <br />
              <span className="text-slate-400 font-medium">Contacta al Administrador de Red Corporativa.</span>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
