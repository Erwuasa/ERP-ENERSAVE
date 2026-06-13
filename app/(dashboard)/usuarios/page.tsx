"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  Search,
  Filter,
  X,
  Check,
  ChevronRight,
  TrendingUp,
  SlidersHorizontal,
  Mail,
  UserCheck,
  Trash2,
  Calendar,
  AlertCircle,
  Building2,
  ArrowRight,
  RefreshCw,
  Zap,
  Lock
} from "lucide-react";
import {
  getUsers,
  createUser,
  updatePermissions,
  updateUserRoleAndManager,
  deleteUserProfile,
  UserProfile,
  PermissionDetails
} from "../../actions/userActions";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>("superadmin"); // Default to superadmin to allow preview, verified against live auth if available
  const [authChecking, setAuthChecking] = useState(true);
  
  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals & Panels Active state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeUserForSheet, setActiveUserForSheet] = useState<UserProfile | null>(null);

  // New Client Form inputs
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<"superadmin" | "jefe_comercial" | "comercial">("comercial");
  const [formManagerId, setFormManagerId] = useState<string>("");
  const [formStatus, setFormStatus] = useState<"activo" | "suspendido" | "pendiente">("activo");
  const [formError, setFormError] = useState<string | null>(null);
  const [submittingUser, setSubmittingUser] = useState(false);

  // Success indicator toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const supabase = createClientComponentClient();

  // Load live session profile to see if roles allow access, with local bypass if not authenticated
  useEffect(() => {
    async function determineRoleAndUsers() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();
          
          if (profile) {
            setCurrentUserRole(profile.role);
          }
        }
      } catch (err) {
        console.warn("Could not check live Supabase session role, continuing in simulated Superadmin mode.", err);
      } finally {
        setAuthChecking(false);
        loadUsers();
      }
    }
    determineRoleAndUsers();
  }, [supabase]);

  const loadUsers = async () => {
    setLoading(true);
    const result = await getUsers();
    if (result.success) {
      setUsers(result.users);
    }
    setLoading(false);
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Create user callback handler
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) {
      setFormError("Por favor completa los campos obligatorios.");
      return;
    }

    setSubmittingUser(true);
    setFormError(null);

    const targetManagerId = formRole === "comercial" && formManagerId ? formManagerId : null;

    const response = await createUser({
      fullName: formName,
      email: formEmail,
      role: formRole,
      managerId: targetManagerId,
      status: formStatus,
    });

    setSubmittingUser(false);

    if (response.success) {
      showToast(`Usuario ${formName} registrado con éxito en Supabase Auth.`);
      setIsCreateOpen(false);
      // Reset form variables
      setFormName("");
      setFormEmail("");
      setFormRole("comercial");
      setFormManagerId("");
      setFormStatus("activo");
      // Reload users list
      loadUsers();
    } else {
      setFormError(response.error || "Error al registrar el usuario.");
    }
  };

  // Toggle user permissions callback handler
  const handleTogglePermission = async (permKey: keyof PermissionDetails) => {
    if (!activeUserForSheet) return;

    const currentPerms = activeUserForSheet.permissions;
    const updatedPerms: PermissionDetails = {
      ...currentPerms,
      [permKey]: !currentPerms[permKey]
    };

    // Update active user state immediately for fluid frame render
    const updatedUser = {
      ...activeUserForSheet,
      permissions: updatedPerms
    };
    setActiveUserForSheet(updatedUser);

    // Send action update to database / mock store
    const response = await updatePermissions(activeUserForSheet.id, updatedPerms);
    if (response.success) {
      // Sync list state with updated user
      setUsers(prev => prev.map(u => u.id === activeUserForSheet.id ? updatedUser : u));
    }
  };

  // Update user roles and manager
  const handleUpdateRoleAndManager = async (
    userId: string,
    role: "superadmin" | "jefe_comercial" | "comercial",
    managerId: string | null,
    status: "activo" | "suspendido" | "pendiente"
  ) => {
    const response = await updateUserRoleAndManager(userId, role, managerId, status);
    if (response.success) {
      showToast("Políticas jerárquicas y estado actualizados correctamente.");
      loadUsers();
      if (activeUserForSheet && activeUserForSheet.id === userId) {
        setActiveUserForSheet(prev => prev ? { ...prev, role, managerId, status } : null);
      }
    }
  };

  // Handle delete profile
  const handleDeleteUser = async (userId: string, name: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar permanentemente al usuario ${name}?`)) {
      const response = await deleteUserProfile(userId);
      if (response.success) {
        showToast(`Usuario ${name} ha sido revocado.`);
        setActiveUserForSheet(null);
        loadUsers();
      }
    }
  };

  // Filtering calculations
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesStatus = statusFilter === "all" || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Access check: Only superadmin or admin role can enter
  // Include simulated bypass that advises the user but lets them preview the panel
  const isAuthorized = currentUserRole === "superadmin" || currentUserRole === "admin";

  const managersList = users.filter((u) => u.role === "jefe_comercial" || u.role === "superadmin");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-1 md:p-4 space-y-8 font-sans">
      
      {/* Toast notifications */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-slate-900 border border-emerald-500/30 text-emerald-400 px-5 py-3.5 rounded-2xl shadow-xl shadow-slate-950/50 flex items-center space-x-3 backdrop-blur-md"
          >
            <div className="bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20">
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-xs font-semibold">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-7xl mx-auto space-y-8">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-8">
          <div>
            <div className="flex items-center space-x-2 text-[11px] font-mono text-cyan-400 uppercase tracking-widest">
              <span>Administración Central</span>
              <span>•</span>
              <span className="text-slate-400">Control de Accesos</span>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1.5 tracking-tight flex items-center gap-3">
              Gestión de Usuarios
              <span className="text-[10px] font-mono bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                Supabase Auth RLS
              </span>
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
              Módulo restringido para administradores. Permite dar de alta asesores comerciales en Supabase Auth, asignar jerarquías de manager y conceder permisos específicos mediante almacenamiento JSONB.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Simulating role override toggle */}
            <div className="bg-slate-900/60 border border-white/5 p-1 rounded-xl flex items-center">
              <span className="text-[10px] uppercase font-mono text-slate-500 px-3 font-semibold">Rol Actual:</span>
              <select
                value={currentUserRole}
                onChange={(e) => setCurrentUserRole(e.target.value)}
                className="bg-slate-950 border border-white/10 text-[10px] font-mono font-bold text-slate-200 px-3 py-1.5 rounded-lg cursor-pointer focus:outline-none focus:border-cyan-400"
              >
                <option value="superadmin">⭐ Superadmin (Acceso)</option>
                <option value="admin">💼 Admin (Acceso)</option>
                <option value="comercial">🚩 Comercial (Bloqueado)</option>
              </select>
            </div>

            <button
              onClick={loadUsers}
              className="p-2.5 bg-slate-900 border border-white/10 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Recargar usuarios"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* ACCESS SECURITY BARRIER CHECK */}
        {!isAuthorized ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-rose-500/5 border border-rose-500/15 rounded-3xl p-8 text-center space-y-4 max-w-xl mx-auto my-12"
          >
            <div className="w-14 h-14 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center mx-auto border border-rose-500/20">
              <Lock className="w-6 h-6 animate-bounce" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-widest font-mono">
                Módulo Restringido
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                No dispones de suficientes privilegios para visualizar o alterar las configuraciones de usuarios en esta rama de la jerarquía de comisiones energeticas.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setCurrentUserRole("superadmin")}
                className="px-4 py-2 bg-gradient-to-r from-rose-500 to-indigo-600 rounded-xl text-xs font-bold text-white uppercase hover:opacity-90 active:scale-95 transition-all"
              >
                Elevar Cuenta a Superadmin (Simulado)
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-6">
            
            {/* GRID OF BRIEF METRICS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] font-mono text-slate-500 uppercase font-black">Asesores Totales</span>
                <p className="text-2xl font-extrabold text-white mt-1 font-mono">{users.length}</p>
              </div>
              <div className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] font-mono text-slate-500 uppercase font-black">Estructura Jefes</span>
                <p className="text-2xl font-extrabold text-amber-500 mt-1 font-mono">
                  {users.filter(u => u.role === "jefe_comercial").length}
                </p>
              </div>
              <div className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] font-mono text-slate-500 uppercase font-black">Fuerza Ventas</span>
                <p className="text-2xl font-extrabold text-cyan-400 mt-1 font-mono">
                  {users.filter(u => u.role === "comercial").length}
                </p>
              </div>
              <div className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] font-mono text-slate-500 uppercase font-black">Activos / Desactivados</span>
                <p className="text-xs font-bold text-slate-300 mt-2 font-mono flex items-center space-x-2">
                  <span className="text-emerald-400">{users.filter(u => u.status === "activo").length} Activos</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-rose-400">{users.filter(u => u.status === "suspendido").length} Susp.</span>
                </p>
              </div>
            </div>

            {/* CONTROL BAR (SEARCH, FILTERS AND ACTIONS) */}
            <div className="bg-slate-900/30 p-4 rounded-2xl border border-white/5 flex flex-col sm:flex-row gap-4 justify-between items-center bg-opacity-40 backdrop-blur-md">
              <div className="w-full sm:w-auto flex flex-1 flex-col sm:flex-row gap-3">
                
                {/* Search query field */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-500 absolute top-3 left-3" />
                  <input
                    type="text"
                    placeholder="Filtrar por nombre, email o ID de Supabase..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs focus:ring-1 focus:ring-cyan-500 text-slate-200"
                  />
                </div>

                {/* Filters Row */}
                <div className="flex gap-2.5">
                  <div className="flex items-center space-x-2 border border-white/10 bg-slate-950/60 px-2.5 py-1.5 rounded-xl text-xs">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="bg-transparent border-none text-slate-300 text-xs font-medium focus:outline-none focus:ring-0 cursor-pointer"
                    >
                      <option value="all">Todos los Roles</option>
                      <option value="superadmin">Superadmin</option>
                      <option value="jefe_comercial">Jefe Comercial</option>
                      <option value="comercial">Comercial</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-1.5 border border-white/10 bg-slate-950/60 px-2.5 py-1.5 rounded-xl text-xs">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-transparent border-none text-slate-300 text-xs font-medium focus:outline-none focus:ring-0 cursor-pointer"
                    >
                      <option value="all">Todos los Estados</option>
                      <option value="activo">Activos</option>
                      <option value="suspendido">Suspendido</option>
                      <option value="pendiente">Pendiente</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Float Highlighted CTA for Action Creation */}
              <button
                onClick={() => setIsCreateOpen(true)}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-slate-950 font-extrabold rounded-xl text-xs cursor-pointer hover:opacity-90 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 tracking-wide"
              >
                <UserPlus className="w-4 h-4 shrink-0 text-slate-950" />
                <span>Registrar Nuevo Asesor</span>
              </button>
            </div>

            {/* DATA TABLE CONTAINER */}
            <div className="bg-slate-900/40 rounded-3xl border border-white/5 overflow-hidden backdrop-blur-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  
                  {/* Table headers */}
                  <thead>
                    <tr className="border-b border-white/10 bg-slate-950/40 text-slate-400 font-mono">
                      <th className="py-4.5 px-6 font-bold uppercase tracking-wider text-[10px]">Asesor / Supabase ID</th>
                      <th className="py-4.5 px-6 font-bold uppercase tracking-wider text-[10px]">Rol Organizacional</th>
                      <th className="py-4.5 px-6 font-bold uppercase tracking-wider text-[10px]">Email de Registro</th>
                      <th className="py-4.5 px-6 font-bold uppercase tracking-wider text-[10px]">Jefe de Ventas Asignado</th>
                      <th className="py-4.5 px-6 font-bold uppercase tracking-wider text-[10px]">Estado RLS</th>
                      <th className="py-4.5 px-6 font-bold uppercase tracking-wider text-[10px] text-right">Módulos JSONB</th>
                    </tr>
                  </thead>

                  {/* Table body */}
                  <tbody className="divide-y divide-white/5">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500 font-mono">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                            <span>Interrogando repositorio profiles...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          No se encontraron usuarios que coincidan con la búsqueda.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => {
                        return (
                          <motion.tr
                            key={user.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="hover:bg-white/[0.02] cursor-pointer transition-all group"
                            onClick={() => setActiveUserForSheet(user)}
                          >
                            {/* Profile details */}
                            <td className="py-4 px-6">
                              <div className="flex items-center space-x-3">
                                <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-200 font-extrabold uppercase shrink-0 transition-all group-hover:border-cyan-400/30">
                                  {user.fullName.split(" ").map(n => n[0]).join("") || "U"}
                                </div>
                                <div className="space-y-0.5">
                                  <p className="font-bold text-white group-hover:text-cyan-400 transition-colors">
                                    {user.fullName}
                                  </p>
                                  <p className="text-[9px] font-mono text-slate-500">
                                    {user.id}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Role badge */}
                            <td className="py-4 px-6">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-mono font-bold uppercase border ${
                                user.role === "superadmin"
                                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                  : user.role === "jefe_comercial"
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                  : "bg-cyan-500/10 text-cyan-400 transition-all border-cyan-500/20"
                              }`}>
                                {user.role === "superadmin" ? "⭐ Superadmin" : 
                                 user.role === "jefe_comercial" ? "💼 Jefe de Red" : 
                                 "📢 Comercial"}
                              </span>
                            </td>

                            {/* Email display */}
                            <td className="py-4 px-6 text-slate-300 font-mono">
                              <div className="flex items-center space-x-2">
                                <Mail className="w-3.5 h-3.5 text-slate-600" />
                                <span>{user.email}</span>
                              </div>
                            </td>

                            {/* Manager profile link */}
                            <td className="py-4 px-6 text-slate-300">
                              {user.role === "superadmin" ? (
                                <span className="text-slate-500 italic">No aplica</span>
                              ) : user.managerName ? (
                                <div className="flex items-center space-x-2">
                                  <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                                  <span className="font-medium text-slate-300">{user.managerName}</span>
                                </div>
                              ) : (
                                <span className="text-rose-400/80 bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10 text-[10px] font-mono">
                                  ⚠️ Sin Jefe Asignado
                                </span>
                              )}
                            </td>

                            {/* Status badge */}
                            <td className="py-4 px-6">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-widest ${
                                user.status === "activo"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15"
                                  : user.status === "suspendido"
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/15"
                                  : "bg-slate-800 text-slate-450 border border-white/5"
                              }`}>
                                {user.status.toUpperCase()}
                              </span>
                            </td>

                            {/* Right action indicator */}
                            <td className="py-4 px-6 text-right">
                              <button className="p-1 px-3 bg-slate-950/80 hover:bg-slate-800 rounded-xl text-[10px] font-mono text-slate-400 hover:text-white border border-white/5 flex items-center justify-end space-x-1.5 float-right">
                                <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Ver Permisos</span>
                                <ChevronRight className="w-3 h-3 text-slate-500 transition-transform group-hover:translate-x-0.5" />
                              </button>
                            </td>

                          </motion.tr>
                        );
                      })
                    )}
                  </tbody>

                </table>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* CREATE USER DIALOG MODAL */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop visual glass block */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateOpen(false)}
              className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm"
            />

            {/* Modal Body card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl relative overflow-hidden z-10"
            >
              
              {/* Blue accent glow banner */}
              <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-cyan-400 to-indigo-600" />

              <div className="p-6 md:p-8 space-y-6">
                
                {/* Modal close & title */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-tr from-cyan-500 to-indigo-500 rounded-xl">
                      <UserPlus className="w-5 h-5 text-slate-950" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold uppercase font-mono text-white">
                        Alta en Supabase Auth
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        API Admin Client Registration Panel
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsCreateOpen(false)}
                    className="p-1 px-1.5 rounded-lg border border-white/5 bg-slate-950 hover:bg-white/5 text-slate-400 hover:text-white transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateUserSubmit} className="space-y-4">
                  {formError && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest font-black">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="p. ej. Miguel Ángel Soler"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs focus:ring-1 focus:ring-cyan-500 focus:border-cyan-400 focus:outline-none text-white font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest font-black">
                      Correo Electrónico (Auth)
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="soler@ener-erp.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs focus:ring-1 focus:ring-cyan-500 focus:border-cyan-400 focus:outline-none text-white font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest font-black">
                        Rol Corporativo
                      </label>
                      <select
                        value={formRole}
                        onChange={(e) => setFormRole(e.target.value as any)}
                        className="w-full px-3 py-2.5 bg-slate-950 border border-white/10 rounded-xl focus:outline-none text-xs text-slate-100 font-mono font-bold"
                      >
                        <option value="comercial">Comercial</option>
                        <option value="jefe_comercial">Jefe Comercial</option>
                        <option value="superadmin">Superadmin</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest font-black">
                        Estado Inicial
                      </label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                        className="w-full px-3 py-2.5 bg-slate-950 border border-white/10 rounded-xl focus:outline-none text-xs text-slate-100 font-mono font-bold"
                      >
                        <option value="activo">🟢 Activo</option>
                        <option value="suspendido">🔴 Suspendido</option>
                        <option value="pendiente">🟡 Pendiente</option>
                      </select>
                    </div>
                  </div>

                  {/* DYNAMIC DROPDOWN FOR MANAGER ASSIGNMENT IF USER ES COMERCIAL */}
                  {formRole === "comercial" && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="space-y-1.5 pt-2 border-t border-white/5"
                    >
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest font-black">
                        Jefe Comercial Asignado (Manager)
                      </label>
                      <select
                        value={formManagerId}
                        onChange={(e) => setFormManagerId(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-950 border border-white/10 rounded-xl focus:outline-none text-xs text-slate-100 font-mono"
                      >
                        <option value="">-- Sin Jefe (Directo a la Dirección) --</option>
                        {managersList.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.fullName} ({m.role === "superadmin" ? "Superadmin" : "Jefe Comercial"})
                          </option>
                        ))}
                      </select>
                      <span className="text-[9px] text-slate-500 font-mono">
                        Requerido para el cálculo recursivo de retrocomisiones del equipo de venta.
                      </span>
                    </motion.div>
                  )}

                  <div className="pt-4 flex justify-end space-x-3.5">
                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(false)}
                      className="px-4 py-2.5 bg-slate-950 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submittingUser}
                      className="px-5 py-2.5 bg-gradient-to-r from-cyan-400 to-indigo-600 text-slate-950 font-bold rounded-xl text-xs cursor-pointer hover:opacity-95 transition-all flex items-center justify-center space-x-2"
                    >
                      {submittingUser ? (
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Registrar Asesor</span>
                          <ArrowRight className="w-4 h-4 text-slate-950" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAILED PERMISSIONS SLIDEOUT SHEET (PANEL LATERAL SHEET) */}
      <AnimatePresence>
        {activeUserForSheet && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveUserForSheet(null)}
              className="absolute inset-0 bg-slate-950"
            />

            {/* Sheet frame body */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-slate-900 border-l border-white/10 w-full max-w-md h-screen relative flex flex-col justify-between overflow-y-auto shadow-2xl z-20 backdrop-blur-xl"
            >
              
              <div className="p-6 sm:p-8 space-y-6">
                
                {/* Header sheet panel controls */}
                <div className="flex items-center justify-between pb-4 border-b border-white/5">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <SlidersHorizontal className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold uppercase font-mono text-white">
                        Permisos ERP (JSONB)
                      </h3>
                      <p className="text-[10px] uppercase font-mono text-slate-500">
                        Supabase Profiles.permissions
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveUserForSheet(null)}
                    className="p-1 px-1.5 rounded-lg border border-white/5 bg-slate-950 hover:bg-white/5 text-slate-400 hover:text-white transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Profile card layout inside sheet */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 text-white flex items-center justify-center font-black text-sm">
                      {activeUserForSheet.fullName.split(" ").map(n => n[0]).join("") || "U"}
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-white">{activeUserForSheet.fullName}</h4>
                      <p className="text-[10px] font-mono text-slate-500">{activeUserForSheet.id}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[10px] font-mono pt-2 border-t border-white/5">
                    <div>
                      <span className="text-slate-500 uppercase block text-[8px] font-bold">Email de acceso:</span>
                      <span className="text-slate-300">{activeUserForSheet.email}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase block text-[8px] font-bold">Jerarquía Jefes:</span>
                      <span className="text-slate-300">{activeUserForSheet.managerName || "Sin asignar"}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3">
                    <div>
                      <label className="block text-[8px] uppercase font-mono font-black text-slate-500 tracking-wider">Rol de Energía</label>
                      <select
                        value={activeUserForSheet.role}
                        onChange={(e) => handleUpdateRoleAndManager(
                          activeUserForSheet.id,
                          e.target.value as any,
                          activeUserForSheet.managerId,
                          activeUserForSheet.status
                        )}
                        className="mt-1 w-full p-2 bg-slate-900 border border-white/10 rounded-lg text-[11px] font-mono text-white"
                      >
                        <option value="superadmin">superadmin</option>
                        <option value="jefe_comercial">jefe_comercial</option>
                        <option value="comercial">comercial</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[8px] uppercase font-mono font-black text-slate-500 tracking-wider">Estado RLS</label>
                      <select
                        value={activeUserForSheet.status}
                        onChange={(e) => handleUpdateRoleAndManager(
                          activeUserForSheet.id,
                          activeUserForSheet.role,
                          activeUserForSheet.managerId,
                          e.target.value as any
                        )}
                        className="mt-1 w-full p-2 bg-slate-900 border border-white/10 rounded-lg text-[11px] font-mono text-white"
                      >
                        <option value="activo">activo</option>
                        <option value="suspendido">suspendido</option>
                        <option value="pendiente">pendiente</option>
                      </select>
                    </div>
                  </div>

                  {activeUserForSheet.role === "comercial" && (
                    <div className="pt-2">
                      <label className="block text-[8px] uppercase font-mono font-black text-slate-500 tracking-wider">Jefe Comercial</label>
                      <select
                        value={activeUserForSheet.managerId || ""}
                        onChange={(e) => handleUpdateRoleAndManager(
                          activeUserForSheet.id,
                          activeUserForSheet.role,
                          e.target.value || null,
                          activeUserForSheet.status
                        )}
                        className="mt-1 w-full p-2 bg-slate-900 border border-white/10 rounded-lg text-[11px] font-mono text-white"
                      >
                        <option value="">-- Sin Jefe Directo --</option>
                        {managersList.filter(m => m.id !== activeUserForSheet.id).map((m) => (
                          <option key={m.id} value={m.id}>{m.fullName}</option>
                        ))}
                      </select>
                    </div>
                  )}

                </div>

                {/* ANIMATED TOGGLES / SWITCHES SECTION LIST */}
                <div className="space-y-5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-widest block border-b border-white/5 pb-2">
                    Matriz de Permisos Específicos
                  </span>

                  <div className="space-y-3">
                    
                    {/* Toggle: Export database */}
                    <div className="flex h-14 items-center justify-between p-3.5 bg-slate-950/60 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-white block">Exportar base de datos</span>
                        <span className="text-[9px] text-slate-500 block">Permite exportar listado general en formato CSV/Excel.</span>
                      </div>
                      
                      {/* Animated switch toggle */}
                      <button
                        onClick={() => handleTogglePermission("exportDatabase")}
                        className={`w-11 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200 outline-none ${
                          activeUserForSheet.permissions.exportDatabase ? "bg-cyan-400" : "bg-slate-800"
                        }`}
                      >
                        <motion.div
                          layout
                          className="w-4 h-4 rounded-full bg-slate-950"
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          animate={{ x: activeUserForSheet.permissions.exportDatabase ? 18 : 0 }}
                        />
                      </button>
                    </div>

                    {/* Toggle: View Retrocommissions */}
                    <div className="flex h-14 items-center justify-between p-3.5 bg-slate-950/60 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-white block">Ver retrocomisiones</span>
                        <span className="text-[9px] text-slate-500 block">Inspección de comisiones diferidas e indirectas del equipo.</span>
                      </div>
                      
                      <button
                        onClick={() => handleTogglePermission("viewRetrocommissions")}
                        className={`w-11 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200 outline-none ${
                          activeUserForSheet.permissions.viewRetrocommissions ? "bg-cyan-400" : "bg-slate-800"
                        }`}
                      >
                        <motion.div
                          layout
                          className="w-4 h-4 rounded-full bg-slate-950"
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          animate={{ x: activeUserForSheet.permissions.viewRetrocommissions ? 18 : 0 }}
                        />
                      </button>
                    </div>

                    {/* Toggle: Read Contracts */}
                    <div className="flex h-14 items-center justify-between p-3.5 bg-slate-950/60 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-white block">Lectura de contratos</span>
                        <span className="text-[9px] text-slate-500 block">Acceso de lectura a contratos generales del canal.</span>
                      </div>
                      
                      <button
                        onClick={() => handleTogglePermission("contractsView")}
                        className={`w-11 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200 outline-none ${
                          activeUserForSheet.permissions.contractsView ? "bg-cyan-400" : "bg-slate-800"
                        }`}
                      >
                        <motion.div
                          layout
                          className="w-4 h-4 rounded-full bg-slate-950"
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          animate={{ x: activeUserForSheet.permissions.contractsView ? 18 : 0 }}
                        />
                      </button>
                    </div>

                    {/* Toggle: Comparator Access */}
                    <div className="flex h-14 items-center justify-between p-3.5 bg-slate-950/60 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-white block">Acceso al Comparador</span>
                        <span className="text-[9px] text-slate-500 block">Permite simular y cotizar ofertas de energía.</span>
                      </div>
                      
                      <button
                        onClick={() => handleTogglePermission("comparatorAccess")}
                        className={`w-11 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200 outline-none ${
                          activeUserForSheet.permissions.comparatorAccess ? "bg-cyan-400" : "bg-slate-800"
                        }`}
                      >
                        <motion.div
                          layout
                          className="w-4 h-4 rounded-full bg-slate-950"
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          animate={{ x: activeUserForSheet.permissions.comparatorAccess ? 18 : 0 }}
                        />
                      </button>
                    </div>

                    {/* Toggle: Quick settlement */}
                    <div className="flex h-14 items-center justify-between p-3.5 bg-slate-950/60 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-white block">Gestión rápida de comisiones</span>
                        <span className="text-[9px] text-slate-500 block">Aprobación instantánea sobre comisiones de la red de ventas.</span>
                      </div>
                      
                      <button
                        onClick={() => handleTogglePermission("quickSettlement")}
                        className={`w-11 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200 outline-none ${
                          activeUserForSheet.permissions.quickSettlement ? "bg-cyan-400" : "bg-slate-800"
                        }`}
                      >
                        <motion.div
                          layout
                          className="w-4 h-4 rounded-full bg-slate-950"
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          animate={{ x: activeUserForSheet.permissions.quickSettlement ? 18 : 0 }}
                        />
                      </button>
                    </div>

                  </div>
                </div>

              </div>

              {/* Action delete button inside sheet base */}
              <div className="p-6 border-t border-white/5 bg-slate-950/40">
                <button
                  onClick={() => handleDeleteUser(activeUserForSheet.id, activeUserForSheet.fullName)}
                  className="w-full py-3 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/25 rounded-2xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar Perfil en Supabase</span>
                </button>
                <span className="block text-[9px] font-mono text-center text-slate-500 mt-2">
                  Esto suspenderá las credenciales RLS y el registro vinculante.
                </span>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
