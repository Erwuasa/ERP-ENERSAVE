import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { ComercialCommissionsChart } from './components/ComercialCommissionsChart';
import { ComercialCompaniaChart } from './components/ComercialCompaniaChart';
import { ComercialRenovacionesCard } from './components/ComercialRenovacionesCard';
import { ComercialContratosEstadoKpis } from './components/ComercialContratosEstadoKpis';
import type { ContractEstadoKpiFilter } from './lib/contract-estado-kpis';
import { LiquidacionesInternasPanel } from './components/LiquidacionesInternasPanel';
import type { Settlement } from './types/settlement';
import { 
  Flame, 
  Lightbulb, 
  LayoutDashboard, 
  Users, 
  FileSpreadsheet, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Menu, 
  LogOut, 
  TrendingUp, 
  AlertTriangle, 
  UserSquare2, 
  WalletCards, 
  Calculator, 
  FileClock,
  Briefcase,
  Layers,
  Database,
  Code,
  CheckCircle,
  Copy,
  PlusCircle,
  TrendingDown,
  Sparkles,
  Info,
  DollarSign,
  AlertCircle,
  User,
  Building2,
  Zap,
  Coins,
  ArrowRight,
  SlidersHorizontal,
  UserPlus,
  X,
  Search,
  Filter,
  Trash2,
  Lock,
  Sun,
  Moon,
  Download,
  FileText,
  File,
  Award,
  ShieldAlert,
  CalendarDays,
  LayoutGrid,
  BarChart3,
} from 'lucide-react';
import { UserControlSheet } from './components/admin/UserControlSheet';
import {
  deleteErpComercial,
  insertErpComercial,
  listErpComerciales,
  updateErpComercial,
  type ErpComercialRole,
} from './lib/supabase/erp-comerciales';
import { MarcoRetributivoPanel } from './components/MarcoRetributivoPanel';
import { IncidenciasKanban } from './components/IncidenciasKanban';
import { PipelinePage } from './components/ventas/PipelinePage';
import { MiDiaPage } from './components/ventas/MiDiaPage';
import { FichaProspecto } from './components/ventas/FichaProspecto';
import { ReportingPage } from './components/ventas/ReportingPage';
import { SlaAvisosPage } from './components/ventas/SlaAvisosPage';
import { EnersaveLeadDatabasePage } from './components/ventas/EnersaveLeadDatabasePage';
import { NuevoContratoWizard } from './components/NuevoContratoWizard';
import { FileDropZone } from './components/ui/FileDropZone';
import { ContratosPanel } from './components/ContratosPanel';
import { MisClientesPanel } from './components/MisClientesPanel';
import type { Contract } from './types/contract';
import type { Client } from './types/client';
import type { ContractOcrResult } from './lib/contract-ocr';
import {
  buildClientsFromContracts,
  linkContractsToClients,
  syncClientEstados,
  upsertClient,
} from './lib/clients';
import {
  contractRegistrationErrorMessage,
  EMPTY_NEW_CONTRACT_FORM,
  newContractFormToRegistrationInput,
  validateContractRegistration,
  type NewContractFormState,
} from './lib/contract-registration';
import { marcoRetributivoCatalog } from './data/marco-retributivo-catalog';
import { estimateMarcoCommissionEur } from './lib/marco-commission';
import { saveTeamContractToSupabase } from './lib/supabase/contracts';
import {
  createContratoCreadoActividad,
  updateProspecto,
} from './lib/supabase/ventas';
import { buildDemoSyncedContracts } from './lib/demo/synced-ventas-erp-seed';
import { buildProspectoImportSources } from './lib/ventas/prospecto-import-sources';
import { buildNewContractFormFromProspecto } from './lib/ventas/prospecto-to-contract';
import {
  clearSupabaseSession,
  DEFAULT_DEV_PASSWORD,
  getAuthSessionStatus,
  syncSupabaseSession,
} from './lib/supabase/auth-session';
import { isSupabaseConfigured } from './lib/supabase/client';
import type { Prospecto } from './lib/ventas/types';
import {
  CONTRACT_ESTADO_INCOMPLETO,
  CONTRACT_ESTADO_INICIAL,
  getContractEstadoBadgeClass,
  isContractActivado,
} from './lib/contract-estado';
import type { ContractsListFilter } from './lib/contract-renewal';
import {
  aplicaRenovacionAnual,
  computeRenewalSchedule,
} from './lib/contract-segment-rules';
import type { IncidenciaTicket } from './lib/incidencias';
import { isIncidenciaKanbanVisible, withIncidenciaEstado } from './lib/incidencias';

const SEED_CONTRACTS: Contract[] = [
  { id: 'con-1', clientName: 'ANA MARIA PINEDA BARRAGA', cups: 'ES0031102370432011GL', tipo: 'luz', compania: 'Iberdrola', tarifa: 'Fijo', atr: '2.0TD', consumoAnual: 4200, tipoPrecio: 'fijo', precioFijoConsumo: 0.118, potenciaContratada: 4.6, nif: '12345678A', telefono: '600111222', email: 'ana.pineda@email.com', iban: 'ES91 2100 0418 4502 0005 1332', direccionSuministro: 'C/ Mayor 12, 28013 Madrid', consumoAnualManual: 4200, estado: 'Activado', comercialId: 'usr-3', comercialName: 'Jose Antonio Acal Franco', createdAt: '2025-04-07', fechaFin: '2026-04-07', estadoRenovacion: 'Renovacion proxima', fechaRenovacion: '2026-04-07', diasRenovacion: 69, montoInterno: 240, montoExterno: 120 },
  { id: 'con-2', clientName: 'GEA CATERING, S.L.', cups: 'ES0021000002359672001KF', tipo: 'luz', compania: 'Endesa', tarifa: 'Fijo', atr: '2.0TD', consumoAnual: 18420, tipoPrecio: 'fijo', precioFijoConsumo: 0.105, potenciaContratada: 9.2, nif: 'B12345678', telefono: '963111222', email: 'admin@geacatering.es', iban: 'ES80 2310 0001 1800 0001 2345', direccionSuministro: 'Pol. Ind. Norte, nave 4, 46015 Valencia', consumoAnualManual: 18420, estado: 'Activado', comercialId: 'usr-3', comercialName: 'Jose Antonio Acal Franco', createdAt: '2025-04-14', fechaFin: '2026-04-14', estadoRenovacion: 'Renovacion proxima', fechaRenovacion: '2026-04-14', diasRenovacion: 76, montoInterno: 380, montoExterno: 190 },
  { id: 'con-3', clientName: 'MARIAN DOREL CHERBZAN', cups: 'ES003110237045776921002PQ', tipo: 'luz', compania: 'Naturgy', tarifa: 'Fijo', atr: '2.0TD', consumoAnual: 8553, tipoPrecio: 'fijo', precioFijoConsumo: 0.112, potenciaContratada: 5.75, consumoAnualManual: null, estado: 'Incidencia', comercialId: 'usr-3', comercialName: 'Jose Antonio Acal Franco', createdAt: '2025-04-15', fechaFin: '2026-04-15', estadoRenovacion: 'Renovacion proxima', fechaRenovacion: '2026-04-15', diasRenovacion: 77, montoInterno: 450, montoExterno: 225 },
  { id: 'con-4', clientName: 'MARIAN DOREL CHERBZAN', cups: 'ES003110237045776921001PS', tipo: 'luz', compania: 'Niba Energía', tarifa: 'Fijo', atr: '2.0TD', consumoAnual: 3200, tipoPrecio: 'fijo', precioFijoConsumo: 0.099, potenciaContratada: 3.45, consumoAnualManual: 3200, estado: 'Pendiente de firma', comercialId: 'usr-3', comercialName: 'Jose Antonio Acal Franco', createdAt: '2025-04-15', fechaFin: '2026-04-15', estadoRenovacion: 'Renovacion proxima', fechaRenovacion: '2026-04-15', diasRenovacion: 77, montoInterno: 120, montoExterno: 60 },
  { id: 'con-5', clientName: 'MARIAN DOREL CHERBZAN', cups: 'ES003110237045813989001GL', tipo: 'luz', compania: 'Ignis', tarifa: 'Fijo', atr: '2.0TD', consumoAnual: 28227, tipoPrecio: 'fijo', precioFijoConsumo: 0.108, potenciaContratada: 11.5, consumoAnualManual: 28227, estado: 'Temporal', comercialId: 'usr-3', comercialName: 'Jose Antonio Acal Franco', createdAt: '2025-04-15', fechaFin: '2026-04-15', estadoRenovacion: 'Renovacion proxima', fechaRenovacion: '2026-04-15', diasRenovacion: 77, montoInterno: 400, montoExterno: 200 },
  { id: 'con-6', clientName: 'Siderúrgica del Norte SL', cups: 'ES0031105542292007LG', tipo: 'luz', compania: 'Axpo Iberia', tarifa: 'Indexada Pool', atr: '3.0TD', consumoAnual: 500000, tipoPrecio: 'mercado', precioFijoConsumo: 0.095, potenciaContratada: 450, consumoAnualManual: 500000, estado: 'Activado', comercialId: 'usr-1', comercialName: 'Carlos De la Fuente', createdAt: '2025-04-21', fechaFin: '2026-04-21', estadoRenovacion: 'Renovacion proxima', fechaRenovacion: '2026-04-21', diasRenovacion: 83, montoInterno: 500, montoExterno: 250 },
  { id: 'con-7', clientName: 'GEA FOOD COOPERATIVA', cups: 'ES0031105542292008XG', tipo: 'gas', compania: 'Endesa', tarifa: 'Indexado', atr: '3.0TD', consumoAnual: 37270, tipoPrecio: 'mercado', precioFijoConsumo: 0.062, potenciaContratada: 0, consumoAnualManual: null, estado: 'KO', comercialId: 'usr-1', comercialName: 'Carlos De la Fuente', createdAt: '2025-04-26', fechaFin: '2026-04-26', estadoRenovacion: 'Renovacion proxima', fechaRenovacion: '2026-04-26', diasRenovacion: 88, montoInterno: 300, montoExterno: 150 },
  { id: 'con-8', clientName: 'Hotel Continental', cups: 'ES0021000000987654ZX', tipo: 'gas', compania: 'Endesa', tarifa: 'Fija Confort', atr: '3.0TD', consumoAnual: 120000, tipoPrecio: 'fijo', precioFijoConsumo: 0.071, potenciaContratada: 0, consumoAnualManual: 120000, estado: 'Activado', comercialId: 'usr-4', comercialName: 'Marta Rivas', createdAt: '2026-05-15', fechaFin: '2027-05-15', estadoRenovacion: 'Al día', fechaRenovacion: '2027-05-15', diasRenovacion: 350, montoInterno: 960.00, montoExterno: 480.00 },
  { id: 'con-9', clientName: 'Residencia Geriátrica Verde', cups: 'ES0021000000452391KL', tipo: 'luz', compania: 'Naturgy', tarifa: 'Indexada Pool', atr: '2.0TD', consumoAnual: 85000, tipoPrecio: 'mercado', precioFijoConsumo: 0.088, potenciaContratada: 25, consumoAnualManual: null, estado: 'Pendiente de firma', comercialId: 'usr-4', comercialName: 'Marta Rivas', createdAt: '2026-05-22', fechaFin: '2027-05-22', estadoRenovacion: 'Al día', fechaRenovacion: '2027-05-22', diasRenovacion: 360, montoInterno: 850.00, montoExterno: 510.00 },
  ...buildDemoSyncedContracts(),
];

function createInitialCrmState() {
  const clients = buildClientsFromContracts(SEED_CONTRACTS);
  const contracts = linkContractsToClients(SEED_CONTRACTS, clients);
  return { clients, contracts };
}

const INITIAL_CRM = createInitialCrmState();

// ==========================================
// ENERSAVE LOGO (VECTOR SHIELD + GOLD LIGHTNING)
// ==========================================
const EnersaveLogo = ({ className = "w-12 h-12", withText = false }: { className?: string, withText?: boolean }) => {
  return (
    <div className="flex flex-col items-center justify-center">
      <svg viewBox="0 0 400 350" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="50%" stopColor="#1e3a8a" />
            <stop offset="100%" stopColor="#1e40af" />
          </linearGradient>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="70%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          <linearGradient id="goldTrim" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>

        {/* Shield outline */}
        <path
          d="M200,20 C310,20 340,60 340,160 C340,250 260,300 200,330 C140,300 60,250 60,160 C60,60 90,20 200,20 Z"
          fill="url(#shieldGrad)"
          stroke="url(#goldTrim)"
          strokeWidth="10"
        />

        {/* Inner grid patterns representing circuit wires / high-tech energy */}
        <path d="M120,130 L170,130 L190,150" stroke="#fbbf24" strokeWidth="2.5" strokeOpacity="0.25" fill="none" />
        <circle cx="120" cy="130" r="4.5" fill="#fbbf24" fillOpacity="0.4" />
        <circle cx="190" cy="150" r="4.5" fill="#fbbf24" fillOpacity="0.4" />

        <path d="M280,130 L230,130 L210,150" stroke="#fbbf24" strokeWidth="2.5" strokeOpacity="0.25" fill="none" />
        <circle cx="280" cy="130" r="4.5" fill="#fbbf24" fillOpacity="0.4" />
        <circle cx="210" cy="150" r="4.5" fill="#fbbf24" fillOpacity="0.4" />

        <path d="M130,220 L170,220 L185,205" stroke="#fbbf24" strokeWidth="2.5" strokeOpacity="0.25" fill="none" />
        <circle cx="130" cy="220" r="4.5" fill="#fbbf24" fillOpacity="0.4" />

        <path d="M270,220 L230,220 L215,205" stroke="#fbbf24" strokeWidth="2.5" strokeOpacity="0.25" fill="none" />
        <circle cx="270" cy="220" r="4.5" fill="#fbbf24" fillOpacity="0.4" />

        {/* Powerful golden yellow lightning bolt */}
        <path
          d="M230,45 L130,195 L190,195 L155,305 L275,150 L205,150 Z"
          fill="url(#goldGrad)"
          stroke="#78350f"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
      </svg>
      {withText && (
        <span className="mt-3 text-2xl font-extrabold tracking-widest text-[#1e3a8a] dark:text-[#60a5fa] font-sans">
          ENERSAVE
        </span>
      )}
    </div>
  );
};

// ==========================================
// TYPES AND INTERFACES (DEFINED EARLY)
// ==========================================
type UserRole = 'superadmin' | 'jefe_comercial' | 'comercial' | 'tramitacion';

function mapVentasRole(role: UserRole): 'comercial' | 'jefe_comercial' | 'superadmin' | 'tramitacion' {
  if (role === 'tramitacion') return 'tramitacion';
  if (role === 'jefe_comercial') return 'jefe_comercial';
  if (role === 'superadmin') return 'superadmin';
  return 'comercial';
}

interface Profile {
  id: string;
  fullName: string;
  role: UserRole;
  managerId: string | null;
  permissions: {
    contractsView: boolean;
    comparatorAccess: boolean;
    quickSettlement: boolean;
    exportDatabase?: boolean;
    viewRetrocommissions?: boolean;
  };
  email: string;
  status: 'activo' | 'suspendido' | 'pendiente';
  commissionPercentage: number;
}

function defaultPermissionsForRole(role: UserRole): Profile['permissions'] {
  if (role === 'tramitacion') {
    return {
      contractsView: true,
      comparatorAccess: false,
      quickSettlement: false,
      exportDatabase: true,
      viewRetrocommissions: false,
    };
  }
  return {
    contractsView: true,
    comparatorAccess: true,
    quickSettlement: role !== 'comercial',
    exportDatabase: role === 'superadmin',
    viewRetrocommissions: role !== 'comercial',
  };
}

function defaultCommissionForRole(role: UserRole): number {
  if (role === 'superadmin') return 100;
  if (role === 'jefe_comercial') return 85;
  return 60;
}

function mergeErpRowsIntoProfiles(
  rows: Array<{
    id: string;
    full_name: string;
    role: ErpComercialRole;
    manager_id: string | null;
    email: string | null;
  }>,
  current: Profile[]
): Profile[] {
  const byId = new Map(current.map((p) => [p.id, p]));
  return rows.map((row) => {
    const existing = byId.get(row.id);
    const role = row.role as UserRole;
    return {
      id: row.id,
      fullName: row.full_name,
      role,
      managerId: row.manager_id,
      email: row.email ?? existing?.email ?? '',
      status: existing?.status ?? 'activo',
      commissionPercentage:
        existing?.commissionPercentage ?? defaultCommissionForRole(role),
      permissions: existing?.permissions ?? defaultPermissionsForRole(role),
    };
  });
}

const companiesTariffsCatalog: Record<string, Record<string, string[]>> = {
  "2.0TD": {
    "EnerLuz": ["EnerLuz Inteligente Indexada"],
    "Iberdrola": ["Iberdrola Plan Estable Luz"],
    "Endesa": ["Endesa One Luz 3 Periodos"],
    "Naturgy": ["Naturgy Tarifa Por Uso"]
  },
  "3.0TD": {
    "EnerLuz": ["EnerLuz MultiPYME Indexada 6P"],
    "Endesa": ["Endesa Negocio Fórmula Variable"],
    "Iberdrola": ["Iberdrola Plan 3 Grabaciones PYME"]
  },
  "6.0TD": {
    "EnerLuz": ["EnerLuz Industrial Pool Max 6.0"],
    "Iberdrola": ["Iberdrola Alta Tensión a Medida"],
    "Naturgy": ["Naturgy Gas & Luz Industrial Alianza"]
  }
};

interface Ticket extends IncidenciaTicket {}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`bg-gray-200 dark:bg-slate-800 rounded animate-pulse ${className}`} />
  );
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);
};

const renderCompaniaLogo = (brandName: string) => {
  const brand = (brandName || '').toLowerCase().trim();
  
  if (brand.includes('niba')) {
    return (
      <span className="inline-flex items-center bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25 px-2 py-0.5 rounded text-[9px] font-extrabold font-mono tracking-wider" title="Niba Energía">
        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block mr-1 shrink-0" />
        NIBA
      </span>
    );
  } else if (brand.includes('connect') || brand.includes('global')) {
    return (
      <span className="inline-flex items-center bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/25 px-2 py-0.5 rounded text-[9px] font-extrabold font-mono tracking-wider" title="Global Connect">
        <span className="w-2 h-2 rounded-full bg-teal-450 inline-block mr-1 shrink-0 animate-pulse" />
        GLOBAL CONNECT
      </span>
    );
  } else if (brand.includes('axpo')) {
    return (
      <span className="inline-flex items-center bg-red-600/10 text-red-600 dark:text-red-450 border border-red-500/25 px-2 py-0.5 rounded text-[9px] font-extrabold font-mono tracking-wider" title="Axpo Iberia">
        <span className="w-2 h-2 rounded bg-red-600 inline-block mr-1 shrink-0" />
        AXPO
      </span>
    );
  } else if (brand.includes('endesa')) {
    return (
      <span className="inline-flex items-center bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/25 px-2 py-0.5 rounded text-[9px] font-extrabold font-mono tracking-wider" title="Endesa">
        <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block mr-1 shrink-0 animate-ping" style={{ animationDuration: '3s' }} />
        ENDESA
      </span>
    );
  } else if (brand.includes('repsol')) {
    return (
      <span className="inline-flex items-center bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/25 px-2 py-0.5 rounded text-[9px] font-extrabold font-mono tracking-wider" title="Repsol">
        <span className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-400 to-red-500 inline-block mr-1 shrink-0" />
        REPSOL
      </span>
    );
  } else if (brand.includes('naturgy')) {
    return (
      <span className="inline-flex items-center bg-yellow-600/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/25 px-2 py-0.5 rounded text-[9px] font-extrabold font-mono tracking-wider" title="Naturgy">
        <span className="w-2 h-2 rounded bg-amber-500 inline-block mr-1 shrink-0" />
        NATURGY
      </span>
    );
  } else if (brand.includes('octopus')) {
    return (
      <span className="inline-flex items-center bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/25 px-2 py-0.5 rounded text-[9px] font-extrabold font-mono tracking-wider" title="Octopus Energy">
        <span className="w-2 h-2 rounded-full bg-pink-500 inline-block mr-1 shrink-0" />
        OCTOPUS
      </span>
    );
  } else if (brand.includes('factor')) {
    return (
      <span className="inline-flex items-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded text-[9px] font-extrabold font-mono tracking-wider" title="Factorenergia">
        <span className="w-2 h-2 rounded bg-emerald-500 inline-block mr-1 shrink-0" />
        FACTOR ENERGÍA
      </span>
    );
  } else if (brand.includes('ignis')) {
    return (
      <span className="inline-flex items-center bg-purple-600/10 text-purple-600 dark:text-purple-400 border border-purple-500/25 px-2 py-0.5 rounded text-[9px] font-extrabold font-mono tracking-wider" title="Ignis">
        <span className="w-2 h-2 rounded-full bg-purple-500 inline-block mr-1 shrink-0" />
        IGNIS
      </span>
    );
  } else {
    return (
      <span className="inline-flex items-center bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/25 px-2 py-0.5 rounded text-[9px] font-extrabold font-mono tracking-wider">
        <span className="w-2 h-2 rounded-full bg-slate-400 inline-block mr-1 shrink-0" />
        {brandName.toUpperCase()}
      </span>
    );
  }
};

const getSortedProfiles = (rawProfiles: Profile[]) => {
  const result: Profile[] = [];
  const rootUsers = rawProfiles.filter(p => p.managerId === null);
  
  const addAndRecurse = (user: Profile) => {
    if (result.some(r => r.id === user.id)) return;
    result.push(user);
    const subordinates = rawProfiles.filter(p => p.managerId === user.id);
    subordinates.forEach(sub => addAndRecurse(sub));
  };

  rootUsers.forEach(u => addAndRecurse(u));
  
  rawProfiles.forEach(u => {
    if (!result.some(r => r.id === u.id)) {
      result.push(u);
    }
  });

  return result;
};

export default function App() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper function to calculate retrocommission status and potential clawbacks
  const getRetrocommissionInfo = (c: Contract) => {
    const brand = c.compania.toLowerCase();
    let limitMonths = 6;
    if (brand.includes('naturgy') || brand.includes('repsol')) limitMonths = 4;
    else if (brand.includes('endesa')) limitMonths = 2;
    else if (brand.includes('gana') || brand.includes('iberdrola') || brand.includes('niba')) limitMonths = 12;

    const actDate = new Date(c.createdAt);
    // Reference date is 2026-05-28 or current date
    const now = new Date();
    const diffTime = now.getTime() - actDate.getTime();
    const diffMonths = Math.max(0, diffTime / (1000 * 60 * 60 * 24 * 30.4));
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    
    const limitDays = Math.round(limitMonths * 30.4);
    const remainingDays = Math.max(0, limitDays - diffDays);
    const percentElapsed = Math.min(100, Math.round((diffDays / limitDays) * 100));
    
    const isSecure = diffMonths >= limitMonths;
    let riskStatus: 'high' | 'medium' | 'expired' = 'medium';
    if (isSecure) riskStatus = 'expired';
    else if (percentElapsed < 50) riskStatus = 'high';

    return {
      limitMonths,
      limitDays,
      diffDays,
      diffMonths,
      remainingDays,
      percentElapsed,
      isSecure,
      riskStatus
    };
  };

  // Simulation Auth State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [liqLoading, setLiqLoading] = useState<boolean>(false);
  const [activeUserId, setActiveUserId] = useState<string>('usr-1');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [activeModule, setActiveModule] = useState<'erp' | 'ventas'>('erp');
  // NAV-07 deep-link state keys (v1): activeModule, currentMenuTab, ventasFichaProspectoId,
  // highlightContractId, contractWizardProspectoId — react-router deferred (NAV-06).
  const [ventasFichaProspectoId, setVentasFichaProspectoId] = useState<string | null>(null);
  const [ventasFichaSnapshot, setVentasFichaSnapshot] = useState<Prospecto | null>(null);
  const [ventasPipelineCentroMandoId, setVentasPipelineCentroMandoId] = useState<string | null>(null);

  function openVentasFicha(prospecto: Prospecto) {
    setVentasFichaProspectoId(prospecto.id);
    setVentasFichaSnapshot(prospecto);
  }

  function openVentasPipelineCentroMando(prospectoId: string) {
    setVentasPipelineCentroMandoId(prospectoId);
    setCurrentMenuTab('Pipeline');
  }

  function closeVentasFicha() {
    setVentasFichaProspectoId(null);
    setVentasFichaSnapshot(null);
  }
  const [contractWizardProspectoId, setContractWizardProspectoId] = useState<string | null>(null);
  const [contractWizardOpen, setContractWizardOpen] = useState(false);
  const [currentMenuTab, setCurrentMenuTab] = useState<string>('Dashboard');
  const [cashflowScenario, setCashflowScenario] = useState<'optimista' | 'realista' | 'pesimista'>('realista');

  // Input states for Login Page mockup
  const [loginEmail, setLoginEmail] = useState('carlos@enersave.com');
  const [loginPassword, setLoginPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [copiedText, setCopiedText] = useState(false);

  // ==========================================
  // SEED INITIAL DATABASE MOCKS
  // ==========================================
  const [profiles, setProfiles] = useState<Profile[]>([
    { id: 'usr-1', fullName: 'Carlos De la Fuente', role: 'superadmin', managerId: null, permissions: { contractsView: true, comparatorAccess: true, quickSettlement: true, exportDatabase: true, viewRetrocommissions: true }, email: 'carlos@enersave.com', status: 'activo', commissionPercentage: 100 },
    { id: 'usr-2', fullName: 'Elena Garrido', role: 'jefe_comercial', managerId: 'usr-1', permissions: { contractsView: true, comparatorAccess: true, quickSettlement: true, exportDatabase: false, viewRetrocommissions: true }, email: 'elena@enersave.com', status: 'activo', commissionPercentage: 85 },
    { id: 'usr-3', fullName: 'Ignacio Ortiz', role: 'comercial', managerId: 'usr-2', permissions: { contractsView: true, comparatorAccess: true, quickSettlement: false, exportDatabase: false, viewRetrocommissions: false }, email: 'ignacio@enersave.com', status: 'activo', commissionPercentage: 60 },
    { id: 'usr-4', fullName: 'Marta Rivas', role: 'comercial', managerId: 'usr-2', permissions: { contractsView: true, comparatorAccess: true, quickSettlement: false, exportDatabase: false, viewRetrocommissions: false }, email: 'marta@enersave.com', status: 'activo', commissionPercentage: 70 },
    { id: 'usr-5', fullName: 'Santiago Cano', role: 'comercial', managerId: null, permissions: { contractsView: true, comparatorAccess: true, quickSettlement: false, exportDatabase: false, viewRetrocommissions: false }, email: 'santiago@enersave.com', status: 'suspendido', commissionPercentage: 65 },
    { id: 'usr-6', fullName: 'Laura Tramitación', role: 'tramitacion', managerId: 'usr-1', permissions: { contractsView: true, comparatorAccess: false, quickSettlement: false, exportDatabase: true, viewRetrocommissions: false }, email: 'tramitacion@enersave.com', status: 'activo', commissionPercentage: 0 },
  ]);

  const [clients, setClients] = useState<Client[]>(INITIAL_CRM.clients);
  const [contracts, setContracts] = useState<Contract[]>(INITIAL_CRM.contracts);

  // Dual switch view state for Superadmin
  const [superadminViewMode, setSuperadminViewMode] = useState<'tramitacion' | 'comercial'>('tramitacion');

  // Interactive filters for Clients database views
  const [clientesSearchQuery, setClientesSearchQuery] = useState('');
  const [contractsSearchQuery, setContractsSearchQuery] = useState('');
  const [contractsListFilter, setContractsListFilter] = useState<ContractsListFilter>('all');
  const [highlightContractId, setHighlightContractId] = useState<string | null>(null);

  useEffect(() => {
    setClients((prev) => syncClientEstados(prev, contracts));
  }, [contracts]);

  useEffect(() => {
    if (!highlightContractId) return;
    const timer = setTimeout(() => setHighlightContractId(null), 10000);
    return () => clearTimeout(timer);
  }, [highlightContractId]);

  const [liquidacionesSearchQuery, setLiquidacionesSearchQuery] = useState('');
  const [cupsFilter, setCupsFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [atrFilter, setAtrFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [renewalStatusFilter, setRenewalStatusFilter] = useState('');

  // Editing cells tracking state
  const [editingCell, setEditingCell] = useState<{ contractId: string, field: keyof Contract } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const [settlements, setSettlements] = useState<Settlement[]>([
    { id: 'liq-1', comercialId: 'usr-3', comercialName: 'Ignacio Ortiz', montoInterno: 240, montoExterno: 120, estado: 'pagado', tipo: 'luz', descripcion: 'Comisión liquidada - ANA MARIA PINEDA BARRAGA', createdAt: '2026-06-02', contractId: 'con-1' },
    { id: 'liq-2', comercialId: 'usr-3', comercialName: 'Ignacio Ortiz', montoInterno: 380, montoExterno: 190, estado: 'pendiente', tipo: 'luz', descripcion: 'Comisión pendiente - GEA CATERING, S.L.', createdAt: '2026-06-04', contractId: 'con-2' },
    { id: 'liq-3', comercialId: 'usr-3', comercialName: 'Ignacio Ortiz', montoInterno: -450, montoExterno: -225, estado: 'pendiente', tipo: 'luz', descripcion: 'Retrocomisión proporcional - MARIAN DOREL CHERBZAN (Naturgy)', createdAt: '2026-06-08', contractId: 'con-3' },
    { id: 'liq-4', comercialId: 'usr-4', comercialName: 'Marta Rivas', montoInterno: 960, montoExterno: 480, estado: 'pendiente', tipo: 'gas', descripcion: 'Comisión pendiente - Hotel Continental', createdAt: '2026-06-05', contractId: 'con-8' },
    { id: 'liq-5', comercialId: 'usr-4', comercialName: 'Marta Rivas', montoInterno: 850, montoExterno: 510, estado: 'pagado', tipo: 'luz', descripcion: 'Comisión liquidada - Residencia Geriátrica Verde', createdAt: '2026-06-01', contractId: 'con-9' },
    { id: 'liq-6', comercialId: 'usr-5', comercialName: 'Santiago Cano', montoInterno: 400, montoExterno: 200, estado: 'pagado', tipo: 'luz', descripcion: 'Comisión regularizada - MARIAN DOREL CHERBZAN (Ignis)', createdAt: '2026-06-03', contractId: 'con-5' },
    { id: 'liq-7', comercialId: 'usr-1', comercialName: 'Carlos De la Fuente', montoInterno: 500, montoExterno: 250, estado: 'pagado', tipo: 'luz', descripcion: 'Comisión liquidada - Siderúrgica del Norte SL', createdAt: '2026-06-06', contractId: 'con-6' },
    { id: 'liq-8', comercialId: 'usr-1', comercialName: 'Carlos De la Fuente', montoInterno: -300, montoExterno: -150, estado: 'pendiente', tipo: 'gas', descripcion: 'Retrocomisión - GEA FOOD COOPERATIVA (Endesa)', createdAt: '2026-06-10', contractId: 'con-7' },
  ]);

  const [incidencias, setIncidencias] = useState<Ticket[]>([
    { id: 'inc-1', clientName: 'Residencia Geriátrica Verde', tipo: 'Retraso de Firma', prioridad: 'alta', estado: 'pendiente', comercialId: 'usr-4', comercialName: 'Marta Rivas', descripcion: 'Cliente renegociando penalización con comercializadora saliente', createdAt: '2026-05-20' },
    { id: 'inc-2', clientName: 'Restaurante El Laurel', tipo: 'Error de CUPS', prioridad: 'media', estado: 'resuelta', comercialId: 'usr-4', comercialName: 'Marta Rivas', descripcion: 'El CUPS suministrado correspondía a la luz en lugar del gas. Subsanado.', createdAt: '2026-05-10', estadoAt: '2026-05-28T10:00:00.000Z' },
    { id: 'inc-3', clientName: 'GEA CATERING, S.L.', tipo: 'Tarifa Incorrecta', prioridad: 'media', estado: 'pendiente', comercialId: 'usr-3', comercialName: 'Ignacio Ortiz', descripcion: 'Facturación con tarifa distinta a la contratada en alta.', createdAt: '2026-05-22' },
    { id: 'inc-4', clientName: 'ANA MARIA PINEDA BARRAGA', tipo: 'Incidencia Cartera', prioridad: 'baja', estado: 'cancelada', comercialId: 'usr-3', comercialName: 'Ignacio Ortiz', descripcion: 'Cliente desistió del cambio de comercializadora.', createdAt: '2026-05-18', estadoAt: '2026-05-28T14:00:00.000Z' },
    { id: 'inc-5', clientName: 'Hotel Continental', tipo: 'Reclamación Distribuidora', prioridad: 'baja', estado: 'resuelta', comercialId: 'usr-4', comercialName: 'Marta Rivas', descripcion: 'Corte de suministro revertido tras reclamación.', createdAt: '2026-04-01', estadoAt: '2026-05-15T08:00:00.000Z' },
    { id: 'inc-6', clientName: 'Taller Mecánico Sur', tipo: 'Retraso de Firma', prioridad: 'media', estado: 'cancelada', comercialId: 'usr-3', comercialName: 'Ignacio Ortiz', descripcion: 'Alta anulada por falta de documentación.', createdAt: '2026-04-10', estadoAt: '2026-05-10T09:00:00.000Z' },
  ]);

  const [newIncClientName, setNewIncClientName] = useState('');
  const [newIncTipo, setNewIncTipo] = useState<Ticket['tipo']>('Incidencia Cartera');
  const [newIncPrioridad, setNewIncPrioridad] = useState<Ticket['prioridad']>('media');
  const [newIncDescripcion, setNewIncDescripcion] = useState('');

  // ==========================================
  // CALCULATED ENERGY CALCULATIONS COMPARATOR
  // ==========================================
  const [compCups, setCompCups] = useState('ES0021000000');
  const [compClient, setCompClient] = useState('');
  const [compTipo, setCompTipo] = useState<'luz' | 'gas'>('luz');
  const [compConsumo, setCompConsumo] = useState<number>(30000);
  const [compTarifaActual, setCompTarifaActual] = useState('Fija Cara');
  const [matchingRate, setMatchingRate] = useState<{ name: string; cost: number; savings: number; profitCompany: number; profitAgent: number } | null>(null);
  
  // High fidelity period variables mimicking the Next.js active form
  const [compSegment, setCompSegment] = useState<'residencial' | 'pyme'>('residencial');
  const [compAccessTariff, setCompAccessTariff] = useState<'2.0TD' | '3.0TD' | '6.0TD'>('2.0TD');
  const [compPotencias, setCompPotencias] = useState({ p1: 4.6, p2: 4.6, p3: 0, p4: 0, p5: 0, p6: 0 });
  const [compConsumos, setCompConsumos] = useState({ p1: 1200, p2: 900, p3: 1500, p4: 0, p5: 0, p6: 0 });
  const [compRentMeter, setCompRentMeter] = useState<number>(1.84);
  const [compCurrentBill, setCompCurrentBill] = useState<number>(85);
  const [compResults, setCompResults] = useState<any[] | null>(null);
  const [compSummary, setCompSummary] = useState<any | null>(null);
  const [compLoading, setCompLoading] = useState<boolean>(false);

  const [newContractForm, setNewContractForm] = useState<NewContractFormState>({
    ...EMPTY_NEW_CONTRACT_FORM,
    fechaInicio: new Date().toISOString().split('T')[0],
  });

  function patchNewContractForm(patch: Partial<NewContractFormState>) {
    setNewContractForm((prev) => ({ ...prev, ...patch }));
  }

  function resetNewContractForm() {
    const user = profiles.find((p) => p.id === activeUserId) || profiles[0];
    setNewContractForm({
      ...EMPTY_NEW_CONTRACT_FORM,
      fechaInicio: new Date().toISOString().split('T')[0],
      wizardStep: 1,
      nombreComercial: user.fullName,
      jefeEquipo:
        profiles.find((p) => p.id === user.managerId)?.fullName ?? '',
    });
  }

  function applyOcrToNewContractForm(data: ContractOcrResult) {
    const patch: Partial<NewContractFormState> = {};
    if (data.tipo) patch.tipo = data.tipo;
    if (data.cups) patch.cups = data.cups;
    if (data.compania) patch.compania = data.compania;
    if (data.tarifa) patch.tarifa = data.tarifa;
    if (data.tipoPrecio === 'mercado') {
      patch.tarifa = 'Indexada Pool';
      patch.tipoPrecio = 'mercado';
    }
    if (data.tipoPrecio === 'fijo') {
      patch.tarifa = 'Fija Confort';
      patch.tipoPrecio = 'fijo';
    }
    if (data.nif) patch.nif = data.nif;
    if (data.iban) patch.iban = data.iban;
    if (data.direccionSuministro) patch.direccionSuministro = data.direccionSuministro;
    if (data.potenciaContratada) patch.potenciaContratada = String(data.potenciaContratada);
    if (data.precioFijoConsumo != null) patch.precioFijoConsumo = String(data.precioFijoConsumo);
    if (data.fechaInicio) patch.fechaInicio = data.fechaInicio;
    if (data.compania) patch.wizardStep = 2;
    patchNewContractForm(patch);
  }

  // Contract Generation Modal from Comparator
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [modalClientName, setModalClientName] = useState('');
  const [modalNif, setModalNif] = useState('');
  const [modalTelefono, setModalTelefono] = useState('');
  const [modalEmail, setModalEmail] = useState('');
  const [modalIban, setModalIban] = useState('');
  const [modalDireccionCompleta, setModalDireccionCompleta] = useState('');
  const [modalDireccionSuministro, setModalDireccionSuministro] = useState('');
  const [modalCups, setModalCups] = useState('');
  const [modalPotencia, setModalPotencia] = useState('');
  const [modalPrecioFijoConsumo, setModalPrecioFijoConsumo] = useState('');
  const [modalTipoPrecio, setModalTipoPrecio] = useState<'fijo' | 'mercado' | ''>('');
  const [modalFechaInicio, setModalFechaInicio] = useState('');
  const [modalCompany, setModalCompany] = useState('');
  const [modalTariff, setModalTariff] = useState('');
  const [modalSegment, setModalSegment] = useState<'residencial' | 'pyme'>('residencial');
  const [modalAccessTariff, setModalAccessTariff] = useState<'2.0TD' | '3.0TD' | '6.0TD'>('2.0TD');
  const [modalFiles, setModalFiles] = useState<{ name: string; size: string }[]>([]);
  const [expandedContractId, setExpandedContractId] = useState<string | null>(null);

  // New User trigger workflow simulation
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('comercial');
  const [newUserManager, setNewUserManager] = useState<string>('usr-2');
  
  // Interactive Simulation variables for advanced Usuarios portal features
  const [activeUserForSheet, setActiveUserForSheet] = useState<Profile | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [userSearchText, setUserSearchText] = useState<string>('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('all');

  // Comparison history search & interactive commission calculator states
  const [compHistorySearch, setCompHistorySearch] = useState<string>('');
  const [marcoSimType, setMarcoSimType] = useState<'luz' | 'gas'>('luz');
  const [marcoSimConsumo, setMarcoSimConsumo] = useState<number>(35000);
  const [marcoSimTariff, setMarcoSimTariff] = useState<string>('3.0TD');

  // Selected period for commercial generated commission KPI
  const [selectedPeriod, setSelectedPeriod] = useState<string>('1m');

  // Custom new states for simulated loader actions
  const [isCreatingContract, setIsCreatingContract] = useState<boolean>(false);
  const [isCreatingUser, setIsCreatingUser] = useState<boolean>(false);
  const [isSavingUserSheet, setIsSavingUserSheet] = useState<boolean>(false);
  const [isSyncingErpUsers, setIsSyncingErpUsers] = useState<boolean>(false);
  const [isBajaLoading, setIsBajaLoading] = useState<boolean>(false);
  const [isActivatingContractLoading, setIsActivatingContractLoading] = useState<boolean>(false);
  const [isConsolidating, setIsConsolidating] = useState<boolean>(false);
  const [isBajaOpen, setIsBajaOpen] = useState<boolean>(false);
  const [selectedContractForBaja, setSelectedContractForBaja] = useState<Contract | null>(null);
  const [bajaDate, setBajaDate] = useState<string>('2026-05-28');

  // Contract Activation and Commission Distribution states
  const [isActivateOpen, setIsActivateOpen] = useState<boolean>(false);
  const [selectedContractForActivation, setSelectedContractForActivation] = useState<Contract | null>(null);
  const [activatePowerKw, setActivatePowerKw] = useState<number>(15);
  const [activateConsumoKwh, setActivateConsumoKwh] = useState<number>(25000);

  // Historial de Comparativas state
  const [comparisonsHistory, setComparisonsHistory] = useState<any[]>([
    { id: 'comp-1', clientName: 'Ferretería El Candado', cups: 'ES0021000000882244XX', accessTariff: '3.0TD', currentAnnualExpense: 4800, maxAnnualSavings: 960, bestTariffName: 'EnerLuz Inteligente Indexada', date: '2026-05-18' },
    { id: 'comp-2', clientName: 'Lavandería Burbujas', cups: 'ES0021000000119988YY', accessTariff: '2.0TD', currentAnnualExpense: 2300, maxAnnualSavings: 450, bestTariffName: 'EnerLuz Inteligente Indexada', date: '2026-05-20' },
    { id: 'comp-3', clientName: 'Conservas del Cantábrico', cups: 'ES0021000000776655ZZ', accessTariff: '6.0TD', currentAnnualExpense: 14500, maxAnnualSavings: 3100, bestTariffName: 'EnerLuz Industrial Pool Max 6.0', date: '2026-05-22' }
  ]);

  // Liquidaciones Internas state
  const [selectedCompaniaTab, setSelectedCompaniaTab] = useState<string>('Todos');
  const [pendingContracts, setPendingContracts] = useState<any[]>([
    { id: 'pcon-1', code: '04AE54BBX', cups: 'ES875404715066446', dateFirm: '28-abr-2025', dateAct: '13-may-2025', direction: 'Calle Mayor 53 , Barcelona 25006', agentId: 'usr-3', agentName: 'Ignacio Ortiz', brand: 'Niba', tariff: 'Tarifa 2.0TD', price: 150.00, checked: false, clientName: 'Suministros Pérez', tipo: 'luz' },
    { id: 'pcon-2', code: 'EC900F84X', cups: 'ES963107157423318', dateFirm: '04-jun-2025', dateAct: '19-jun-2025', direction: 'Calle Mayor 7 , Barcelona 33367', agentId: 'usr-4', agentName: 'Marta Rivas', brand: 'Global Connect', tariff: 'Tarifa 2.0TD', price: 50.00, checked: false, clientName: 'Clínica Dental Les Corts', tipo: 'luz' },
    { id: 'pcon-3', code: 'F5264AD0X', cups: 'ES94130653587045', dateFirm: '28-jun-2025', dateAct: '13-jul-2025', direction: 'Calle Mayor 54 , Barcelona 9297', agentId: 'usr-3', agentName: 'Ignacio Ortiz', brand: 'Niba', tariff: 'Tarifa 3.0TD', price: 230.00, checked: true, clientName: 'Panadería Barcelona', tipo: 'gas' },
    { id: 'pcon-4', code: '79B45E63X', cups: 'ES727908497439937', dateFirm: '17-jul-2025', dateAct: '01-ago-2025', direction: 'Calle Mayor 35 , Barcelona 11367', agentId: 'usr-5', agentName: 'Santiago Cano', brand: 'Axpo', tariff: 'Tarifa 3.0TD', price: 230.00, checked: false, clientName: 'Restaurante El Celler', tipo: 'luz' },
    { id: 'pcon-5', code: 'A828A291A', cups: 'ES102983719283712', dateFirm: '02-ago-2025', dateAct: '15-ago-2025', direction: 'Gran Via 122, Madrid 28008', agentId: 'usr-2', agentName: 'Elena Garrido', brand: 'Endesa', tariff: 'Tarifa Fija Pyme', price: 180.00, checked: false, clientName: 'Talleres Mecánicos Gran Vía', tipo: 'luz' }
  ]);
  const [consolidatedLiquidations, setConsolidatedLiquidations] = useState<any[]>([
    { id: 'cliq-1', brand: 'Repsol', operator: 'Desconocida', dateConsolidated: '09-feb-2026 | 07:16 PM', contractsCount: 1, amount: 250.00, code: '728A92BB' },
    { id: 'cliq-2', brand: 'Factorenergia', operator: 'Desconocida', dateConsolidated: '15-ene-2026 | 04:30 PM', contractsCount: 2, amount: 380.00, code: '028F91CC' }
  ]);

  // Trigger login: app profile + Supabase Auth session for ventas RLS
  function applyLoginProfile(matches: Profile) {
    setActiveUserId(matches.id);
    const role = matches.role;
    setActiveModule('erp');
    if (role === 'superadmin') {
      setCurrentMenuTab('Dashboard');
    } else if (role === 'jefe_comercial') {
      setCurrentMenuTab('Mi Equipo');
    } else if (role === 'comercial') {
      setCurrentMenuTab('Dashboard');
    } else if (role === 'tramitacion') {
      setCurrentMenuTab('Liquidaciones');
    }
    setIsLoggedIn(true);
  }

  async function ensureSupabaseForProfile(
    profile: Profile,
    password: string
  ): Promise<boolean> {
    if (!isSupabaseConfigured()) return true;
    const sessionResult = await syncSupabaseSession(profile.email, password, {
      comercialId: profile.id,
      role: profile.role,
      fullName: profile.fullName,
    });
    if (!sessionResult.ok) {
      setLoginError(
        `No se pudo conectar con Supabase: ${sessionResult.message}. Crea el usuario en Auth con el mismo email y contraseña, o desactiva «Confirm email» en Supabase.`
      );
      return false;
    }
    return true;
  }

  async function quickLoginAs(profileId: string) {
    setLoginLoading(true);
    setLoginError(null);
    const matches = profiles.find((p) => p.id === profileId);
    if (!matches) {
      setLoginLoading(false);
      setLoginError('Perfil demo no encontrado.');
      return;
    }
    setLoginEmail(matches.email);
    if (!await ensureSupabaseForProfile(matches, DEFAULT_DEV_PASSWORD)) {
      setLoginLoading(false);
      return;
    }
    applyLoginProfile(matches);
    setLoginLoading(false);
  }

  const triggerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    let searchEmail = loginEmail.toLowerCase().trim();

    if (searchEmail === 'superadmin@enersave.com' || searchEmail === 'superadmin@ener-erp.com') {
      searchEmail = 'carlos@enersave.com';
    } else if (searchEmail === 'jefecomercial@enersave.com' || searchEmail === 'jefecomercial@ener-erp.com') {
      searchEmail = 'elena@enersave.com';
    } else if (searchEmail === 'comercial@enersave.com' || searchEmail === 'comercial@ener-erp.com') {
      searchEmail = 'ignacio@enersave.com';
    }

    const matches = profiles.find((p) => p.email.toLowerCase() === searchEmail);
    if (!matches) {
      setLoginLoading(false);
      setLoginError('Credenciales incorrectas: Correo no registrado en el servidor corporativo de ENERSAVE.');
      return;
    }

    if (matches.status === 'suspendido') {
      setLoginLoading(false);
      setLoginError('La cuenta de este agente se encuentra suspendida temporalmente por administración.');
      return;
    }

    if (isSupabaseConfigured()) {
      if (!await ensureSupabaseForProfile(matches, loginPassword)) {
        setLoginLoading(false);
        return;
      }
    }

    applyLoginProfile(matches);
    setLoginLoading(false);
  };

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    (async () => {
      const status = await getAuthSessionStatus();
      if (cancelled || !status.ok) return;
      const matches = profiles.find(
        (p) => p.email.toLowerCase() === status.email.toLowerCase()
      );
      if (!matches || matches.status === 'suspendido') return;
      applyLoginProfile(matches);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Perform Tariff Comparison logic
  // Perform Tariff Comparison logic (Synchronous for smooth real-time autocalculation)
  const handleCompareRates = () => {
    const daysInYear = 365;
    const meterCostAnnual = Number(compRentMeter) * 12;

    interface SetupTariff {
      companyName: string;
      tariffName: string;
      potRates: number[];
      conRates: number[];
    }

    let testProfiles: SetupTariff[] = [];

    if (compAccessTariff === "2.0TD") {
      testProfiles = [
        {
          companyName: "EnerLuz",
          tariffName: "EnerLuz Inteligente Indexada",
          potRates: [0.071, 0.022],
          conRates: [0.145, 0.125, 0.101],
        },
        {
          companyName: "Iberdrola",
          tariffName: "Iberdrola Plan Estable Luz",
          potRates: [0.082, 0.029],
          conRates: [0.178, 0.178, 0.178],
        },
        {
          companyName: "Endesa",
          tariffName: "Endesa One Luz 3 Periodos",
          potRates: [0.079, 0.026],
          conRates: [0.165, 0.139, 0.118],
        },
        {
          companyName: "Naturgy",
          tariffName: "Naturgy Tarifa Por Uso",
          potRates: [0.081, 0.027],
          conRates: [0.169, 0.149, 0.121],
        },
      ];
    } else if (compAccessTariff === "3.0TD") {
      testProfiles = [
        {
          companyName: "EnerLuz",
          tariffName: "EnerLuz MultiPYME Indexada 6P",
          potRates: [0.102, 0.085, 0.045, 0.038, 0.022, 0.015],
          conRates: [0.129, 0.118, 0.105, 0.098, 0.091, 0.082],
        },
        {
          companyName: "Endesa",
          tariffName: "Endesa Negocio Fórmula Variable",
          potRates: [0.115, 0.095, 0.052, 0.044, 0.028, 0.018],
          conRates: [0.149, 0.138, 0.122, 0.115, 0.108, 0.095],
        },
        {
          companyName: "Iberdrola",
          tariffName: "Iberdrola Plan 3 Grabaciones PYME",
          potRates: [0.119, 0.098, 0.055, 0.045, 0.029, 0.019],
          conRates: [0.155, 0.141, 0.128, 0.119, 0.112, 0.099],
        },
      ];
    } else {
      testProfiles = [
        {
          companyName: "EnerLuz",
          tariffName: "EnerLuz Industrial Pool Max 6.0",
          potRates: [0.095, 0.078, 0.042, 0.034, 0.019, 0.012],
          conRates: [0.111, 0.099, 0.092, 0.085, 0.078, 0.069],
        },
        {
          companyName: "Iberdrola",
          tariffName: "Iberdrola Alta Tensión a Medida",
          potRates: [0.112, 0.091, 0.049, 0.041, 0.024, 0.016],
          conRates: [0.132, 0.119, 0.109, 0.102, 0.094, 0.084],
        },
        {
          companyName: "Naturgy",
          tariffName: "Naturgy Gas & Luz Industrial Alianza",
          potRates: [0.106, 0.086, 0.046, 0.038, 0.022, 0.014],
          conRates: [0.125, 0.112, 0.103, 0.096, 0.088, 0.078],
        },
      ];
    }

    const calculatedOptions = testProfiles.map((prof, idx) => {
      let potCost = 0;
      let conCost = 0;

      if (compAccessTariff === "2.0TD") {
        potCost =
          Number(compPotencias.p1 || 0) * prof.potRates[0] * daysInYear +
          Number(compPotencias.p2 || 0) * prof.potRates[1] * daysInYear;

        conCost =
          Number(compConsumos.p1 || 0) * prof.conRates[0] +
          Number(compConsumos.p2 || 0) * prof.conRates[1] +
          Number(compConsumos.p3 || 0) * prof.conRates[2];
      } else {
        potCost =
          Number(compPotencias.p1 || 0) * prof.potRates[0] * daysInYear +
          Number(compPotencias.p2 || 0) * prof.potRates[1] * daysInYear +
          Number(compPotencias.p3 || 0) * (prof.potRates[2] || 0) * daysInYear +
          Number(compPotencias.p4 || 0) * (prof.potRates[3] || 0) * daysInYear +
          Number(compPotencias.p5 || 0) * (prof.potRates[4] || 0) * daysInYear +
          Number(compPotencias.p6 || 0) * (prof.potRates[5] || 0) * daysInYear;

        conCost =
          Number(compConsumos.p1 || 0) * prof.conRates[0] +
          Number(compConsumos.p2 || 0) * prof.conRates[1] +
          Number(compConsumos.p3 || 0) * prof.conRates[2] +
          Number(compConsumos.p4 || 0) * (prof.conRates[3] || 0) +
          Number(compConsumos.p5 || 0) * (prof.conRates[4] || 0) +
          Number(compConsumos.p6 || 0) * (prof.conRates[5] || 0);
      }

      const annualCost = potCost + conCost + meterCostAnnual;
      const monthlyCost = annualCost / 12;

      return {
        id: `client-tariff-${prof.companyName.toLowerCase()}-${idx}`,
        companyName: prof.companyName as any,
        tariffName: prof.tariffName,
        monthlyCost: Math.round(monthlyCost),
        annualCost: Math.round(annualCost),
        potenciaBreakdown: Math.round(potCost),
        consumoBreakdown: Math.round(conCost),
        rentCostAnnual: Math.round(meterCostAnnual),
        isBestOption: prof.companyName === "EnerLuz",
      };
    });

    let currentAnnualExpense = 0;
    if (compCurrentBill && Number(compCurrentBill) > 0) {
      currentAnnualExpense = Number(compCurrentBill) * 12;
    } else {
      const maxVal = Math.max(...calculatedOptions.map(o => o.annualCost));
      currentAnnualExpense = maxVal * 1.18;
    }

    const finalOptions = calculatedOptions.map((opt) => {
      const savingsAnnual = Math.max(0, currentAnnualExpense - opt.annualCost);
      const savingsPercentage = Math.round((savingsAnnual / currentAnnualExpense) * 100);

      return {
        ...opt,
        savingsAnnual: Math.round(savingsAnnual),
        savingsPercentage: savingsPercentage,
      };
    });

    finalOptions.sort((a, b) => a.annualCost - b.annualCost);

    const topOptions = finalOptions.slice(0, 3);
    const best = topOptions.find(o => o.companyName === "EnerLuz") || topOptions[0];

    setCompResults(topOptions);
    setCompSummary({
      bestTariffName: best.tariffName,
      bestTariffCompany: best.companyName,
      maxAnnualSavings: best.savingsAnnual,
      maxSavingsPercentage: best.savingsPercentage,
      currentAnnualExpense: Math.round(currentAnnualExpense),
    });

    // Maintain legacy variable compatibility just in case other triggers read it
    setMatchingRate({
      name: best.tariffName,
      cost: best.annualCost,
      savings: best.savingsAnnual,
      profitCompany: best.annualCost * 0.05,
      profitAgent: best.annualCost * 0.03
    });
  };

  // Real-time calculation effect triggers immediately upon typing parameters
  useEffect(() => {
    handleCompareRates();
  }, [
    compClient,
    compSegment,
    compAccessTariff,
    compPotencias,
    compConsumos,
    compRentMeter,
    compCurrentBill
  ]);

  // Open the detailed contract modal from comparator offer card
  const openNewContractModal = (opt: any) => {
    setModalClientName(compClient || '');
    setModalNif('');
    setModalTelefono('');
    setModalEmail('');
    setModalIban('');
    setModalDireccionCompleta('');
    setModalDireccionSuministro('');
    setModalCups('');
    setModalPotencia(compPotencias.p1 ? `${compPotencias.p1} kW` : '15 kW');
    setModalPrecioFijoConsumo('');
    setModalTipoPrecio(
      String(opt.tariffName || '').toLowerCase().includes('index') ? 'mercado' : 'fijo'
    );
    setModalFechaInicio(new Date().toISOString().split('T')[0]);
    setModalCompany(opt.companyName);
    setModalTariff(opt.tariffName);
    setModalSegment(compSegment);
    setModalAccessTariff(compAccessTariff);
    setModalFiles([]);
    setIsContractModalOpen(true);
  };

  // Adjust selections automatically inside the contract generation modal
  useEffect(() => {
    if (isContractModalOpen) {
      const companiesForTariff = Object.keys(companiesTariffsCatalog[modalAccessTariff] || {});
      if (companiesForTariff.length > 0) {
        if (!companiesForTariff.includes(modalCompany)) {
          setModalCompany(companiesForTariff[0]);
        }
      }
    }
  }, [modalAccessTariff, isContractModalOpen]);

  useEffect(() => {
    if (isContractModalOpen && modalCompany) {
      const tariffsForCompany = (companiesTariffsCatalog[modalAccessTariff] || {})[modalCompany] || [];
      if (tariffsForCompany.length > 0) {
        if (!tariffsForCompany.includes(modalTariff)) {
          setModalTariff(tariffsForCompany[0]);
        }
      }
    }
  }, [modalCompany, modalAccessTariff, isContractModalOpen]);

  // File attachment helpers for contract modal expediente
  function appendModalFiles(files: File[]) {
    if (files.length === 0) return;
    const filesArray = files.map((file) => ({
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
    }));
    setModalFiles((prev) => [...prev, ...filesArray]);
    toast.success(`${filesArray.length} archivo(s) acoplado(s).`);
  }

  const handleCreateContractFromModal = (e: React.FormEvent) => {
    e.preventDefault();

    const totalConsumo = compConsumos.p1 + compConsumos.p2 + compConsumos.p3 + (compConsumos.p4 || 0) + (compConsumos.p5 || 0) + (compConsumos.p6 || 0);
    const calculatedConsumo = totalConsumo > 0 ? totalConsumo : 0;

    const validation = validateContractRegistration(
      {
        clientName: modalClientName,
        cups: modalCups,
        tipo: compTipo,
        compania: modalCompany,
        tarifa: modalTariff,
        tipoPrecio: modalTipoPrecio,
        consumoAnual: calculatedConsumo,
        nif: modalNif,
        telefono: modalTelefono,
        email: modalEmail,
        iban: modalIban,
        direccionSuministro: modalDireccionSuministro,
        direccionCompleta: modalDireccionCompleta,
        potenciaContratada: modalPotencia,
        precioFijoConsumo: modalPrecioFijoConsumo,
        fechaInicio: modalFechaInicio,
      },
      { requireDireccionCompleta: true }
    );

    if (!validation.valid) {
      toast.error(contractRegistrationErrorMessage(validation.missingLabels));
      return;
    }

    if (calculatedConsumo <= 0) {
      toast.error('El consumo anual debe ser mayor que 0. Completa los periodos en el comparador.');
      return;
    }
    
    // Internal margins: 3.0TD / 6.0TD gets 0.012 €/kWh, 2.0TD gets 0.01 €/kWh
    const internalMargin = calculatedConsumo * (modalAccessTariff === '2.0TD' ? 0.01 : 0.012);
    // User commission rate determines the agent payload payout
    const externalAdvisorMargin = internalMargin * (activeUser.commissionPercentage / 100);

    const userAsSeller = activeUser;

    const { clients: clientsAfterUpsert, client: linkedClient } = upsertClient(clients, {
      nombre: modalClientName,
      comercialId: userAsSeller.id,
      documento: modalNif,
      telefono: modalTelefono,
      email: modalEmail,
      direccion: modalDireccionSuministro || modalDireccionCompleta,
    });

    const newContractObj: Contract = {
      id: `con-${contracts.length + 1}`,
      clientId: linkedClient.id,
      clientName: modalClientName,
      cups: modalCups.toUpperCase().trim(),
      tipo: compTipo,
      compania: modalCompany,
      tarifa: modalTariff,
      tipoPrecio: modalTipoPrecio as 'fijo' | 'mercado',
      precioFijoConsumo: parseFloat(modalPrecioFijoConsumo.replace(',', '.')),
      consumoAnual: calculatedConsumo,
      montoInterno: Math.round(internalMargin * 100) / 100,
      montoExterno: Math.round(externalAdvisorMargin * 100) / 100,
      estado: 'Pendiente de firma',
      comercialId: userAsSeller.id,
      comercialName: userAsSeller.fullName,
      createdAt: new Date().toISOString().split('T')[0],
      fechaFin: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      estadoRenovacion: 'Al día',
      nif: modalNif,
      telefono: modalTelefono,
      email: modalEmail,
      iban: modalIban,
      direccionCompleta: modalDireccionCompleta,
      direccionSuministro: modalDireccionSuministro,
      potenciaContratada: modalPotencia,
      documentos: modalFiles.length > 0 ? modalFiles : [],
    };

    const contractsWithNew = [newContractObj, ...contracts];
    setClients(syncClientEstados(clientsAfterUpsert, contractsWithNew));

    // Auto-create Settlement row linked to this contract (Trigger logic representation)
    const newSettlementObj: Settlement = {
      id: `liq-${settlements.length + 1}`,
      comercialId: userAsSeller.id,
      comercialName: userAsSeller.fullName,
      montoInterno: Math.round(internalMargin * 100) / 100,
      montoExterno: Math.round(externalAdvisorMargin * 100) / 100,
      estado: 'pendiente',
      tipo: 'luz',
      descripcion: `Comisión generada para contrato nuevo: ${modalClientName}`,
      createdAt: new Date().toISOString().split('T')[0],
      contractId: newContractObj.id,
    };

    setContracts(contractsWithNew);
    setSettlements([newSettlementObj, ...settlements]);

    // Save this simulation in comparisonsHistory list
    const newHistoryEntry = {
      id: `comp-${Date.now()}`,
      clientName: modalClientName || 'Demo Empresa SL',
      cups: modalCups || 'ES0021000555',
      accessTariff: modalAccessTariff,
      currentAnnualExpense: Math.round(compSummary ? compSummary.currentAnnualExpense : 1200),
      maxAnnualSavings: Math.round(compSummary ? compSummary.maxAnnualSavings : 400),
      bestTariffName: modalTariff,
      date: new Date().toISOString().split('T')[0]
    };
    setComparisonsHistory(prev => [newHistoryEntry, ...prev]);

    setIsContractModalOpen(false);
    setCurrentMenuTab(activeModule === 'ventas' ? 'Mis Contratos' : 'Contratos');
    toast.success(`¡Contrato registrado con éxito para ${modalClientName}! Se ha redirigido al gestor de contrataciones.`);
  };

  function switchAppModule(module: 'erp' | 'ventas') {
    setActiveModule(module);
    if (module === 'ventas') {
      setCurrentMenuTab(activeRole === 'tramitacion' ? 'Base EnerSave' : 'Mi Día');
      return;
    }
    if (activeRole === 'superadmin') {
      setCurrentMenuTab('Dashboard');
    } else if (activeRole === 'jefe_comercial') {
      setCurrentMenuTab('Mi Equipo');
    } else if (activeRole === 'comercial') {
      setCurrentMenuTab('Mis Clientes');
    } else if (activeRole === 'tramitacion') {
      setCurrentMenuTab('Liquidaciones');
    }
  }

  const handleToggleSuperadminMode = () => {
    const nextMode = superadminViewMode === 'tramitacion' ? 'comercial' : 'tramitacion';
    setSuperadminViewMode(nextMode);
    if (nextMode === 'comercial') {
      setCurrentMenuTab('Mis Clientes');
    } else {
      setCurrentMenuTab('Dashboard');
    }
    toast.success(`Cambiando a Panel de ${nextMode === 'comercial' ? 'Mis Clientes (Agente)' : 'Tramitación (Operativo)'}`);
  };

  // Simulate creation of a new client contract
  // This triggers a contract entry AND instantly adds an automated row in Settlements (liquidaciones)!
  const handleCreateContract = async (
    e: React.FormEvent,
    onSuccess?: () => void,
    options?: { incomplete?: boolean; prospectoId?: string }
  ) => {
    e.preventDefault();

    const form = newContractForm;
    const input = newContractFormToRegistrationInput(form);
    const validation = validateContractRegistration(input);
    const isIncomplete = options?.incomplete === true || !validation.valid;

    if (!isIncomplete && !validation.valid) {
      toast.error(contractRegistrationErrorMessage(validation.missingLabels));
      return;
    }

    setIsCreatingContract(true);

    const consumo = form.consumoAnual === "" ? 0 : Number(form.consumoAnual);
    const precioFijo = parseFloat(String(form.precioFijoConsumo).replace(",", "."));

    try {
      const marcoEntry = form.marcoEntryId
        ? marcoRetributivoCatalog.find((entry) => entry.id === form.marcoEntryId)
        : marcoRetributivoCatalog.find(
            (entry) =>
              entry.compania === form.compania &&
              entry.tarifa === form.tarifa &&
              entry.tipo === form.tipo
          );

      const comercial_obj = profiles.find(p => p.role === 'comercial' || p.role === 'jefe_comercial') || profiles[2];
      const sellerProfile =
        profiles.find((p) => p.id === activeUserId) ||
        profiles.find((p) => p.fullName === form.nombreComercial) ||
        profiles.find(p => p.role === activeRole) ||
        comercial_obj;
      const userAsSeller = sellerProfile;

      const commissionPct = userAsSeller.commissionPercentage;
      let internalMargin = consumo * (form.tipo === 'luz' ? 0.01 : 0.008);
      let externalAdvisorMargin = internalMargin * (commissionPct / 100);

      if (marcoEntry) {
        const estimate = estimateMarcoCommissionEur(
          marcoEntry,
          commissionPct,
          consumo,
          formatCurrency
        );
        internalMargin = estimate.amountEur;
        externalAdvisorMargin = estimate.amountEur;
      }

      const activationDate = form.fechaInicio || new Date().toISOString().split('T')[0];
      const segmentContext = {
        tipoCliente: form.tipoCliente,
        compania: form.compania,
        clientName: form.clientName.trim(),
        nif: form.nif,
      };
      const renewalSchedule = aplicaRenovacionAnual(segmentContext)
        ? computeRenewalSchedule(activationDate)
        : { estadoRenovacion: 'No aplica' as const };
      const fechaRenovacionStr = renewalSchedule.fechaRenovacion;
      const diasRenovacion = renewalSchedule.diasRenovacion;
      const estadoRenovacion = renewalSchedule.estadoRenovacion;

      const direccionCliente = form.direccionFiscal
        ? `${form.direccionFiscal}${form.codigoPostal ? `, ${form.codigoPostal}` : ''}${form.poblacion ? ` ${form.poblacion}` : ''}`
        : form.direccionSuministro;

      const { clients: clientsAfterUpsert, client: linkedClient } = upsertClient(clients, {
        nombre: form.clientName.trim() || 'Pendiente de información',
        comercialId: userAsSeller.id,
        documento: form.nif,
        telefono: form.telefono,
        email: form.email,
        direccion: direccionCliente,
        codigoPostal: form.codigoPostal || undefined,
        ciudad: form.poblacion || undefined,
      });

      const potenciaStr =
        form.potenciaP1 ||
        form.potenciaP2 ||
        form.potenciaP3
          ? [
              form.potenciaP1,
              form.potenciaP2,
              form.potenciaP3,
              form.potenciaP4,
              form.potenciaP5,
              form.potenciaP6,
            ]
              .map((v, i) => (String(v).trim() ? `P${i + 1}: ${v} kW` : ''))
              .filter(Boolean)
              .join(' · ')
          : form.potenciaContratada;

      const tipoPrecio =
        form.tipoPrecio ||
        (form.tarifa &&
        (form.tarifa.toLowerCase().includes('index') ||
          form.tarifa.toLowerCase().includes('variable') ||
          form.tarifa.toLowerCase().includes('pool'))
          ? 'mercado'
          : form.tarifa
            ? 'fijo'
            : '');

      const contractEstado = isIncomplete
        ? CONTRACT_ESTADO_INCOMPLETO
        : CONTRACT_ESTADO_INICIAL;

      const newContractObj: Contract = {
        id: `con-${contracts.length + 1}`,
        clientId: linkedClient.id,
        clientName: form.clientName.trim() || 'Pendiente de información',
        cups: form.cups ? form.cups.toUpperCase().trim() : 'PENDIENTE',
        tipo: form.tipo,
        compania: form.compania,
        tarifa: form.tarifa,
        consumoAnual: consumo,
        montoInterno: Math.round(internalMargin * 100) / 100,
        montoExterno: Math.round(externalAdvisorMargin * 100) / 100,
        estado: contractEstado,
        comercialId: userAsSeller.id,
        comercialName: userAsSeller.fullName,
        createdAt: activationDate,
        fechaFin: fechaRenovacionStr,
        fechaRenovacion: fechaRenovacionStr,
        diasRenovacion,
        estadoRenovacion,
        nif: form.nif,
        telefono: form.telefono,
        email: form.email,
        iban: form.iban,
        direccionSuministro: form.direccionSuministro,
        direccionCompleta: form.direccionFiscal
          ? `${form.direccionFiscal}${form.codigoPostal ? `, ${form.codigoPostal}` : ''}${form.poblacion ? ` ${form.poblacion}` : ''}${form.provincia ? ` (${form.provincia})` : ''}`
          : undefined,
        potenciaContratada: potenciaStr,
        precioFijoConsumo: Number.isFinite(precioFijo) ? precioFijo : undefined,
        tipoPrecio:
          tipoPrecio === "fijo" || tipoPrecio === "mercado" ? tipoPrecio : undefined,
        documentos: form.documentos.length > 0 ? form.documentos : undefined,
        tipoCliente: form.tipoCliente,
        formaPago: form.formaPago,
        direccionFiscal: form.direccionFiscal || undefined,
        codigoPostal: form.codigoPostal || undefined,
        poblacion: form.poblacion || undefined,
        provincia: form.provincia || undefined,
        nombreComercial: form.nombreComercial || userAsSeller.fullName,
        jefeEquipo: form.jefeEquipo || undefined,
        comentariosInternos:
          form.comentariosInternos.length > 0 ? form.comentariosInternos : undefined,
        marcoEntryId: form.marcoEntryId || marcoEntry?.id || undefined,
        atr: marcoEntry?.peaje,
      };

      const supabaseResult = await saveTeamContractToSupabase(newContractObj, form);

      if (supabaseResult.ok) {
        newContractObj.id = supabaseResult.id;

        if (options?.prospectoId) {
          const linkResult = await updateProspecto(options.prospectoId, {
            contratoEquipoId: supabaseResult.id,
          });
          if (linkResult.ok === false) {
            toast.warning('Contrato guardado pero no se pudo vincular al prospecto.');
          } else {
            const actResult = await createContratoCreadoActividad({
              prospectoId: options.prospectoId,
              comercialId: activeUserId,
              comercialName: activeUser.fullName,
              contratoEquipoId: supabaseResult.id,
              clientName: form.clientName.trim() || undefined,
            });
            if (actResult.ok === false) {
              toast.warning('Contrato vinculado pero no se registró la actividad en timeline.');
            }
          }
        }
      } else if (supabaseResult.reason === 'not_configured') {
        toast.message('Borrador guardado en la app. Supabase pendiente de configurar.');
      } else if (supabaseResult.reason === 'table_missing') {
        toast.warning(
          'Contrato guardado en la app. Crea la tabla contratos_equipo en Supabase para persistir en base de datos.'
        );
      } else {
        toast.warning(`Contrato guardado en la app. Supabase: ${supabaseResult.message}`);
      }

      const contractsWithNew = [newContractObj, ...contracts];
      setClients(syncClientEstados(clientsAfterUpsert, contractsWithNew));

      if (!isIncomplete && internalMargin > 0) {
        const newSettlementObj: Settlement = {
          id: `liq-${settlements.length + 1}`,
          comercialId: userAsSeller.id,
          comercialName: userAsSeller.fullName,
          montoInterno: Math.round(internalMargin * 100) / 100,
          montoExterno: Math.round(externalAdvisorMargin * 100) / 100,
          estado: 'pendiente',
          tipo: form.tipo,
          descripcion: `Comisión generada para contrato nuevo: ${form.clientName || 'Sin nombre'}`,
          createdAt: new Date().toISOString().split('T')[0],
          contractId: newContractObj.id,
        };
        setSettlements([newSettlementObj, ...settlements]);
      }

      setContracts(contractsWithNew);

      resetNewContractForm();
      onSuccess?.();

      toast.success(
        isIncomplete
          ? 'Contrato guardado como pendiente de información.'
          : `¡Contrato registrado! Liquidación de ${formatCurrency(newContractObj.montoExterno)} para ${userAsSeller.fullName}.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el contrato';
      toast.error(msg);
    } finally {
      setIsCreatingContract(false);
    }
  };

  const handleAddNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName) return;
    setIsCreatingUser(true);

    const randomID = `usr-${profiles.length + 1}`;
    const email = `${newUserName.toLowerCase().replace(/\s+/g, '')}@ener-erp.com`;
    const managerId = newUserRole === 'comercial' ? newUserManager : null;

    const insertResult = await insertErpComercial({
      id: randomID,
      full_name: newUserName,
      role: newUserRole,
      manager_id: managerId,
      email,
    });

    if (!insertResult.ok) {
      setIsCreatingUser(false);
      toast.error(insertResult.message);
      return;
    }

    const newProfile: Profile = {
      id: randomID,
      fullName: newUserName,
      role: newUserRole,
      managerId,
      commissionPercentage: defaultCommissionForRole(newUserRole),
      permissions: defaultPermissionsForRole(newUserRole),
      email,
      status: 'activo',
    };

    setProfiles([...profiles, newProfile]);
    setNewUserName('');
    setIsCreatingUser(false);
    setIsCreateOpen(false);
    toast.success(`Asesor ${newUserName} registrado en Supabase.`);
  };

  async function handleSaveUserRoleToSupabase(
    userId: string,
    role: UserRole,
    managerId: string | null
  ) {
    setIsSavingUserSheet(true);
    const result = await updateErpComercial(userId, {
      role,
      manager_id: managerId,
    });
    setIsSavingUserSheet(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    const permissions = defaultPermissionsForRole(role);
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === userId
          ? {
              ...p,
              role,
              managerId,
              permissions,
              commissionPercentage: defaultCommissionForRole(role),
            }
          : p
      )
    );
    setActiveUserForSheet((prev) =>
      prev && prev.id === userId
        ? {
            ...prev,
            role,
            managerId,
            permissions,
            commissionPercentage: defaultCommissionForRole(role),
          }
        : prev
    );
    toast.success('Rol actualizado en Supabase');
  }

  async function handleDeleteUserFromSupabase(userId: string) {
    const user = profiles.find((p) => p.id === userId);
    if (!user) return;
    if (!confirm(`¿Eliminar ${user.fullName} de erp_comerciales?`)) return;

    const result = await deleteErpComercial(userId);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setProfiles((prev) => prev.filter((p) => p.id !== userId));
    setActiveUserForSheet(null);
    toast.success('Usuario eliminado de Supabase');
  }

  // Toggle Settlement payout state (simulating admin action)
  const toggleSettlementState = (id: string) => {
    let nextState = '';
    const item = settlements.find(s => s.id === id);
    setSettlements(settlements.map(s => {
      if (s.id === id) {
        nextState = s.estado === 'pendiente' ? 'pagado' : 'pendiente';
        return { ...s, estado: nextState as any };
      }
      return s;
    }));
    toast.success(`Liquidación ${id} para ${item?.comercialName} cambiada a ${nextState === 'pagado' ? '💰 PAGADA' : '⏳ PENDIENTE'}.`);
  };

  // Marks a contract as 'activo' and calculates & splits commissions using exact splits
  const handleActivateAndDistribute = (contractId: string, consumoKwh: number, potenciaKw: number) => {
    // 1. Find contract
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;

    setIsActivatingContractLoading(true);

    setTimeout(() => {
      // 2. Determine rates and calculate total commission
      const kwhRate = contract.tipo === 'luz' ? 0.015 : 0.012;
      const kwRate = contract.tipo === 'luz' ? 5.50 : 4.00;
      const totalCom = (consumoKwh * kwhRate) + (potenciaKw * kwRate);

      // 3. Find comercial user and manager to allocate splits
      const comercialProfile = profiles.find(p => p.id === contract.comercialId);
      const managerId = comercialProfile ? comercialProfile.managerId : null;
      const managerProfile = managerId ? profiles.find(p => p.id === managerId) : null;

      // Split shares
      const comercialShare = Math.round(totalCom * 0.50 * 100) / 100;
      let jefeShare = Math.round(totalCom * 0.20 * 100) / 100;
      let superadminShare = Math.round(totalCom * 0.30 * 100) / 100;

      // Rollup if no Jefe Comercial is assigned
      if (!managerId) {
        superadminShare += jefeShare;
        jefeShare = 0;
      }

      const today = new Date().toISOString().split('T')[0];
      const newRecords: Settlement[] = [];

      // Row A: Comercial direct commission (50%)
      const recComercial: Settlement = {
        id: `liq-auto-c-${Math.floor(1000 + Math.random() * 9000).toString()}`,
        comercialId: contract.comercialId,
        comercialName: contract.comercialName,
        montoInterno: Math.round(totalCom * 100) / 100,
        montoExterno: comercialShare,
        estado: 'pendiente',
        tipo: contract.tipo,
        descripcion: `Comisión Directa (50%) - Contrato Activo: ${contract.clientName} (CUPS: ${contract.cups})`,
        createdAt: today,
      };
      newRecords.push(recComercial);

      // Row B: Jefe de Red override commission (20%)
      if (managerId && managerProfile && jefeShare > 0) {
        const recJefe: Settlement = {
          id: `liq-auto-j-${Math.floor(1000 + Math.random() * 9000).toString()}`,
          comercialId: managerId,
          comercialName: managerProfile.fullName,
          montoInterno: Math.round(totalCom * 100) / 100,
          montoExterno: jefeShare,
          estado: 'pendiente',
          tipo: contract.tipo,
          descripcion: `Comisión de Dirección Override (20% de ${contract.comercialName}) - Contrato Activo: ${contract.clientName}`,
          createdAt: today,
        };
        newRecords.push(recJefe);
      }

      // 4. Update state variables of contracts
      setContracts(contracts.map(c => {
        if (c.id === contractId) {
          const activationDate = today;
          const renewalSchedule = aplicaRenovacionAnual(c)
            ? computeRenewalSchedule(activationDate)
            : { estadoRenovacion: 'No aplica' as const };
          return {
            ...c,
            estado: 'Activado',
            createdAt: activationDate,
            consumoAnual: consumoKwh,
            montoInterno: Math.round(totalCom * 100) / 100,
            montoExterno: comercialShare + jefeShare,
            fechaFin: renewalSchedule.fechaRenovacion,
            fechaRenovacion: renewalSchedule.fechaRenovacion,
            diasRenovacion: renewalSchedule.diasRenovacion,
            estadoRenovacion: renewalSchedule.estadoRenovacion,
          };
        }
        return c;
      }));

      // Add new settlements
      setSettlements([...newRecords, ...settlements]);
      setIsActivatingContractLoading(false);
      setIsActivateOpen(false);
      setSelectedContractForActivation(null);
      toast.success(`¡Contrato activado de forma oficial! Comisión neta repartida: Asesor (50%: ${formatCurrency(comercialShare)}) y Jefe (20%: ${formatCurrency(jefeShare)}).`);
    }, 600);
  };

  // Process termination and compute proportional retrocommission clawback
  const handleCancelContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractForBaja) return;

    const c = selectedContractForBaja;
    const actDate = new Date(c.createdAt);
    const cancelDate = new Date(bajaDate);
    const diffTime = cancelDate.getTime() - actDate.getTime();

    if (diffTime < 0) {
      toast.error("La fecha de baja no puede ser anterior a la fecha de activación.");
      return;
    }

    setIsBajaLoading(true);
    setTimeout(() => {
      setIsBajaLoading(false);

      const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.4);
      
      let limitMonths = 6;
      const brand = c.compania.toLowerCase();
      if (brand.includes('naturgy') || brand.includes('repsol')) {
        limitMonths = 4;
      } else if (brand.includes('endesa')) {
        limitMonths = 2;
      } else if (brand.includes('gana') || brand.includes('iberdrola') || brand.includes('niba')) {
        limitMonths = 12;
      }

      let clawbackPercent = 0;
      let clawbackAmount = 0;

      if (diffMonths < limitMonths) {
        clawbackPercent = 1 - (diffMonths / limitMonths);
        clawbackAmount = c.montoExterno * clawbackPercent;
      }

      const clawbackAmountRounded = Math.round(clawbackAmount * 100) / 100;
      const internalClawbackRounded = Math.round(c.montoInterno * clawbackPercent * 100) / 100;

      // Update contracts list
      setContracts(contracts.map(item => {
        if (item.id === c.id) {
          return {
            ...item,
            estado: 'Dado de Baja',
            fechaBaja: bajaDate,
            retrocomisionClawback: clawbackAmountRounded
          };
        }
        return item;
      }));

      // Create a negative settlement record
      const negativeSettlement: Settlement = {
        id: `liq-baja-${Date.now()}`,
        comercialId: c.comercialId,
        comercialName: c.comercialName,
        montoInterno: -internalClawbackRounded,
        montoExterno: -clawbackAmountRounded,
        estado: 'pendiente',
        tipo: c.tipo,
        descripcion: `Retrocomisión Proporcional - Baja de ${c.clientName} (${c.compania}) tras ${(diffMonths).toFixed(1)}/${limitMonths} meses (${(clawbackPercent * 100).toFixed(0)}% de penalización)`,
        createdAt: bajaDate,
        contractId: c.id,
      };
      setSettlements([negativeSettlement, ...settlements]);

      // If there is clawback, inject a negative entry into pendingContracts as a checklist item
      if (clawbackAmountRounded > 0) {
        const negativePendingContract = {
          id: `pcon-neg-${Date.now()}`,
          code: `CLAW-${c.id.toUpperCase()}`,
          cups: c.cups,
          dateFirm: c.createdAt,
          dateAct: bajaDate,
          direction: `Penalización de baja de contrato antes de ${limitMonths} meses`,
          agentId: c.comercialId,
          agentName: c.comercialName,
          brand: c.compania,
          tariff: `${(clawbackPercent * 100).toFixed(0)}% Penalización`,
          price: -clawbackAmountRounded,
          checked: true,
          clientName: `Retrocomisión: ${c.clientName}`,
          tipo: c.tipo
        };
        setPendingContracts([negativePendingContract, ...pendingContracts]);
      }

      setIsBajaOpen(false);
      setSelectedContractForBaja(null);
      toast.success(`Contrato dado de baja con éxito. Se calculó una retrocomisión de -${formatCurrency(clawbackAmountRounded)} (${(clawbackPercent * 100).toFixed(0)}% penalización) y se registró como saldo negativo.`);
    }, 750);
  };

  // Toggle profile permissions dynamically
  const togglePermission = (userId: string, permKey: keyof Profile['permissions']) => {
    const user = profiles.find(p => p.id === userId);
    const prevValue = user?.permissions[permKey];
    setProfiles(profiles.map(p => {
      if (p.id === userId) {
        return {
          ...p,
          permissions: {
            ...p.permissions,
            [permKey]: !p.permissions[permKey]
          }
        };
      }
      return p;
    }));
    toast.success(`Permiso '${permKey}' de ${user?.fullName} se ha cambiado a ${!prevValue ? 'ACTIVADO' : 'DESACTIVADO'}.`);
  };

  // Auto execute comparison on screen tab changes
  useEffect(() => {
    if (
      (currentMenuTab === 'Comparador' || currentMenuTab === 'Comparador de Facturas') &&
      !compResults &&
      !compLoading
    ) {
      handleCompareRates();
    }
    if (currentMenuTab === 'Liquidaciones' || currentMenuTab === 'Liquidaciones internas') {
      setLiqLoading(true);
      const timer = setTimeout(() => {
        setLiqLoading(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [currentMenuTab]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Calculate high level summaries
  const totalInternal = settlements.reduce((sum, s) => sum + s.montoInterno, 0);
  const totalExternal = settlements.reduce((sum, s) => sum + s.montoExterno, 0);
  const pendingExternal = settlements.filter(s => s.estado === 'pendiente').reduce((sum, s) => sum + s.montoExterno, 0);
  const paidExternal = settlements.filter(s => s.estado === 'pagado').reduce((sum, s) => sum + s.montoExterno, 0);

  // Filter items matching the active users reporting hierarchy
  const prospectoImportSources = useMemo(
    () => buildProspectoImportSources(contracts, clients),
    [contracts, clients]
  );

  const activeUser = profiles.find(p => p.id === activeUserId) || profiles[0];
  const activeRole = activeUser.role;
  const isErpOpsAdmin = activeRole === 'superadmin' || activeRole === 'tramitacion';

  useEffect(() => {
    if (currentMenuTab !== 'Usuarios' || !isErpOpsAdmin) return;

    let cancelled = false;
    async function loadErpUsers() {
      setIsSyncingErpUsers(true);
      const result = await listErpComerciales();
      if (!cancelled && result.ok) {
        setProfiles((prev) => mergeErpRowsIntoProfiles(result.data, prev));
      } else if (!cancelled && result.ok === false) {
        toast.error(`No se pudo cargar usuarios: ${result.message}`);
      }
      if (!cancelled) setIsSyncingErpUsers(false);
    }

    loadErpUsers();
    return () => {
      cancelled = true;
    };
  }, [currentMenuTab, activeRole]);

  function navigateToContract(contract: Contract) {
    if (activeRole === 'superadmin' && superadminViewMode === 'comercial' && activeModule === 'erp') {
      setSuperadminViewMode('tramitacion');
    }
    setHighlightContractId(contract.id);
    setContractsSearchQuery(contract.cups);
    setContractsListFilter('all');
    setCurrentMenuTab(activeModule === 'ventas' ? 'Mis Contratos' : 'Contratos');
    toast.info(`Contrato ${contract.cups} — pantalla Contratos`);
  }

  function navigateToRenovacionProxima() {
    if (activeRole === 'superadmin' && superadminViewMode === 'comercial' && activeModule === 'erp') {
      setSuperadminViewMode('tramitacion');
    }
    setHighlightContractId(null);
    setContractsSearchQuery('');
    setContractsListFilter('renovacion_proxima');
    setActiveModule('erp');
    setCurrentMenuTab('Contratos');
    toast.info('Contratos con renovación próxima');
  }

  function navigateToContratosEstadoKpi(filter: ContractEstadoKpiFilter) {
    setHighlightContractId(null);
    setContractsSearchQuery('');
    setContractsListFilter(filter);
    setActiveModule('erp');
    setCurrentMenuTab('Contratos');
    toast.info('Contratos filtrados por estado');
  }

  function openContractWizardBlank() {
    resetNewContractForm();
    setContractWizardProspectoId(null);
    setContractWizardOpen(true);
  }

  function openContractWizardForProspecto(prospecto: Prospecto) {
    const user = profiles.find((p) => p.id === activeUserId) || profiles[0];
    const jefe = profiles.find((p) => p.id === user.managerId);
    patchNewContractForm({
      ...EMPTY_NEW_CONTRACT_FORM,
      fechaInicio: new Date().toISOString().split('T')[0],
      ...buildNewContractFormFromProspecto(prospecto, {
        nombreComercial: user.fullName,
        jefeEquipo: jefe?.fullName ?? '',
      }),
    });
    setContractWizardProspectoId(prospecto.id);
    closeVentasFicha();
    setContractWizardOpen(true);
  }

  function navigateToContratoFromFicha(contratoEquipoId: string) {
    setHighlightContractId(contratoEquipoId);
    closeVentasFicha();
    if (activeRole === 'comercial') {
      setActiveModule('ventas');
      setCurrentMenuTab('Mis Contratos');
    } else {
      setActiveModule('erp');
      setCurrentMenuTab('Contratos');
    }
    toast.info('Contrato resaltado en la lista');
  }

  function getContractEstadoForProspecto(contratoEquipoId: string): string | undefined {
    return contracts.find((c) => c.id === contratoEquipoId)?.estado;
  }

  const myTeamMembers = profiles.filter(p => p.managerId === activeUser.id);
  const teamMemberIds = myTeamMembers.map(m => m.id);

  const teamContracts = contracts.filter(c => teamMemberIds.includes(c.comercialId) || c.comercialId === activeUser.id);
  const teamSettlements = settlements.filter(s => teamMemberIds.includes(s.comercialId) || s.comercialId === activeUser.id);
  
  const myContracts = contracts.filter(c => c.comercialId === activeUser.id);
  const mySettlements = settlements.filter(s => s.comercialId === activeUser.id);

  const roleFilteredIncidencias = (() => {
    if (activeRole === 'superadmin' || activeRole === 'tramitacion') return incidencias;
    if (activeRole === 'jefe_comercial') {
      const teamIds = new Set([activeUserId, ...teamMemberIds]);
      return incidencias.filter(i => teamIds.has(i.comercialId));
    }
    return incidencias.filter(i => i.comercialId === activeUserId);
  })();

  const visibleIncidencias = roleFilteredIncidencias.filter((inc) => isIncidenciaKanbanVisible(inc));

  const canCreateIncidencia = activeRole === 'comercial' || activeRole === 'jefe_comercial';
  const canEditIncidencia = activeRole === 'comercial';
  const canDragIncidencias = isErpOpsAdmin;

  const handleCreateIncidencia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncClientName.trim() || !newIncDescripcion.trim()) return;

    const newTicket: Ticket = {
      id: `inc-${Date.now()}`,
      clientName: newIncClientName.trim(),
      tipo: newIncTipo,
      prioridad: newIncPrioridad,
      estado: 'pendiente',
      comercialId: activeUserId,
      comercialName: activeUser.fullName,
      descripcion: newIncDescripcion.trim(),
      createdAt: new Date().toISOString().split('T')[0],
    };

    setIncidencias(prev => [newTicket, ...prev]);
    setNewIncClientName('');
    setNewIncDescripcion('');
    setNewIncTipo('Incidencia Cartera');
    setNewIncPrioridad('media');
    toast.success('Incidencia registrada correctamente.');
  };

  const handleUpdateIncidencia = (updated: IncidenciaTicket) => {
    if (activeRole !== 'comercial' || updated.comercialId !== activeUserId) return;
    const existing = incidencias.find(i => i.id === updated.id);
    if (!existing) return;
    const final = withIncidenciaEstado({ ...updated, estadoAt: existing.estadoAt }, updated.estado);
    setIncidencias(prev => prev.map(i => (i.id === final.id ? final : i)));
    toast.success('Incidencia actualizada.');
  };

  const handleMoveIncidencia = (id: string, newEstado: IncidenciaTicket['estado']) => {
    if (!isErpOpsAdmin) return;
    setIncidencias(prev =>
      prev.map(i => (i.id === id ? withIncidenciaEstado(i, newEstado) : i))
    );
  };

  // New clean, unified Menu items lists based on allowed roles in the exact ordered sequence
  const sidebarItemsConfig = [
    { name: 'Dashboard', allowedRoles: ['superadmin', 'jefe_comercial', 'comercial', 'tramitacion'], icon: LayoutDashboard },
    { name: 'Liquidaciones internas', allowedRoles: ['superadmin', 'jefe_comercial', 'comercial'], icon: WalletCards },
    { name: 'Liquidaciones', allowedRoles: ['superadmin', 'tramitacion'], icon: WalletCards },
    { name: 'Usuarios', allowedRoles: ['superadmin', 'tramitacion'], icon: Users },
    { name: 'Cashflow', allowedRoles: ['superadmin', 'tramitacion'], icon: DollarSign },
    { name: 'Mi Equipo', allowedRoles: ['jefe_comercial'], icon: Users },
    { name: 'Mis Clientes', allowedRoles: ['comercial'], icon: UserSquare2 },
    { name: 'Contratos', allowedRoles: ['superadmin', 'jefe_comercial', 'comercial', 'tramitacion'], icon: FileSpreadsheet },
    { name: 'Comparador', allowedRoles: ['superadmin', 'jefe_comercial', 'comercial', 'tramitacion'], icon: Calculator },
    { name: 'Historial de Comparativas', allowedRoles: ['superadmin', 'jefe_comercial', 'comercial', 'tramitacion'], icon: FileClock },
    { name: 'Tarifas', allowedRoles: ['superadmin', 'jefe_comercial', 'comercial', 'tramitacion'], icon: TrendingUp },
    { name: 'Marco Retributivo', allowedRoles: ['superadmin', 'jefe_comercial', 'comercial'], icon: Coins },
    { name: 'Incidencias', allowedRoles: ['superadmin', 'jefe_comercial', 'comercial', 'tramitacion'], icon: AlertTriangle },
  ];

  const ventasSidebarItemsConfig = [
    { name: 'Mi Día', icon: CalendarDays, allowedRoles: ['comercial', 'jefe_comercial', 'superadmin'] },
    { name: 'Pipeline', icon: LayoutGrid, allowedRoles: ['comercial', 'jefe_comercial', 'superadmin'] },
    { name: 'Base EnerSave', icon: Database, allowedRoles: ['superadmin', 'tramitacion'] },
    { name: 'Avisos SLA', icon: ShieldAlert, allowedRoles: ['comercial', 'jefe_comercial', 'superadmin'] },
    { name: 'Reporting', icon: BarChart3, allowedRoles: ['jefe_comercial', 'superadmin'] },
  ];

  const canViewMarcoRetributivo =
    activeRole !== 'superadmin' && activeRole !== 'tramitacion'
      ? true
      : activeRole === 'superadmin' && superadminViewMode === 'comercial';

  const canViewConsolidatedLiquidaciones =
    activeRole === 'tramitacion' ||
    (activeRole === 'superadmin' && superadminViewMode === 'tramitacion');

  const canViewInternalLiquidaciones =
    activeRole === 'comercial' ||
    activeRole === 'jefe_comercial' ||
    activeRole === 'superadmin';

  const currentMenuOptions =
    activeModule === 'ventas'
      ? ventasSidebarItemsConfig.filter((item) => item.allowedRoles.includes(activeRole))
      : sidebarItemsConfig.filter((item) => {
          if (item.name === 'Marco Retributivo' && !canViewMarcoRetributivo) {
            return false;
          }
          if (item.name === 'Liquidaciones' && !canViewConsolidatedLiquidaciones) {
            return false;
          }
          if (item.name === 'Liquidaciones internas' && !canViewInternalLiquidaciones) {
            return false;
          }
          if (activeRole === 'superadmin') {
            if (superadminViewMode === 'comercial') {
              const comercialTabs = [
                'Dashboard',
                'Liquidaciones internas',
                'Mis Clientes',
                'Comparador',
                'Historial de Comparativas',
                'Tarifas',
                'Marco Retributivo',
                'Incidencias',
              ];
              return comercialTabs.includes(item.name);
            }
            return item.allowedRoles.includes('superadmin');
          }
          if (activeRole === 'tramitacion') {
            const tramitacionTabs = [
              'Dashboard',
              'Liquidaciones',
              'Usuarios',
              'Cashflow',
              'Contratos',
              'Comparador',
              'Historial de Comparativas',
              'Tarifas',
              'Incidencias',
            ];
            return tramitacionTabs.includes(item.name);
          }
          return item.allowedRoles.includes(activeRole);
        });

  // RAW CODES FOR THE TABS
  const sqlCode = "";

  const loginCode = "";

  const layoutCode = "";

  const comparadorCode = "";

  const serverActionCode = "";

  const renderEditableCell = (c: Contract, field: keyof Contract, placeholder: string = 'N/A') => {
    const isEditing = editingCell?.contractId === c.id && editingCell?.field === field;
    const value = c[field] !== undefined ? String(c[field]) : '';

    const handleSingleClick = (e: React.MouseEvent) => {
      if (isEditing) return;
      navigator.clipboard.writeText(value);
      toast.success(`Copiado: "${value}"`);
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
      setEditingCell({ contractId: c.id, field });
      setEditValue(value);
    };

    const handleSave = () => {
      if (!editingCell) return;
      const updatedValue = editValue.trim();
      setContracts(prev => prev.map(item => {
        if (item.id === c.id) {
          let typedValue: any = updatedValue;
          if (field === 'consumoAnual' || field === 'consumoAnualManual' || field === 'precioFijoConsumo' || field === 'diasRenovacion' || field === 'montoInterno' || field === 'montoExterno') {
            typedValue = Number(updatedValue) || 0;
          }
          return {
            ...item,
            [field]: typedValue
          };
        }
        return item;
      }));
      setEditingCell(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        setEditingCell(null);
      }
    };

    if (isEditing) {
      return (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          autoFocus
          className="p-1 text-xs bg-brand-panel border border-cyan-500 rounded text-brand-text font-mono w-full outline-none"
        />
      );
    }

    return (
      <span
        onClick={handleSingleClick}
        onDoubleClick={handleDoubleClick}
        className="cursor-pointer hover:underline decoration-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400 select-all"
        title="1 clic para copiar | doble clic para editar"
      >
        {value || placeholder}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans selection:bg-cyan-500/30 selection:text-white flex flex-col relative transition-colors duration-300">
      
      {/* SIMULATE SPLIT LOGIN SCREEN IF LOGGED OUT */}
      {!isLoggedIn ? (
        <div className="flex-1 min-h-screen flex items-center justify-center p-4 bg-brand-bg relative overflow-hidden transition-colors duration-300">
          {/* Subtle background decoration with yellow and blue mesh glows */}
          <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative w-full max-w-md bg-brand-panel border border-slate-200 dark:border-white/5 rounded-3xl p-8 sm:p-10 shadow-xl dark:shadow-none space-y-8 z-10">
            {/* Logo and Titles */}
            <div className="text-center space-y-4">
              <EnersaveLogo className="h-20 w-20 mx-auto" />
              <div className="space-y-1">
                <h1 className="text-2xl font-black tracking-tight text-brand-text font-sans">
                  ERP ENERSAVE
                </h1>
                <p className="text-xs text-brand-subtext font-medium uppercase font-mono tracking-widest">
                  PLATFORM CORE
                </p>
              </div>
            </div>

            {loginError && (
              <div className="p-3.5 rounded-xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-700 dark:text-rose-300 leading-normal font-medium">
                  {loginError}
                </p>
              </div>
            )}

            <form onSubmit={triggerLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 font-mono uppercase tracking-wider">
                  Email
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-xl focus:border-blue-500 dark:focus:border-cyan-400 focus:ring-2 focus:ring-blue-500/10 focus:outline-none text-[#0f172a] dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 transition-all text-sm font-medium"
                    placeholder="ejemplo@enersave.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 font-mono uppercase tracking-wider">
                    Contraseña
                  </label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-brand-surface border border-slate-200 dark:border-slate-800 rounded-xl focus:border-blue-500 dark:focus:border-cyan-400 focus:ring-2 focus:ring-blue-500/10 focus:outline-none text-[#0f172a] dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 transition-all text-sm font-medium"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="relative w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 dark:shadow-none focus:outline-none transition-all flex items-center justify-center space-x-2 border border-blue-500 group cursor-pointer overflow-hidden mt-6"
              >
                {loginLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="text-sm">Entrar al ERP</span>
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {/* Subtly integrated Quick Access Buttons to avoid clutter */}
            <div className="border-t border-slate-100 dark:border-white/5 pt-5 space-y-2.5">
              <span className="block text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">
                Demo Acceso Rápido
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={loginLoading}
                  onClick={() => quickLoginAs('usr-1')}
                  className="px-2 py-1.5 bg-brand-surface hover:bg-blue-50 dark:hover:bg-blue-950/20 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-cyan-500/30 text-[10px] font-semibold text-blue-600 dark:text-cyan-400 rounded-lg cursor-pointer transition-all text-center animate-none"
                >
                  Superadmin
                </button>
                <button
                  type="button"
                  disabled={loginLoading}
                  onClick={() => quickLoginAs('usr-2')}
                  className="px-2 py-1.5 bg-brand-surface hover:bg-amber-50 dark:hover:bg-amber-950/20 border border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-500/30 text-[10px] font-semibold text-amber-600 dark:text-amber-400 rounded-lg cursor-pointer transition-all text-center animate-none"
                >
                  Jefe Comer.
                </button>
                <button
                  type="button"
                  disabled={loginLoading}
                  onClick={() => quickLoginAs('usr-3')}
                  className="px-2 py-1.5 bg-brand-surface hover:bg-indigo-50 dark:hover:bg-indigo-950/20 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/30 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 rounded-lg cursor-pointer transition-all text-center"
                >
                  Comercial
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
            
            /* DYNAMIC SIDEBAR + DASHBOARD CONTAINER (Fixed sidebar height, scrollable central viewport) */
            <div className="flex-1 flex h-screen overflow-hidden relative">
              
              {/* COLLAPSIBLE GLASS SIDEBAR */}
              <motion.aside
                animate={{ width: sidebarCollapsed ? '76px' : '280px' }}
                transition={{ duration: 0.3 }}
                className="bg-brand-panel border-r border-brand-border backdrop-blur-xl shrink-0 h-full flex flex-col justify-between overflow-y-auto relative z-20 transition-colors duration-300"
              >
                <div>
                  
                  {/* Sidebar Header with Toggle Buttons */}
                  <div className="p-4 flex items-center justify-between border-b border-brand-border h-[73px]">
                    <div className="flex items-center space-x-2 overflow-hidden">
                      <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="focus:outline-none hover:opacity-80 transition-opacity flex items-center shrink-0 cursor-pointer"
                        title="Alternar panel lateral de Enersave"
                      >
                        <EnersaveLogo className="h-9 w-9 shrink-0 animate-none" />
                      </button>
                      
                      {!sidebarCollapsed && (
                        <div className="font-extrabold tracking-tight shrink-0 leading-tight">
                          <span className="text-[12px] text-[#1e3a8a] dark:text-[#60a5fa] block font-black leading-none uppercase">
                            ENERSAVE
                          </span>
                          <span className="block text-[8px] font-mono text-slate-400 tracking-wider leading-none mt-1">PLATFORM CORE</span>
                        </div>
                      )}
                    </div>

                    {sidebarCollapsed ? (
                      <button
                        onClick={() => setSidebarCollapsed(false)}
                        className="p-1 rounded bg-brand-surface hover:bg-brand-elevated border border-brand-border text-brand-subtext hover:text-brand-text cursor-pointer transition-colors"
                        title="Expandir"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setSidebarCollapsed(true)}
                        className="p-1 rounded bg-brand-surface hover:bg-brand-elevated border border-brand-border text-brand-subtext hover:text-brand-text cursor-pointer transition-colors"
                        title="Contraer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Profile Summary Card with dynamic role details */}
                  <div className="p-4 border-b border-brand-border bg-brand-bg/10">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-brand-surface border border-brand-border flex items-center justify-center font-bold text-cyan-600 dark:text-cyan-400 shrink-0 text-xs text-center font-mono shadow-sm">
                        {activeUser.fullName.split(' ').map(n => n[0]).join('')}
                      </div>
                      {!sidebarCollapsed && (
                        <div className="overflow-hidden">
                          <h4 className="text-xs font-bold truncate text-brand-text">{activeUser.fullName}</h4>
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-mono font-bold mt-0.5 uppercase tracking-wide ${
                            activeRole === 'superadmin' ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20' :
                            activeRole === 'jefe_comercial' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20' :
                            activeRole === 'tramitacion' ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/20' :
                            'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                          }`}>
                            {activeRole === 'superadmin' ? 'Superadmin' :
                             activeRole === 'jefe_comercial' ? 'Jefe Comercial' :
                             activeRole === 'tramitacion' ? 'Tramitación' :
                             'Comercial'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Module selector: ERP ↔ Ventas (all roles) */}
                  <div className="p-3 border-b border-brand-border">
                    <div
                      className={`grid grid-cols-2 gap-1 p-1 bg-brand-panel border border-brand-border rounded-xl ${
                        sidebarCollapsed ? 'grid-cols-1 gap-0.5' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => switchAppModule('erp')}
                        title="Módulo ERP"
                        className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[10px] font-mono font-bold transition-colors duration-200 cursor-pointer ${
                          activeModule === 'erp'
                            ? 'bg-cyan-600 text-white shadow-sm'
                            : 'text-brand-subtext hover:text-brand-text hover:bg-slate-200/55 dark:hover:bg-white/5'
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5 shrink-0" aria-hidden />
                        {!sidebarCollapsed && <span>ERP</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => switchAppModule('ventas')}
                        title="Módulo Ventas"
                        className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[10px] font-mono font-bold transition-colors duration-200 cursor-pointer ${
                          activeModule === 'ventas'
                            ? 'bg-cyan-600 text-white shadow-sm'
                            : 'text-brand-subtext hover:text-brand-text hover:bg-slate-200/55 dark:hover:bg-white/5'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5 shrink-0" aria-hidden />
                        {!sidebarCollapsed && <span>Ventas</span>}
                      </button>
                    </div>
                  </div>

                  {/* Superadmin ERP view switcher (tramitación vs comercial agent) */}
                  {activeRole === 'superadmin' && activeModule === 'erp' && (
                    <div className="p-3 border-b border-brand-border bg-slate-500/5 space-y-2">
                      {!sidebarCollapsed && (
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest font-extrabold">Vista de Panel</span>
                          <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                            superadminViewMode === 'tramitacion' ? 'bg-amber-500/10 text-amber-500 font-bold' : 'bg-emerald-500/10 text-emerald-400 font-bold'
                          }`}>
                            {superadminViewMode === 'tramitacion' ? 'Tramitación' : 'Comercial'}
                          </span>
                        </div>
                      )}
                      <button
                        onClick={handleToggleSuperadminMode}
                        className="w-full flex items-center justify-between px-3 py-2 bg-slate-150 hover:bg-slate-200 dark:bg-brand-surface hover:bg-brand-elevated text-brand-text border border-brand-border rounded-xl cursor-pointer text-xs font-bold transition-all shadow-sm"
                        title={superadminViewMode === 'tramitacion' ? 'Cambiar a Mis Clientes (Comercial)' : 'Cambiar a Tramitación (Operativo)'}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-500" />
                          {!sidebarCollapsed && (
                            <span className="truncate text-[11px] font-bold">
                              {superadminViewMode === 'tramitacion' ? 'Ver mis clientes' : 'Ver tramitación'}
                            </span>
                          )}
                        </div>
                        {!sidebarCollapsed && (
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Side menu paths dynamically rendered according to role schema */}
                  <div className="p-3 space-y-1">
                    {currentMenuOptions.map((opt, id) => {
                      const Icon = opt.icon;
                      const isSelected = currentMenuTab === opt.name;
                      return (
                        <button
                          key={id}
                          onClick={() => setCurrentMenuTab(opt.name)}
                          className={`w-full flex items-center shrink-0 space-x-3 px-3 py-2.5 rounded-xl cursor-pointer text-left transition-all ${
                            isSelected 
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10 dark:bg-cyan-500/12 dark:text-cyan-200 dark:border dark:border-cyan-500/25 dark:shadow-none' 
                              : 'text-brand-subtext hover:text-brand-text hover:bg-slate-200/55 dark:hover:bg-brand-elevated/40'
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white dark:text-cyan-300' : 'text-brand-subtext'}`} />
                          {!sidebarCollapsed && (
                            <span className="text-xs font-semibold truncate tracking-tight">
                              {opt.name}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                </div>

                {/* Sidebar footer control */}
                <div className="p-4 border-t border-brand-border space-y-3">
                  
                  {/* Theme Toggle Button */}
                  {mounted && (
                    <button
                      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl border border-brand-border bg-brand-bg hover:bg-slate-200/40 dark:hover:bg-white/5 transition-all duration-300 cursor-pointer text-brand-subtext hover:text-brand-text group shadow-sm dark:shadow-none"
                    >
                      <div className="flex items-center space-x-2.5">
                        <motion.div
                          animate={{ rotate: resolvedTheme === 'dark' ? 180 : 0 }}
                          transition={{ type: "spring", stiffness: 220, damping: 14 }}
                          className="text-amber-500 dark:text-sky-400 shrink-0"
                        >
                          {resolvedTheme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                        </motion.div>
                        {!sidebarCollapsed && (
                          <span className="text-xs font-bold font-sans">
                            {resolvedTheme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}
                          </span>
                        )}
                      </div>
                      {!sidebarCollapsed && (
                        <span className="text-[9px] font-mono tracking-wider text-slate-400 dark:text-slate-500 font-extrabold uppercase bg-brand-panel border border-brand-border px-1.5 py-0.5 rounded-md">
                          {resolvedTheme === 'dark' ? 'Oscuro' : 'Claro'}
                        </span>
                      )}
                    </button>
                  )}

                  {sidebarCollapsed && (
                    <button
                      onClick={() => setSidebarCollapsed(false)}
                      className="w-10 h-10 mx-auto flex items-center justify-center bg-brand-panel border border-brand-border rounded-xl text-brand-subtext hover:text-brand-text cursor-pointer"
                    >
                      <PlusCircle className="w-5 h-5 text-cyan-500 rotate-45" />
                    </button>
                  )}

                  {!sidebarCollapsed && (
                    <div className="p-3 bg-brand-panel rounded-xl border border-brand-border flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-amber-500 flex items-center justify-center text-slate-950 font-bold text-xs uppercase shadow">
                        {activeUser.fullName.charAt(0)}
                      </div>
                      <div className="overflow-hidden">
                        <span className="block text-[11px] font-bold text-brand-text truncate leading-tight">
                          {activeUser.fullName}
                        </span>
                        <span className="block text-[9px] font-mono text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mt-0.5 leading-none">
                          {activeUser.role === 'superadmin' ? 'Superadmin' : activeUser.role === 'jefe_comercial' ? 'Director' : 'Asesor'}
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={async () => {
                      await clearSupabaseSession();
                      setIsLoggedIn(false);
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    {!sidebarCollapsed && <span className="text-xs font-bold leading-none">Desconectar ERP</span>}
                  </button>
                </div>

              </motion.aside>

              {/* CENTRAL MAIN VIEWPORT (Self-Scrollable container) */}
              <div className="flex-1 min-w-0 p-6 md:p-10 space-y-8 relative overflow-y-auto h-full bg-brand-bg text-brand-text">
                
                {/* Floating energy grid graphics */}
                <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none bg-[var(--brand-glow-cyan)]" />
                <div className="absolute bottom-10 left-10 w-80 h-80 rounded-full blur-3xl pointer-events-none bg-[var(--brand-glow-amber)]" />

                {/* ==================================================
                    DASHBOARD CONTENIDO SEGÚN EL ROL DE ACCESO
                    ================================================== */}

                {currentMenuTab === 'Dashboard' && activeModule === 'erp' && (
                  <div className="space-y-8">
                    
                    {/* PROFILE: SUPERADMIN (EXECUTIVE CONTROL BOARD) */}
                    {(activeRole === 'superadmin' || activeRole === 'tramitacion') && (
                      <div className="space-y-8 animate-fade-in">
                        {/* STATS ROW */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                          <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border space-y-2 relative overflow-hidden group shadow-sm dark:shadow-none">
                            <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500" />
                            <p className="text-xs font-bold font-mono text-brand-subtext uppercase tracking-widest">
                              Monto Interno Empresa
                            </p>
                            <h3 className="text-2xl font-black text-brand-text tracking-tight">
                              {formatCurrency(totalInternal)}
                            </h3>
                            <p className="text-[11px] text-slate-500">
                              Bruto Recibido de Comercializadoras
                            </p>
                          </div>

                          <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border space-y-2 relative overflow-hidden shadow-sm dark:shadow-none">
                            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                            <p className="text-xs font-bold font-mono text-brand-subtext uppercase tracking-widest">
                              Liquidaciones Red Ventas
                            </p>
                            <h3 className="text-2xl font-black text-brand-text tracking-tight">
                              {formatCurrency(totalExternal)}
                            </h3>
                            <p className="text-[11px] text-slate-500">
                              Comisiones Totales Asignadas
                            </p>
                          </div>

                          <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border space-y-2 relative overflow-hidden shadow-sm dark:shadow-none">
                            <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
                            <p className="text-xs font-bold font-mono text-brand-subtext uppercase tracking-widest">
                              Comisión Pendiente
                            </p>
                            <h3 className="text-2xl font-black text-rose-600 dark:text-rose-450 tracking-tight">
                              {formatCurrency(pendingExternal)}
                            </h3>
                            <p className="text-[11px] text-slate-500">
                              Triggers de pago pendientes
                            </p>
                          </div>

                          <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border space-y-2 relative overflow-hidden shadow-sm dark:shadow-none">
                            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                            <p className="text-xs font-bold font-mono text-brand-subtext uppercase tracking-widest">
                              Comisión Pagada
                            </p>
                            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                              {formatCurrency(paidExternal)}
                            </h3>
                            <p className="text-[11px] text-slate-500">
                              Abonado a la red comercial
                            </p>
                          </div>
                        </div>

                        {/* TWO COLUMN SUMMARY GRAPH AND INFO CARD */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Left: General business highlights */}
                          <div className="lg:col-span-2 bg-brand-panel p-6 rounded-2xl border border-brand-border space-y-5">
                            <h3 className="text-sm font-extrabold text-brand-text tracking-wide uppercase">
                              Distribución de Contrataciones Activas (Volumen de Energía)
                            </h3>
                            
                            {/* Simulated Bars representing Gas vs Light contracts */}
                            <div className="space-y-4 pt-1">
                              <div className="space-y-1.5">
                                <div className="flex justify-between text-xs font-mono">
                                  <span className="text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                                    <Lightbulb className="w-3.5 h-3.5" /> Luz Indexada Pool & PVPC
                                  </span>
                                  <span className="font-bold text-brand-text">
                                    {contracts.filter(c => c.tipo === 'luz').length} CONTRATOS
                                  </span>
                                </div>
                                <div className="h-3 bg-brand-bg rounded-full overflow-hidden border border-brand-border font-sans">
                                  <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full" style={{ width: '60%' }} />
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <div className="flex justify-between text-xs font-mono">
                                  <span className="text-amber-600 dark:text-amber-500 flex items-center gap-1">
                                    <Flame className="w-3.5 h-3.5" /> Gas Fija Confort & Regulada
                                  </span>
                                  <span className="font-bold text-brand-text">
                                    {contracts.filter(c => c.tipo === 'gas').length} CONTRATOS
                                  </span>
                                </div>
                                <div className="h-3 bg-brand-bg rounded-full overflow-hidden border border-brand-border font-sans">
                                  <div className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full" style={{ width: '40%' }} />
                                </div>
                              </div>
                            </div>


                          </div>

                          {/* Right: Quick actions */}
                          <div className="bg-brand-panel p-6 rounded-2xl border border-brand-border space-y-4">
                            <h3 className="text-xs font-extrabold text-brand-text tracking-wide uppercase font-mono">
                              Simulaciones de Sistema
                            </h3>
                            <p className="text-brand-subtext text-xs">
                              Como superadmin puedes simular la adición de nuevos contratos o simular el registro de un nuevo comercial desde el panel inferior para comprobar cómo fluyen las comisiones en tiempo real.
                            </p>
                            
                            <div className="space-y-2 pt-2">
                              <button 
                                onClick={() => setCurrentMenuTab('Usuarios')}
                                className="w-full text-left p-3 rounded-xl bg-brand-bg hover:bg-slate-100 dark:hover:bg-slate-800 border border-brand-border transition-all flex items-center justify-between group cursor-pointer"
                              >
                                <span className="text-xs font-bold text-brand-text">Registrar Agente Comercial</span>
                                <ChevronRight className="w-4 h-4 text-blue-500 dark:text-cyan-400 group-hover:translate-x-1 transition-transform" />
                              </button>
                              
                              <button 
                                onClick={() => setCurrentMenuTab('Contratos')}
                                className="w-full text-left p-3 rounded-xl bg-brand-bg hover:bg-slate-100 dark:hover:bg-slate-800 border border-brand-border transition-all flex items-center justify-between group cursor-pointer"
                              >
                                <span className="text-xs font-bold text-brand-text">Ver Todos los Contratos</span>
                                <ChevronRight className="w-4 h-4 text-blue-500 dark:text-cyan-400 group-hover:translate-x-1 transition-transform" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* TABLE: LAST COMMISSIONS GENERATED */}
                        <div className="bg-brand-panel p-6 rounded-2xl border border-brand-border space-y-4">
                          <div className="flex justify-between items-center">
                            <h3 className="text-sm font-extrabold text-brand-text tracking-wide uppercase">
                              Contratos de Energía y Liquidaciones del Equipo General
                            </h3>
                            <span className="text-xs font-mono text-brand-subtext">Total: {contracts.length} contratos</span>
                          </div>
                          
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="border-b border-brand-border text-brand-subtext font-mono">
                                  <th className="pb-3 text-[10px] uppercase font-bold tracking-wider">Cliente / Cups</th>
                                  <th className="pb-3 text-[10px] uppercase font-bold tracking-wider">Luz/Gas</th>
                                  <th className="pb-3 text-[10px] uppercase font-bold tracking-wider">Consumo</th>
                                  <th className="pb-3 text-[10px] uppercase font-bold tracking-wider">Comercial</th>
                                  <th className="pb-3 text-[10px] uppercase font-bold tracking-wider text-right">Monto Interno</th>
                                  <th className="pb-3 text-[10px] uppercase font-bold tracking-wider text-right">Monto Comisión</th>
                                  <th className="pb-3 text-[10px] uppercase font-bold tracking-wider text-right">Estado Contrato</th>
                                </tr>
                              </thead>
                              <tbody>
                                {contracts.map((c, i) => {
                                  const isExpanded = expandedContractId === c.id;
                                  return (
                                    <React.Fragment key={c.id || i}>
                                      <tr 
                                        onClick={() => setExpandedContractId(isExpanded ? null : c.id)}
                                        className="border-b border-brand-border hover:bg-slate-50/50 dark:hover:bg-white/[0.01] cursor-pointer transition-colors"
                                      >
                                        <td className="py-3.5 pr-2">
                                          <p className="font-bold text-brand-text flex items-center gap-1.5">
                                            {c.clientName}
                                          </p>
                                          <p className="text-[10px] font-mono text-brand-subtext mt-0.5 font-semibold">{c.cups}</p>
                                        </td>
                                        <td className="py-3.5">
                                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                            c.tipo === 'luz' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-amber-500/10 text-amber-500'
                                          }`}>
                                            {c.tipo === 'luz' ? <Lightbulb className="w-3 h-3" /> : <Flame className="w-3 h-3" />}
                                            {c.tipo.toUpperCase()}
                                          </span>
                                          <span className="block text-[10px] text-slate-400 mt-0.5">{c.compania}</span>
                                        </td>
                                        <td className="py-3.5 font-mono text-brand-text font-bold">
                                          {c.consumoAnual.toLocaleString('es-ES')} kWh/año
                                        </td>
                                        <td className="py-3.5 font-sans font-medium text-brand-text">
                                          {c.comercialName}
                                        </td>
                                        <td className="py-3.5 font-mono text-cyan-600 dark:text-cyan-400 font-bold text-right py-3.5">
                                          {formatCurrency(c.montoInterno)}
                                        </td>
                                        <td className="py-3.5 font-mono text-amber-500 font-bold text-right font-black">
                                          {formatCurrency(c.montoExterno)}
                                        </td>
                                        <td className="py-3.5 text-right">
                                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${getContractEstadoBadgeClass(c.estado)}`}>
                                            {c.estado}
                                          </span>
                                        </td>
                                      </tr>
                                      {isExpanded && (
                                        <tr className="bg-slate-50/60 dark:bg-brand-surface/50 border-b border-brand-border select-none">
                                          <td colSpan={7} className="p-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs text-left">
                                              <div className="space-y-1">
                                                <span className="text-[10px] uppercase font-bold font-mono text-slate-450">Datos Fiscales</span>
                                                <p className="font-semibold text-brand-text">NIF/CIF: <span className="font-mono text-brand-subtext">{c.nif || 'B-99881122'}</span></p>
                                                <p className="text-brand-subtext">Tel: {c.telefono || '654 321 098'}</p>
                                                <p className="text-brand-subtext">Email: {c.email || 'titular@gestiongrup.es'}</p>
                                              </div>

                                              <div className="space-y-1">
                                                <span className="text-[10px] uppercase font-bold font-mono text-slate-450">Ubicaciones Suministro</span>
                                                <p className="text-brand-subtext font-semibold">Dirección Suministro:</p>
                                                <p className="text-brand-subtext text-[11px] leading-normal">{c.direccionSuministro || c.direccionCompleta || 'Poligono Industrial Alcala, Sevilla'}</p>
                                                <p className="text-brand-subtext text-[10px] mt-1 font-sans">Dirección Factura: {c.direccionCompleta || 'Av. Diagonal 455, Barcelona'}</p>
                                              </div>

                                              <div className="space-y-1">
                                                <span className="text-[10px] uppercase font-bold font-mono text-slate-450">Condiciones Técnicas</span>
                                                <p className="text-brand-subtext font-semibold">Tarifa: <span className="font-mono text-cyan-600 dark:text-cyan-400">{c.tarifa}</span></p>
                                                <p className="text-brand-subtext">Potencia: {c.potenciaContratada || '15 kW'}</p>
                                                <p className="text-brand-subtext mt-1 text-[10px] font-mono">IBAN: {c.iban || 'ES21 4400 **** **** ****'}</p>
                                              </div>

                                              <div className="space-y-2">
                                                <span className="text-[10px] uppercase font-bold font-mono text-slate-450 font-extrabold block">Expediente & Documentos</span>
                                                {c.documentos && c.documentos.length > 0 ? (
                                                  <div className="space-y-1">
                                                    {c.documentos.map((doc, idx) => (
                                                      <div key={idx} className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold truncate bg-emerald-500/5 p-1 rounded border border-emerald-500/10">
                                                        <FileText className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                                        <span className="truncate">{doc.name}</span>
                                                        <span className="text-[9px] font-mono text-slate-400 shrink-0">({doc.size})</span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                ) : (
                                                  <div className="space-y-1 text-slate-400">
                                                    <div className="flex items-center gap-1.5 text-[11px] truncate bg-blue-500/5 p-1 rounded border border-blue-500/10">
                                                      <FileText className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                                      <span className="truncate">C2_Titular_CIF.pdf</span>
                                                      <span className="text-[9px] font-mono shrink-0">(1.24 MB)</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[11px] truncate bg-blue-500/5 p-1 rounded border border-blue-500/10">
                                                      <FileText className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                                      <span className="truncate font-sans">Factura_Ultima_Luz.pdf</span>
                                                      <span className="text-[9px] font-mono shrink-0">(2.12 MB)</span>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* PROFILE: JEFE_COMERCIAL (DELEGATED NODE LEADER PANEL) */}
                    {activeRole === 'jefe_comercial' && (
                      <div className="space-y-8 animate-fade-in">
                        {/* STATS ROW */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                          <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border space-y-2 relative overflow-hidden shadow-sm">
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                            <p className="text-xs font-bold font-mono text-brand-subtext uppercase tracking-widest">
                              Ventas del Nodo
                            </p>
                            <h3 className="text-2xl font-black text-brand-text tracking-tight font-mono">
                              {formatCurrency(
                                contracts
                                  .filter(c => {
                                    const isSub = profiles.filter(p => p.managerId === activeUserId).some(p => p.id === c.comercialId);
                                    return isSub || c.comercialId === activeUserId;
                                  })
                                  .reduce((sum, c) => sum + c.montoInterno, 0)
                              )}
                            </h3>
                            <p className="text-[11px] text-slate-500">
                              Volumen bruto de red comercial asignada
                            </p>
                          </div>

                          <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border space-y-2 relative overflow-hidden shadow-sm">
                            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                            <p className="text-xs font-bold font-mono text-brand-subtext uppercase tracking-widest">
                              Override Earned (Honorarios)
                            </p>
                            <h3 className="text-2xl font-black text-emerald-500 tracking-tight font-mono">
                              {formatCurrency(
                                contracts
                                  .filter(c => c.comercialId !== activeUserId && isContractActivado(c.estado))
                                  .reduce((sum, c) => {
                                    const ag = profiles.find(p => p.id === c.comercialId);
                                    if (!ag) return sum;
                                    const diff = activeUser.commissionPercentage - ag.commissionPercentage;
                                    return sum + (c.montoInterno * diff / 100);
                                  }, 0)
                              )}
                            </h3>
                            <p className="text-[11px] text-slate-500">
                              Márgenes de pasiva ganados por rango
                            </p>
                          </div>

                          <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border space-y-2 relative overflow-hidden shadow-sm">
                            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                            <p className="text-xs font-bold font-mono text-brand-subtext uppercase tracking-widest">
                              Comisiones Personales
                            </p>
                            <h3 className="text-2xl font-black text-amber-500 tracking-tight font-mono">
                              {formatCurrency(
                                settlements
                                  .filter(s => s.comercialId === activeUserId)
                                  .reduce((sum, s) => sum + s.montoExterno, 0)
                              )}
                            </h3>
                            <p className="text-[11px] text-slate-500">
                              Tus liquidaciones directas asignadas
                            </p>
                          </div>

                          <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border space-y-2 relative overflow-hidden shadow-sm">
                            <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
                            <p className="text-xs font-bold font-mono text-brand-subtext uppercase tracking-widest">
                              Miembros en Red
                            </p>
                            <h3 className="text-2xl font-black text-brand-text tracking-tight font-sans">
                              {profiles.filter(p => p.managerId === activeUserId).length} asesores
                            </h3>
                            <p className="text-[11px] text-slate-500">
                              Asesores directos bajo tu supervisión
                            </p>
                          </div>
                        </div>

                        {/* LIST ROW */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Left: list of team members */}
                          <div className="bg-brand-panel p-6 rounded-2xl border border-brand-border shadow-sm space-y-4">
                            <h3 className="text-sm font-extrabold text-brand-text tracking-wide uppercase">
                              Eficiencia de la Red de Asesores
                            </h3>
                            <div className="space-y-3 font-sans">
                              {profiles.filter(p => p.managerId === activeUserId).map(sub => {
                                const subContracts = contracts.filter(c => c.comercialId === sub.id);
                                const totalSum = subContracts.reduce((sum, c) => sum + c.montoInterno, 0);
                                return (
                                  <div key={sub.id} className="p-4 rounded-xl border border-brand-border bg-brand-surface dark:bg-brand-surface/50 flex justify-between items-center text-xs">
                                    <div className="space-y-1">
                                      <strong className="text-sm text-brand-text block">{sub.fullName}</strong>
                                      <span className="text-[9px] font-mono uppercase bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                                        Nivel: {sub.commissionPercentage}%
                                      </span>
                                    </div>
                                    <div className="text-right font-mono">
                                      <span className="font-bold text-brand-text block">{formatCurrency(totalSum)}</span>
                                      <span className="text-[10px] text-slate-450">{subContracts.length} contratos</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Right: Team contracts monitoring */}
                          <div className="bg-brand-panel p-6 rounded-2xl border border-brand-border shadow-sm space-y-4">
                            <h3 className="text-sm font-extrabold text-brand-text tracking-wide uppercase">
                              Últimos Contratos Auditados del Nodo
                            </h3>
                            <div className="space-y-3">
                              {(() => {
                                const teamIds = profiles.filter(p => p.managerId === activeUserId).map(p => p.id);
                                const activeTeamContracts = contracts.filter(c => teamIds.includes(c.comercialId) || c.comercialId === activeUserId).slice(0, 4);
                                if (activeTeamContracts.length === 0) {
                                  return (
                                    <p className="text-xs font-mono text-brand-subtext text-center p-8">No hay contratos registrados en tu delegación comercial.</p>
                                  );
                                }
                                return activeTeamContracts.map(c => (
                                  <div key={c.id} className="p-3 bg-brand-bg rounded-xl border border-brand-border flex items-center justify-between text-xs font-mono">
                                    <div>
                                      <span className="font-bold text-brand-text block">{c.clientName}</span>
                                      <span className="text-[9px] text-slate-400 font-sans block mt-0.5">Vendedor: {c.comercialName} • {c.compania}</span>
                                    </div>
                                    <div className="text-right">
                                      <strong className="text-emerald-500 block">{formatCurrency(c.montoExterno)}</strong>
                                      <span className={`text-[8px] font-bold px-1 py-0.25 rounded ${getContractEstadoBadgeClass(c.estado)}`}>
                                        {c.estado}
                                      </span>
                                    </div>
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* PROFILE: COMERCIAL (PERSONAL COMMISSION HUD) */}
                    {activeRole === 'comercial' && (
                      <div className="space-y-4 animate-fade-in">
                        <ComercialCommissionsChart
                          contracts={contracts}
                          activeUserId={activeUserId}
                          selectedPeriod={selectedPeriod}
                          onPeriodChange={setSelectedPeriod}
                          formatCurrency={formatCurrency}
                        />

                        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(72px,0.38fr)_minmax(0,2.5fr)_minmax(0,1fr)]">
                          <div
                            onClick={() => {
                              setLiquidacionesSearchQuery('');
                              setCurrentMenuTab('Liquidaciones internas');
                            }}
                            className="bg-brand-panel p-3 rounded-xl border border-brand-border shadow-sm flex flex-col justify-between gap-2 font-sans cursor-pointer hover:border-cyan-500/40 transition-colors group min-h-[132px] min-w-0"
                          >
                            <div className="space-y-1">
                              <span className="text-[10px] font-semibold text-brand-text uppercase tracking-tight block group-hover:text-cyan-500 transition-colors leading-tight">Comisión pendiente</span>
                              <div className="w-full bg-brand-surface h-1 rounded-full overflow-hidden">
                                <div className="bg-amber-500 h-full rounded-full w-[65%]" />
                              </div>
                            </div>
                            <div className="pt-1.5 border-t border-dashed border-brand-border">
                              <strong className="text-xl font-black text-amber-500 tabular-nums font-mono leading-none">
                                {formatCurrency(
                                  settlements
                                    .filter(s => s.comercialId === activeUserId && s.estado === 'pendiente')
                                    .reduce((sum, s) => sum + s.montoExterno, 0)
                                )}
                              </strong>
                              <span className="text-[9px] text-brand-subtext block mt-0.5">Ver liquidaciones →</span>
                            </div>
                          </div>

                          <div 
                            onClick={() => setCurrentMenuTab('Incidencias')}
                            className="bg-brand-panel px-2 py-3 rounded-xl border border-brand-border shadow-sm flex flex-col items-center justify-between gap-1 font-sans cursor-pointer hover:border-rose-500/40 transition-colors group min-h-[132px] min-w-0"
                          >
                            <div className="flex items-center gap-1 w-full justify-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                              <span className="text-[9px] font-semibold text-brand-text uppercase tracking-tight group-hover:text-rose-500 transition-colors leading-none truncate">
                                Incidencias
                              </span>
                            </div>
                            <div className="pt-1 border-t border-dashed border-brand-border w-full text-center">
                              <strong className={`text-2xl font-black tabular-nums font-mono leading-none ${
                                visibleIncidencias.filter(i => i.estado === 'pendiente').length > 0 ? 'text-rose-500' : 'text-emerald-500'
                              }`}>
                                {visibleIncidencias.filter(i => i.estado === 'pendiente').length}
                              </strong>
                            </div>
                          </div>

                          <div className="col-span-2 xl:col-span-1 min-w-0">
                            <ComercialCompaniaChart
                              contracts={contracts}
                              activeUserId={activeUserId}
                            />
                          </div>

                          <div className="min-w-0">
                          <ComercialRenovacionesCard
                            contracts={contracts}
                            activeUserId={activeUserId}
                            onNavigate={navigateToRenovacionProxima}
                          />
                          </div>
                        </div>

                        <ComercialContratosEstadoKpis
                          contracts={contracts}
                          activeUserId={activeUserId}
                          onNavigate={navigateToContratosEstadoKpi}
                        />

                      </div>
                    )}

                  </div>
                )}

                {/* VIEW: USUARIOS (Jerarquía de Perfiles) */}
                {currentMenuTab === 'Usuarios' && activeModule === 'erp' && (
                  <div className="space-y-6">
                    {activeRole !== 'superadmin' && activeRole !== 'tramitacion' ? (
                      <div className="bg-rose-500/5 border border-rose-500/15 rounded-3xl p-8 text-center space-y-4 max-w-xl mx-auto my-12 animate-fade-in">
                        <div className="w-14 h-14 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center mx-auto border border-rose-500/20">
                          <Lock className="w-6 h-6" />
                        </div>
                        <div className="space-y-1.5">
                          <h3 className="text-sm font-extrabold text-white uppercase tracking-widest font-mono">
                            Módulo Restringido
                          </h3>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            No dispones de suficientes privilegios (Rol: <span className="font-mono text-rose-400 uppercase font-bold">{activeRole}</span>) para gestionar roles organizativos, ver correos o alterar permisos JSONB.
                          </p>
                        </div>
                        <div className="pt-2">
                          <button
                            onClick={() => setCurrentMenuTab('Dashboard')}
                            className="px-4 py-2 bg-slate-900 border border-white/10 hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-300 uppercase transition-all cursor-pointer"
                          >
                            Volver al Dashboard
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6 animate-fade-in">
                        
                        {/* Summary mini cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-brand-panel p-4 rounded-xl border border-brand-border shadow-sm dark:shadow-none">
                            <span className="text-[9px] uppercase font-mono text-brand-subtext tracking-wider">Asesores Totales</span>
                            <p className="text-xl font-bold text-brand-text mt-1 font-mono">{profiles.length}</p>
                          </div>
                          <div className="bg-brand-panel p-4 rounded-xl border border-brand-border shadow-sm dark:shadow-none">
                            <span className="text-[9px] uppercase font-mono text-brand-subtext tracking-wider">Jefes Comercial</span>
                            <p className="text-xl font-bold text-amber-500 mt-1 font-mono">
                              {profiles.filter(p => p.role === 'jefe_comercial').length}
                            </p>
                          </div>
                          <div className="bg-brand-panel p-4 rounded-xl border border-brand-border shadow-sm dark:shadow-none">
                            <span className="text-[9px] uppercase font-mono text-brand-subtext tracking-wider">Asesores Directos</span>
                            <p className="text-xl font-bold text-blue-600 dark:text-cyan-400 mt-1 font-mono">
                              {profiles.filter(p => p.role === 'comercial').length}
                            </p>
                          </div>
                          <div className="bg-brand-panel p-4 rounded-xl border border-brand-border shadow-sm dark:shadow-none">
                            <span className="text-[9px] uppercase font-mono text-brand-subtext tracking-wider">Filtro Estado</span>
                            <p className="text-xs font-bold mt-1 text-brand-subtext">
                              <span className="text-emerald-500">{profiles.filter(p => p.status === 'activo').length} Act.</span>
                              <span className="mx-1">•</span>
                              <span className="text-rose-500">{profiles.filter(p => p.status === 'suspendido').length} Susp.</span>
                            </p>
                          </div>
                        </div>

                        <div className="bg-brand-panel p-4 rounded-2xl border border-brand-border flex flex-col md:flex-row gap-4 justify-between items-center shadow-sm dark:shadow-none">
                          <div className="w-full md:w-auto flex flex-1 flex-col sm:flex-row gap-3">
                            <div className="relative flex-1 max-w-sm">
                              <Search className="w-4 h-4 text-brand-subtext absolute top-3 left-3" />
                              <input
                                type="text"
                                placeholder="Filtrar por nombre, email o ID..."
                                value={userSearchText}
                                onChange={(e) => setUserSearchText(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-brand-bg border border-brand-border rounded-xl text-xs text-brand-text placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                              />
                            </div>

                            <div className="flex gap-2">
                              <div className="flex items-center space-x-1.5 border border-brand-border bg-brand-bg px-2.5 py-1.5 rounded-xl text-[11px]">
                                <Filter className="w-3.5 h-3.5 text-brand-subtext" />
                                <select
                                  value={userRoleFilter}
                                  onChange={(e) => setUserRoleFilter(e.target.value)}
                                  className="bg-transparent border-none text-brand-text text-[11px] focus:outline-none cursor-pointer"
                                >
                                  <option value="all">Ver todos los roles</option>
                                  <option value="superadmin">superadmin</option>
                                  <option value="jefe_comercial">jefe_comercial</option>
                                  <option value="comercial">comercial</option>
                                </select>
                              </div>

                              <div className="flex items-center space-x-1 border border-brand-border bg-brand-bg px-2.5 py-1.5 rounded-xl text-[11px]">
                                <select
                                  value={userStatusFilter}
                                  onChange={(e) => setUserStatusFilter(e.target.value)}
                                  className="bg-transparent border-none text-brand-text text-[11px] focus:outline-none cursor-pointer"
                                >
                                  <option value="all">Ver todos los estados</option>
                                  <option value="activo">activos</option>
                                  <option value="suspendido">suspendidos</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => setIsCreateOpen(true)}
                            className="w-full md:w-auto px-4 py-2.5 bg-gradient-to-r from-blue-700 via-blue-500 to-amber-500 hover:from-blue-800 hover:to-amber-600 text-white rounded-xl text-xs font-extrabold cursor-pointer hover:opacity-95 flex items-center justify-center gap-2 shadow-md"
                          >
                            <UserPlus className="w-4 h-4 text-white" />
                            <span>Registrar Nuevo Asesor</span>
                          </button>
                          {isSyncingErpUsers && (
                            <span className="text-[10px] font-mono text-brand-subtext">Sincronizando Supabase…</span>
                          )}
                        </div>

                        {/* Interactive Data Table Grid */}
                        <div className="bg-brand-panel border border-brand-border rounded-2xl overflow-hidden shadow-sm dark:shadow-none">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="border-b border-brand-border bg-brand-surface dark:bg-brand-surface/50 text-brand-subtext font-mono text-[10px]">
                                  <th className="py-4 px-5 uppercase font-bold tracking-wider">Asesor (Nombre / ID)</th>
                                  <th className="py-4 px-5 uppercase font-bold tracking-wider">Rol de Energía</th>
                                  <th className="py-4 px-5 uppercase font-bold tracking-wider">Email de Acceso</th>
                                  <th className="py-4 px-5 uppercase font-bold tracking-wider">Jefe de Red Asignado</th>
                                  <th className="py-4 px-5 uppercase font-bold tracking-wider">Estado RLS</th>
                                  <th className="py-4 px-5 uppercase font-bold tracking-wider text-right">Permisos JSONB</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-brand-border">
                                {getSortedProfiles(profiles)
                                  .filter((p) => {
                                    const matchTxt = p.fullName.toLowerCase().includes(userSearchText.toLowerCase()) || p.email.toLowerCase().includes(userSearchText.toLowerCase()) || p.id.toLowerCase().includes(userSearchText.toLowerCase());
                                    const matchRol = userRoleFilter === 'all' || p.role === userRoleFilter;
                                    const matchStat = userStatusFilter === 'all' || p.status === userStatusFilter;
                                    return matchTxt && matchRol && matchStat;
                                  })
                                  .map((p) => {
                                    const mgr = profiles.find((m) => m.id === p.managerId);
                                    const indentLevel = p.role === 'superadmin' ? 0 : (p.role === 'jefe_comercial' ? 1 : (p.managerId ? 2 : 1));
                                    return (
                                      <tr
                                        key={p.id}
                                        onClick={() => setActiveUserForSheet(p)}
                                        className="hover:bg-white/[0.02] cursor-pointer transition-colors group"
                                      >
                                        <td className="py-4 px-5">
                                          <div className="flex items-center">
                                            {/* Beautiful Visual Line Guides representing the org hierarchy */}
                                            {indentLevel === 1 && (
                                              <span className="text-blue-500 font-mono font-bold mr-2 text-xs select-none">
                                                ┣━ 📂
                                              </span>
                                            )}
                                            {indentLevel === 2 && (
                                              <div className="flex items-center mr-2 select-none">
                                                <span className="text-slate-600/50 dark:text-slate-400/30 font-mono tracking-widest mr-1">┃</span>
                                                <span className="text-emerald-500 font-mono font-bold">┗━ 👤</span>
                                              </div>
                                            )}
                                            
                                            <div className="flex items-center space-x-3">
                                              <div className={`w-8 h-8 rounded-full border text-xs font-extrabold flex items-center justify-center uppercase shrink-0 ${
                                                indentLevel === 0 ? 'bg-blue-600 border-blue-500 text-white shadow shadow-blue-500/20' :
                                                indentLevel === 1 ? 'bg-amber-500/20 border-amber-500/40 text-amber-500' :
                                                'bg-slate-800 border-white/10 text-slate-300'
                                              }`}>
                                                {p.fullName.split(' ').map((n) => n[0]).join('').substring(0, 2)}
                                              </div>
                                              <div>
                                                <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">{p.fullName}</p>
                                                <p className="text-[10px] font-mono text-slate-500">{p.id}</p>
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="py-4 px-5">
                                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase ${
                                            p.role === 'superadmin' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25' :
                                            p.role === 'jefe_comercial' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/25' :
                                            'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25'
                                          }`}>
                                            {p.role}
                                          </span>
                                        </td>
                                        <td className="py-4 px-5 text-slate-400 font-mono">{p.email}</td>
                                        <td className="py-4 px-5 text-slate-300">
                                          {p.role === 'superadmin' ? (
                                            <span className="text-slate-500 italic text-[10px]">N/A</span>
                                          ) : mgr ? (
                                            <span className="font-medium text-slate-300">{mgr.fullName}</span>
                                          ) : (
                                            <span className="text-rose-400/80 bg-rose-500/5 border border-rose-500/10 px-2 py-0.5 rounded text-[10px] font-mono">⚠️ No asignado</span>
                                          )}
                                        </td>
                                        <td className="py-4 px-5">
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-widest uppercase ${
                                            p.status === 'activo'
                                              ? 'bg-emerald-500/10 text-emerald-400'
                                              : 'bg-rose-500/10 text-rose-400'
                                          }`}>
                                            {p.status}
                                          </span>
                                        </td>
                                        <td className="py-4 px-5 text-right">
                                          <button className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-950 border border-white/5 rounded-lg text-[10px] text-slate-400 hover:text-white group-hover:border-cyan-400/30">
                                            <span>Ver Permisos</span>
                                            <ChevronRight className="w-3.5 h-3.5 text-slate-500 transition-transform group-hover:translate-x-0.5" />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* VIEW: CASHFLOW */}
                {currentMenuTab === 'Cashflow' && activeModule === 'erp' && (
                  <CashflowPanel
                    activeRole={activeRole}
                    formatCurrency={formatCurrency}
                    cashflowScenario={cashflowScenario}
                    setCashflowScenario={setCashflowScenario}
                  />
                )}
                 {/* VIEW: CONTRATOS */}
                 {(currentMenuTab === 'Contratos' || currentMenuTab === 'Mis Contratos') && activeModule === 'erp' && (
                  <ContratosPanel
                    activeRole={activeRole}
                    activeUserId={activeUserId}
                    activeUserName={activeUser.fullName}
                    canEditContractEstado={
                      activeModule === 'erp' &&
                      (isErpOpsAdmin &&
                        (activeRole === 'tramitacion' || superadminViewMode === 'tramitacion'))
                    }
                    visibleContracts={
                      currentMenuTab === 'Mis Contratos' || activeRole === 'comercial'
                        ? myContracts
                        : activeRole === 'jefe_comercial'
                          ? teamContracts
                          : contracts
                    }
                    setContracts={setContracts}
                    contractsSearchQuery={contractsSearchQuery}
                    setContractsSearchQuery={setContractsSearchQuery}
                    contractsListFilter={contractsListFilter}
                    setContractsListFilter={setContractsListFilter}
                    onActivateContract={(c) => {
                      setSelectedContractForActivation(c);
                      setActivateConsumoKwh(c.consumoAnual);
                      setActivatePowerKw(15.5);
                      setIsActivateOpen(true);
                    }}
                    onBajaContract={(c) => {
                      setSelectedContractForBaja(c);
                      setBajaDate(new Date().toISOString().split('T')[0]);
                      setIsBajaOpen(true);
                    }}
                    handleCreateContract={handleCreateContract}
                    isCreatingContract={isCreatingContract}
                    newContractForm={newContractForm}
                    onNewContractFormChange={patchNewContractForm}
                    onResetNewContractForm={resetNewContractForm}
                    applyOcrToNewContractForm={applyOcrToNewContractForm}
                    onOpenNewContract={openContractWizardBlank}
                    highlightContractId={highlightContractId}
                    profiles={profiles}
                    commissionPercentage={activeUser.commissionPercentage}
                    formatCurrency={formatCurrency}
                    renderCompaniaLogo={renderCompaniaLogo}
                  />
                )}

                {/* VIEW: TARIFAS */}
                {currentMenuTab === 'Tarifas' && activeModule === 'erp' && (
                  <div className="space-y-8 animate-fade-in">
                    <div className="bg-brand-panel p-6 rounded-2xl border border-brand-border space-y-6 shadow-sm dark:shadow-none">
                      <h3 className="text-sm font-extrabold text-brand-text tracking-wide uppercase">
                        Tarifas de Comercialización Homologadas (Mayo 2026)
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-5 rounded-2xl bg-brand-bg border border-blue-500/20 dark:border-blue-500/10 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-600 dark:text-cyan-400 font-bold">Luz Indexada</span>
                              <span className="text-xs font-mono text-brand-subtext">Omie Pool</span>
                            </div>
                            <h4 className="text-lg font-bold text-brand-text">Tarifa Variable Negocios</h4>
                            <p className="text-xs text-brand-subtext leading-normal">
                              Traslada el coste horario real del mercado de generación eléctrica directamente a las pymes, con un margen de gestión mínimo homologado.
                            </p>
                          </div>
                          <div className="pt-4 border-t border-brand-border mt-4 text-xs font-mono text-brand-subtext flex justify-between">
                            <span>Coste Gestión</span>
                            <span className="text-blue-600 dark:text-cyan-400 font-bold">0.012 €/kWh</span>
                          </div>
                        </div>

                        <div className="p-5 rounded-2xl bg-brand-bg border border-emerald-500/20 dark:border-emerald-500/10 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">Luz Fija</span>
                              <span className="text-xs font-mono text-brand-subtext">Estable</span>
                            </div>
                            <h4 className="text-lg font-bold text-brand-text">Tarifa Fuerte Estar</h4>
                            <p className="text-xs text-brand-subtext leading-normal">
                              Precio de término de energía cerrado durante 12 meses. Sin sorpresas, protege contra subidas súbitas del pool.
                            </p>
                          </div>
                          <div className="pt-4 border-t border-brand-border mt-4 text-xs font-mono text-brand-subtext flex justify-between">
                            <span>Margen Gestión</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">0.024 €/kWh</span>
                          </div>
                        </div>

                        <div className="p-5 rounded-2xl bg-brand-bg border border-amber-500/25 dark:border-amber-500/10 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 text-amber-600 dark:text-amber-500 font-bold">Gas Pyme</span>
                              <span className="text-xs font-mono text-brand-subtext">RL.3 Fijo</span>
                            </div>
                            <h4 className="text-lg font-bold text-brand-text">Gas MultiConfort</h4>
                            <p className="text-xs text-brand-subtext leading-normal">
                              Especialmente adaptada para locales comerciales, oficinas y hostelería. Término de consumo adaptado al escalón RL.1 a RL.3.
                            </p>
                          </div>
                          <div className="pt-4 border-t border-brand-border mt-4 text-xs font-mono text-brand-subtext flex justify-between">
                            <span>Margen Gestión</span>
                            <span className="text-amber-600 dark:text-amber-500 font-bold">0.009 €/kWh</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* VIEW: LIQUIDACIONES INTERNAS (comercial / jefe / superadmin comercial) */}
                {currentMenuTab === 'Liquidaciones internas' && activeModule === 'erp' && canViewInternalLiquidaciones && (
                  <LiquidacionesInternasPanel
                    activeRole={
                      activeRole === 'superadmin'
                        ? superadminViewMode === 'comercial'
                          ? 'comercial'
                          : 'superadmin'
                        : (activeRole as 'jefe_comercial' | 'comercial')
                    }
                    activeUserId={activeUserId}
                    activeUserName={activeUser.fullName}
                    settlements={settlements}
                    contracts={contracts}
                    profiles={profiles}
                    formatCurrency={formatCurrency}
                  />
                )}

                {/* VIEW: LIQUIDACIONES CONSOLIDADAS (tramitación / superadmin operativo) */}
                {currentMenuTab === 'Liquidaciones' && activeModule === 'erp' && canViewConsolidatedLiquidaciones && (
                  <div className="space-y-8 animate-fade-in text-slate-800 dark:text-slate-100 font-sans">
                    
                    {/* 1. SECCIÓN SUPERADMINISTRADOR: Métricas Consolidadas del Negocio (Internas vs Externas) */}
                    {(activeRole === 'superadmin' || activeRole === 'tramitacion') && (
                      <div className="p-6 bg-slate-100 dark:bg-brand-surface border border-slate-200 dark:border-white/5 rounded-3xl space-y-4 shadow-sm animate-fade-in">
                        <div className="flex items-center space-x-2.5">
                          <span className="p-1.5 rounded-lg bg-blue-600/10 text-blue-600">
                            <TrendingUp className="w-4 h-4" />
                          </span>
                          <span className="text-xs font-mono font-bold text-blue-600 dark:text-cyan-400 uppercase tracking-widest leading-none">
                            Liquidaciones Consolidadas Corporativas: Distribución Interna y Externa
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="p-4 bg-brand-panel border border-brand-border rounded-xl">
                            <span className="text-[9px] text-slate-400 uppercase font-mono block font-semibold">100% Facturación Proveedores</span>
                            <strong className="text-xl font-bold text-blue-600 dark:text-cyan-400 font-mono tracking-tight block mt-0.5">34.800 €</strong>
                            <p className="text-[9px] text-slate-400 leading-normal mt-1 font-mono">
                              Comisiones íntegras facturadas a las compañías (Endesa, Naturgy, Niba, etc.) por altas del canal.
                            </p>
                          </div>
                          
                          <div className="p-4 bg-brand-panel border border-brand-border rounded-xl">
                            <span className="text-[9px] text-amber-500 uppercase font-mono block font-semibold">Liquidación Comerciales</span>
                            <strong className="text-xl font-bold text-amber-500 font-mono tracking-tight block mt-0.5">18.540 euro</strong>
                            <p className="text-[9px] text-slate-400 leading-normal mt-1 font-mono">
                              Honorarios liquidados a los agentes comerciales de la red según sus comisiones de venta (60%-70%).
                            </p>
                          </div>

                          <div className="p-4 bg-brand-panel border border-brand-border rounded-xl">
                            <span className="text-[9px] text-emerald-500 uppercase font-mono block font-semibold">Liquidación Jefes de Nodo</span>
                            <strong className="text-xl font-bold text-emerald-500 font-mono tracking-tight block mt-0.5">5.820 €</strong>
                            <p className="text-[9px] text-slate-400 leading-normal mt-1 font-mono">
                              Comisiones por venta propia de directores de red y márgenes de override sobre sus comerciales asignados.
                            </p>
                          </div>

                          <div className="p-4 bg-indigo-500/5 border border-indigo-500/25 rounded-xl font-mono">
                            <span className="text-[9px] text-indigo-500 dark:text-indigo-400 uppercase block font-semibold">Caja Neta de la Empresa</span>
                            <strong className="text-xl font-semibold text-indigo-600 dark:text-indigo-300 block mt-0.5">10.440 €</strong>
                            <p className="text-[9px] text-slate-400 leading-normal mt-1">
                              Remanente líquido de retención corporativa (30.0%) para servicios y administración.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2. SECCIÓN JEFE COMERCIAL: Su equipo + Retrocomisiones directas por override de rango */}
                    {activeRole === 'jefe_comercial' && (
                      <div className="p-6 bg-slate-150 dark:bg-brand-surface border border-slate-200 dark:border-white/5 rounded-3xl space-y-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-brand-border">
                          <div className="flex items-center space-x-2">
                            <Award className="w-5 h-5 text-amber-500" />
                            <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest font-mono">
                              Consolidado de Red del Nodo (Liquidaciones Internas vs Externas)
                            </span>
                          </div>
                          <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-cyan-400 text-[10px] font-mono rounded-full font-bold">
                            Tu Tasa de Jefatura: {activeUser.commissionPercentage}%
                          </span>
                        </div>

                        {/* Summary of Internal vs External for the Nodo */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          <div className="p-4 bg-brand-panel border border-brand-border rounded-xl">
                            <span className="text-[10px] text-slate-400 uppercase font-mono block font-bold">Facturación Externa (Comisiones Base 100%)</span>
                            <strong className="text-2xl font-black text-blue-600 dark:text-cyan-400 font-mono tracking-tight block mt-1">
                              {formatCurrency(
                                pendingContracts.filter(c => {
                                  const isMyReport = profiles.filter(p => p.managerId === activeUserId).some(r => r.id === c.agentId) || c.agentId === activeUserId;
                                  return isMyReport;
                                }).reduce((sum, c) => sum + c.price, 0)
                              )}
                            </strong>
                            <p className="text-[9px] text-slate-400 mt-1 leading-normal font-mono">
                              Volumen bruto generado por las comisiones brutas de las comercializadoras antes de aplicar tramos.
                            </p>
                          </div>

                          <div className="p-4 bg-brand-panel border border-brand-border rounded-xl">
                            <span className="text-[10px] text-slate-400 uppercase font-mono block font-bold">Liquidado Interno (A tus Comerciales)</span>
                            <strong className="text-2xl font-black text-amber-500 font-mono tracking-tight block mt-1">
                              {formatCurrency(
                                pendingContracts.filter(c => {
                                  const isMyReport = profiles.filter(p => p.managerId === activeUserId).some(r => r.id === c.agentId);
                                  return isMyReport;
                                }).reduce((sum, c) => {
                                  const ag = profiles.find(p => p.id === c.agentId);
                                  const percent = ag ? ag.commissionPercentage : 0;
                                  return sum + (c.price * percent / 100);
                                }, 0)
                              )}
                            </strong>
                            <p className="text-[9px] text-slate-400 mt-1 leading-normal font-mono">
                              Fracción interna transferida directamente a los asesores comerciales de su equipo (60-70%).
                            </p>
                          </div>

                          <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-mono block font-black">Tu Margen de Override (Comisión Pasiva)</span>
                            <strong className="text-2xl font-black text-emerald-500 font-mono tracking-tight block mt-1">
                              {formatCurrency(
                                pendingContracts.filter(c => c.agentId !== activeUserId).reduce((sum, c) => {
                                  const ag = profiles.find(p => p.id === c.agentId);
                                  if (!ag) return sum;
                                  const diff = activeUser.commissionPercentage - ag.commissionPercentage;
                                  return sum + c.price * (diff / 100);
                                }, 0)
                              )}
                            </strong>
                            <p className="text-[9px] text-slate-400 mt-1 leading-normal font-mono">
                              Honorarios ganados por la diferencia de rango entre tu comisionado y el de tus subgentes asignados.
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                          {/* Left subdivision: List of agents under team leader */}
                          <div className="lg:col-span-12 space-y-3">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block font-bold">Diferenciales de Rango Activos por Comercial</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {profiles.filter(p => p.managerId === activeUserId).map(agent => {
                                const agentLevel = agent.commissionPercentage;
                                const difference = activeUser.commissionPercentage - agentLevel;
                                // Sales total for this agent
                                const agentSales = pendingContracts.filter(c => c.agentId === agent.id).reduce((sum, c) => sum + c.price, 0);
                                const myOverrideEarned = agentSales * (difference / 100);
                                return (
                                  <div key={agent.id} className="p-3.5 rounded-xl bg-brand-panel border border-brand-border space-y-2">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <span className="font-bold text-sm text-brand-text block">{agent.fullName}</span>
                                        <span className="text-[9px] uppercase font-mono text-slate-500 block">Nivel Agent: {agentLevel}%</span>
                                      </div>
                                      <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-500 text-[8px] font-bold font-mono rounded">
                                        +{difference}% Diff
                                      </span>
                                    </div>
                                    <div className="text-right font-mono text-[10px] border-t border-brand-border pt-1.5 flex justify-between">
                                      <span className="text-slate-500">Volumen Ventas:</span>
                                      <span className="font-bold text-brand-text">{formatCurrency(agentSales)}</span>
                                    </div>
                                    <div className="text-right font-mono text-[11px] flex justify-between text-slate-350">
                                      <span className="text-slate-500 uppercase text-[9px]">Tus Honorarios:</span>
                                      <strong className="text-emerald-500 font-bold">{formatCurrency(myOverrideEarned)}</strong>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Header Principal de Liquidaciones Internas */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
                      <div className="flex items-center space-x-2">
                        <WalletCards className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
                        <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest leading-none">
                          Consolidación de Comisiones
                        </span>
                      </div>
                      <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 text-brand-subtext absolute top-3 left-3" />
                        <input
                          type="text"
                          placeholder="Buscar liquidación por cliente o cups..."
                          value={liquidacionesSearchQuery}
                          onChange={(e) => setLiquidacionesSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-8 py-2 bg-brand-surface border border-brand-border rounded-xl focus:border-blue-500 focus:outline-none text-xs text-brand-text font-medium"
                        />
                        {liquidacionesSearchQuery && (
                          <button
                            onClick={() => setLiquidacionesSearchQuery('')}
                            className="absolute top-2.5 right-2 text-slate-400 hover:text-brand-text text-xs p-0.5"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tabs de Filtro de Compañías según el screenshot */}
                    <div className="flex flex-wrap items-center gap-2 pb-1">
                      {['Todos', 'Niba', 'Global Connect', 'Axpo', 'Iberdesa', 'Factorenergia', 'Octopus', 'Ignis', 'Repsol', 'TotalEnergies', 'Endesa'].map((tab) => {
                        const count = pendingContracts.filter(c => {
                          if (activeRole === 'jefe_comercial') {
                            const isMyReport = profiles.filter(p => p.managerId === activeUserId).some(r => r.id === c.agentId) || c.agentId === activeUserId;
                            if (!isMyReport) return false;
                          } else if (activeRole === 'comercial') {
                            if (c.agentId !== activeUserId) return false;
                          }
                          return tab === 'Todos' || c.brand.toLowerCase() === tab.toLowerCase();
                        }).length;

                        return (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setSelectedCompaniaTab(tab)}
                            className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase rounded-lg transition-all cursor-pointer border ${
                              selectedCompaniaTab === tab
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm font-black'
                                : 'bg-brand-panel border-brand-border text-brand-text hover:border-slate-300 dark:hover:border-white/15'
                            }`}
                          >
                            {tab} {count > 0 && <span className="ml-1 px-1 bg-amber-500/20 text-amber-500 text-[8px] font-bold rounded-full">{count}</span>}
                          </button>
                        );
                      })}
                    </div>

                    {/* DUAL COLUMN LAYOUT EXACTLY MATCHING THE MOCKUP */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                      
                      {/* COL 1: CONTRATOS PENDIENTES DE LIQUIDAR (Chequeables) */}
                      <div className="xl:col-span-7 bg-brand-panel p-5 rounded-2xl border border-brand-border space-y-4 bg-white dark:bg-[#0f172a] shadow-sm">
                        <div className="flex justify-between items-center border-b border-brand-border pb-3">
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight block">
                              Contratos Pendientes ({pendingContracts.filter(c => {
                                if (activeRole === 'jefe_comercial') {
                                  return profiles.filter(p => p.managerId === activeUserId).some(r => r.id === c.agentId) || c.agentId === activeUserId;
                                } else if (activeRole === 'comercial') {
                                  return c.agentId === activeUserId;
                                }
                                return true;
                              }).length})
                            </span>
                            <span className="text-[10px] text-brand-subtext">Selecciona los contratos de luz o gas autorizados por distribuidora.</span>
                          </div>
                          
                          {/* Checked Total Indicator */}
                          {(() => {
                            const activeProfs = profiles.filter(p => p.managerId === activeUserId || p.id === activeUserId);
                            const currentFiltered = pendingContracts.filter(c => {
                              if (activeRole === 'jefe_comercial') {
                                if (!activeProfs.some(ap => ap.id === c.agentId)) return false;
                              } else if (activeRole === 'comercial') {
                                if (c.agentId !== activeUserId) return false;
                              }
                              return selectedCompaniaTab === 'Todos' || c.brand.toLowerCase() === selectedCompaniaTab.toLowerCase();
                            });
                            const checkedItems = currentFiltered.filter(c => c.checked);
                            const checkedSum = checkedItems.reduce((sum, item) => sum + item.price, 0);
                            return (
                              <div className="flex items-center space-x-3 bg-blue-500/5 px-3 py-1.5 rounded-xl border border-blue-500/15">
                                <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-cyan-400 uppercase tracking-widest leading-none block text-right">
                                  {checkedItems.length} sel. ({formatCurrency(checkedSum)})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (checkedItems.length === 0) return;
                                    setIsConsolidating(true);
                                    setTimeout(() => {
                                      const randomCode = `CS-${Math.floor(1000 + Math.random() * 9000).toString()}${selectedCompaniaTab !== 'Todos' ? selectedCompaniaTab.toUpperCase().substring(0, 2) : 'GL'}`;
                                      const newConsolidated = {
                                        id: `cliq-${Date.now()}`,
                                        brand: selectedCompaniaTab === 'Todos' ? checkedItems[0].brand : selectedCompaniaTab,
                                        operator: 'Desconocida',
                                        dateConsolidated: new Date().toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                                        contractsCount: checkedItems.length,
                                        amount: checkedSum,
                                        code: randomCode
                                      };
                                      setConsolidatedLiquidations([newConsolidated, ...consolidatedLiquidations]);
                                      setPendingContracts(pendingContracts.filter(c => !checkedItems.some(ci => ci.id === c.id)));
                                      setIsConsolidating(false);
                                      toast.success(`Cierre contable completado. Remesa ${randomCode} emitida con éxito.`);
                                    }, 600);
                                  }}
                                  disabled={checkedItems.length === 0 || isConsolidating}
                                  className={`px-3 py-1.5 text-[9px] font-mono tracking-widest text-[#0f172a] bg-amber-500 hover:bg-amber-600 font-extrabold rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                  {isConsolidating ? 'Closing...' : '✓ CONSOLIDAR'}
                                </button>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Interactive List Scrollable mimicking the screenshot */}
                        <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                          {(() => {
                            const activeProfs = profiles.filter(p => p.managerId === activeUserId || p.id === activeUserId);
                            const currentFiltered = pendingContracts.filter(c => {
                              if (activeRole === 'jefe_comercial') {
                                if (!activeProfs.some(ap => ap.id === c.agentId)) return false;
                              } else if (activeRole === 'comercial') {
                                if (c.agentId !== activeUserId) return false;
                              }
                              const companyMatch = selectedCompaniaTab === 'Todos' || c.brand.toLowerCase() === selectedCompaniaTab.toLowerCase();
                              if (!companyMatch) return false;

                              if (liquidacionesSearchQuery) {
                                const q = liquidacionesSearchQuery.toLowerCase();
                                return c.clientName.toLowerCase().includes(q) || 
                                       c.cups.toLowerCase().includes(q) || 
                                       c.brand.toLowerCase().includes(q);
                              }
                              return true;
                            });

                            if (currentFiltered.length === 0) {
                              return (
                                <div className="p-8 text-center rounded-xl border border-dashed border-brand-border text-brand-subtext text-xs font-mono">
                                  No hay contratos pendientes de consolidar en "{selectedCompaniaTab}"
                                </div>
                              );
                            }

                            return currentFiltered.map((c) => {
                              // We display actual adjusted fees!
                              const advisor = profiles.find(p => p.id === c.agentId);
                              const rateMultiplier = advisor ? (advisor.commissionPercentage / 100) : 1;
                              const realCommission = c.price * rateMultiplier;

                              return (
                                <div
                                  key={c.id}
                                  className={`p-4 rounded-xl border transition-all flex items-start space-x-3.5 relative ${
                                    c.checked
                                      ? 'bg-blue-500/5 border-blue-500/35 shadow-xs'
                                      : 'bg-brand-surface dark:bg-brand-surface/50 border-brand-border hover:border-slate-350 dark:hover:border-white/10'
                                  }`}
                                >
                                  {/* Checkbox input exactly like mockup */}
                                  <div className="pt-0.5">
                                    <input
                                      type="checkbox"
                                      checked={c.checked || false}
                                      onChange={() => {
                                        setPendingContracts(pendingContracts.map(pc => pc.id === c.id ? { ...pc, checked: !pc.checked } : pc));
                                      }}
                                      className="w-4 h-4 text-blue-600 dark:text-cyan-400 bg-slate-950/40 rounded border border-white/15 focus:ring-0 cursor-pointer accent-blue-600"
                                    />
                                  </div>

                                  {/* Contract Info layout mimicking the screenshot */}
                                  <div className="flex-1 space-y-2.5 min-w-0">
                                    {/* Line 1: CUPS (larger, bold, blue) & ACT/Code info */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-white/5 pb-1.5">
                                      <span className="text-xs sm:text-sm font-black text-blue-600 dark:text-cyan-400 font-mono tracking-tight select-all">
                                        {c.cups}
                                      </span>
                                      <div className="flex items-center space-x-1.5 font-mono text-[9px] text-slate-500 shrink-0">
                                        <span>ACT: {c.dateAct}</span>
                                        <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 px-1 py-0.25 rounded uppercase">
                                          {c.code}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Line 2: Address directly below the CUPS */}
                                    <div className="text-[10px] text-slate-400 font-sans leading-tight pl-0.5">
                                      {c.direction}
                                    </div>

                                    {/* Line 3: Customer Name & Contract type with brand logo */}
                                    <div className="space-y-2 pt-1 border-t border-dashed border-brand-border">
                                      <div className="text-[11px] font-sans text-slate-700 dark:text-slate-350 flex items-center space-x-1.5">
                                        <span className="text-slate-400 text-[10px] uppercase font-mono tracking-wide font-bold">Cliente:</span>
                                        <strong className="text-slate-900 dark:text-slate-100 font-bold">{c.clientName || 'Suministros Pérez'}</strong>
                                      </div>

                                      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 text-blue-500 dark:text-cyan-400 font-bold text-[9px] rounded font-mono uppercase">
                                            {c.tipo === 'gas' ? (
                                              <>
                                                <Flame className="w-3 h-3 text-amber-500 shrink-0 animate-pulse" />
                                                <span>Contrato Gas</span>
                                              </>
                                            ) : (
                                              <>
                                                <Lightbulb className="w-3 h-3 text-yellow-500 shrink-0 animate-pulse" />
                                                <span>Contrato Luz</span>
                                              </>
                                            )}
                                          </span>
                                          <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-brand-surface border border-brand-border text-brand-subtext rounded text-[9px] font-mono">
                                            {c.tariff || 'Tarifa Fija'}
                                          </span>
                                        </div>

                                        <div className="flex items-center space-x-1.5">
                                          <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">CIÁ:</span>
                                          {renderCompaniaLogo(c.brand)}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Line 4: Footer dates and comisionado price */}
                                    <div className="flex items-center justify-between border-t border-brand-border pt-2 text-[10px] font-mono text-slate-500">
                                      <div className="flex items-center space-x-1.5">
                                        <span>Firma: {c.dateFirm}</span>
                                      </div>
                                      
                                      {/* Scaled payout price based on the person's commission scale */}
                                      <div className="text-right shrink-0">
                                        <span className="text-[8px] text-slate-500 uppercase tracking-widest font-bold block leading-none">Tu Neto Recibido</span>
                                        <span className="text-xs font-black text-slate-800 dark:text-slate-100 font-mono inline-block mt-0.5">
                                          {formatCurrency(realCommission)}
                                        </span>
                                      </div>
                                    </div>

                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>

                      </div>

                      {/* COL 2: PENDIENTE DE LIQUIDAR AGRUPADO & HISTÓRICOS */}
                      <div className="xl:col-span-5 space-y-6">
                        
                        {/* 1. Pendiente de Liquidar Block grouped by operator */}
                        <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border bg-white dark:bg-[#0f172a] shadow-sm space-y-4">
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight block">
                              Pendiente de Liquidar
                            </span>
                            <span className="text-[9px] text-brand-subtext font-mono">Volúmenes teóricos pendientes de facturar por marca</span>
                          </div>

                          <div className="space-y-2">
                            {(() => {
                              const activeProfs = profiles.filter(p => p.managerId === activeUserId || p.id === activeUserId);
                              const remainingPending = pendingContracts.filter(c => {
                                if (activeRole === 'jefe_comercial') {
                                  return activeProfs.some(ap => ap.id === c.agentId);
                                } else if (activeRole === 'comercial') {
                                  return c.agentId === activeUserId;
                                }
                                return true;
                              });

                              const grouped: Record<string, { count: number; sum: number }> = {};
                              remainingPending.forEach(c => {
                                const advisor = profiles.find(p => p.id === c.agentId);
                                const multiplier = advisor ? (advisor.commissionPercentage / 100) : 1;
                                const realVal = c.price * multiplier;

                                if (!grouped[c.brand]) {
                                  grouped[c.brand] = { count: 0, sum: 0 };
                                }
                                grouped[c.brand].count++;
                                grouped[c.brand].sum += realVal;
                              });

                              const keys = Object.keys(grouped);
                              if (keys.length === 0) {
                                return (
                                  <div className="p-4 text-center rounded-xl bg-slate-950/30 text-[9px] font-mono text-slate-500">
                                    0 marcas pendientes de cobro directo.
                                  </div>
                                );
                              }

                              return keys.map((k) => (
                                <div key={k} className="p-3 rounded-xl bg-brand-surface/60 border border-brand-border flex items-center justify-between text-xs">
                                  <div>
                                    <span className="font-extrabold text-blue-500 block font-mono uppercase tracking-wide">{k}</span>
                                    <span className="text-[9px] text-slate-400 font-mono block mt-1">
                                      Desconocida • {grouped[k].count} contratos pendientes
                                    </span>
                                  </div>
                                  <div className="text-right font-mono">
                                    <span className="text-[11px] font-black text-amber-500 block">
                                      {formatCurrency(grouped[k].sum)}
                                    </span>
                                    <span className="text-[8px] uppercase text-slate-500 bg-amber-500/10 px-1 py-0.25 rounded font-extrabold">Pendiente</span>
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>

                        {/* 2. Liquidaciones Consolidadas List */}
                        <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border bg-white dark:bg-[#0f172a] shadow-sm space-y-4">
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight block">
                              Liquidaciones Consolidadas
                            </span>
                            <span className="text-[9px] text-brand-subtext font-mono">Remesas liquidadas con código único de cierre contable</span>
                          </div>

                          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                            {consolidatedLiquidations.map((cliq) => (
                              <div key={cliq.id} className="p-3.5 rounded-xl bg-brand-surface/30 border border-brand-border hover:border-blue-400/20 transition-all text-xs">
                                <div className="flex justify-between items-start pb-2 border-b border-brand-border">
                                  <div>
                                    <strong className="text-slate-200 font-bold block">{cliq.brand} - {cliq.operator}</strong>
                                    <span className="text-[9px] text-slate-500 font-mono block mt-0.5">{cliq.dateConsolidated}</span>
                                  </div>
                                  <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 text-[8px] font-bold rounded font-mono uppercase border border-emerald-500/20">
                                    CONSOLIDADO
                                  </span>
                                </div>
                                <div className="flex items-center justify-between pt-2 text-[10px] font-mono text-slate-400">
                                  <span>{cliq.contractsCount} contratos vinculados</span>
                                  <strong className="text-emerald-500 font-bold">{formatCurrency(cliq.amount)}</strong>
                                </div>
                                <div className="mt-1 pb-1 flex justify-between items-center bg-slate-900/60 p-2 rounded border border-white/5 font-mono text-[9px] text-slate-500">
                                  <span>Cód: {cliq.code}</span>
                                  <button
                                    type="button"
                                    onClick={() => alert(`Remesa de pago ${cliq.code} por ${formatCurrency(cliq.amount)} autorizada.`)}
                                    className="text-cyan-400 hover:text-cyan-500 font-extrabold uppercase text-[8px] cursor-pointer"
                                  >
                                    Ver detalles &rarr;
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>

                    </div>

                  </div>
                )}

                {/* VIEW: INCIDENCIAS */}
                {currentMenuTab === 'Incidencias' && activeModule === 'erp' && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-end text-xs">
                      <span className="font-mono text-brand-subtext">
                        Pendientes: {visibleIncidencias.filter(i => i.estado === 'pendiente').length}
                      </span>
                    </div>

                    {canCreateIncidencia && (
                      <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border shadow-sm dark:shadow-none">
                        <form onSubmit={handleCreateIncidencia} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div className="space-y-1 sm:col-span-2">
                            <label className="block text-[10px] font-mono text-brand-subtext uppercase">Cliente</label>
                            <input
                              type="text"
                              required
                              value={newIncClientName}
                              onChange={(e) => setNewIncClientName(e.target.value)}
                              placeholder="Nombre del cliente"
                              className="w-full h-8 px-3 bg-brand-surface border border-brand-border rounded-lg text-xs text-brand-text"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[10px] font-mono text-brand-subtext uppercase">Tipo</label>
                            <select
                              value={newIncTipo}
                              onChange={(e) => setNewIncTipo(e.target.value as Ticket['tipo'])}
                              className="w-full h-8 px-2 bg-brand-surface border border-brand-border rounded-lg text-xs text-brand-text"
                            >
                              <option value="Incidencia Cartera">Incidencia Cartera</option>
                              <option value="Tarifa Incorrecta">Tarifa Incorrecta</option>
                              <option value="Retraso de Firma">Retraso de Firma</option>
                              <option value="Error de CUPS">Error de CUPS</option>
                              <option value="Reclamación Distribuidora">Reclamación Distribuidora</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[10px] font-mono text-brand-subtext uppercase">Prioridad</label>
                            <select
                              value={newIncPrioridad}
                              onChange={(e) => setNewIncPrioridad(e.target.value as Ticket['prioridad'])}
                              className="w-full h-8 px-2 bg-brand-surface border border-brand-border rounded-lg text-xs text-brand-text"
                            >
                              <option value="alta">Alta</option>
                              <option value="media">Media</option>
                              <option value="baja">Baja</option>
                            </select>
                          </div>
                          <div className="space-y-1 sm:col-span-2 lg:col-span-4">
                            <label className="block text-[10px] font-mono text-brand-subtext uppercase">Descripción</label>
                            <textarea
                              required
                              value={newIncDescripcion}
                              onChange={(e) => setNewIncDescripcion(e.target.value)}
                              placeholder="Detalle de la incidencia"
                              rows={2}
                              className="w-full px-3 py-2 bg-brand-surface border border-brand-border rounded-lg text-xs text-brand-text resize-none"
                            />
                          </div>
                          <div className="sm:col-span-2 lg:col-span-4">
                            <button
                              type="submit"
                              className="h-8 px-3 text-[11px] font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              Nueva incidencia
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border shadow-sm dark:shadow-none">
                      <IncidenciasKanban
                        incidencias={visibleIncidencias}
                        showComercialName={activeRole !== 'comercial'}
                        canEdit={canEditIncidencia}
                        canDrag={canDragIncidencias}
                        onSave={handleUpdateIncidencia}
                        onMove={handleMoveIncidencia}
                      />
                    </div>
                  </div>
                )}

                {/* VIEW: MI EQUIPO */}
                {currentMenuTab === 'Mi Equipo' && activeModule === 'erp' && (
                  <div className="space-y-8 animate-fade-in text-slate-800 dark:text-slate-100">
                    <div className="bg-brand-panel p-6 rounded-2xl border border-brand-border space-y-4 shadow-sm dark:shadow-none">
                      <h3 className="text-sm font-extrabold text-brand-text tracking-wide uppercase">
                        Agentes Comerciales del Nodo Bajo su Dirección
                      </h3>
                      <p className="text-brand-subtext text-xs mt-1">
                        Como Jefatura Comercial supervisas a los comerciales contratados de tu sucursal.
                      </p>

                      <div className="overflow-x-auto pt-2">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-brand-border text-brand-subtext font-mono">
                              <th className="pb-3 text-[10px] uppercase font-bold tracking-wider">Nombre del Agente</th>
                              <th className="pb-3 text-[10px] uppercase font-bold tracking-wider">ID Único</th>
                              <th className="pb-3 text-[10px] uppercase font-bold tracking-wider">Contratos Registrados</th>
                              <th className="pb-3 text-[10px] uppercase font-bold tracking-wider">Estado Permisos</th>
                              <th className="pb-3 text-[10px] uppercase font-bold tracking-wider text-right">Modificaciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {myTeamMembers.map((m, i) => {
                              const hasContracts = contracts.filter(c => c.comercialId === m.id).length;
                              return (
                                <tr key={i} className="border-b border-brand-border hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                                  <td className="py-3.5 font-bold text-brand-text font-sans">
                                    {m.fullName}
                                  </td>
                                  <td className="py-3.5 font-mono text-brand-subtext">
                                    {m.id}
                                  </td>
                                  <td className="py-3.5 font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                                    {hasContracts} contratos firmados
                                  </td>
                                  <td className="py-3.5 space-y-1.5">
                                    <span className={`inline-block text-[9px] font-mono px-2 py-0.5 rounded-full ${
                                      m.permissions.comparatorAccess ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                    }`}>
                                      Comparador: {m.permissions.comparatorAccess ? 'ACTIVO' : 'BAJA'}
                                    </span>
                                  </td>
                                  <td className="py-3.5 text-right">
                                    <button
                                      onClick={() => togglePermission(m.id, 'comparatorAccess')}
                                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[9px] rounded font-bold cursor-pointer transition-colors shadow-sm"
                                    >
                                      Alt. Permiso
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* VENTAS: Mi Día */}
                {currentMenuTab === 'Mi Día' && activeModule === 'ventas' && (
                  <MiDiaPage
                    actor={{
                      comercialId: activeUserId,
                      comercialName: activeUser.fullName,
                      role: mapVentasRole(activeRole),
                    }}
                    contracts={contracts}
                    importSources={prospectoImportSources}
                    onOpenFicha={openVentasFicha}
                    onNavigateTab={(tab) => setCurrentMenuTab(tab)}
                    onOpenPipelineProspecto={openVentasPipelineCentroMando}
                  />
                )}

                {/* VENTAS: Pipeline */}
                {currentMenuTab === 'Pipeline' && activeModule === 'ventas' && (
                  <PipelinePage
                    actor={{
                      comercialId: activeUserId,
                      comercialName: activeUser.fullName,
                      role: mapVentasRole(activeRole),
                    }}
                    profiles={profiles.map((p) => ({
                      id: p.id,
                      fullName: p.fullName,
                      role: p.role,
                    }))}
                    importSources={prospectoImportSources}
                    contracts={contracts}
                    onOpenFicha={openVentasFicha}
                    onNavigateToContratos={navigateToContratoFromFicha}
                    getContractCups={(id) => contracts.find((c) => c.id === id)?.cups}
                    openCentroMandoProspectoId={ventasPipelineCentroMandoId}
                    onCentroMandoClosed={() => setVentasPipelineCentroMandoId(null)}
                  />
                )}

                {currentMenuTab === 'Base EnerSave' && activeModule === 'ventas' && (
                  <EnersaveLeadDatabasePage />
                )}

                {currentMenuTab === 'Reporting' && activeModule === 'ventas' && (
                  <ReportingPage
                    actor={{
                      comercialId: activeUserId,
                      comercialName: activeUser.fullName,
                      role: mapVentasRole(activeRole),
                    }}
                    profiles={profiles.map((p) => ({
                      id: p.id,
                      fullName: p.fullName,
                      role: p.role,
                      managerId: p.managerId,
                    }))}
                  />
                )}

                {currentMenuTab === 'Avisos SLA' && activeModule === 'ventas' && (
                  <SlaAvisosPage
                    actor={{
                      comercialId: activeUserId,
                      comercialName: activeUser.fullName,
                      role: mapVentasRole(activeRole),
                    }}
                    profiles={profiles.map((p) => ({
                      id: p.id,
                      fullName: p.fullName,
                      managerId: p.managerId,
                    }))}
                    onOpenFicha={openVentasFicha}
                  />
                )}

                {ventasFichaProspectoId && activeModule === 'ventas' && (
                  <FichaProspecto
                    prospectoId={ventasFichaProspectoId}
                    initialProspecto={ventasFichaSnapshot}
                    actor={{
                      comercialId: activeUserId,
                      comercialName: activeUser.fullName,
                      role: mapVentasRole(activeRole),
                    }}
                    onClose={closeVentasFicha}
                    onDeleted={closeVentasFicha}
                    onOpenContractWizard={openContractWizardForProspecto}
                    onNavigateToContratos={navigateToContratoFromFicha}
                    getContractEstado={getContractEstadoForProspecto}
                  />
                )}

                {/* VIEW: MIS CLIENTES */}
                {currentMenuTab === 'Mis Clientes' && activeModule === 'erp' && (
                  <MisClientesPanel
                    clients={clients}
                    setClients={setClients}
                    contracts={contracts}
                    activeUserId={activeUserId}
                    activeUserName={activeUser.fullName}
                    clientesSearchQuery={clientesSearchQuery}
                    setClientesSearchQuery={setClientesSearchQuery}
                    onNavigateToContract={navigateToContract}
                  />
                )}


                {/* VIEW: COMPARADOR (Electricity/Gas Interactive Calculator) */}
                {(currentMenuTab === 'Comparador' || currentMenuTab === 'Comparador de Facturas') && activeModule === 'erp' && (
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
                )}

                {/* VIEW: HISTORIAL DE COMPARATIVAS */}
                {currentMenuTab === 'Historial de Comparativas' && activeModule === 'erp' && (
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
                )}

                {/* VIEW: MARCO RETRIBUTIVO (comercial, jefe_comercial, superadmin modo comercial) */}
                {currentMenuTab === 'Marco Retributivo' && activeModule === 'erp' && canViewMarcoRetributivo && (
                  <MarcoRetributivoPanel
                    commissionPercentage={activeUser.commissionPercentage}
                    formatCurrency={formatCurrency}
                    renderCompaniaLogo={renderCompaniaLogo}
                  />
                )}

                {currentMenuTab === 'Marco Retributivo' && activeModule === 'erp' && !canViewMarcoRetributivo && (
                  <div className="p-8 rounded-3xl border border-brand-border bg-brand-panel text-center space-y-3">
                    <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto" />
                    <h3 className="text-sm font-bold text-brand-text uppercase tracking-wide">
                      Marco Retributivo no disponible
                    </h3>
                    <p className="text-xs text-brand-subtext max-w-md mx-auto leading-relaxed">
                      El panel de tramitación operativa no incluye consulta de comisiones por tarifa. Cambia a
                      vista comercial para ver el marco retributivo del canal.
                    </p>
                  </div>
                )}


                {/* INLINE CONTRACT ACTIVATION AND COMMISSIONS SPLIT MODAL OVERLAY */}
                <AnimatePresence>
                  {isActivateOpen && selectedContractForActivation && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                      {/* Backdrop */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => {
                          setIsActivateOpen(false);
                          setSelectedContractForActivation(null);
                        }}
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs"
                      />

                      {/* Modal Content container */}
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg p-6 overflow-hidden space-y-4 shadow-2xl z-10"
                      >
                        <div className="flex items-center space-x-3 text-emerald-400">
                          <Zap className="w-5 h-5" />
                          <h3 className="text-sm font-black uppercase font-mono tracking-wider text-white">
                            Aprobación, Activación e Insert RLS
                          </h3>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Se calcula la liquidación contable inmediata procediendo a la activación del suministro energético y aplicando la regla retributiva:
                          </p>
                          <div className="p-2 bg-slate-950 rounded border border-white/5 text-[10px] font-mono text-slate-500 mt-2 space-y-1">
                            <span className="text-emerald-500 font-bold block uppercase text-[8px]">Reparticiones Reguladas:</span>
                            <span>• Comercial Individual (Comisión Directa): <strong className="text-white">50%</strong></span>
                            <span>• Jefe Comercial (Override de Supervisión): <strong className="text-white">20%</strong></span>
                            <span>• Superadmin/Empresa (Retenido Base del ERP): <strong className="text-white">30%</strong></span>
                          </div>
                        </div>

                        {/* Customer details banner */}
                        <div className="p-3 bg-slate-950/50 border border-white/5 rounded-xl text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-mono text-[10px]">CLIENTE:</span>
                            <span className="text-slate-200 font-bold">{selectedContractForActivation.clientName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-mono text-[10px]">CUPS SUMINISTRO:</span>
                            <span className="text-slate-300 font-mono text-[10px]">{selectedContractForActivation.cups}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-mono text-[10px]">TIPO COMERCIAL:</span>
                            <span className="text-slate-200 font-bold uppercase">{selectedContractForActivation.tipo}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-mono text-[10px]">ASESOR DE REPORTE:</span>
                            <span className="text-slate-200">{selectedContractForActivation.comercialName}</span>
                          </div>
                        </div>

                        {/* Inputs area */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-widest mb-1">
                              Consumo Real (kWh/año)
                            </label>
                            <input
                              type="number"
                              value={activateConsumoKwh}
                              onChange={(e) => setActivateConsumoKwh(Math.max(0, Number(e.target.value)))}
                              className="w-full bg-slate-950 border border-white/15 rounded-lg p-2 font-mono text-white text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-widest mb-1">
                              Potencia Suministro (kW)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={activatePowerKw}
                              onChange={(e) => setActivatePowerKw(Math.max(0, Number(e.target.value)))}
                              className="w-full bg-slate-950 border border-white/15 rounded-lg p-2 font-mono text-white text-xs"
                            />
                          </div>
                        </div>

                        {/* Dynamic Live Calculations */}
                        {(() => {
                          const kwhRate = selectedContractForActivation.tipo === 'luz' ? 0.015 : 0.012;
                          const kwRate = selectedContractForActivation.tipo === 'luz' ? 5.50 : 4.00;
                          const totalCom = (activateConsumoKwh * kwhRate) + (activatePowerKw * kwRate);

                          const comShare = Math.round(totalCom * 0.50 * 100) / 100;
                          let jefeShare = Math.round(totalCom * 0.20 * 100) / 100;
                          let superShare = Math.round(totalCom * 0.30 * 100) / 100;

                          // Rollup
                          const comercialProfile = profiles.find(p => p.id === selectedContractForActivation.comercialId);
                          const managerId = comercialProfile ? comercialProfile.managerId : null;
                          const managerProfile = managerId ? profiles.find(p => p.id === managerId) : null;

                          if (!managerId) {
                            superShare += jefeShare;
                            jefeShare = 0;
                          }

                          return (
                            <div className="p-4 bg-slate-950 border border-emerald-500/20 rounded-xl space-y-2 text-xs font-mono">
                              <div className="flex justify-between text-white border-b border-white/5 pb-1.5 text-[10px]">
                                <span>COMISIÓN BRUTA GLOBAL (100%):</span>
                                <span className="font-extrabold text-emerald-400">{Math.round(totalCom * 100) / 100} €</span>
                              </div>

                              <div className="space-y-1 text-[10px] pt-1">
                                <div className="flex justify-between text-yellow-400/90 font-semibold">
                                  <span>↳ Comercial (50% Split):</span>
                                  <span>{comShare} €</span>
                                </div>
                                <p className="text-[8px] text-slate-500 pl-3">Destinatario: {selectedContractForActivation.comercialName}</p>

                                <div className="flex justify-between text-cyan-400/90 font-semibold">
                                  <span>↳ Jefe Comercial (20% Override):</span>
                                  <span>{jefeShare} €</span>
                                </div>
                                <p className="text-[8px] text-slate-500 pl-3">Supervisor: {managerProfile ? managerProfile.fullName : 'Sin manager (Rolls up to company)'}</p>

                                <div className="flex justify-between text-emerald-400/90 font-semibold">
                                  <span>↳ Empresa Plataforma (30% Retención):</span>
                                  <span>{Math.round(superShare * 100) / 100} €</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Actions */}
                        <div className="flex justify-end gap-3 text-xs pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsActivateOpen(false);
                              setSelectedContractForActivation(null);
                            }}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl"
                          >
                            Cancelar
                          </button>
                           <button
                             type="button"
                             disabled={isActivatingContractLoading}
                             onClick={() => {
                               handleActivateAndDistribute(selectedContractForActivation.id, activateConsumoKwh, activatePowerKw);
                             }}
                             className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                           >
                             {isActivatingContractLoading ? (
                               <>
                                 <svg className="animate-spin h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
                                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                 </svg>
                                 <span>Distribuyendo...</span>
                               </>
                             ) : (
                               <>
                                 <CheckCircle className="w-4 h-4 text-slate-950" />
                                 <span>Confirmar Activación & Reparto ERP</span>
                               </>
                             )}
                           </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* INLINE CONTRACT CANCELLATION AND RETROCOMMISSION CLAWBACK MODAL */}
                <AnimatePresence>
                  {isBajaOpen && selectedContractForBaja && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                      {/* Backdrop */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => {
                          setIsBajaOpen(false);
                          setSelectedContractForBaja(null);
                        }}
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs"
                      />

                      {/* Modal Panel Container */}
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg p-6 overflow-hidden space-y-4 shadow-2xl z-10 text-slate-300"
                      >
                        <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-rose-500 to-amber-500" />
                        
                        <div className="flex items-center space-x-3 text-rose-400">
                          <Trash2 className="w-5 h-5 text-rose-500" />
                          <h3 className="text-sm font-black uppercase font-mono tracking-wider text-white">
                            Registro de Baja e Inicio de Retrocomisión
                          </h3>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Al cancelar el suministro eléctrico o de gas antes del periodo de cobertura, se genera una liquidación negativa proporcional contra la cuenta del comercial implicado:
                          </p>
                        </div>

                        {/* Customer details banner */}
                        <div className="p-3 bg-slate-950/50 border border-white/5 rounded-xl text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-mono text-[10px]">CLIENTE AFECTADO:</span>
                            <span className="text-slate-200 font-bold">{selectedContractForBaja.clientName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-mono text-[10px]">CUPS:</span>
                            <span className="text-slate-300 font-mono text-[10px]">{selectedContractForBaja.cups}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-mono text-[10px]">COMPAÑÍA / TIPO:</span>
                            <span className="text-slate-200 font-bold uppercase">{selectedContractForBaja.compania} ({selectedContractForBaja.tipo})</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-mono text-[10px]">COMISIÓN ORIGINAL LIQUIDADA:</span>
                            <span className="text-emerald-400 font-mono font-bold">{formatCurrency(selectedContractForBaja.montoExterno)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-mono text-[10px]">FECHA DE ACTIVACIÓN:</span>
                            <span className="text-slate-300 font-mono">{selectedContractForBaja.createdAt}</span>
                          </div>
                        </div>

                        {/* Date input area */}
                        <div className="space-y-1.5 text-xs">
                          <label className="block text-[9px] font-mono text-slate-400 tracking-widest uppercase font-bold">
                            Fecha Oficial de Baja de Suministro
                          </label>
                          <input
                            type="date"
                            required
                            value={bajaDate}
                            onChange={(e) => setBajaDate(e.target.value)}
                            className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 font-mono text-white text-xs text-center border-white/10"
                          />
                        </div>

                        {/* Proportional live clawback computation */}
                        {(() => {
                          const actDate = new Date(selectedContractForBaja.createdAt);
                          const cancelDate = new Date(bajaDate);
                          const diffTime = cancelDate.getTime() - actDate.getTime();
                          let limitMonths = 6;
                          const brand = selectedContractForBaja.compania.toLowerCase();
                          if (brand.includes('naturgy') || brand.includes('repsol')) limitMonths = 4;
                          else if (brand.includes('endesa')) limitMonths = 2;
                          else if (brand.includes('gana') || brand.includes('iberdrola') || brand.includes('niba')) limitMonths = 12;

                          if (diffTime < 0) {
                            return (
                              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-450 text-[10px] rounded-lg font-mono">
                                ⚠️ Error: La fecha de baja no puede ser anterior a la de activación.
                              </div>
                            );
                          }

                          const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.4);
                          let clawbackPercent = 0;
                          let clawbackAmount = 0;

                          if (diffMonths < limitMonths) {
                            clawbackPercent = 1 - (diffMonths / limitMonths);
                            clawbackAmount = selectedContractForBaja.montoExterno * clawbackPercent;
                          }

                          const secure = diffMonths >= limitMonths;

                          return (
                            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-md text-xs font-mono space-y-2">
                              {secure ? (
                                <div className="text-emerald-400 font-bold text-center py-1">
                                  ✓ SEGURO: El contrato ha consumido todo el periodo de cobertura ({limitMonths} meses). No se aplicará retrocomisión negativa.
                                </div>
                              ) : (
                                <>
                                  <div className="flex justify-between text-rose-400 border-b border-white/5 pb-1">
                                    <span>PENALIZACIÓN CORRESPONDIENTE:</span>
                                    <span className="font-extrabold">{(clawbackPercent * 100).toFixed(0)} %</span>
                                  </div>
                                  <div className="flex justify-between text-white font-bold text-[11px] pt-2">
                                    <span>SALDO NEGATIVO RECOBRABLE:</span>
                                    <span className="text-rose-405 font-black text-red-400">-{formatCurrency(clawbackAmount)}</span>
                                  </div>
                                  <p className="text-[9px] text-slate-500 mt-1 leading-snug">
                                    Se deducirá {formatCurrency(clawbackAmount)} de las liquidaciones pendientes para {selectedContractForBaja.comercialName}. El contrato pasará a estado «Dado de Baja».
                                  </p>
                                </>
                              )}
                            </div>
                          );
                        })()}

                        {/* Actions */}
                        <div className="flex justify-end gap-3 text-xs pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsBajaOpen(false);
                              setSelectedContractForBaja(null);
                            }}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-755 text-slate-300 font-bold rounded-xl cursor-safe"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            disabled={isBajaLoading}
                            onClick={handleCancelContract}
                            className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-black rounded-xl hover:opacity-95 transition-opacity flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {isBajaLoading ? (
                              <>
                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>Procesando Clawback...</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-4 h-4 text-white" />
                                <span>Confirmar Clawback Negativo</span>
                              </>
                            )}
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* CREATE USER MODAL */}
                <AnimatePresence>
                  {isCreateOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsCreateOpen(false)}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                      />
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 15 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 15 }}
                        className="bg-brand-panel border border-brand-border w-full max-w-md rounded-2xl p-6 relative z-10 space-y-4 shadow-xl"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-cyan-600" />
                            <h3 className="text-sm font-bold text-brand-text">Nuevo asesor</h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsCreateOpen(false)}
                            className="p-1.5 rounded-lg border border-brand-border text-brand-subtext hover:text-brand-text"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                         <form
                           onSubmit={handleAddNewUser}
                           className="space-y-4 text-xs"
                         >
                           <div className="space-y-1">
                             <label className="block text-[10px] font-mono text-brand-subtext uppercase font-bold">Nombre completo</label>
                             <input
                               type="text"
                               required
                               value={newUserName}
                               onChange={(e) => setNewUserName(e.target.value)}
                               placeholder="p. ej. Miguel Ángel Soler"
                               className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 text-brand-text"
                             />
                           </div>
                           <div className="space-y-1">
                             <label className="block text-[10px] font-mono text-brand-subtext uppercase font-bold">Rol</label>
                             <select
                               value={newUserRole}
                               onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                               className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg focus:outline-none text-brand-text font-mono font-semibold"
                             >
                               <option value="comercial">comercial</option>
                               <option value="jefe_comercial">jefe_comercial</option>
                               <option value="superadmin">superadmin</option>
                             </select>
                           </div>
                           {newUserRole === 'comercial' && (
                             <div className="space-y-1">
                               <label className="block text-[10px] font-mono text-brand-subtext uppercase font-bold">Jefe de red</label>
                               <select
                                 value={newUserManager}
                                 onChange={(e) => setNewUserManager(e.target.value)}
                                 className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg focus:outline-none text-brand-text font-mono"
                               >
                                 {profiles.filter(p => p.role === 'jefe_comercial' || p.role === 'superadmin').map((m) => (
                                   <option key={m.id} value={m.id}>{m.fullName}</option>
                                 ))}
                               </select>
                             </div>
                           )}
                           <div className="pt-2 flex justify-end gap-2">
                             <button
                               type="button"
                               onClick={() => setIsCreateOpen(false)}
                               className="px-4 py-2 border border-brand-border rounded-lg text-brand-subtext hover:text-brand-text"
                             >
                               Cancelar
                             </button>
                             <button
                               type="submit"
                               disabled={isCreatingUser}
                               className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold disabled:opacity-50"
                             >
                               {isCreatingUser ? 'Registrando…' : 'Registrar en Supabase'}
                             </button>
                           </div>
                        </form>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {activeUserForSheet && (
                    <UserControlSheet
                      user={activeUserForSheet}
                      managers={profiles
                        .filter((p) => p.role === 'jefe_comercial' || p.role === 'superadmin')
                        .map((p) => ({ id: p.id, fullName: p.fullName }))}
                      open
                      saving={isSavingUserSheet}
                      onClose={() => setActiveUserForSheet(null)}
                      onChange={(updated) => {
                        setProfiles((prev) =>
                          prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
                        );
                        setActiveUserForSheet(updated);
                      }}
                      onSaveRole={(role, managerId) =>
                        handleSaveUserRoleToSupabase(activeUserForSheet.id, role, managerId)
                      }
                      onTogglePermission={(key) => {
                        togglePermission(activeUserForSheet.id, key);
                        setActiveUserForSheet({
                          ...activeUserForSheet,
                          permissions: {
                            ...activeUserForSheet.permissions,
                            [key]: !activeUserForSheet.permissions[key],
                          },
                        });
                      }}
                      onDelete={() => handleDeleteUserFromSupabase(activeUserForSheet.id)}
                    />
                  )}
                </AnimatePresence>

                {/* MODAL GENERACIÓN CONTRATO ADAPTADO */}
                <AnimatePresence>
                  {isContractModalOpen && (
                    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6 md:p-10">
                      {/* Backdrop */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsContractModalOpen(false)}
                        className="fixed inset-0 bg-slate-950 backdrop-blur-sm"
                      />

                      {/* Modal Content Frame */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 30 }}
                        className="bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-4xl shadow-2xl relative overflow-hidden z-10 flex flex-col max-h-[90vh]"
                      >
                        {/* Header banner */}
                        <div className="p-6 bg-slate-50 dark:bg-[#0f182c] border-b border-slate-150 dark:border-white/10 flex items-center justify-between">
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest block font-extrabold">
                              Emisión de Nueva Contratación
                            </span>
                            <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                              <FileText className="w-5 h-5 text-blue-500" />
                              Contrato Comercial • {modalClientName || 'Cliente Detallado'}
                            </h2>
                          </div>
                          <button
                            onClick={() => setIsContractModalOpen(false)}
                            className="p-1.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#0c1222] text-slate-400 hover:text-slate-905 dark:hover:text-white cursor-pointer transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Form area */}
                        <form onSubmit={handleCreateContractFromModal} className="flex-1 overflow-y-auto p-6 space-y-6">
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* LEFT COLUMN: CLIENT DETAILS */}
                            <div className="space-y-4">
                              <h3 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider font-mono border-b border-slate-100 dark:border-white/5 pb-1 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-blue-500" />
                                Datos Generales del Titular
                              </h3>

                              {/* Client name (editable) */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-mono font-bold text-brand-subtext uppercase tracking-wide">
                                  Nombre o Razón Social <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={modalClientName}
                                  onChange={(e) => setModalClientName(e.target.value)}
                                  placeholder="Ej: Pinturas Ramírez S.L."
                                  className="w-full px-3.5 py-2.5 bg-brand-surface border border-slate-250 dark:border-white/10 rounded-xl focus:outline-none text-xs text-slate-800 dark:text-white font-medium"
                                />
                              </div>

                              {/* NIF/NIE/CIF */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-mono font-bold text-brand-subtext uppercase tracking-wide">
                                  NIF / NIE / CIF <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={modalNif}
                                  onChange={(e) => setModalNif(e.target.value.toUpperCase())}
                                  placeholder="Ej: B12345678"
                                  className="w-full px-3.5 py-2.5 bg-brand-surface border border-slate-250 dark:border-white/10 rounded-xl focus:outline-none text-xs text-slate-800 dark:text-white font-mono uppercase"
                                />
                              </div>

                              {/* Teléfono and Email row */}
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="block text-[10px] font-mono font-bold text-brand-subtext uppercase tracking-wide">
                                    Teléfono Móvil <span className="text-rose-500">*</span>
                                  </label>
                                  <input
                                    type="tel"
                                    required
                                    value={modalTelefono}
                                    onChange={(e) => setModalTelefono(e.target.value)}
                                    placeholder="Ej: 612345678"
                                    className="w-full px-3.5 py-2.5 bg-brand-surface border border-slate-250 dark:border-white/10 rounded-xl focus:outline-none text-xs text-slate-800 dark:text-white font-medium"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-[10px] font-mono font-bold text-brand-subtext uppercase tracking-wide">
                                    Email Contacto <span className="text-rose-500">*</span>
                                  </label>
                                  <input
                                    type="email"
                                    required
                                    value={modalEmail}
                                    onChange={(e) => setModalEmail(e.target.value)}
                                    placeholder="Ej: comercial@empresa.com"
                                    className="w-full px-3.5 py-2.5 bg-brand-surface border border-slate-250 dark:border-white/10 rounded-xl focus:outline-none text-xs text-slate-800 dark:text-white font-medium"
                                  />
                                </div>
                              </div>

                              {/* Bank account IBAN */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-mono font-bold text-brand-subtext uppercase tracking-wide">
                                  IBAN Cuenta de Pago <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={modalIban}
                                  onChange={(e) => setModalIban(e.target.value.toUpperCase())}
                                  placeholder="ES21 0000 0000 0000..."
                                  className="w-full px-3.5 py-2.5 bg-brand-surface border border-slate-250 dark:border-white/10 rounded-xl focus:outline-none text-xs text-slate-800 dark:text-white font-mono uppercase"
                                />
                              </div>

                              {/* Segment / Access tariff state displays */}
                              <div className="grid grid-cols-2 gap-3 text-[10px] font-mono text-brand-subtext bg-brand-surface p-3 rounded-2xl border border-slate-100 dark:border-white/5">
                                <div>
                                  <span className="block text-[8px] text-slate-400 dark:text-slate-500 uppercase">Segmento</span>
                                  <span className="font-extrabold text-blue-600 dark:text-blue-400 uppercase">{modalSegment}</span>
                                </div>
                                <div>
                                  <span className="block text-[8px] text-slate-400 dark:text-slate-550 uppercase">Tarifa de Acceso</span>
                                  <span className="font-extrabold text-blue-600 dark:text-blue-400 uppercase">{modalAccessTariff}</span>
                                </div>
                              </div>
                            </div>

                            {/* RIGHT COLUMN: TECHNICAL DETAIL & TARIFF SELECTORS */}
                            <div className="space-y-4">
                              <h3 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider font-mono border-b border-slate-100 dark:border-white/5 pb-1 flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5 text-blue-500" />
                                Punto de Suministro y Tarifa
                              </h3>

                              {/* Dirección completa */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-mono font-bold text-brand-subtext uppercase tracking-wide">
                                  Dirección Completa de Facturación <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={modalDireccionCompleta}
                                  onChange={(e) => setModalDireccionCompleta(e.target.value)}
                                  placeholder="Calle de la Energía 44, 2ºB, Madrid"
                                  className="w-full px-3.5 py-2.5 bg-brand-surface border border-slate-250 dark:border-white/10 rounded-xl focus:outline-none text-xs text-slate-800 dark:text-white font-medium"
                                />
                              </div>

                              {/* Dirección suministro */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-mono font-bold text-brand-subtext uppercase tracking-wide">
                                  Dirección Punto de Suministro <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={modalDireccionSuministro}
                                  onChange={(e) => setModalDireccionSuministro(e.target.value)}
                                  placeholder="Calle Suministro Industrial s/n, Nave 3, Sevilla"
                                  className="w-full px-3.5 py-2.5 bg-brand-surface border border-slate-250 dark:border-white/10 rounded-xl focus:outline-none text-xs text-slate-800 dark:text-white font-medium"
                                />
                              </div>

                              {/* CUPS input (placed strictly on modal) */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-mono font-bold text-brand-subtext uppercase tracking-wide">
                                  CUPS Oficial de Suministro <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={modalCups}
                                  onChange={(e) => setModalCups(e.target.value.toUpperCase())}
                                  placeholder="ES0021000000000000XX"
                                  className="w-full px-3.5 py-2.5 bg-brand-surface border border-slate-250 dark:border-white/10 rounded-xl focus:outline-none text-xs text-slate-800 dark:text-white font-mono font-bold uppercase tracking-wider"
                                />
                              </div>

                              {/* Potencia contratada */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-mono font-bold text-brand-subtext uppercase tracking-wide">
                                  Potencia Contratada <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={modalPotencia}
                                  onChange={(e) => setModalPotencia(e.target.value)}
                                  placeholder="Ej: P1: 15kW, P2: 15kW"
                                  className="w-full px-3.5 py-2.5 bg-brand-surface border border-slate-250 dark:border-white/10 rounded-xl focus:outline-none text-xs text-slate-800 dark:text-white font-medium"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="block text-[10px] font-mono font-bold text-brand-subtext uppercase tracking-wide">
                                    Tipo de precio <span className="text-rose-500">*</span>
                                  </label>
                                  <select
                                    required
                                    value={modalTipoPrecio}
                                    onChange={(e) => setModalTipoPrecio(e.target.value as 'fijo' | 'mercado')}
                                    className="w-full px-3.5 py-2.5 bg-brand-surface border border-slate-250 dark:border-white/10 rounded-xl text-xs text-slate-800 dark:text-white font-medium focus:outline-none"
                                  >
                                    <option value="">Seleccionar…</option>
                                    <option value="fijo">Precio fijo</option>
                                    <option value="mercado">Precio de mercado</option>
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-[10px] font-mono font-bold text-brand-subtext uppercase tracking-wide">
                                    Precio consumo (€/kWh) <span className="text-rose-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    inputMode="decimal"
                                    value={modalPrecioFijoConsumo}
                                    onChange={(e) => setModalPrecioFijoConsumo(e.target.value)}
                                    placeholder="Ej: 0,118"
                                    className="w-full px-3.5 py-2.5 bg-brand-surface border border-slate-250 dark:border-white/10 rounded-xl focus:outline-none text-xs text-slate-800 dark:text-white font-mono"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="block text-[10px] font-mono font-bold text-brand-subtext uppercase tracking-wide">
                                  Fecha inicio contrato <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="date"
                                  required
                                  value={modalFechaInicio}
                                  onChange={(e) => setModalFechaInicio(e.target.value)}
                                  className="w-full px-3.5 py-2.5 bg-brand-surface border border-slate-250 dark:border-white/10 rounded-xl focus:outline-none text-xs text-slate-800 dark:text-white font-medium"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="block text-[10px] font-mono font-bold text-brand-subtext uppercase tracking-wide">
                                  Tipo suministro <span className="text-rose-500">*</span>
                                </label>
                                <select
                                  required
                                  value={compTipo}
                                  onChange={(e) => setCompTipo(e.target.value as 'luz' | 'gas')}
                                  className="w-full px-3.5 py-2.5 bg-brand-surface border border-slate-250 dark:border-white/10 rounded-xl text-xs text-slate-800 dark:text-white font-medium focus:outline-none"
                                >
                                  <option value="luz">Luz</option>
                                  <option value="gas">Gas</option>
                                </select>
                              </div>

                              {/* Dynamic Company Selection */}
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="block text-[10px] font-mono font-bold text-brand-subtext uppercase tracking-wide">
                                    Compañía <span className="text-rose-500">*</span>
                                  </label>
                                  <select
                                    required
                                    value={modalCompany}
                                    onChange={(e) => setModalCompany(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-brand-surface border border-slate-250 dark:border-white/10 rounded-xl text-xs text-slate-800 dark:text-white font-medium focus:outline-none"
                                  >
                                    {Object.keys(companiesTariffsCatalog[modalAccessTariff] || {}).map(c => (
                                      <option key={c} value={c}>{c}</option>
                                    ))}
                                  </select>
                                </div>

                                <div className="space-y-1">
                                  <label className="block text-[10px] font-mono font-bold text-brand-subtext uppercase tracking-wide">
                                    Tarifa <span className="text-rose-500">*</span>
                                  </label>
                                  <select
                                    required
                                    value={modalTariff}
                                    onChange={(e) => setModalTariff(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-brand-surface border border-slate-250 dark:border-white/10 rounded-xl text-xs text-slate-800 dark:text-white font-medium focus:outline-none"
                                  >
                                    {((companiesTariffsCatalog[modalAccessTariff] || {})[modalCompany] || []).map(t => (
                                      <option key={t} value={t}>{t}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                            </div>
                          </div>

                          {/* DROPZONE AREA FOR DOCUMENTS */}
                          <div className="space-y-2 pt-2">
                            <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider font-mono">
                              Adjuntos del Expediente (CIF, Facturas, Certificados)
                            </label>

                            <FileDropZone
                              className="rounded-2xl border-slate-200 dark:border-white/10 bg-brand-surface text-slate-400 dark:text-slate-300"
                              label="Arrastra y suelta documentos o haz clic aquí"
                              hint="PDF, DOCX, imágenes (max 25MB) · Ctrl+V · Shift+V"
                              accept="image/*,.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                              onFiles={appendModalFiles}
                            />

                            {/* Dropped files list */}
                            {modalFiles.length > 0 && (
                              <div className="p-3 bg-brand-surface/60 rounded-2xl border border-slate-100 dark:border-white/5 space-y-2">
                                <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-550 block">Expediente adjunto ({modalFiles.length})</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {modalFiles.map((f, i) => (
                                    <div key={i} className="bg-white dark:bg-[#0c1222] p-2 rounded-xl flex items-center justify-between border border-slate-150 dark:border-white/5 text-xs text-slate-700 dark:text-slate-350">
                                      <div className="flex items-center space-x-2 truncate pr-2">
                                        <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                                        <span className="truncate font-medium">{f.name}</span>
                                        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 shrink-0">({f.size})</span>
                                      </div>
                                      <button 
                                        type="button" 
                                        onClick={() => setModalFiles(modalFiles.filter((_, idx) => idx !== i))}
                                        className="text-rose-500 p-1 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                          </div>

                          {/* FOOTER ACTIONS OF FORM */}
                          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-100 dark:border-white/10">
                            <button
                              type="button"
                              onClick={() => setIsContractModalOpen(false)}
                              className="px-5 py-2.5 bg-brand-surface border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer hover:bg-slate-100 hover:bg-brand-elevated transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow"
                            >
                              <Lock className="w-3.5 h-3.5 text-white/90" />
                              Firmar y Emitir Contrato
                            </button>
                          </div>

                        </form>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

              </div>
            </div>
          )}

      {/* FOOTER INFORMACIÓN GESTIÓN INTEGRADA */}
      <NuevoContratoWizard
        open={contractWizardOpen}
        onClose={() => {
          setContractWizardOpen(false);
          setContractWizardProspectoId(null);
          resetNewContractForm();
        }}
        form={newContractForm}
        onChange={patchNewContractForm}
        onSubmit={(e, opts) =>
          handleCreateContract(
            e,
            () => {
              setContractWizardOpen(false);
              setContractWizardProspectoId(null);
              if (contractWizardProspectoId) {
                toast.success('Contrato vinculado al prospecto');
              }
            },
            {
              incomplete: opts?.incomplete,
              prospectoId: contractWizardProspectoId ?? undefined,
            }
          )
        }
        isSubmitting={isCreatingContract}
        commissionPercentage={activeUser.commissionPercentage}
        formatCurrency={formatCurrency}
        renderCompaniaLogo={renderCompaniaLogo}
        profiles={profiles}
        activeUserId={activeUserId}
        activeUserName={activeUser.fullName}
        activeUserRole={activeRole}
      />
    </div>
  );
}
