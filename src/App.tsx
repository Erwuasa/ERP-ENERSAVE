import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { ComercialCommissionsChart } from './components/ComercialCommissionsChart';
import { ComercialCompaniaChart } from './components/ComercialCompaniaChart';
import { ComercialRenovacionesCard } from './components/ComercialRenovacionesCard';
import { ComercialContratosEstadoKpis } from './components/ComercialContratosEstadoKpis';
import type { ContractEstadoKpiFilter } from './lib/contract-estado-kpis';
import { LiquidacionesInternasPanel } from './components/LiquidacionesInternasPanel';
import { PerfilComercialModal } from './components/PerfilComercialModal';
import { LiquidacionesConsolidadasSuperadminSection } from './components/LiquidacionesConsolidadasSuperadminSection';
import type { LiquidacionesConsolidadasView } from './lib/liquidaciones-consolidadas';
import { CashflowPanel } from './components/CashflowPanel';
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
  BookUser,
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
  Package,
  HardDrive,
  Loader2,
  Megaphone,
} from 'lucide-react';
import { UserControlSheet } from './components/admin/UserControlSheet';
import {
  deleteErpComercialUser,
  getErpComercialByEmail,
  insertErpComercial,
  isErpComercialLoginAllowed,
  listErpComerciales,
  updateErpComercial,
  type ErpComercialRole,
} from './lib/supabase/erp-comerciales';
import { MarcoRetributivoPanel } from './components/MarcoRetributivoPanel';
import { ProductosPanel } from './components/ProductosPanel';
import { FtpPanel } from './components/FtpPanel';
import { AvisosModal } from './components/AvisosModal';
import { AvisosPanel } from './components/AvisosPanel';
import { CalendarioPanel } from './components/calendario/CalendarioPanel';
import { ProximosEventosWidget } from './components/calendario/ProximosEventosWidget';
import { ComparadorOfferCard } from './components/ComparadorOfferCard';
import { ComparadorSortToggle } from './components/comparador/ComparadorSortToggle';
import { ComparadorProposalFilters } from './components/comparador/ComparadorProposalFilters';
import { ComparadorIaUpload } from './components/comparador/ComparadorIaUpload';
import { EmailPropuestaModal } from './components/comparador/EmailPropuestaModal';
import { AppUpdateBanner } from './components/AppUpdateBanner';
import { useAppVersionCheck } from './hooks/use-app-version-check';
import {
  consumeAppUpdateSnapshot,
  setAppUpdateSnapshotProvider,
} from './lib/app-update';
import {
  canUserDeleteContract,
  contractDeletionBlockedMessage,
} from './lib/contract-deletion';
import { isContractDeletable } from './lib/contract-registration';
import { IncidenciasPanel } from './components/IncidenciasPanel';
import { PipelinePage } from './components/ventas/PipelinePage';
import { MiDiaPage } from './components/ventas/MiDiaPage';
import { FichaProspecto } from './components/ventas/FichaProspecto';
import { ReportingPage } from './components/ventas/ReportingPage';
import { SlaAvisosPage } from './components/ventas/SlaAvisosPage';
import { EnersaveLeadDatabasePage } from './components/ventas/EnersaveLeadDatabasePage';
import { GeneralDatabasePage } from './components/GeneralDatabasePage';
import { SensitiveScreenShell } from './components/SensitiveScreenShell';
import { RuntimeIntegrityBlockModal } from './components/RuntimeIntegrityBlockModal';
import { createProspecto } from './lib/supabase/ventas';
import { generalDatabaseLeadToProspectoInput } from './lib/general-database-prospecto';
import type { GeneralDatabaseLead } from './types/general-database';
import { useRuntimeIntegrityGuard } from './hooks/use-runtime-integrity-guard';
import {
  buildSecurityIncidencia,
  securityIncidenciaFingerprint,
} from './lib/runtime-integrity-incident';
import { isRuntimeIntegrityEnforced } from './lib/runtime-integrity-env';
import { isRuntimeIntegrityBlockExempt } from './lib/runtime-integrity-exempt';
import { recordRuntimeIntegrityBlock } from './lib/supabase/runtime-integrity-blocks';
import type { IntegrityFinding } from './lib/runtime-integrity';
import { SuperadminDashboard, type DashboardNavigateTarget } from './components/dashboard/SuperadminDashboard';
import { FileDropZone } from './components/ui/FileDropZone';
import { ContratosPanel } from './components/ContratosPanel';
import { MisClientesPanel } from './components/MisClientesPanel';
const NuevoContratoWizard = lazy(() =>
  import('./components/NuevoContratoWizard').then((m) => ({ default: m.NuevoContratoWizard }))
);
import type { Contract } from './types/contract';
import type { Client } from './types/client';
import type { ContractOcrResult } from './lib/contract-ocr';
import { extractContractDataFromDocument } from './lib/contract-ocr';
import { applyComparadorOcrResult } from './lib/comparador-ocr-apply';
import { buildComparadorCandidates } from './lib/comparador-candidates';
import {
  matchesCompProposalFilters,
  type CompProposalFilterId,
} from './lib/comparador-proposal-filters';
import { sortComparadorOptions, type ComparadorSortMode } from './lib/comparador-sort';
import { listMarcoRetributivo, type MarcoRetributivoRow } from './lib/supabase/marco-retributivo';
import {
  buildMailtoHref,
  buildPeriodosMayorConsumo,
  inferTarifaPrecioTipoFromNombre,
} from './lib/ia/comparador-email-helpers';
import { generarEmailPropuesta } from './lib/ia/email-propuesta-generator';
import { subscribeContratosEquipoInserts } from './lib/contratos-equipo-realtime';
import {
  countUnreviewedTramitacionContracts,
  formatTramitacionNuevosSummary,
  groupInsertBufferByComercial,
  groupUnreviewedTramitacionByComercial,
  loadReviewedTramitacionIds,
  pruneInsertBuffer,
  pushInsertBufferEvent,
  saveReviewedTramitacionIds,
  TRAMITACION_SUMMARY_DEBOUNCE_MS,
  TRAMITACION_SUMMARY_INTERVAL_MS,
  type TramitacionInsertEvent,
} from './lib/contratos-tramitacion-notifications';
import {
  buildClientsFromContracts,
  linkContractsToClients,
  syncClientEstados,
  upsertClient,
} from './lib/clients';
import { flattenDocumentosPorTipo } from './lib/contrato-documentos';
import {
  buildPotenciaContratadaFromPeriods,
  contractRegistrationErrorMessage,
  contractToNewContractForm,
  EMPTY_NEW_CONTRACT_FORM,
  inferTipoPrecioFromTarifa,
  newContractFormToRegistrationInput,
  validateContractRegistration,
  type NewContractFormState,
} from './lib/contract-registration';
import { marcoRetributivoCatalog } from './data/marco-retributivo-catalog';
import { companiesTariffsCatalog } from './data/tarifas-catalog';
import { computeComisionBreakdown } from './lib/marco-commission';
import {
  listTeamContracts,
  saveTeamContractToSupabase,
  updateTeamContract,
  deleteTeamContract,
} from './lib/supabase/contracts';
import { createCliente, listClientes, updateCliente } from './lib/supabase/clientes';
import { createIncidencia, listIncidencias, updateIncidencia } from './lib/supabase/incidencias';
import { listAvisos, marcarVisto } from './lib/supabase/avisos';
import { listCalendarioEventos } from './lib/supabase/calendario';
import type { CalendarioEvento } from './types/calendario';
import type { Aviso } from './types/aviso';
import { createSettlement, generarLiquidacionesDelMes, generarLiquidacionesDelMesFromProfiles, listSettlements, updateSettlement } from './lib/supabase/settlements';
import {
  calcularLiquidacionMensualPorComercial,
  erpComercialFromProfile as mapProfileToLiquidacionComercial,
} from './lib/liquidaciones-mensuales';
import {
  erpComercialFromProfile,
  fiscalFormFromComercial,
  isComercialFiscalProfileComplete,
} from './lib/comercial-fiscal-profile';
import {
  downloadAutofacturaPdf,
  generateAutofacturaPdf,
} from './lib/pdf/autofactura-pdf';
import {
  formatAutofacturaFecha,
  getProximaFechaAutofactura,
  type AutofacturaTipoCliente,
} from './lib/autofactura-scheduler';
import { normalizeTipoClienteSegment } from './lib/contract-segment-rules';
import {
  applyActivationSettlements,
  buildPendingContractSettlement,
} from './lib/contract-settlements';
import type { SupabaseFailure, SupabaseResult } from './lib/supabase/result';
import {
  createContratoCreadoActividad,
  updateProspecto,
} from './lib/supabase/ventas';
import { buildDemoSyncedContracts } from './lib/demo/synced-ventas-erp-seed';
import { buildProspectoImportSources } from './lib/ventas/prospecto-import-sources';
import { buildNewContractFormFromProspecto } from './lib/ventas/prospecto-to-contract';
import {
  clearSupabaseSession,
  getAuthSessionStatus,
  parseAuthProfileBridge,
} from './lib/supabase/auth-session';
import { getSupabaseClient, isSupabaseConfigured } from './lib/supabase/client';
import type { Prospecto } from './lib/ventas/types';
import {
  CONTRACT_ESTADO_BORRADOR,
  CONTRACT_ESTADO_INICIAL,
  getContractEstadoBadgeClass,
  isContractActivado,
  isContractBorrador,
} from './lib/contract-estado';
import type { ProductoTarifa } from './lib/productos-catalog';
import { getTariffPeajeType, spreadPotenciaFromP1 } from './lib/contract-potencia';
import type { ContractsListFilter } from './lib/contract-renewal';
import { normalizeCups } from './lib/contract-cups-liquidacion';
import { createNoSpacePasteHandler } from './hooks/useNoSpacePasteInput';
import {
  aplicaRenovacionAnual,
  computeRenewalSchedule,
} from './lib/contract-segment-rules';
import type { IncidenciaTicket } from './lib/incidencias';
import { isIncidenciaKanbanVisible, withIncidenciaEstado, normalizeIncidenciaTicket, generateIncidenciaCodigo, isIncidenciaAbierta, appendIncidenciaEstadoHistorial, todayInputDate } from './lib/incidencias';
import {
  generateEstudioAhorroPdf,
  generateEstudioAhorroConjuntoPdf,
  downloadEstudioAhorroPdf,
} from './lib/pdf/estudio-ahorro-pdf';
import {
  mapComparadorToEstudioAhorro,
  mapComparadorHistoryToEstudioAhorro,
  mapComparadorHistoryListToEstudioAhorroConjunto,
} from './lib/pdf/map-comparador-estudio-ahorro';
import {
  mapRecommendationToEstudioAhorro,
  recommendationPdfFilename,
} from './lib/pdf/map-recommendation-estudio-ahorro';
import { getDemoEstudioAhorroInput } from './lib/pdf/demo-estudio-ahorro-input';
import { calcularRecomendacionesParaContratos } from './lib/tarifa-recommendation';
import type { TarifaRecommendation } from './lib/tarifa-recommendation';
import { getFallbackMarcoCatalog, resolveMarcoCatalogEntry } from './lib/supabase/marco-retributivo';
import { marcoRowToProducto } from './lib/productos-catalog';
import {
  dismissRecommendation,
  filterUndismissedRecommendations,
} from './lib/recommendation-dismissed';
import {
  dismissRenewalAlert,
  isRenewalAlertDismissed,
} from './lib/renewal-alert-dismissed';
import { isRenovacionProxima } from './lib/contract-renewal';
import { getRetroMonths } from './lib/retro-period';
import { canEditMarcoRetributivo } from './lib/marco-retributivo-permissions';
import { canEditFtp } from './lib/ftp-permissions';
import { buildSidebarActionBadges } from './lib/sidebar-action-badges';
import { SidebarMenuBadge } from './components/SidebarMenuBadge';

const SEED_CONTRACTS: Contract[] = [
  { id: 'con-1', clientName: 'ANA MARIA PINEDA BARRAGA', cups: 'ES0031102370432011GL', tipo: 'luz', compania: 'Iberdrola', tarifa: 'Fijo', atr: '2.0TD', consumoAnual: 4200, tipoPrecio: 'fijo', precioFijoConsumo: 0.118, potenciaContratada: 4.6, nif: '12345678A', telefono: '600111222', email: 'ana.pineda@email.com', iban: 'ES91 2100 0418 4502 0005 1332', direccionSuministro: 'C/ Mayor 12, 28013 Madrid', consumoAnualManual: 4200, estado: 'ACTIVADO', comercialId: 'usr-3', comercialName: 'Jose Antonio Acal Franco', createdAt: '2025-04-07', fechaFin: '2026-04-07', estadoRenovacion: 'Renovacion proxima', fechaRenovacion: '2026-04-07', diasRenovacion: 69, montoInterno: 240, montoExterno: 120 },
  { id: 'con-2', clientName: 'GEA CATERING, S.L.', cups: 'ES0021000002359672001KF', tipo: 'luz', compania: 'Endesa', tarifa: 'Fijo', atr: '2.0TD', consumoAnual: 18420, tipoPrecio: 'fijo', precioFijoConsumo: 0.105, potenciaContratada: 9.2, nif: 'B12345678', telefono: '963111222', email: 'admin@geacatering.es', iban: 'ES80 2310 0001 1800 0001 2345', direccionSuministro: 'Pol. Ind. Norte, nave 4, 46015 Valencia', consumoAnualManual: 18420, estado: 'ACTIVADO', comercialId: 'usr-3', comercialName: 'Jose Antonio Acal Franco', createdAt: '2025-04-14', fechaFin: '2026-04-14', estadoRenovacion: 'Renovacion proxima', fechaRenovacion: '2026-04-14', diasRenovacion: 76, montoInterno: 380, montoExterno: 190 },
  { id: 'con-3', clientName: 'MARIAN DOREL CHERBZAN', cups: 'ES003110237045776921002PQ', tipo: 'luz', compania: 'Naturgy', tarifa: 'Fijo', atr: '2.0TD', consumoAnual: 8553, tipoPrecio: 'fijo', precioFijoConsumo: 0.112, potenciaContratada: 5.75, consumoAnualManual: null, estado: 'INCIDENCIA ADMINISTRATIVA', comercialId: 'usr-3', comercialName: 'Jose Antonio Acal Franco', createdAt: '2025-04-15', fechaFin: '2026-04-15', estadoRenovacion: 'Renovacion proxima', fechaRenovacion: '2026-04-15', diasRenovacion: 77, montoInterno: 450, montoExterno: 225 },
  { id: 'con-4', clientName: 'MARIAN DOREL CHERBZAN', cups: 'ES003110237045776921001PS', tipo: 'luz', compania: 'Niba Energía', tarifa: 'Fijo', atr: '2.0TD', consumoAnual: 3200, tipoPrecio: 'fijo', precioFijoConsumo: 0.099, potenciaContratada: 3.45, consumoAnualManual: 3200, estado: 'PTE DE FIRMA', comercialId: 'usr-3', comercialName: 'Jose Antonio Acal Franco', createdAt: '2025-04-15', fechaFin: '2026-04-15', estadoRenovacion: 'Renovacion proxima', fechaRenovacion: '2026-04-15', diasRenovacion: 77, montoInterno: 120, montoExterno: 60 },
  { id: 'con-5', clientName: 'MARIAN DOREL CHERBZAN', cups: 'ES003110237045813989001GL', tipo: 'luz', compania: 'Ignis', tarifa: 'Fijo', atr: '2.0TD', consumoAnual: 28227, tipoPrecio: 'fijo', precioFijoConsumo: 0.108, potenciaContratada: 11.5, consumoAnualManual: 28227, estado: 'PTE DE TRAMITACIÓN', comercialId: 'usr-3', comercialName: 'Jose Antonio Acal Franco', createdAt: '2025-04-15', fechaFin: '2026-04-15', estadoRenovacion: 'Renovacion proxima', fechaRenovacion: '2026-04-15', diasRenovacion: 77, montoInterno: 400, montoExterno: 200 },
  { id: 'con-6', clientName: 'Siderúrgica del Norte SL', cups: 'ES0031105542292007LG', tipo: 'luz', compania: 'Axpo Iberia', tarifa: 'Indexada Pool', atr: '3.0TD', consumoAnual: 500000, tipoPrecio: 'mercado', precioFijoConsumo: 0.095, potenciaContratada: 450, consumoAnualManual: 500000, estado: 'ACTIVADO', comercialId: 'usr-1', comercialName: 'Carlos De la Fuente', createdAt: '2025-04-21', fechaFin: '2026-04-21', estadoRenovacion: 'Renovacion proxima', fechaRenovacion: '2026-04-21', diasRenovacion: 83, montoInterno: 500, montoExterno: 250 },
  { id: 'con-7', clientName: 'GEA FOOD COOPERATIVA', cups: 'ES0031105542292008XG', tipo: 'gas', compania: 'Endesa', tarifa: 'Indexado', atr: '3.0TD', consumoAnual: 37270, tipoPrecio: 'mercado', precioFijoConsumo: 0.062, potenciaContratada: 0, consumoAnualManual: null, estado: 'INCIDENCIA ADMINISTRATIVA', comercialId: 'usr-1', comercialName: 'Carlos De la Fuente', createdAt: '2025-04-26', fechaFin: '2026-04-26', estadoRenovacion: 'Renovacion proxima', fechaRenovacion: '2026-04-26', diasRenovacion: 88, montoInterno: 300, montoExterno: 150 },
  { id: 'con-8', clientName: 'Hotel Continental', cups: 'ES0021000000987654ZX', tipo: 'gas', compania: 'Endesa', tarifa: 'Fija Confort', atr: '3.0TD', consumoAnual: 120000, tipoPrecio: 'fijo', precioFijoConsumo: 0.071, potenciaContratada: 0, consumoAnualManual: 120000, estado: 'ACTIVADO', comercialId: 'usr-4', comercialName: 'Marta Rivas', createdAt: '2026-05-15', fechaFin: '2027-05-15', estadoRenovacion: 'Al día', fechaRenovacion: '2027-05-15', diasRenovacion: 350, montoInterno: 960.00, montoExterno: 480.00 },
  { id: 'con-9', clientName: 'Residencia Geriátrica Verde', cups: 'ES0021000000452391KL', tipo: 'luz', compania: 'Naturgy', tarifa: 'Indexada Pool', atr: '2.0TD', consumoAnual: 85000, tipoPrecio: 'mercado', precioFijoConsumo: 0.088, potenciaContratada: 25, consumoAnualManual: null, estado: 'PTE DE FIRMA', comercialId: 'usr-4', comercialName: 'Marta Rivas', createdAt: '2026-05-22', fechaFin: '2027-05-22', estadoRenovacion: 'Al día', fechaRenovacion: '2027-05-22', diasRenovacion: 360, montoInterno: 850.00, montoExterno: 510.00 },
  {
    id: 'con-10',
    clientName: 'María López García',
    cups: 'ES0021000000555123AB',
    tipo: 'luz',
    compania: 'Repsol',
    tarifa: 'Luz Fija Hogar',
    atr: '2.0TD',
    consumoAnual: 4200,
    consumoAnualManual: 4200,
    tipoPrecio: 'fijo',
    precioFijoConsumo: 0.178,
    potenciaContratada: 4.6,
    tipoCliente: 'residencial',
    nif: '45678901B',
    telefono: '612345678',
    email: 'maria.lopez@email.com',
    iban: 'ES76 2100 0813 6101 2345 6789',
    direccionSuministro: 'Av. Constitución 42, 28012 Madrid',
    estado: 'ACTIVADO',
    comercialId: 'usr-1',
    comercialName: 'Carlos De la Fuente',
    createdAt: '2025-11-01',
    fechaFin: '2026-11-01',
    estadoRenovacion: 'Al día',
    fechaRenovacion: '2026-11-01',
    diasRenovacion: 120,
    montoInterno: 44,
    montoExterno: 30.8,
    marcoEntryId: 'repsol-luz-fija-20',
  },
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
  dni?: string;
  direccion?: string;
  ciudad?: string;
  codigoPostal?: string;
  telefono?: string;
  iban?: string;
  integrityGuardBypass?: boolean;
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

function profileFromAuthBridge(email: string, bridge: { comercialId: string; role: string; fullName: string }): Profile {
  const role = bridge.role as UserRole;
  return {
    id: bridge.comercialId,
    fullName: bridge.fullName,
    role,
    managerId: null,
    email,
    status: 'activo',
    commissionPercentage: defaultCommissionForRole(role),
    permissions: defaultPermissionsForRole(role),
  };
}

function normalizeLoginEmail(raw: string): string {
  return raw.toLowerCase().trim();
}

function mergeErpRowsIntoProfiles(
  rows: Array<{
    id: string;
    full_name: string;
    role: ErpComercialRole;
    manager_id: string | null;
    email: string | null;
    commission_percentage?: number;
    activo?: boolean;
    dni?: string | null;
    direccion?: string | null;
    ciudad?: string | null;
    codigo_postal?: string | null;
    telefono?: string | null;
    iban?: string | null;
    integrity_guard_bypass?: boolean;
  }>,
  current: Profile[]
): Profile[] {
  const byId = new Map(current.map((p) => [p.id, p]));
  const remoteIds = new Set(rows.map((r) => r.id));

  const fromSupabase = rows
    .filter((row) => row.activo !== false && Boolean(row.email?.trim()))
    .map((row) => {
    const existing = byId.get(row.id);
    const role = row.role as UserRole;
    const isActiveInSupabase = row.activo !== false;
    return {
      id: row.id,
      fullName: row.full_name,
      role,
      managerId: row.manager_id,
      email: row.email ?? existing?.email ?? '',
      status: isActiveInSupabase
        ? (existing?.status === 'suspendido' ? 'activo' : existing?.status ?? 'activo')
        : ('suspendido' as const),
      commissionPercentage:
        row.commission_percentage ??
        existing?.commissionPercentage ??
        defaultCommissionForRole(role),
      permissions: existing?.permissions ?? defaultPermissionsForRole(role),
      dni: row.dni ?? existing?.dni ?? '',
      direccion: row.direccion ?? existing?.direccion ?? '',
      ciudad: row.ciudad ?? existing?.ciudad ?? '',
      codigoPostal: row.codigo_postal ?? existing?.codigoPostal ?? '',
      telefono: row.telefono ?? existing?.telefono ?? '',
      iban: row.iban ?? existing?.iban ?? '',
      integrityGuardBypass:
        row.integrity_guard_bypass === true || existing?.integrityGuardBypass === true,
    };
  });

  const localOnly = current.filter((p) => !remoteIds.has(p.id));
  return [...fromSupabase, ...localOnly];
}

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

/**
 * Origen de cada colección. Con 'local' los ids son los del seed de demostración
 * (`con-1`, `cli-…`), que no existen en Supabase, así que no se persiste nada.
 */
type DataSource = 'local' | 'supabase';

export default function App() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper function to calculate retrocommission status and potential clawbacks
  const getRetrocommissionInfo = (c: Contract) => {
    const { meses: limitMonths } = getRetroMonths(c.compania);

    const actDate = new Date(c.createdAt);
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
  const [activeUserId, setActiveUserId] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [activeModule, setActiveModule] = useState<'erp' | 'ventas'>('erp');
  // NAV-07 deep-link state keys (v1): activeModule, currentMenuTab, ventasFichaProspectoId,
  // highlightContractId, contractWizardProspectoId — react-router deferred (NAV-06).
  const [ventasFichaProspectoId, setVentasFichaProspectoId] = useState<string | null>(null);
  const [ventasFichaSnapshot, setVentasFichaSnapshot] = useState<Prospecto | null>(null);
  const [ventasPipelineCentroMandoId, setVentasPipelineCentroMandoId] = useState<string | null>(null);
  const [generalDbImportedLeadIds, setGeneralDbImportedLeadIds] = useState<Set<string>>(() => {
    try {
      const raw = sessionStorage.getItem('enersave-general-db-imported');
      if (!raw) return new Set();
      const parsed = JSON.parse(raw) as string[];
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  });
  const [generalDbHighlightLeadId, setGeneralDbHighlightLeadId] = useState<string | null>(null);

  function openGeneralDatabase(leadId?: string) {
    setActiveModule('erp');
    setCurrentMenuTab('Base de Datos');
    setGeneralDbHighlightLeadId(leadId ?? null);
  }

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
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [currentMenuTab, setCurrentMenuTab] = useState<string>('Dashboard');
  const [cashflowScenario, setCashflowScenario] = useState<'optimista' | 'realista' | 'pesimista'>('realista');

  // Input states for Login Page mockup
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [copiedText, setCopiedText] = useState(false);

  // ==========================================
  // SEED INITIAL DATABASE MOCKS
  // ==========================================
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [clients, setClients] = useState<Client[]>(INITIAL_CRM.clients);
  const [contracts, setContracts] = useState<Contract[]>(INITIAL_CRM.contracts);
  // 'local' = datos de demostración con ids con-N; 'supabase' = filas reales con UUID.
  // Solo se persiste contra Supabase en el segundo caso: un UPDATE con id 'con-1'
  // reventaría con un error de sintaxis de uuid.
  const [contractsSource, setContractsSource] = useState<DataSource>('local');
  const [clientsSource, setClientsSource] = useState<DataSource>('local');
  const [incidenciasSource, setIncidenciasSource] = useState<DataSource>('local');
  const [settlementsSource, setSettlementsSource] = useState<DataSource>('local');
  const [avisosSource, setAvisosSource] = useState<DataSource>('local');
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [avisosModalOpen, setAvisosModalOpen] = useState(false);
  const [calendarioEventos, setCalendarioEventos] = useState<CalendarioEvento[]>([]);

  // Dual switch view state for Superadmin
  const [superadminViewMode, setSuperadminViewMode] = useState<'tramitacion' | 'comercial'>('tramitacion');

  const activeUser =
    profiles.find((p) => p.id === activeUserId) ||
    profiles[0] || {
      id: 'usr-1',
      fullName: 'Usuario',
      role: 'superadmin' as UserRole,
      managerId: null,
      permissions: defaultPermissionsForRole('superadmin'),
      email: '',
      status: 'activo' as const,
      commissionPercentage: 100,
    };
  const activeRole = activeUser.role;
  const isErpOpsAdmin = activeRole === 'superadmin' || activeRole === 'tramitacion';
  const canEditMarcoEntries = canEditMarcoRetributivo(activeRole, { superadminViewMode });
  const canEditFtpEntries = canEditFtp(activeRole);
  const canPublishAvisos = activeRole === 'superadmin' || activeRole === 'tramitacion';

  // Interactive filters for Clients database views
  const [clientesSearchQuery, setClientesSearchQuery] = useState('');
  const [contractsSearchQuery, setContractsSearchQuery] = useState('');
  const [contractsListFilter, setContractsListFilter] = useState<ContractsListFilter>('all');
  const [contractsUserFilterId, setContractsUserFilterId] = useState<string>('all');
  const [perfilComercialOpen, setPerfilComercialOpen] = useState(false);
  const [highlightContractId, setHighlightContractId] = useState<string | null>(null);
  const [recommendationDismissVersion, setRecommendationDismissVersion] = useState(0);
  const [renewalDismissVersion, setRenewalDismissVersion] = useState(0);
  const [reviewedContractIds, setReviewedContractIds] = useState<Set<string>>(() =>
    loadReviewedTramitacionIds()
  );
  const [tramitacionInsertBuffer, setTramitacionInsertBuffer] = useState<
    TramitacionInsertEvent[]
  >([]);
  const tramitacionSummaryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const marcoEntries = useMemo(() => getFallbackMarcoCatalog(), []);

  useEffect(() => {
    setClients((prev) => syncClientEstados(prev, contracts));
  }, [contracts]);

  useEffect(() => {
    if (!highlightContractId) return;
    const timer = setTimeout(() => setHighlightContractId(null), 10000);
    return () => clearTimeout(timer);
  }, [highlightContractId]);

  const [liquidacionesSearchQuery, setLiquidacionesSearchQuery] = useState('');
  const [liquidacionesConsolidadasView, setLiquidacionesConsolidadasView] =
    useState<LiquidacionesConsolidadasView>('overview');
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

  const [incidencias, setIncidencias] = useState<Ticket[]>(() =>
    [
      { id: 'inc-1', clientName: 'Residencia Geriátrica Verde', tipo: 'Retraso de Firma', prioridad: 'alta', estado: 'pendiente', comercialId: 'usr-4', comercialName: 'Marta Rivas', descripcion: 'Cliente renegociando penalización con comercializadora saliente', createdAt: '2026-05-20', origen: 'comercial', canal: 'Canal Norte' },
      { id: 'inc-2', clientName: 'Restaurante El Laurel', tipo: 'Error de CUPS', prioridad: 'media', estado: 'resuelta', comercialId: 'usr-4', comercialName: 'Marta Rivas', descripcion: 'El CUPS suministrado correspondía a la luz en lugar del gas. Subsanado.', createdAt: '2026-05-10', estadoAt: '2026-05-28T10:00:00.000Z', origen: 'sistema', asignadoA: 'usr-1' },
      { id: 'inc-3', clientName: 'GEA CATERING, S.L.', tipo: 'Tarifa Incorrecta', prioridad: 'critica', estado: 'pendiente', comercialId: 'usr-3', comercialName: 'Ignacio Ortiz', descripcion: 'Facturación con tarifa distinta a la contratada en alta.', createdAt: '2026-05-22', origen: 'cliente', canal: 'Web cliente' },
      { id: 'inc-4', clientName: 'ANA MARIA PINEDA BARRAGA', tipo: 'Incidencia Cartera', prioridad: 'baja', estado: 'cancelada', comercialId: 'usr-3', comercialName: 'Ignacio Ortiz', descripcion: 'Cliente desistió del cambio de comercializadora.', createdAt: '2026-05-18', estadoAt: '2026-05-28T14:00:00.000Z', origen: 'manual', asignadoA: 'usr-3' },
      { id: 'inc-5', clientName: 'Hotel Continental', tipo: 'Reclamación Distribuidora', prioridad: 'baja', estado: 'resuelta', comercialId: 'usr-4', comercialName: 'Marta Rivas', descripcion: 'Corte de suministro revertido tras reclamación.', createdAt: '2026-04-01', estadoAt: '2026-05-15T08:00:00.000Z', origen: 'comercial', asignadoA: 'usr-1' },
      { id: 'inc-6', clientName: 'Taller Mecánico Sur', tipo: 'Retraso de Firma', prioridad: 'media', estado: 'cancelada', comercialId: 'usr-3', comercialName: 'Ignacio Ortiz', descripcion: 'Alta anulada por falta de documentación.', createdAt: '2026-04-10', estadoAt: '2026-05-10T09:00:00.000Z', origen: 'sistema' },
      { id: 'inc-7', clientName: 'Panadería La Espiga', tipo: 'Incidencia Cartera', estado: 'sin_categorizar', comercialId: 'usr-4', comercialName: 'Marta Rivas', descripcion: 'Ticket recién creado sin clasificar.', createdAt: '2026-06-10', origen: 'manual', codigo: 'INC-0007' },
      { id: 'inc-8', clientName: 'Clínica Dental Sol', tipo: 'Tarifa Incorrecta', prioridad: 'alta', estado: 'en_progreso', comercialId: 'usr-3', comercialName: 'Ignacio Ortiz', descripcion: 'Revisión de tarifa con comercializadora en curso.', createdAt: '2026-06-01', origen: 'comercial', asignadoA: 'usr-1', codigo: 'INC-0008' },
    ].map((inc) => normalizeIncidenciaTicket(inc))
  );

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
  const [compCompaniaActual, setCompCompaniaActual] = useState('');
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
  const [compProposalFilters, setCompProposalFilters] = useState<CompProposalFilterId[]>([]);
  const [compSortMode, setCompSortMode] = useState<ComparadorSortMode>('ahorro');
  const [compOcrLoading, setCompOcrLoading] = useState(false);
  const [compOcrProgress, setCompOcrProgress] = useState<string | null>(null);
  const [marcoRowsForComparador, setMarcoRowsForComparador] = useState<MarcoRetributivoRow[]>([]);
  const [emailPropuestaOpen, setEmailPropuestaOpen] = useState(false);
  const [emailPropuestaLoading, setEmailPropuestaLoading] = useState(false);
  const [emailPropuestaGeneratingId, setEmailPropuestaGeneratingId] = useState<string | null>(null);
  const [emailPropuestaDestino, setEmailPropuestaDestino] = useState('');
  const [emailPropuestaAsunto, setEmailPropuestaAsunto] = useState('');
  const [emailPropuestaCuerpo, setEmailPropuestaCuerpo] = useState('');

  useEffect(() => {
    void listMarcoRetributivo().then((result) => {
      if (result.ok) setMarcoRowsForComparador(result.data);
    });
  }, []);

  const [newContractForm, setNewContractForm] = useState<NewContractFormState>({
    ...EMPTY_NEW_CONTRACT_FORM,
  });

  function patchNewContractForm(patch: Partial<NewContractFormState>) {
    setNewContractForm((prev) => ({ ...prev, ...patch }));
  }

  function resetNewContractForm() {
    const user = profiles.find((p) => p.id === activeUserId) || profiles[0];
    setNewContractForm({
      ...EMPTY_NEW_CONTRACT_FORM,
      wizardStep: 1,
      nombreComercial: user.fullName,
      jefeEquipo:
        profiles.find((p) => p.id === user.managerId)?.fullName ?? '',
    });
  }

  const { remoteVersion, dismiss: dismissAppUpdate } = useAppVersionCheck();
  const restoredAfterUpdateRef = useRef(false);

  useEffect(() => {
    if (restoredAfterUpdateRef.current) return;
    restoredAfterUpdateRef.current = true;

    const snapshot = consumeAppUpdateSnapshot();
    if (!snapshot) return;

    setActiveModule(snapshot.activeModule as 'erp' | 'ventas');
    setCurrentMenuTab(snapshot.currentMenuTab);
    setContractWizardOpen(snapshot.contractWizardOpen);
    setEditingContractId(snapshot.editingContractId);
    setContractWizardProspectoId(snapshot.contractWizardProspectoId);
    setNewContractForm(snapshot.newContractForm as NewContractFormState);
    setVentasFichaProspectoId(snapshot.ventasFichaProspectoId);

    const comparador = snapshot.comparador;
    setCompCups(comparador.compCups);
    setCompClient(comparador.compClient);
    setCompTipo(comparador.compTipo);
    setCompConsumo(comparador.compConsumo);
    setCompTarifaActual(comparador.compTarifaActual);
    setCompSegment(comparador.compSegment);
    setCompAccessTariff(comparador.compAccessTariff);
    setCompPotencias(comparador.compPotencias);
    setCompConsumos(comparador.compConsumos);
    setCompRentMeter(comparador.compRentMeter);
    setCompCurrentBill(comparador.compCurrentBill);
    setCompResults(comparador.compResults as any[] | null);
    setCompSummary(comparador.compSummary);

    toast.success('Trabajo en curso restaurado tras la actualización');
  }, []);

  useEffect(() => {
    setAppUpdateSnapshotProvider(() => ({
      currentMenuTab,
      activeModule,
      contractWizardOpen,
      editingContractId,
      contractWizardProspectoId,
      newContractForm,
      ventasFichaProspectoId,
      comparador: {
        compCups,
        compClient,
        compTipo,
        compConsumo,
        compTarifaActual,
        compSegment,
        compAccessTariff,
        compPotencias,
        compConsumos,
        compRentMeter,
        compCurrentBill,
        compResults,
        compSummary,
      },
    }));

    return () => setAppUpdateSnapshotProvider(null);
  }, [
    currentMenuTab,
    activeModule,
    contractWizardOpen,
    editingContractId,
    contractWizardProspectoId,
    newContractForm,
    ventasFichaProspectoId,
    compCups,
    compClient,
    compTipo,
    compConsumo,
    compTarifaActual,
    compSegment,
    compAccessTariff,
    compPotencias,
    compConsumos,
    compRentMeter,
    compCurrentBill,
    compResults,
    compSummary,
  ]);

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
    if (data.compania) patch.wizardStep = 'cliente';
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
  const [newUserManager, setNewUserManager] = useState<string>('');
  
  // Interactive Simulation variables for advanced Usuarios portal features
  const [activeUserForSheet, setActiveUserForSheet] = useState<Profile | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [userSearchText, setUserSearchText] = useState<string>('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('all');

  // Comparison history search & interactive commission calculator states
  const [compHistorySearch, setCompHistorySearch] = useState<string>('');
  const [selectedComparisonIds, setSelectedComparisonIds] = useState<string[]>([]);
  const [isGeneratingJointPdf, setIsGeneratingJointPdf] = useState<boolean>(false);
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
  const [isDeletingUserId, setIsDeletingUserId] = useState<string | null>(null);
  const [isBajaLoading, setIsBajaLoading] = useState<boolean>(false);
  const [isActivatingContractLoading, setIsActivatingContractLoading] = useState<boolean>(false);
  const [isConsolidating, setIsConsolidating] = useState<boolean>(false);
  const [isBajaOpen, setIsBajaOpen] = useState<boolean>(false);
  const [selectedContractForBaja, setSelectedContractForBaja] = useState<Contract | null>(null);
  const [bajaDate, setBajaDate] = useState<string>(() => todayInputDate());
  const [bajaMotivo, setBajaMotivo] = useState<string>('');

  // Contract Activation and Commission Distribution states
  const [isActivateOpen, setIsActivateOpen] = useState<boolean>(false);
  const [selectedContractForActivation, setSelectedContractForActivation] = useState<Contract | null>(null);
  const [activatePowerKw, setActivatePowerKw] = useState<number>(15);
  const [activateConsumoKwh, setActivateConsumoKwh] = useState<number>(25000);
  const [activateEffectiveDate, setActivateEffectiveDate] = useState<string>(() => todayInputDate());
  const [activateMotivo, setActivateMotivo] = useState<string>('');

  // Historial de Comparativas state
  const [comparisonsHistory, setComparisonsHistory] = useState<any[]>([
    { id: 'comp-1', clientName: 'Ferretería El Candado', cups: 'ES0021000000882244XX', accessTariff: '3.0TD', currentAnnualExpense: 4800, maxAnnualSavings: 960, bestTariffName: 'EnerLuz Inteligente Indexada', date: '2026-05-18' },
    { id: 'comp-2', clientName: 'Lavandería Burbujas', cups: 'ES0021000000119988YY', accessTariff: '2.0TD', currentAnnualExpense: 2300, maxAnnualSavings: 450, bestTariffName: 'EnerLuz Inteligente Indexada', date: '2026-05-20' },
    { id: 'comp-3', clientName: 'Conservas del Cantábrico', cups: 'ES0021000000776655ZZ', accessTariff: '6.0TD', currentAnnualExpense: 14500, maxAnnualSavings: 3100, bestTariffName: 'EnerLuz Industrial Pool Max 6.0', date: '2026-05-22' }
  ]);

  const filteredComparisonsHistory = useMemo(() => {
    const query = compHistorySearch.trim().toLowerCase();
    if (!query) return comparisonsHistory;
    return comparisonsHistory.filter(
      (item) =>
        item.clientName.toLowerCase().includes(query) ||
        item.cups.toLowerCase().includes(query)
    );
  }, [comparisonsHistory, compHistorySearch]);

  const selectedComparisonsSavings = useMemo(
    () =>
      comparisonsHistory
        .filter((item) => selectedComparisonIds.includes(item.id))
        .reduce((acc, item) => acc + (item.maxAnnualSavings || 0), 0),
    [comparisonsHistory, selectedComparisonIds]
  );

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
      setCurrentMenuTab('Liquidaciones externas');
    }
    setIsLoggedIn(true);
  }

  const triggerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    const searchEmail = normalizeLoginEmail(loginEmail);

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setLoginLoading(false);
        setLoginError('Cliente Supabase no disponible.');
        return;
      }

      const signIn = await supabase.auth.signInWithPassword({
        email: searchEmail,
        password: loginPassword,
      });

      if (!signIn.error && signIn.data.session?.user) {
        const user = signIn.data.session.user;
        let bridge = parseAuthProfileBridge(user);
        const erpLookup = await getErpComercialByEmail(searchEmail);
        const erpRow = erpLookup.ok ? erpLookup.data : null;

        if (!bridge && erpRow) {
          bridge = {
            comercialId: erpRow.id,
            role: erpRow.role,
            fullName: erpRow.full_name,
          };
        }

        if (!bridge) {
          await supabase.auth.signOut();
          setLoginLoading(false);
          setLoginError(
            'Sesión iniciada pero falta vincular comercial_id/role en Auth. Revisa la metadata del usuario en Supabase.'
          );
          return;
        }

        const access = await isErpComercialLoginAllowed(searchEmail, bridge.comercialId);
        if (!access.ok) {
          setLoginLoading(false);
          setLoginError(access.message);
          return;
        }
        if (!access.data) {
          await supabase.auth.signOut();
          setLoginLoading(false);
          setLoginError('La cuenta de este agente se encuentra suspendida temporalmente por administración.');
          return;
        }

        const profile = erpRow
          ? mergeErpRowsIntoProfiles([erpRow], profiles)[0]
          : profileFromAuthBridge(searchEmail, bridge);

        if (erpRow) {
          setProfiles((prev) => mergeErpRowsIntoProfiles([erpRow], prev));
        } else {
          setProfiles((prev) => {
            const without = prev.filter((item) => item.id !== profile.id);
            return [...without, profile];
          });
        }

        applyLoginProfile(profile);
        setLoginLoading(false);
        return;
      }

      const erpLookup = await getErpComercialByEmail(searchEmail);
      if (!erpLookup.ok || !erpLookup.data) {
        setLoginLoading(false);
        setLoginError('Credenciales incorrectas: Correo no registrado en el servidor corporativo de ENERSAVE.');
        return;
      }

      const authMessage = signIn.error?.message.toLowerCase() ?? '';
      if (authMessage.includes('invalid login') || authMessage.includes('invalid credentials')) {
        setLoginLoading(false);
        setLoginError('Contraseña incorrecta.');
        return;
      }

      setLoginLoading(false);
      setLoginError(`No se pudo conectar con Supabase: ${signIn.error?.message ?? 'Error desconocido'}`);
      return;
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

    applyLoginProfile(matches);
    setLoginLoading(false);
  };

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    void (async () => {
      const result = await listErpComerciales();
      if (cancelled) return;

      if (result.ok && result.data.length > 0) {
        setProfiles(mergeErpRowsIntoProfiles(result.data, []));
      }

      const status = await getAuthSessionStatus();
      if (cancelled || !status.ok) return;

      const erpLookup = await getErpComercialByEmail(status.email);
      let profile: Profile;
      if (erpLookup.ok && erpLookup.data) {
        profile = mergeErpRowsIntoProfiles([erpLookup.data], [])[0];
        setProfiles((prev) => mergeErpRowsIntoProfiles([erpLookup.data!], prev));
      } else {
        profile = profileFromAuthBridge(status.email, status.profile);
      }

      if (profile.status === 'suspendido') return;
      applyLoginProfile(profile);
    })();
    return () => {
      cancelled = true;
    };
    // Solo al montar: cargar usuarios reales e intentar restaurar sesión Auth
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Carga los datos reales una vez hay sesión: todas las policies son
  // `to authenticated`, así que antes del login los SELECT devolverían 0 filas.
  // Cada colección cae por separado al seed local si su tabla falla o está vacía,
  // y se cargan juntas para que los clientes de la tabla ganen a los derivados
  // de los contratos en lugar de depender de qué petición termine antes.
  useEffect(() => {
    if (!isLoggedIn || !isSupabaseConfigured()) return;
    let cancelled = false;

    void (async () => {
      const [contractsResult, clientsResult, incidenciasResult, settlementsResult, avisosResult, calendarioResult] =
        await Promise.all([
          listTeamContracts(),
          listClientes(),
          listIncidencias(),
          listSettlements(),
          listAvisos(),
          listCalendarioEventos(),
        ]);
      if (cancelled) return;

      const missingTables: string[] = [];
      const errors: string[] = [];

      function unwrap<T>(result: SupabaseResult<T[]>, table: string): T[] | null {
        if (result.ok === true) return result.data.length > 0 ? result.data : null;
        const failure = result as SupabaseFailure;
        if (failure.reason === 'table_missing') missingTables.push(table);
        else errors.push(`${table}: ${failure.message}`);
        return null;
      }

      const loadedContracts = unwrap(contractsResult, 'contratos_equipo');
      const loadedClients = unwrap(clientsResult, 'clientes');
      const loadedIncidencias = unwrap(incidenciasResult, 'incidencias');
      const loadedSettlements = unwrap(settlementsResult, 'settlements');

      // Sin filas propias en `clientes`, los clientes se siguen derivando de los
      // contratos como hasta ahora, para no vaciar la pantalla de Mis Clientes.
      const effectiveClients =
        loadedClients ?? (loadedContracts ? buildClientsFromContracts(loadedContracts) : null);

      if (effectiveClients) {
        const reference = loadedContracts ?? contracts;
        setClients(syncClientEstados(effectiveClients, reference));
        if (loadedClients) setClientsSource('supabase');
      }

      if (loadedContracts) {
        setContracts(linkContractsToClients(loadedContracts, effectiveClients ?? clients));
        setContractsSource('supabase');
      }

      if (loadedIncidencias) {
        setIncidencias(loadedIncidencias);
        setIncidenciasSource('supabase');
      }

      if (loadedSettlements) {
        setSettlements(loadedSettlements);
        setSettlementsSource('supabase');
      }

      if (avisosResult.ok) {
        setAvisos(avisosResult.data);
        setAvisosSource('supabase');
      } else {
        const failure = avisosResult as SupabaseFailure;
        if (failure.reason === 'table_missing') missingTables.push('avisos');
        else errors.push(`avisos: ${failure.message}`);
      }

      if (calendarioResult.ok) {
        setCalendarioEventos(calendarioResult.data);
      } else {
        const failure = calendarioResult as SupabaseFailure;
        if (failure.reason === 'table_missing') missingTables.push('calendario_eventos');
        else errors.push(`calendario_eventos: ${failure.message}`);
      }

      if (missingTables.length > 0) {
        toast.warning(
          `Faltan tablas en Supabase (${missingTables.join(', ')}). Se muestran los datos de demostración.`
        );
      }
      if (errors.length > 0) toast.warning(`No se pudieron cargar algunos datos. ${errors.join(' · ')}`);
    })();

    return () => {
      cancelled = true;
    };
    // Se ejecuta una sola vez por sesión: `contracts` y `clients` solo se leen
    // como valor de respaldo y no deben reactivar la carga.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  const unviewedAvisos = useMemo(
    () => avisos.filter((aviso) => !aviso.vistoPor.includes(activeUserId)),
    [avisos, activeUserId]
  );

  useEffect(() => {
    if (!isLoggedIn || activeModule !== 'erp') return;
    if (unviewedAvisos.length > 0) setAvisosModalOpen(true);
  }, [isLoggedIn, activeModule, unviewedAvisos.length]);

  useEffect(() => {
    if (!isLoggedIn || !isSupabaseConfigured()) return;
    if (activeRole !== 'tramitacion' && activeRole !== 'superadmin') return;

    const unsubscribe = subscribeContratosEquipoInserts(({ contract, comercialId, comercialName }) => {
      setContracts((prev) => {
        if (prev.some((item) => item.id === contract.id)) return prev;
        return [contract, ...prev];
      });
      setTramitacionInsertBuffer((prev) =>
        pushInsertBufferEvent(prev, {
          contractId: contract.id,
          comercialId,
          comercialName,
          insertedAt: Date.now(),
        })
      );
    });

    return () => {
      unsubscribe?.();
    };
  }, [isLoggedIn, activeRole]);

  /**
   * Refleja en Supabase un cambio ya aplicado al estado local. No-op con datos de
   * demostración, cuyos ids no son UUID y no existen en la tabla.
   */
  function reportPersistFailure(result: SupabaseResult<unknown>) {
    if (result.ok === false) {
      toast.warning(`Cambio aplicado en la app pero no guardado en Supabase: ${result.message}`);
    }
  }

  const persistContractPatch = useCallback(
    (id: string, patch: Partial<Contract>) => {
      if (contractsSource !== 'supabase') return;
      void updateTeamContract(id, patch).then(reportPersistFailure);
    },
    [contractsSource]
  );

  const persistClientPatch = useCallback(
    (id: string, patch: Partial<Client>) => {
      if (clientsSource !== 'supabase') return;
      void updateCliente(id, patch).then(reportPersistFailure);
    },
    [clientsSource]
  );

  const persistIncidenciaPatch = useCallback(
    (id: string, patch: Partial<IncidenciaTicket>) => {
      if (incidenciasSource !== 'supabase') return;
      void updateIncidencia(id, patch).then(reportPersistFailure);
    },
    [incidenciasSource]
  );

  const persistSettlementPatch = useCallback(
    (id: string, patch: Partial<Settlement>) => {
      if (settlementsSource !== 'supabase') return;
      void updateSettlement(id, patch).then(reportPersistFailure);
    },
    [settlementsSource]
  );

  /**
   * Inserta la fila y devuelve el id definitivo que ha generado Postgres, para
   * poder reemplazar el id temporal del estado local (`inc-…`, `liq-…`).
   */
  const persistNewIncidencia = useCallback(
    (incidencia: IncidenciaTicket) => {
      if (incidenciasSource !== 'supabase') return;
      void createIncidencia(incidencia).then((result) => {
        if (result.ok === false) return reportPersistFailure(result);
        setIncidencias((prev) =>
          prev.map((i) => (i.id === incidencia.id ? { ...result.data } : i))
        );
      });
    },
    [incidenciasSource]
  );

  const persistNewSettlements = useCallback(
    (created: Settlement[]) => {
      if (settlementsSource !== 'supabase') return;
      created.forEach((settlement) => {
        void createSettlement(settlement).then((result) => {
          if (result.ok === false) return reportPersistFailure(result);
          setSettlements((prev) =>
            prev.map((s) => (s.id === settlement.id ? { ...result.data } : s))
          );
        });
      });
    },
    [settlementsSource]
  );

  const persistNewClient = useCallback(
    (client: Client) => {
      if (clientsSource !== 'supabase') return;
      void createCliente(client).then((result) => {
        if (result.ok === false) return reportPersistFailure(result);
        setClients((prev) => prev.map((c) => (c.id === client.id ? { ...result.data } : c)));
      });
    },
    [clientsSource]
  );

  /**
   * upsertClient no distingue alta de actualización, así que se deduce del
   * tamaño de la lista para elegir entre INSERT y UPDATE.
   */
  const persistUpsertedClient = useCallback(
    (before: Client[], after: Client[], client: Client) => {
      if (clientsSource !== 'supabase') return;
      if (after.length > before.length) persistNewClient(client);
      else persistClientPatch(client.id, client);
    },
    [clientsSource, persistNewClient, persistClientPatch]
  );

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
      pricingType: 'fijo' | 'indexado';
      sinSva: boolean;
      potenciaBoe: boolean;
    }

    const candidateProfiles = buildComparadorCandidates({
      accessTariff: compAccessTariff,
      segment: compSegment,
      tipo: compTipo,
      marcoRows: marcoRowsForComparador.length > 0 ? marcoRowsForComparador : undefined,
    });

    let testProfiles: SetupTariff[] = candidateProfiles.map((profile) => ({
      companyName: profile.companyName,
      tariffName: profile.tariffName,
      potRates: profile.potRates,
      conRates: profile.conRates,
      pricingType: profile.pricingType,
      sinSva: profile.sinSva,
      potenciaBoe: profile.potenciaBoe,
    }));

    testProfiles = testProfiles.filter((profile) =>
      matchesCompProposalFilters(profile, compProposalFilters)
    );

    if (testProfiles.length === 0) {
      setCompResults([]);
      setCompSummary(null);
      setMatchingRate(null);
      return;
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
        potRates: prof.potRates,
        conRates: prof.conRates,
        isBestOption: false,
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
      const savingsAnnual = currentAnnualExpense - opt.annualCost;
      const savingsPercentage = Math.round((savingsAnnual / currentAnnualExpense) * 100);

      return {
        ...opt,
        savingsAnnual: Math.round(savingsAnnual),
        savingsPercentage: savingsPercentage,
      };
    });

    const totalConsumoAnual =
      Number(compConsumos.p1 || 0) +
      Number(compConsumos.p2 || 0) +
      Number(compConsumos.p3 || 0) +
      Number(compConsumos.p4 || 0) +
      Number(compConsumos.p5 || 0) +
      Number(compConsumos.p6 || 0);

    const markedOptions = sortComparadorOptions(finalOptions, compSortMode, {
      accessTariff: compAccessTariff,
      commissionPercentage: activeUser.commissionPercentage,
      consumoAnual: totalConsumoAnual > 0 ? totalConsumoAnual : compConsumo,
      formatCurrency,
    });

    const topOptions = markedOptions.slice(0, 3);
    const best = topOptions[0] ?? markedOptions[0];

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

  async function handleDownloadComparadorPdf(option?: NonNullable<typeof compResults>[number]) {
    if (!compResults || !compSummary) {
      toast.error('Ejecuta la comparativa antes de descargar el PDF.');
      return;
    }
    const best = option ?? compResults.find((o) => o.isBestOption) ?? compResults[0];
    try {
      const input = mapComparadorToEstudioAhorro({
        clienteNombre: compClient || 'Cliente',
        cups: compCups,
        accessTariff: compAccessTariff,
        tarifaActualNombre: compTarifaActual,
        potencias: compPotencias,
        consumos: compConsumos,
        rentMeterMonthly: compRentMeter,
        currentBillMonthly: compCurrentBill,
        bestOption: best,
        summary: compSummary,
      });
      const blob = await generateEstudioAhorroPdf(input);
      downloadEstudioAhorroPdf(blob, compClient || 'cliente');
      toast.success('Estudio de ahorro descargado correctamente.');
    } catch (error) {
      console.error(error);
      toast.error('No se pudo generar el PDF. Inténtalo de nuevo.');
    }
  }

  async function handleDownloadHistoryPdf(item: {
    clientName: string;
    cups: string;
    accessTariff: string;
    currentAnnualExpense: number;
    maxAnnualSavings: number;
    bestTariffName: string;
  }) {
    try {
      const input = mapComparadorHistoryToEstudioAhorro({
        clientName: item.clientName,
        cups: item.cups,
        accessTariff: item.accessTariff,
        currentAnnualExpense: item.currentAnnualExpense,
        maxAnnualSavings: item.maxAnnualSavings,
        bestTariffName: item.bestTariffName,
      });
      const blob = await generateEstudioAhorroPdf(input);
      downloadEstudioAhorroPdf(blob, item.clientName);
      toast.success('Estudio de ahorro descargado correctamente.');
    } catch (error) {
      console.error(error);
      toast.error('No se pudo generar el PDF. Inténtalo de nuevo.');
    }
  }

  function toggleComparisonSelection(id: string) {
    setSelectedComparisonIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleDownloadJointHistoryPdf() {
    const selected = comparisonsHistory.filter((item) => selectedComparisonIds.includes(item.id));
    if (selected.length < 2) {
      toast.error('Selecciona al menos 2 comparativas para generar el estudio conjunto.');
      return;
    }

    setIsGeneratingJointPdf(true);
    try {
      const input = mapComparadorHistoryListToEstudioAhorroConjunto(
        selected.map((item) => ({
          clientName: item.clientName,
          cups: item.cups,
          accessTariff: item.accessTariff,
          currentAnnualExpense: item.currentAnnualExpense,
          maxAnnualSavings: item.maxAnnualSavings,
          bestTariffName: item.bestTariffName,
        }))
      );
      const blob = await generateEstudioAhorroConjuntoPdf(input);
      downloadEstudioAhorroPdf(blob, `estudio-ahorro-conjunto-${selected.length}-cups.pdf`);
      toast.success(`Estudio conjunto generado con ${selected.length} propuestas.`);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo generar el estudio conjunto. Inténtalo de nuevo.');
    } finally {
      setIsGeneratingJointPdf(false);
    }
  }

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
    compCurrentBill,
    compProposalFilters,
    compSortMode,
    compTipo,
    marcoRowsForComparador,
    activeUser.commissionPercentage,
  ]);

  // Open the detailed contract modal from comparator offer card
  async function handleComparadorInvoiceOcr(file: File) {
    setCompOcrLoading(true);
    setCompOcrProgress('Leyendo factura…');
    try {
      const ocr = await extractContractDataFromDocument(file, setCompOcrProgress);
      const applied = applyComparadorOcrResult(ocr, {
        setCompCups,
        setCompTipo,
        setCompCompaniaActual,
        setCompTarifaActual,
        setCompAccessTariff,
        setCompPotencias,
        setCompConsumos,
        setCompCurrentBill,
        setCompProposalFilters,
      });
      if (applied > 0) {
        toast.success(
          applied === 1
            ? 'Dato de la factura aplicado al comparador.'
            : `${applied} datos de la factura aplicados al comparador.`
        );
      } else {
        toast.message('Factura leída. Completa manualmente los campos que falten.');
      }
    } catch (error) {
      console.error(error);
      toast.error('No se pudo procesar la factura. Puedes rellenar el formulario a mano.');
    } finally {
      setCompOcrLoading(false);
      setCompOcrProgress(null);
    }
  }

  async function handleGenerarEmailPropuesta(option: {
    id: string
    companyName: string
    tariffName: string
    savingsAnnual: number
    savingsPercentage?: number
  }) {
    setEmailPropuestaGeneratingId(option.id);
    setEmailPropuestaOpen(true);
    setEmailPropuestaLoading(true);
    setEmailPropuestaDestino('');
    setEmailPropuestaAsunto('');
    setEmailPropuestaCuerpo('');

    const tarifaActualCompania = compCompaniaActual.trim() || 'su compañía actual';
    const result = await generarEmailPropuesta({
      clienteNombre: compClient.trim() || 'cliente',
      contactoNombre: compClient.trim() || undefined,
      empresaNombre: compSegment === 'pyme' ? compClient.trim() || undefined : undefined,
      tarifaActual: {
        compania: tarifaActualCompania,
        tipo: inferTarifaPrecioTipoFromNombre(compTarifaActual),
      },
      tarifaPropuesta: {
        compania: option.companyName,
        tipo: inferTarifaPrecioTipoFromNombre(option.tariffName),
      },
      ahorroAnualEur: option.savingsAnnual,
      ahorroPct: option.savingsPercentage ?? 0,
      periodosMayorConsumo: buildPeriodosMayorConsumo(compConsumos),
    });

    setEmailPropuestaAsunto(result.asunto);
    setEmailPropuestaCuerpo(result.cuerpo);
    setEmailPropuestaLoading(false);
    setEmailPropuestaGeneratingId(null);
  }

  function handleOpenEmailPropuestaMailClient() {
    window.location.href = buildMailtoHref(
      emailPropuestaDestino,
      emailPropuestaAsunto,
      emailPropuestaCuerpo
    );
    setEmailPropuestaOpen(false);
  }

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
      estado: 'PTE DE FIRMA',
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

    // Comisión provisional: se confirma al activar el contrato (misma fila, nuevos importes).
    const newSettlementObj = buildPendingContractSettlement({
      id: `liq-${settlements.length + 1}`,
      contractId: newContractObj.id,
      comercialId: userAsSeller.id,
      comercialName: userAsSeller.fullName,
      montoInterno: Math.round(internalMargin * 100) / 100,
      montoExterno: Math.round(externalAdvisorMargin * 100) / 100,
      tipo: compTipo,
      clientName: modalClientName,
      createdAt: new Date().toISOString().split('T')[0],
    });

    setContracts(contractsWithNew);
    setSettlements([newSettlementObj, ...settlements]);
    persistUpsertedClient(clients, clientsAfterUpsert, linkedClient);
    persistNewSettlements([newSettlementObj]);

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
      setCurrentMenuTab('Liquidaciones externas');
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
        const breakdown = computeComisionBreakdown(
          marcoEntry,
          commissionPct,
          consumo,
          formatCurrency
        );
        internalMargin = breakdown.comisionEmpresa;
        externalAdvisorMargin = breakdown.comisionComercial;
      }

      const registrationDate = new Date().toISOString().split('T')[0];

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
        buildPotenciaContratadaFromPeriods(form) || form.potenciaContratada;

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
        ? CONTRACT_ESTADO_BORRADOR
        : CONTRACT_ESTADO_INICIAL;

      const supplyTipo = form.tipo === "gas" ? "gas" : "luz"

      const newContractObj: Contract = {
        id: `con-${contracts.length + 1}`,
        clientId: linkedClient.id,
        clientName: form.clientName.trim() || 'Pendiente de información',
        cups: form.cups ? form.cups.toUpperCase().trim() : 'PENDIENTE',
        tipo: supplyTipo,
        compania: form.compania || '—',
        tarifa: form.tarifa || '—',
        consumoAnual: consumo,
        montoInterno: Math.round(internalMargin * 100) / 100,
        montoExterno: Math.round(externalAdvisorMargin * 100) / 100,
        estado: contractEstado,
        comercialId: userAsSeller.id,
        comercialName: userAsSeller.fullName,
        createdAt: '',
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
        documentos: (() => {
          const flat = flattenDocumentosPorTipo(form.documentosPorTipo);
          return flat.length > 0 ? flat : undefined;
        })(),
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
          'Contrato guardado en la app. Falta la tabla contratos_equipo en Supabase.'
        );
      } else if (supabaseResult.reason === 'rls_denied') {
        toast.warning(
          'Contrato guardado en la app. Sin permiso para insertar en Supabase: aplica la migración contratos_equipo_insert_policy (SQL Editor).'
        );
      } else {
        toast.warning(`Contrato guardado en la app. Supabase: ${supabaseResult.message}`);
      }

      const contractsWithNew = [newContractObj, ...contracts];
      setClients(syncClientEstados(clientsAfterUpsert, contractsWithNew));

      if (!isIncomplete && internalMargin > 0) {
        const newSettlementObj = buildPendingContractSettlement({
          id: `liq-${settlements.length + 1}`,
          contractId: newContractObj.id,
          comercialId: userAsSeller.id,
          comercialName: userAsSeller.fullName,
          montoInterno: Math.round(internalMargin * 100) / 100,
          montoExterno: Math.round(externalAdvisorMargin * 100) / 100,
          tipo: form.tipo,
          clientName: form.clientName.trim() || 'Sin nombre',
          createdAt: new Date().toISOString().split('T')[0],
        });
        setSettlements([newSettlementObj, ...settlements]);
        persistNewSettlements([newSettlementObj]);
      }

      setContracts(contractsWithNew);
      persistUpsertedClient(clients, clientsAfterUpsert, linkedClient);

      resetNewContractForm();
      onSuccess?.();

      toast.success(
        isIncomplete
          ? 'Contrato guardado como borrador.'
          : `¡Contrato registrado! Comisión provisional de ${formatCurrency(newContractObj.montoExterno)} para ${userAsSeller.fullName} (se confirma al activar).`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el contrato';
      toast.error(msg);
    } finally {
      setIsCreatingContract(false);
    }
  };

  async function handleUpdateContractFromWizard(
    e: React.FormEvent,
    onSuccess?: () => void,
    options?: { incomplete?: boolean }
  ) {
    e.preventDefault();
    if (!editingContractId) return;

    const existing = contracts.find((c) => c.id === editingContractId);
    if (!existing) {
      toast.error('Contrato no encontrado.');
      return;
    }

    const form = newContractForm;
    const input = newContractFormToRegistrationInput(form);
    const validation = validateContractRegistration(input);
    const isIncomplete = options?.incomplete === true;

    if (!isIncomplete && !validation.valid) {
      toast.error(contractRegistrationErrorMessage(validation.missingLabels));
      return;
    }

    setIsCreatingContract(true);

    try {
      const consumo = form.consumoAnual === '' ? 0 : Number(form.consumoAnual);
      const precioFijo = parseFloat(String(form.precioFijoConsumo).replace(',', '.'));
      const potenciaStr =
        buildPotenciaContratadaFromPeriods(form) || form.potenciaContratada;
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

      const marcoEntry = form.marcoEntryId
        ? marcoRetributivoCatalog.find((entry) => entry.id === form.marcoEntryId)
        : marcoRetributivoCatalog.find(
            (entry) =>
              entry.compania === form.compania &&
              entry.tarifa === form.tarifa &&
              entry.tipo === form.tipo
          );

      const supplyTipo = form.tipo === 'gas' ? 'gas' : 'luz'

      const patch: Partial<Contract> = {
        clientName: form.clientName.trim() || existing.clientName,
        cups: form.cups ? form.cups.toUpperCase().trim() : existing.cups,
        tipo: supplyTipo,
        compania: form.compania || existing.compania || '—',
        tarifa: form.tarifa || existing.tarifa || '—',
        consumoAnual: consumo,
        consumoAnualManual: consumo,
        nif: form.nif,
        telefono: form.telefono,
        email: form.email,
        iban: form.iban,
        direccionSuministro: form.direccionSuministro,
        direccionCompleta: form.direccionFiscal
          ? `${form.direccionFiscal}${form.codigoPostal ? `, ${form.codigoPostal}` : ''}${form.poblacion ? ` ${form.poblacion}` : ''}${form.provincia ? ` (${form.provincia})` : ''}`
          : existing.direccionCompleta,
        potenciaContratada: potenciaStr,
        precioFijoConsumo: Number.isFinite(precioFijo) ? precioFijo : undefined,
        tipoPrecio:
          tipoPrecio === 'fijo' || tipoPrecio === 'mercado' ? tipoPrecio : undefined,
        tipoCliente: form.tipoCliente,
        formaPago: form.formaPago,
        direccionFiscal: form.direccionFiscal || undefined,
        codigoPostal: form.codigoPostal || undefined,
        poblacion: form.poblacion || undefined,
        provincia: form.provincia || undefined,
        comentariosInternos:
          form.comentariosInternos.length > 0 ? form.comentariosInternos : undefined,
        marcoEntryId: form.marcoEntryId || marcoEntry?.id || undefined,
        atr: marcoEntry?.peaje ?? existing.atr,
        documentos: (() => {
          const flat = flattenDocumentosPorTipo(form.documentosPorTipo)
          return flat.length > 0 ? flat : existing.documentos
        })(),
        ...(isIncomplete || !validation.valid
          ? { estado: CONTRACT_ESTADO_BORRADOR }
          : isContractBorrador(existing.estado) && validation.valid
            ? { estado: CONTRACT_ESTADO_INICIAL }
            : {}),
      };

      setContracts((prev) =>
        prev.map((c) => (c.id === editingContractId ? { ...c, ...patch } : c))
      );
      persistContractPatch(editingContractId, patch);

      resetNewContractForm();
      setEditingContractId(null);
      onSuccess?.();
      toast.success('Contrato actualizado.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar el contrato';
      toast.error(msg);
    } finally {
      setIsCreatingContract(false);
    }
  }

  async function handleDeleteContract(contractId: string) {
    const contract = contracts.find((item) => item.id === contractId);
    if (!contract) {
      toast.error('Contrato no encontrado.');
      return;
    }

    const formSnapshot =
      editingContractId === contractId ? newContractForm : undefined;

    if (
      !isContractDeletable(contract, {
        documentosPorTipo: formSnapshot?.documentosPorTipo,
      }) ||
      !canUserDeleteContract(contract, activeRole, activeUserId, formSnapshot)
    ) {
      toast.error(contractDeletionBlockedMessage());
      return;
    }

    const supabaseResult = await deleteTeamContract(contractId);
    if (supabaseResult.ok === false) {
      if (supabaseResult.reason === 'not_configured') {
        // Sin Supabase: eliminación solo local
      } else if (supabaseResult.reason === 'rls_denied') {
        toast.error('No tienes permiso para eliminar este contrato o ya no está en borrador.');
        return;
      } else {
        toast.warning(`Eliminado en la app. Supabase: ${supabaseResult.message}`);
      }
    }

    setContracts((prev) => prev.filter((item) => item.id !== contractId));
    setSettlements((prev) => prev.filter((item) => item.contractId !== contractId));

    if (editingContractId === contractId) {
      setContractWizardOpen(false);
      setEditingContractId(null);
      resetNewContractForm();
    }

    toast.success('Contrato eliminado.');
  }

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
    if (activeRole !== 'superadmin') {
      toast.error('Solo el superadmin puede eliminar usuarios.');
      return;
    }

    const user = profiles.find((p) => p.id === userId);
    if (!user) return;

    if (userId === activeUserId) {
      toast.error('No puedes eliminar tu propia cuenta.');
      return;
    }

    if (
      !confirm(
        `¿Eliminar a ${user.fullName}? Se borrarán sus credenciales de acceso en Supabase Auth y no podrá volver a entrar.`
      )
    ) {
      return;
    }

    setIsDeletingUserId(userId);
    const result = await deleteErpComercialUser(userId);
    setIsDeletingUserId(null);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    if (result.data.mode === 'deleted' || result.data.mode === 'revoked') {
      setProfiles((prev) => prev.filter((p) => p.id !== userId));
    }

    if (activeUserForSheet?.id === userId) {
      setActiveUserForSheet(null);
    }

    toast.success(
      result.data.message ??
        (result.data.mode === 'deleted'
          ? 'Usuario eliminado correctamente.'
          : 'Acceso revocado; historial comercial conservado.')
    );
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
    persistSettlementPatch(id, { estado: nextState as Settlement['estado'] });
    toast.success(`Liquidación ${id} para ${item?.comercialName} cambiada a ${nextState === 'pagado' ? '💰 PAGADA' : '⏳ PENDIENTE'}.`);
  };

  // Marks a contract as 'activo' and calculates commission from marco retributivo
  const handleActivateAndDistribute = (contractId: string, consumoKwh: number, potenciaKw: number) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;

    setIsActivatingContractLoading(true);

    setTimeout(() => {
      const comercialProfile = profiles.find(p => p.id === contract.comercialId);
      const commissionPct = comercialProfile?.commissionPercentage ?? 70;
      const marcoEntry = resolveMarcoCatalogEntry(
        contract.marcoEntryId,
        contract.compania,
        contract.tarifa,
        contract.tipo,
        marcoEntries
      );

      const breakdown = marcoEntry
        ? computeComisionBreakdown(marcoEntry, commissionPct, consumoKwh, formatCurrency)
        : null;

      const totalCom = breakdown?.comisionEmpresa ?? 0;
      const comercialShare = breakdown?.comisionComercial ?? 0;

      const managerId = comercialProfile?.managerId ?? null;
      const managerProfile = managerId ? profiles.find(p => p.id === managerId) : null;
      let jefeShare = 0;
      if (managerProfile && comercialProfile && totalCom > 0) {
        const overridePct = managerProfile.commissionPercentage - comercialProfile.commissionPercentage;
        if (overridePct > 0) {
          jefeShare = Math.round(totalCom * (overridePct / 100) * 100) / 100;
        }
      }

      const activationDate = activateEffectiveDate;

      const activationSettlementResult = applyActivationSettlements(settlements, {
        contract,
        commissionPct,
        totalCom,
        comercialShare,
        jefeShare,
        managerId,
        managerName: managerProfile?.fullName ?? null,
        activationDate,
      });

      const renewalSchedule = aplicaRenovacionAnual(contract)
        ? computeRenewalSchedule(activationDate)
        : { estadoRenovacion: 'No aplica' as const };

      const activationPatch: Partial<Contract> = {
        estado: 'ACTIVADO',
        createdAt: activationDate,
        estadoEfectivoDesde: activationDate,
        motivoCambioEstado: activateMotivo.trim() || undefined,
        consumoAnual: consumoKwh,
        potenciaContratada: potenciaKw,
        montoInterno: totalCom,
        montoExterno: comercialShare + jefeShare,
        fechaFin: renewalSchedule.fechaRenovacion,
        fechaRenovacion: renewalSchedule.fechaRenovacion,
        diasRenovacion: renewalSchedule.diasRenovacion,
        estadoRenovacion: renewalSchedule.estadoRenovacion,
      };

      setContracts(contracts.map(c => (c.id === contractId ? { ...c, ...activationPatch } : c)));
      persistContractPatch(contractId, activationPatch);

      setSettlements(activationSettlementResult.settlements);
      activationSettlementResult.updates.forEach(({ id, patch }) => persistSettlementPatch(id, patch));
      if (activationSettlementResult.creates.length > 0) {
        persistNewSettlements(activationSettlementResult.creates);
      }
      setIsActivatingContractLoading(false);
      setIsActivateOpen(false);
      setSelectedContractForActivation(null);

      if (breakdown) {
        toast.success(
          `Contrato activado. Comisión comercial: ${formatCurrency(comercialShare)}${jefeShare > 0 ? ` · Jefe: ${formatCurrency(jefeShare)}` : ''}.`
        );
      } else {
        toast.success('Contrato activado. No se encontró marco retributivo para calcular comisión.');
      }
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
      const { meses: limitMonths } = getRetroMonths(c.compania);

      let clawbackPercent = 0;
      let clawbackAmount = 0;

      if (diffMonths < limitMonths) {
        clawbackPercent = 1 - (diffMonths / limitMonths);
        clawbackAmount = c.montoExterno * clawbackPercent;
      }

      const clawbackAmountRounded = Math.round(clawbackAmount * 100) / 100;
      const internalClawbackRounded = Math.round(c.montoInterno * clawbackPercent * 100) / 100;

      // Update contracts list
      const bajaPatch: Partial<Contract> = {
        estado: 'Dado de Baja',
        fechaBaja: bajaDate,
        estadoEfectivoDesde: bajaDate,
        motivoCambioEstado: bajaMotivo.trim() || undefined,
        retrocomisionClawback: clawbackAmountRounded,
      };

      setContracts(contracts.map(item => (item.id === c.id ? { ...item, ...bajaPatch } : item)));
      persistContractPatch(c.id, bajaPatch);

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
      persistNewSettlements([negativeSettlement]);

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
    if (currentMenuTab === 'Liquidaciones externas' || currentMenuTab === 'Liquidaciones internas') {
      setLiqLoading(true);
      const timer = setTimeout(() => {
        setLiqLoading(false);
      }, 800);
      return () => clearTimeout(timer);
    }
    setLiquidacionesConsolidadasView('overview');
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

  const handleMarcarAvisosVistos = useCallback(
    async (avisoIds: string[]) => {
      for (const avisoId of avisoIds) {
        if (isSupabaseConfigured() && avisosSource === 'supabase') {
          const result = await marcarVisto(avisoId, activeUserId);
          if (result.ok) {
            setAvisos((prev) => prev.map((aviso) => (aviso.id === avisoId ? result.data : aviso)));
          }
          continue;
        }

        setAvisos((prev) =>
          prev.map((aviso) =>
            aviso.id === avisoId && !aviso.vistoPor.includes(activeUserId)
              ? { ...aviso, vistoPor: [...aviso.vistoPor, activeUserId] }
              : aviso
          )
        );
      }
    },
    [activeUserId, avisosSource]
  );

  const resolveAvisoPublisherName = useCallback(
    (userId: string) => profiles.find((profile) => profile.id === userId)?.fullName ?? userId,
    [profiles]
  );

  const incidenciasRef = useRef(incidencias);
  incidenciasRef.current = incidencias;

  const handleIntegrityBlocked = useCallback(
    (findings: IntegrityFinding[]) => {
      if (
        isRuntimeIntegrityBlockExempt({
          role: activeRole,
          integrityGuardBypass: activeUser.integrityGuardBypass,
        })
      ) {
        return;
      }

      const fp = securityIncidenciaFingerprint(findings);
      const storageKey = `integrity-reported-${fp}`;
      if (sessionStorage.getItem(storageKey)) return;
      sessionStorage.setItem(storageKey, new Date().toISOString());

      void recordRuntimeIntegrityBlock(findings, fp);

      const ticket = buildSecurityIncidencia({
        userId: activeUserId,
        userName: activeUser.fullName,
        findings,
        existingIncidencias: incidenciasRef.current,
      });
      setIncidencias((prev) => [ticket, ...prev]);
      persistNewIncidencia(ticket);
      toast.error('Sesión bloqueada: incidencia de seguridad enviada al superadmin.');
    },
    [
      activeRole,
      activeUser.integrityGuardBypass,
      activeUserId,
      activeUser.fullName,
      persistNewIncidencia,
    ]
  );

  const integrityGuardExempt = isRuntimeIntegrityBlockExempt({
    role: activeRole,
    integrityGuardBypass: activeUser.integrityGuardBypass,
  });

  const { blocked: integrityBlocked, findings: integrityFindings } =
    useRuntimeIntegrityGuard({
      enabled: isLoggedIn && isRuntimeIntegrityEnforced(),
      exemptFromBlock: integrityGuardExempt,
      onBlocked: handleIntegrityBlocked,
    });

  const ventasActor = useMemo(
    () => ({
      comercialId: activeUserId,
      comercialName: activeUser.fullName,
      role: mapVentasRole(activeRole),
    }),
    [activeUserId, activeUser.fullName, activeRole]
  );

  const convertGeneralDatabaseLeadToProspecto = useCallback(
    async (lead: GeneralDatabaseLead): Promise<string | null> => {
      const input = generalDatabaseLeadToProspectoInput(
        lead,
        ventasActor.comercialId,
        ventasActor.comercialName
      );
      const result = await createProspecto(input);
      if (!result.ok) {
        toast.error(result.message);
        return null;
      }
      setGeneralDbImportedLeadIds((prev) => {
        const next = new Set(prev);
        next.add(lead.id);
        sessionStorage.setItem('enersave-general-db-imported', JSON.stringify([...next]));
        return next;
      });
      return result.data.id;
    },
    [ventasActor.comercialId, ventasActor.comercialName]
  );

  const openVentasFromGeneralDatabase = useCallback((prospectoId: string) => {
    setActiveModule('ventas');
    setCurrentMenuTab('Pipeline');
    setVentasPipelineCentroMandoId(prospectoId);
  }, []);

  useEffect(() => {
    if (activeRole !== 'superadmin' || superadminViewMode !== 'tramitacion') return;
    const disallowedTabs = ['Comparador', 'Comparador de Facturas', 'Historial de Comparativas'];
    if (disallowedTabs.includes(currentMenuTab)) {
      setCurrentMenuTab('Dashboard');
    }
  }, [activeRole, superadminViewMode, currentMenuTab]);

  useEffect(() => {
    if (currentMenuTab !== 'Usuarios' || !isErpOpsAdmin) return;

    let cancelled = false;
    async function loadErpUsers() {
      setIsSyncingErpUsers(true);
      const result = await listErpComerciales();
      if (!cancelled && result.ok) {
        setProfiles((prev) => mergeErpRowsIntoProfiles(result.data, prev))
      } else if (!cancelled && result.ok === false) {
        console.warn('[Usuarios] Supabase sync:', result.message)
      }
      if (!cancelled) setIsSyncingErpUsers(false);
    }

    loadErpUsers();
    return () => {
      cancelled = true;
    };
  }, [currentMenuTab, activeRole]);

  function navigateToContract(contract: Contract) {
    setHighlightContractId(contract.id);
    setContractsSearchQuery(contract.cups);
    setContractsListFilter('all');
    setCurrentMenuTab(activeModule === 'ventas' ? 'Mis Contratos' : 'Contratos');
    toast.info(`Contrato ${contract.cups} — pantalla Contratos`);
  }

  function navigateToRenovacionProxima() {
    setHighlightContractId(null);
    setContractsSearchQuery('');
    setContractsListFilter('renovacion_proxima');
    setActiveModule('erp');
    setCurrentMenuTab('Contratos');
    toast.info(
      activeRole === 'superadmin' && superadminViewMode === 'comercial'
        ? 'Tus contratos con renovación próxima'
        : 'Contratos con renovación próxima'
    );
  }

  function navigateToContratosEstadoKpi(filter: ContractEstadoKpiFilter) {
    setHighlightContractId(null);
    setContractsSearchQuery('');
    setContractsListFilter(filter);
    setActiveModule('erp');
    setCurrentMenuTab('Contratos');
    toast.info('Contratos filtrados por estado');
  }

  function handleDashboardNavigate(target: DashboardNavigateTarget) {
    setActiveModule('erp');
    switch (target) {
      case 'contratos_activos':
        setContractsListFilter('activado');
        setCurrentMenuTab('Contratos');
        break;
      case 'contratos_nuevos':
      case 'bajas':
      case 'contratos':
        setContractsListFilter('all');
        setCurrentMenuTab('Contratos');
        break;
      case 'incidencias':
        setCurrentMenuTab('Incidencias');
        break;
      case 'comparativas':
        setCurrentMenuTab('Comparador');
        break;
      case 'comerciales':
        setCurrentMenuTab('Usuarios');
        break;
      case 'oportunidades_mejora':
        if (!canViewTarifaRecommendations) break;
        setActiveModule('erp');
        setContractsListFilter('con_recomendacion');
        setCurrentMenuTab('Contratos');
        toast.info('Contratos propios con oportunidad de mejora tarifaria');
        break;
      case 'renovaciones_proximas':
        navigateToRenovacionProxima();
        break;
      default:
        break;
    }
  }

  function openContractWizardBlank() {
    resetNewContractForm();
    setContractWizardProspectoId(null);
    setEditingContractId(null);
    setContractWizardOpen(true);
  }

  function openContractWizardForEdit(contract: Contract) {
    if (showTramitacionNotifications) {
      markContractReviewedByTramitacion(contract.id);
    }
    const comercial = profiles.find((p) => p.id === contract.comercialId);
    const jefe = comercial?.managerId
      ? profiles.find((p) => p.id === comercial.managerId)
      : undefined;
    patchNewContractForm({
      ...contractToNewContractForm(contract, {
        nombreComercial: contract.comercialName ?? comercial?.fullName ?? '',
        jefeEquipo: contract.jefeEquipo ?? jefe?.fullName ?? '',
      }),
    });
    setContractWizardProspectoId(null);
    setEditingContractId(contract.id);
    setContractWizardOpen(true);
  }

  function openContractWizardFromProducto(product: ProductoTarifa) {
    const user = profiles.find((p) => p.id === activeUserId) || profiles[0];
    const jefe = profiles.find((p) => p.id === user.managerId);
    const peajeType = getTariffPeajeType(product.peaje);
    const energiaP1 = product.precios.energia.p1;
    const potenciaP1 = product.precios.potencia.p1;

    resetNewContractForm();
    patchNewContractForm({
      compania: product.compania,
      tarifa: product.tarifa,
      tipo: product.tipo,
      marcoEntryId: product.id,
      wizardStep: 'cliente',
      wizardSegment: product.wizardSegment,
      tipoCliente: product.tipoCliente,
      tipoPrecio: inferTipoPrecioFromTarifa(product.tarifa),
      ...(energiaP1 != null ? { precioFijoConsumo: String(energiaP1) } : {}),
      ...(potenciaP1 != null
        ? {
            potenciaContratada: String(potenciaP1),
            ...spreadPotenciaFromP1(String(potenciaP1), peajeType),
          }
        : {}),
      nombreComercial: user.fullName,
      jefeEquipo: jefe?.fullName ?? '',
    });
    setContractWizardProspectoId(null);
    setContractWizardOpen(true);
  }

  function openContractWizardFromRecommendation(
    contract: Contract,
    recommendation: TarifaRecommendation
  ) {
    const row = marcoEntries.find((e) => e.id === recommendation.tarifaRecomendadaId);
    if (!row) {
      toast.error('No se encontró la tarifa recomendada en el marco retributivo.');
      return;
    }
    openContractWizardFromProducto(marcoRowToProducto(row));
    patchNewContractForm({
      clientName: contract.clientName,
      cups: contract.cups,
      nif: contract.nif ?? '',
      telefono: contract.telefono ?? '',
      email: contract.email ?? '',
      iban: contract.iban ?? '',
      direccionSuministro: contract.direccionSuministro ?? '',
      direccionCompleta: contract.direccionCompleta ?? '',
      consumoAnual: String(contract.consumoAnualManual ?? contract.consumoAnual ?? ''),
      potenciaContratada: contract.potenciaContratada != null ? String(contract.potenciaContratada) : '',
      precioFijoConsumo:
        contract.precioFijoConsumo != null ? String(contract.precioFijoConsumo) : '',
      wizardStep: 'cliente',
    });
    toast.success(`Wizard prellenado con ${recommendation.companiaRecomendada}`);
  }

  async function handleDownloadRecommendationPdf(
    contract: Contract,
    recommendation: TarifaRecommendation
  ) {
    const demoInput = getDemoEstudioAhorroInput({
      nombre: contract.clientName,
      cups: contract.cups,
      direccion: contract.direccionSuministro ?? contract.direccionCompleta,
    })

    try {
      let input = demoInput
      try {
        input = mapRecommendationToEstudioAhorro(contract, recommendation, marcoEntries)
      } catch (mapError) {
        console.warn('[PDF] Mapeo dinámico fallido, usando demo embebido', mapError)
      }
      const blob = await generateEstudioAhorroPdf(input)
      downloadEstudioAhorroPdf(blob, recommendationPdfFilename(recommendation))
      toast.success('PDF de estudio de ahorro generado')
    } catch (error) {
      console.error(error)
      try {
        const blob = await generateEstudioAhorroPdf(demoInput)
        downloadEstudioAhorroPdf(blob, recommendationPdfFilename(recommendation))
        toast.success('PDF de estudio de ahorro generado (plantilla demo)')
      } catch (fallbackError) {
        console.error(fallbackError)
        toast.error('No se pudo generar el PDF.')
      }
    }
  }

  async function handleDownloadJointContractsPdf(selectedContracts: Contract[]) {
    const withRec = selectedContracts.filter((c) => tarifaRecommendations?.has(c.id));
    if (withRec.length === 0) {
      toast.error('Ningún contrato seleccionado tiene recomendación tarifaria.');
      return;
    }

    setIsGeneratingJointPdf(true);
    try {
      const estudios = withRec.map((c) => {
        const rec = tarifaRecommendations!.get(c.id)!;
        try {
          return mapRecommendationToEstudioAhorro(c, rec, marcoEntries);
        } catch {
          return getDemoEstudioAhorroInput({
            nombre: c.clientName,
            cups: c.cups,
            direccion: c.direccionSuministro ?? c.direccionCompleta,
          });
        }
      });

      const input = {
        fechaGeneracion: new Intl.DateTimeFormat('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date()),
        titular:
          withRec.length === 1
            ? withRec[0].clientName
            : `${withRec.length} suministros`,
        estudios,
      };

      const blob = await generateEstudioAhorroConjuntoPdf(input);
      downloadEstudioAhorroPdf(blob, 'estudio-ahorro-conjunto.pdf');
      toast.success(`PDF conjunto generado (${estudios.length} CUPS)`);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo generar el PDF conjunto.');
    } finally {
      setIsGeneratingJointPdf(false);
    }
  }

  function handleDismissRecommendation(contractId: string) {
    dismissRecommendation(contractId);
    setRecommendationDismissVersion((v) => v + 1);
    toast.message('Recomendación descartada durante 30 días');
  }

  function handleDismissRenewalAlert(contractId: string) {
    dismissRenewalAlert(contractId);
    setRenewalDismissVersion((v) => v + 1);
    toast.message('Renovación marcada como gestionada durante 30 días');
  }

  function openContractWizardForProspecto(prospecto: Prospecto) {
    const user = profiles.find((p) => p.id === activeUserId) || profiles[0];
    const jefe = profiles.find((p) => p.id === user.managerId);
    patchNewContractForm({
      ...EMPTY_NEW_CONTRACT_FORM,
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

  const isSuperadminComercialView =
    activeRole === 'superadmin' && superadminViewMode === 'comercial';

  const canViewTarifaRecommendations =
    activeRole === 'comercial' ||
    activeRole === 'jefe_comercial' ||
    isSuperadminComercialView;

  const ownContractsForRecommendations = useMemo(
    () => contracts.filter((c) => c.comercialId === activeUserId),
    [contracts, activeUserId]
  );

  const tarifaRecommendations = useMemo(() => {
    if (!canViewTarifaRecommendations) {
      return new Map<string, TarifaRecommendation>();
    }
    const raw = calcularRecomendacionesParaContratos(
      ownContractsForRecommendations,
      marcoEntries,
      profiles.map((p) => ({
        id: p.id,
        commissionPercentage: p.commissionPercentage,
      })),
      formatCurrency
    );
    return filterUndismissedRecommendations(raw);
  }, [
    canViewTarifaRecommendations,
    ownContractsForRecommendations,
    marcoEntries,
    profiles,
    recommendationDismissVersion,
  ]);

  const renovacionesProximasCount = useMemo(
    () =>
      contracts.filter(
        (c) => isRenovacionProxima(c) && !isRenewalAlertDismissed(c.id)
      ).length,
    [contracts, renewalDismissVersion]
  );

  useEffect(() => {
    if (!canViewTarifaRecommendations && contractsListFilter === 'con_recomendacion') {
      setContractsListFilter('all');
    }
  }, [canViewTarifaRecommendations, contractsListFilter]);

  const showContractsUserFilter =
    activeRole === 'tramitacion' ||
    (activeRole === 'superadmin' && superadminViewMode === 'tramitacion');

  const showTramitacionNotifications = showContractsUserFilter;

  const tramitacionUnreviewedCount = useMemo(
    () => countUnreviewedTramitacionContracts(contracts, reviewedContractIds),
    [contracts, reviewedContractIds]
  );

  const tramitacionUnreviewedGroups = useMemo(
    () => groupUnreviewedTramitacionByComercial(contracts, reviewedContractIds),
    [contracts, reviewedContractIds]
  );

  const tramitacionRecentSummary = useMemo(() => {
    const groups = groupInsertBufferByComercial(
      pruneInsertBuffer(tramitacionInsertBuffer)
    );
    return formatTramitacionNuevosSummary(groups);
  }, [tramitacionInsertBuffer]);

  const markContractReviewedByTramitacion = useCallback((contractId: string) => {
    setReviewedContractIds((prev) => {
      if (prev.has(contractId)) return prev;
      const next = new Set(prev);
      next.add(contractId);
      saveReviewedTramitacionIds(next);
      return next;
    });
  }, []);

  const flushTramitacionInsertSummary = useCallback((clearAfterToast = true) => {
    setTramitacionInsertBuffer((current) => {
      const pruned = pruneInsertBuffer(current);
      const summary = formatTramitacionNuevosSummary(
        groupInsertBufferByComercial(pruned)
      );
      if (summary) toast.info(summary, { duration: 6000 });
      return clearAfterToast ? [] : pruned;
    });
  }, []);

  useEffect(() => {
    if (!showTramitacionNotifications || tramitacionInsertBuffer.length === 0) return;

    if (tramitacionSummaryTimeoutRef.current) {
      clearTimeout(tramitacionSummaryTimeoutRef.current);
    }

    tramitacionSummaryTimeoutRef.current = setTimeout(() => {
      flushTramitacionInsertSummary(true);
    }, TRAMITACION_SUMMARY_DEBOUNCE_MS);

    return () => {
      if (tramitacionSummaryTimeoutRef.current) {
        clearTimeout(tramitacionSummaryTimeoutRef.current);
      }
    };
  }, [
    showTramitacionNotifications,
    tramitacionInsertBuffer,
    flushTramitacionInsertSummary,
  ]);

  useEffect(() => {
    if (!showTramitacionNotifications) return;

    const intervalId = window.setInterval(() => {
      setTramitacionInsertBuffer((current) => {
        const pruned = pruneInsertBuffer(current);
        if (pruned.length === 0) return current;
        const summary = formatTramitacionNuevosSummary(
          groupInsertBufferByComercial(pruned)
        );
        if (summary) toast.info(summary, { duration: 6000 });
        return [];
      });
    }, TRAMITACION_SUMMARY_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [showTramitacionNotifications]);

  function handleTramitacionSelectComercial(comercialId: string) {
    setContractsListFilter('nuevos_sin_revisar');
    setContractsUserFilterId(comercialId);
    setCurrentMenuTab('Contratos');
    setActiveModule('erp');
  }

  function handleTramitacionShowAllUnreviewed() {
    setContractsListFilter('nuevos_sin_revisar');
    setContractsUserFilterId('all');
    setCurrentMenuTab('Contratos');
    setActiveModule('erp');
  }

  const opsAdminContracts = useMemo(() => {
    if (!showContractsUserFilter || contractsUserFilterId === 'all') return contracts;
    return contracts.filter(c => c.comercialId === contractsUserFilterId);
  }, [contracts, contractsUserFilterId, showContractsUserFilter]);
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

  const contractsForSidebarBadges = useMemo(() => {
    if (activeRole === 'comercial' || isSuperadminComercialView) {
      return contracts.filter((c) => c.comercialId === activeUserId);
    }
    if (activeRole === 'jefe_comercial') {
      return teamContracts;
    }
    return contracts;
  }, [activeRole, isSuperadminComercialView, contracts, activeUserId, teamContracts]);

  const canCreateIncidencia = activeRole === 'comercial' || activeRole === 'jefe_comercial';
  const canEditIncidencia = activeRole === 'comercial';
  const canDragIncidencias = isErpOpsAdmin;

  const handleCreateIncidencia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncClientName.trim() || !newIncDescripcion.trim()) return;

    const newTicket: Ticket = normalizeIncidenciaTicket({
      id: `inc-${Date.now()}`,
      clientName: newIncClientName.trim(),
      tipo: newIncTipo,
      prioridad: newIncPrioridad,
      estado: 'abierto',
      origen: 'comercial',
      comercialId: activeUserId,
      comercialName: activeUser.fullName,
      descripcion: newIncDescripcion.trim(),
      createdAt: new Date().toISOString().split('T')[0],
      codigo: generateIncidenciaCodigo(incidencias),
    });

    setIncidencias(prev => [newTicket, ...prev]);
    persistNewIncidencia(newTicket);
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
    persistIncidenciaPatch(final.id, final);
    toast.success('Incidencia actualizada.');
  };

  const handleMoveIncidencia = (
    id: string,
    newEstado: IncidenciaTicket['estado'],
    meta: { fecha: string; motivo?: string }
  ) => {
    if (!isErpOpsAdmin) return;
    const moved = incidencias.find(i => i.id === id);
    if (!moved) return;
    const updated = appendIncidenciaEstadoHistorial(
      moved,
      newEstado,
      activeUserId,
      meta.fecha,
      meta.motivo
    );
    setIncidencias(prev => prev.map(i => (i.id === id ? updated : i)));
    persistIncidenciaPatch(id, {
      estado: updated.estado,
      estadoAt: updated.estadoAt,
      historialEstados: updated.historialEstados,
    });
  };

  // New clean, unified Menu items lists based on allowed roles in the exact ordered sequence
  const sidebarItemsConfig = [
    { name: 'Dashboard', allowedRoles: ['superadmin', 'jefe_comercial', 'comercial', 'tramitacion'], icon: LayoutDashboard },
    { name: 'Calendario', allowedRoles: ['superadmin', 'jefe_comercial', 'comercial', 'tramitacion'], icon: CalendarDays },
    { name: 'Liquidaciones internas', allowedRoles: ['superadmin', 'jefe_comercial', 'comercial', 'tramitacion'], icon: WalletCards },
    { name: 'Liquidaciones externas', allowedRoles: ['superadmin', 'tramitacion'], icon: WalletCards },
    { name: 'Usuarios', allowedRoles: ['superadmin', 'tramitacion'], icon: Users },
    { name: 'Cashflow', allowedRoles: ['superadmin'], icon: DollarSign },
    { name: 'Mi Equipo', allowedRoles: ['jefe_comercial'], icon: Users },
    { name: 'Mis Clientes', allowedRoles: ['comercial'], icon: UserSquare2 },
    { name: 'Contratos', allowedRoles: ['superadmin', 'jefe_comercial', 'comercial', 'tramitacion'], icon: FileSpreadsheet },
    { name: 'Comparador', allowedRoles: ['superadmin', 'jefe_comercial', 'comercial', 'tramitacion'], icon: Calculator },
    { name: 'Historial de Comparativas', allowedRoles: ['superadmin', 'jefe_comercial', 'comercial', 'tramitacion'], icon: FileClock },
    { name: 'Base de Datos', allowedRoles: ['superadmin', 'jefe_comercial', 'comercial', 'tramitacion'], icon: BookUser },
    { name: 'Tarifas', allowedRoles: ['superadmin', 'jefe_comercial', 'comercial', 'tramitacion'], icon: Package },
    { name: 'Marco Retributivo', allowedRoles: ['superadmin', 'jefe_comercial', 'comercial', 'tramitacion'], icon: Coins },
    { name: 'Incidencias', allowedRoles: ['superadmin', 'jefe_comercial', 'comercial', 'tramitacion'], icon: AlertTriangle },
    { name: 'Comunicaciones', allowedRoles: ['superadmin', 'jefe_comercial', 'comercial', 'tramitacion'], icon: Megaphone },
    { name: 'FTP', allowedRoles: ['superadmin', 'jefe_comercial', 'comercial', 'tramitacion'], icon: HardDrive },
  ];

  const ventasSidebarItemsConfig = [
    { name: 'Mi Día', icon: CalendarDays, allowedRoles: ['comercial', 'jefe_comercial', 'superadmin'] },
    { name: 'Pipeline', icon: LayoutGrid, allowedRoles: ['comercial', 'jefe_comercial', 'superadmin'] },
    { name: 'Base EnerSave', icon: Database, allowedRoles: ['superadmin', 'tramitacion'] },
    { name: 'Avisos SLA', icon: ShieldAlert, allowedRoles: ['comercial', 'jefe_comercial', 'superadmin'] },
    { name: 'Reporting', icon: BarChart3, allowedRoles: ['jefe_comercial', 'superadmin'] },
  ];

  const canViewMarcoRetributivo =
    activeRole === 'jefe_comercial' ||
    activeRole === 'comercial' ||
    activeRole === 'tramitacion' ||
    (activeRole === 'superadmin' && superadminViewMode === 'comercial');

  const canViewConsolidatedLiquidaciones =
    activeRole === 'tramitacion' ||
    (activeRole === 'superadmin' && superadminViewMode === 'tramitacion');

  const canViewInternalLiquidaciones =
    activeRole === 'comercial' ||
    activeRole === 'jefe_comercial' ||
    activeRole === 'superadmin' ||
    activeRole === 'tramitacion';

  const canGenerateMonthlyLiquidaciones =
    activeRole === 'tramitacion' ||
    (activeRole === 'superadmin' && superadminViewMode === 'tramitacion');

  const handleGenerateMonthlyLiquidaciones = useCallback(async () => {
    const now = new Date();
    const mes = now.getMonth() + 1;
    const año = now.getFullYear();

    if (isSupabaseConfigured() && settlementsSource === 'supabase') {
      const result = await generarLiquidacionesDelMes(mes, año, {
        contracts,
        existingSettlements: settlements,
        formatCurrency,
      });
      if (result.ok === false) {
        toast.error(result.message);
        return null;
      }
      if (result.data.settlements.length > 0) {
        setSettlements((prev) => [...result.data.settlements, ...prev]);
      }
      return {
        count: result.data.count,
        totalComisionado: result.data.totalComisionado,
      };
    }

    const localResult = await generarLiquidacionesDelMesFromProfiles(
      mes,
      año,
      contracts,
      profiles,
      settlements,
      formatCurrency
    );
    if (localResult.settlements.length > 0) {
      setSettlements((prev) => [...localResult.settlements, ...prev]);
      persistNewSettlements(localResult.settlements);
    }
    return {
      count: localResult.count,
      totalComisionado: localResult.totalComisionado,
    };
  }, [
    contracts,
    settlements,
    profiles,
    settlementsSource,
    persistNewSettlements,
  ]);

  const canEditFiscalProfile =
    activeRole === 'comercial' ||
    activeRole === 'jefe_comercial' ||
    (activeRole === 'superadmin' && superadminViewMode === 'comercial');

  const canGenerateAutofactura = canEditFiscalProfile;

  const activeUserFiscalComplete = useMemo(
    () => isComercialFiscalProfileComplete(erpComercialFromProfile(activeUser)),
    [activeUser]
  );

  const autofacturaTipoCliente = useMemo((): AutofacturaTipoCliente => {
    const mine = contracts.filter((c) => c.comercialId === activeUserId);
    if (mine.length === 0) return 'residencial';
    let pymeCount = 0;
    for (const contract of mine) {
      const segment = normalizeTipoClienteSegment({
        tipoCliente: contract.tipoCliente,
        compania: contract.compania,
        clientName: contract.clientName,
        nif: contract.nif,
      });
      if (segment === 'pyme' || segment === 'autonomo') pymeCount += 1;
    }
    return pymeCount > mine.length / 2 ? 'pyme' : 'residencial';
  }, [contracts, activeUserId]);

  const handleSaveFiscalProfile = useCallback(
    (form: {
      dni: string;
      direccion: string;
      ciudad: string;
      codigoPostal: string;
      telefono: string;
      iban: string;
    }) => {
      setProfiles((prev) =>
        prev.map((profile) =>
          profile.id === activeUserId
            ? {
                ...profile,
                dni: form.dni,
                direccion: form.direccion,
                ciudad: form.ciudad,
                codigoPostal: form.codigoPostal,
                telefono: form.telefono,
                iban: form.iban,
              }
            : profile
        )
      );
    },
    [activeUserId]
  );

  const handleGenerateAutofactura = useCallback(async () => {
    const now = new Date();
    const mes = now.getMonth() + 1;
    const año = now.getFullYear();
    const comerciales = profiles
      .filter(
        (profile) =>
          profile.role === 'comercial' ||
          profile.role === 'jefe_comercial' ||
          profile.role === 'superadmin'
      )
      .map((profile) =>
        mapProfileToLiquidacionComercial({
          id: profile.id,
          fullName: profile.fullName,
          commissionPercentage: profile.commissionPercentage,
          status: profile.status,
        })
      );

    const liquidacion = calcularLiquidacionMensualPorComercial(
      contracts,
      activeUserId,
      mes,
      año,
      comerciales,
      formatCurrency
    );

    if (liquidacion.desglosePorContrato.length === 0) {
      toast.info('No hay comisiones activadas este mes para autofacturar.');
      return;
    }

    const comercial = erpComercialFromProfile(activeUser);
    const blob = await generateAutofacturaPdf(comercial, liquidacion, {
      mes,
      año,
      proximaFechaEmisionLabel: formatAutofacturaFecha(
        getProximaFechaAutofactura(autofacturaTipoCliente)
      ),
    });
    downloadAutofacturaPdf(blob, comercial.fullName, mes, año);
    toast.success('Autofactura generada correctamente.');
  }, [contracts, profiles, activeUser, activeUserId, autofacturaTipoCliente]);

  const currentMenuOptions =
    activeModule === 'ventas'
      ? ventasSidebarItemsConfig.filter((item) => item.allowedRoles.includes(activeRole))
      : sidebarItemsConfig.filter((item) => {
          if (item.name === 'Marco Retributivo' && !canViewMarcoRetributivo) {
            return false;
          }
          if (item.name === 'Liquidaciones externas' && !canViewConsolidatedLiquidaciones) {
            return false;
          }
          if (item.name === 'Liquidaciones internas' && !canViewInternalLiquidaciones) {
            return false;
          }
          if (activeRole === 'superadmin') {
            if (superadminViewMode === 'comercial') {
              const comercialTabs = [
                'Dashboard',
                'Calendario',
                'Liquidaciones internas',
                'Mis Clientes',
                'Contratos',
                'Comparador',
                'Historial de Comparativas',
                'Base de Datos',
                'Tarifas',
                'Marco Retributivo',
                'Incidencias',
                'Comunicaciones',
                'FTP',
              ];
              return comercialTabs.includes(item.name);
            }
            const superadminTramitacionTabs = [
              'Dashboard',
              'Calendario',
              'Liquidaciones internas',
              'Liquidaciones externas',
              'Usuarios',
              'Cashflow',
              'Contratos',
              'Tarifas',
              'Incidencias',
              'Comunicaciones',
              'FTP',
            ];
            return superadminTramitacionTabs.includes(item.name);
          }
          if (activeRole === 'tramitacion') {
            const tramitacionTabs = [
              'Dashboard',
              'Calendario',
              'Liquidaciones internas',
              'Liquidaciones externas',
              'Usuarios',
              'Contratos',
              'Comparador',
              'Historial de Comparativas',
              'Base de Datos',
              'Tarifas',
              'Marco Retributivo',
              'Incidencias',
              'Comunicaciones',
              'FTP',
            ];
            return tramitacionTabs.includes(item.name);
          }
          return item.allowedRoles.includes(activeRole);
        });

  const sidebarActionBadges = useMemo(
    () =>
      buildSidebarActionBadges(
        currentMenuOptions.map((item) => item.name),
        {
          contracts: contractsForSidebarBadges,
          incidencias: roleFilteredIncidencias,
          settlements,
          activeUserId,
        }
      ),
    [
      currentMenuOptions,
      contractsForSidebarBadges,
      roleFilteredIncidencias,
      settlements,
      activeUserId,
    ]
  );

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
                      const badge = sidebarActionBadges[opt.name];
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
                          <span className="relative shrink-0">
                            <Icon className={`w-4 h-4 ${isSelected ? 'text-white dark:text-cyan-300' : 'text-brand-subtext'}`} />
                            {sidebarCollapsed && (
                              <SidebarMenuBadge badge={badge} collapsed />
                            )}
                          </span>
                          {!sidebarCollapsed && (
                            <>
                              <span className="text-xs font-semibold truncate tracking-tight flex-1 min-w-0">
                                {opt.name}
                              </span>
                              <SidebarMenuBadge badge={badge} />
                            </>
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
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => canEditFiscalProfile && setPerfilComercialOpen(true)}
                        disabled={!canEditFiscalProfile}
                        className={`w-full p-3 bg-brand-panel rounded-xl border border-brand-border flex items-center space-x-2.5 text-left transition-colors ${
                          canEditFiscalProfile
                            ? 'hover:border-cyan-500/30 cursor-pointer'
                            : 'opacity-80 cursor-default'
                        }`}
                        title={canEditFiscalProfile ? 'Editar perfil fiscal' : undefined}
                      >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-amber-500 flex items-center justify-center text-slate-950 font-bold text-xs uppercase shadow shrink-0">
                          {activeUser.fullName.charAt(0)}
                        </div>
                        <div className="overflow-hidden min-w-0">
                          <span className="block text-[11px] font-bold text-brand-text truncate leading-tight">
                            {activeUser.fullName}
                          </span>
                          <span className="block text-[9px] font-mono text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mt-0.5 leading-none">
                            {activeUser.role === 'superadmin'
                              ? 'Superadmin'
                              : activeUser.role === 'jefe_comercial'
                                ? 'Director'
                                : 'Asesor'}
                          </span>
                          {canEditFiscalProfile && !activeUserFiscalComplete ? (
                            <span className="block text-[8px] text-amber-600 dark:text-amber-400 mt-1">
                              Perfil fiscal incompleto
                            </span>
                          ) : null}
                        </div>
                      </button>
                      {canEditFiscalProfile ? (
                        <button
                          type="button"
                          onClick={() => setPerfilComercialOpen(true)}
                          className="w-full px-3 py-1.5 rounded-lg border border-brand-border bg-brand-surface text-[10px] font-mono font-bold text-brand-subtext hover:text-brand-text hover:border-cyan-500/30 transition-colors cursor-pointer"
                        >
                          Perfil fiscal
                        </button>
                      ) : null}
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
                    <ProximosEventosWidget
                      eventos={calendarioEventos}
                      activeUserId={activeUserId}
                      onOpenCalendario={() => setCurrentMenuTab('Calendario')}
                    />
                    
                    {/* PROFILE: SUPERADMIN (EXECUTIVE CONTROL BOARD) */}
                    {(activeRole === 'tramitacion' ||
                      (activeRole === 'superadmin' && superadminViewMode === 'tramitacion')) && (
                      <SuperadminDashboard
                        welcomeName={activeUser.fullName}
                        activeRole={activeRole}
                        contracts={contracts}
                        incidencias={incidencias}
                        comerciales={profiles.map((p) => ({
                          id: p.id,
                          fullName: p.fullName,
                          role: p.role,
                          status: p.status,
                        }))}
                        comparativas={comparisonsHistory.map((c) => ({
                          id: c.id,
                          date: c.date,
                        }))}
                        oportunidadesMejora={
                          canViewTarifaRecommendations
                            ? tarifaRecommendations.size
                            : undefined
                        }
                        renovacionesProximas={renovacionesProximasCount}
                        onNavigate={handleDashboardNavigate}
                      />
                    )}

                    {/* PROFILE: JEFE_COMERCIAL (DELEGATED NODE LEADER PANEL) */}
                    {activeRole === 'jefe_comercial' && (
                      <div className="space-y-8 animate-fade-in">
                        {/* STATS ROW */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
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

                          <div
                            onClick={() => handleDashboardNavigate('oportunidades_mejora')}
                            className="bg-brand-panel p-5 rounded-2xl border border-brand-border space-y-2 relative overflow-hidden shadow-sm cursor-pointer hover:border-amber-500/40 transition-colors"
                          >
                            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                            <p className="text-xs font-bold font-mono text-brand-subtext uppercase tracking-widest flex items-center gap-1.5">
                              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                              Oportunidades tarifarias
                            </p>
                            <h3 className="text-2xl font-black text-amber-500 tracking-tight font-mono">
                              {tarifaRecommendations.size}
                            </h3>
                            <p className="text-[11px] text-brand-subtext">
                              Contratos propios · retro vencida · mejora de comisión
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
                    {(activeRole === 'comercial' || isSuperadminComercialView) && (
                      <div className="space-y-4 animate-fade-in">
                        <ComercialCommissionsChart
                          settlements={settlements}
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
                                visibleIncidencias.filter(i => isIncidenciaAbierta(i.estado)).length > 0 ? 'text-rose-500' : 'text-emerald-500'
                              }`}>
                                {visibleIncidencias.filter(i => isIncidenciaAbierta(i.estado)).length}
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

                          <div
                            onClick={() => handleDashboardNavigate('oportunidades_mejora')}
                            className="bg-brand-panel p-3 rounded-xl border border-brand-border shadow-sm flex flex-col justify-between gap-2 font-sans cursor-pointer hover:border-amber-500/40 transition-colors min-h-[132px] min-w-0"
                          >
                            <div className="space-y-1">
                              <span className="text-[10px] font-semibold text-brand-text uppercase tracking-tight flex items-center gap-1.5">
                                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                                Oportunidades tarifarias
                              </span>
                              <p className="text-[9px] text-brand-subtext leading-snug">
                                Contratos propios con mejora de ahorro y comisión
                              </p>
                            </div>
                            <div className="pt-1.5 border-t border-dashed border-brand-border">
                              <strong className="text-xl font-black text-amber-500 tabular-nums font-mono leading-none">
                                {tarifaRecommendations.size}
                              </strong>
                              <span className="text-[9px] text-brand-subtext block mt-0.5">Ver mis contratos →</span>
                            </div>
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
                                  <th className="py-4 px-5 uppercase font-bold tracking-wider text-right">Acciones</th>
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
                                        className="hover:bg-brand-bg/80 dark:hover:bg-white/[0.02] cursor-pointer transition-colors group"
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
                                                indentLevel === 1 ? 'bg-amber-500/20 border-amber-500/40 text-amber-600 dark:text-amber-500' :
                                                'bg-brand-surface border-brand-border text-brand-subtext'
                                              }`}>
                                                {p.fullName.split(' ').map((n) => n[0]).join('').substring(0, 2)}
                                              </div>
                                              <div>
                                                <p className="font-bold text-brand-text group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">{p.fullName}</p>
                                                <p className="text-[10px] font-mono text-brand-subtext">{p.id}</p>
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
                                        <td className="py-4 px-5 text-brand-subtext font-mono">{p.email}</td>
                                        <td className="py-4 px-5 text-brand-text">
                                          {p.role === 'superadmin' ? (
                                            <span className="text-brand-subtext italic text-[10px]">N/A</span>
                                          ) : mgr ? (
                                            <span className="font-medium text-brand-text">{mgr.fullName}</span>
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
                                          <div className="inline-flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveUserForSheet(p);
                                              }}
                                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-surface hover:bg-brand-panel border border-brand-border rounded-lg text-[10px] font-mono font-bold text-brand-subtext hover:text-brand-text group-hover:border-blue-500/30 dark:group-hover:border-cyan-400/30 transition-colors duration-200 cursor-pointer"
                                            >
                                              <span>Ver Permisos</span>
                                              <ChevronRight className="w-3.5 h-3.5 text-brand-subtext transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600 dark:group-hover:text-cyan-400" />
                                            </button>
                                            {activeRole === 'superadmin' && p.id !== activeUserId && (
                                              <button
                                                type="button"
                                                disabled={isDeletingUserId === p.id}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  void handleDeleteUserFromSupabase(p.id);
                                                }}
                                                title="Eliminar usuario"
                                                className="inline-flex items-center justify-center p-1.5 rounded-lg border border-rose-500/25 text-rose-500 hover:bg-rose-500/10 disabled:opacity-50"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                          </div>
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
                    settlements={settlements}
                    contracts={contracts}
                  />
                )}
                 {/* VIEW: CONTRATOS */}
                 {(currentMenuTab === 'Contratos' || currentMenuTab === 'Mis Contratos') && activeModule === 'erp' && (
                  <ContratosPanel
                    activeRole={activeRole}
                    activeUserId={activeUserId}
                    activeUserName={activeUser.fullName}
                    canEditContractEstado={activeModule === 'erp' && activeRole === 'tramitacion'}
                    canManageContractLifecycle={activeRole === 'tramitacion'}
                    visibleContracts={
                      currentMenuTab === 'Mis Contratos' ||
                      activeRole === 'comercial' ||
                      isSuperadminComercialView
                        ? myContracts
                        : activeRole === 'jefe_comercial'
                          ? teamContracts
                          : showContractsUserFilter
                            ? opsAdminContracts
                            : contracts
                    }
                    showUserFilter={showContractsUserFilter}
                    userFilterId={contractsUserFilterId}
                    onUserFilterChange={setContractsUserFilterId}
                    setContracts={setContracts}
                    onPersistContract={persistContractPatch}
                    contractsSearchQuery={contractsSearchQuery}
                    setContractsSearchQuery={setContractsSearchQuery}
                    contractsListFilter={contractsListFilter}
                    setContractsListFilter={setContractsListFilter}
                    onActivateContract={(c) => {
                      setSelectedContractForActivation(c);
                      setActivateConsumoKwh(c.consumoAnual);
                      setActivatePowerKw(15.5);
                      setActivateEffectiveDate(todayInputDate());
                      setActivateMotivo('');
                      setIsActivateOpen(true);
                    }}
                    onBajaContract={(c) => {
                      setSelectedContractForBaja(c);
                      setBajaDate(todayInputDate());
                      setBajaMotivo('');
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
                    showTarifaRecommendations={canViewTarifaRecommendations}
                    tarifaRecommendations={
                      canViewTarifaRecommendations ? tarifaRecommendations : undefined
                    }
                    onCreateContractFromRecommendation={
                      canViewTarifaRecommendations
                        ? openContractWizardFromRecommendation
                        : undefined
                    }
                    onDownloadRecommendationPdf={
                      canViewTarifaRecommendations
                        ? handleDownloadRecommendationPdf
                        : undefined
                    }
                    onDismissRecommendation={
                      canViewTarifaRecommendations ? handleDismissRecommendation : undefined
                    }
                    renewalDismissVersion={renewalDismissVersion}
                    onDismissRenewalAlert={handleDismissRenewalAlert}
                    onDownloadJointRecommendationPdf={
                      canViewTarifaRecommendations
                        ? handleDownloadJointContractsPdf
                        : undefined
                    }
                    isGeneratingJointPdf={isGeneratingJointPdf}
                    onEditContract={openContractWizardForEdit}
                    onDeleteContract={(contract) => void handleDeleteContract(contract.id)}
                    showTramitacionNotifications={showTramitacionNotifications}
                    tramitacionUnreviewedCount={tramitacionUnreviewedCount}
                    tramitacionUnreviewedGroups={tramitacionUnreviewedGroups}
                    tramitacionRecentSummary={tramitacionRecentSummary}
                    reviewedContractIds={reviewedContractIds}
                    onTramitacionSelectComercial={handleTramitacionSelectComercial}
                    onTramitacionShowAllUnreviewed={handleTramitacionShowAllUnreviewed}
                  />
                )}


                {/* VIEW: LIQUIDACIONES INTERNAS (comercial / jefe / superadmin comercial) */}
                {currentMenuTab === 'Liquidaciones internas' && activeModule === 'erp' && canViewInternalLiquidaciones && (
                  <LiquidacionesInternasPanel
                    activeRole={
                      activeRole === 'superadmin'
                        ? superadminViewMode === 'comercial'
                          ? 'comercial'
                          : 'superadmin'
                        : activeRole === 'tramitacion'
                          ? 'tramitacion'
                        : (activeRole as 'jefe_comercial' | 'comercial')
                    }
                    activeUserId={activeUserId}
                    activeUserName={activeUser.fullName}
                    settlements={settlements}
                    contracts={contracts}
                    profiles={profiles}
                    formatCurrency={formatCurrency}
                    canGenerateMonthlyLiquidaciones={canGenerateMonthlyLiquidaciones}
                    onGenerateMonthlyLiquidaciones={handleGenerateMonthlyLiquidaciones}
                    canGenerateAutofactura={canGenerateAutofactura}
                    fiscalProfileComplete={activeUserFiscalComplete}
                    autofacturaTipoCliente={autofacturaTipoCliente}
                    onGenerateAutofactura={handleGenerateAutofactura}
                    onOpenFiscalProfile={() => setPerfilComercialOpen(true)}
                  />
                )}

                {/* VIEW: LIQUIDACIONES CONSOLIDADAS (tramitación / superadmin operativo) */}
                {currentMenuTab === 'Liquidaciones externas' && activeModule === 'erp' && canViewConsolidatedLiquidaciones && (
                  <div className="space-y-8 animate-fade-in text-slate-800 dark:text-slate-100 font-sans">
                    
                    {/* 1. SECCIÓN SUPERADMINISTRADOR: Métricas Consolidadas del Negocio (Internas vs Externas) */}
                    {(activeRole === 'superadmin' || activeRole === 'tramitacion') && (
                      <LiquidacionesConsolidadasSuperadminSection
                        activeRole={activeRole}
                        contracts={contracts}
                        settlements={settlements}
                        profiles={profiles}
                        formatCurrency={formatCurrency}
                        onViewChange={setLiquidacionesConsolidadasView}
                      />
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

                    <>
                    {/* Header Principal de Liquidaciones Externas */}
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
                    </>

                  </div>
                )}

                {/* VIEW: INCIDENCIAS */}
                {currentMenuTab === 'Incidencias' && activeModule === 'erp' && (
                  <IncidenciasPanel
                    incidencias={roleFilteredIncidencias}
                    activeUserId={activeUserId}
                    activeRole={activeRole}
                    teamMemberIds={teamMemberIds}
                    showComercialName={activeRole !== 'comercial'}
                    canEdit={canEditIncidencia}
                    canDrag={canDragIncidencias}
                    onSave={handleUpdateIncidencia}
                    onMove={handleMoveIncidencia}
                    createForm={
                      canCreateIncidencia ? (
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
                                value={newIncPrioridad ?? ''}
                                onChange={(e) =>
                                  setNewIncPrioridad(
                                    (e.target.value || undefined) as Ticket['prioridad']
                                  )
                                }
                                className="w-full h-8 px-2 bg-brand-surface border border-brand-border rounded-lg text-xs text-brand-text"
                              >
                                <option value="">Sin categorizar</option>
                                <option value="critica">Crítica</option>
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
                      ) : undefined
                    }
                  />
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
                    actor={ventasActor}
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
                    actor={ventasActor}
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
                    onOpenGeneralDatabase={() => openGeneralDatabase()}
                  />
                )}

                {currentMenuTab === 'Base EnerSave' && activeModule === 'ventas' && (
                  <SensitiveScreenShell userLabel={ventasActor.comercialName}>
                    <EnersaveLeadDatabasePage />
                  </SensitiveScreenShell>
                )}

                {currentMenuTab === 'Reporting' && activeModule === 'ventas' && (
                  <ReportingPage
                    actor={ventasActor}
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
                    actor={ventasActor}
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
                    actor={ventasActor}
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
                    onPersistClient={persistClientPatch}
                    contracts={contracts}
                    activeUserId={activeUserId}
                    activeUserName={activeUser.fullName}
                    activeRole={activeRole}
                    profiles={profiles}
                    clientesSearchQuery={clientesSearchQuery}
                    setClientesSearchQuery={setClientesSearchQuery}
                    onNavigateToContract={navigateToContract}
                    superadminComercialScope={
                      activeRole === 'superadmin' && superadminViewMode === 'comercial'
                    }
                  />
                )}


                {/* VIEW: COMPARADOR (Electricity/Gas Interactive Calculator) */}
                {(currentMenuTab === 'Comparador' || currentMenuTab === 'Comparador de Facturas') && activeModule === 'erp' && (
                  <div className="space-y-8 animate-fade-in text-slate-800 dark:text-slate-100 font-sans">
                    
                    {/* Comparative Input screen */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                      
                      {/* Left: Input controls */}
                      <div className="lg:col-span-5 bg-brand-panel p-6 sm:p-8 rounded-3xl border border-brand-border space-y-6 relative shadow-sm dark:shadow-none bg-white dark:bg-[#0f172a]">
                        <ComparadorIaUpload
                          loading={compOcrLoading}
                          progress={compOcrProgress}
                          onFile={(file) => void handleComparadorInvoiceOcr(file)}
                        />

                        <div className="space-y-5 pt-1">
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

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="block text-[10px] font-mono font-bold text-brand-subtext uppercase tracking-wider">
                                Compañía actual
                              </label>
                              <input
                                type="text"
                                value={compCompaniaActual}
                                onChange={(e) => setCompCompaniaActual(e.target.value)}
                                placeholder="Endesa, Iberdrola…"
                                className="w-full px-3.5 py-2.5 bg-brand-surface border border-brand-border rounded-xl focus:border-blue-500 focus:outline-none text-xs text-brand-text font-medium"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[10px] font-mono font-bold text-brand-subtext uppercase tracking-wider">
                                Tarifa actual
                              </label>
                              <input
                                type="text"
                                value={compTarifaActual}
                                onChange={(e) => setCompTarifaActual(e.target.value)}
                                placeholder="Indexada, fija…"
                                className="w-full px-3.5 py-2.5 bg-brand-surface border border-brand-border rounded-xl focus:border-blue-500 focus:outline-none text-xs text-brand-text font-medium"
                              />
                            </div>
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
                            <p className="text-[10px] text-center font-mono text-brand-subtext uppercase tracking-wider flex items-center justify-center gap-1.5">
                              <Sparkles className="w-3 h-3 opacity-60" />
                              Calculando…
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Right: Results comparison with visual cards list */}
                      <div className="lg:col-span-7 space-y-4">
                        <ComparadorProposalFilters
                          value={compProposalFilters}
                          onChange={setCompProposalFilters}
                        />

                        <ComparadorSortToggle value={compSortMode} onChange={setCompSortMode} />

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
                          ) : compResults && compSummary && compResults.length > 0 ? (
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
                              className="space-y-4"
                            >
                              {compResults.map((opt) => (
                                <ComparadorOfferCard
                                  key={opt.id}
                                  option={opt}
                                  segment={compSegment}
                                  sortMode={compSortMode}
                                  renderCompaniaLogo={renderCompaniaLogo}
                                  onContract={() => openNewContractModal(opt)}
                                  onDownloadPdf={() => void handleDownloadComparadorPdf(opt)}
                                  onSendEmail={
                                    opt.savingsAnnual > 0
                                      ? () => void handleGenerarEmailPropuesta(opt)
                                      : undefined
                                  }
                                  sendingEmail={emailPropuestaGeneratingId === opt.id}
                                />
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
                                  {compProposalFilters.length > 0
                                    ? 'Sin ofertas para los filtros seleccionados'
                                    : 'Esperando parámetros'}
                                </h3>
                                <p className="text-xs text-brand-subtext max-w-sm mt-1 mx-auto leading-relaxed">
                                  {compProposalFilters.length > 0
                                    ? 'Prueba quitando algún filtro de propuesta o cambia la tarifa de acceso.'
                                    : 'Completa el formulario de potencia contratada y consumos históricos para procesar la comparativa multi-proveedor.'}
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                    </div>

                    <EmailPropuestaModal
                      open={emailPropuestaOpen}
                      loading={emailPropuestaLoading}
                      emailDestino={emailPropuestaDestino}
                      asunto={emailPropuestaAsunto}
                      cuerpo={emailPropuestaCuerpo}
                      onEmailDestinoChange={setEmailPropuestaDestino}
                      onAsuntoChange={setEmailPropuestaAsunto}
                      onCuerpoChange={setEmailPropuestaCuerpo}
                      onClose={() => setEmailPropuestaOpen(false)}
                      onOpenMailClient={handleOpenEmailPropuestaMailClient}
                    />

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
                            <p className="text-[11px] text-brand-subtext mt-0.5">
                              Selecciona varias propuestas para generar un estudio de ahorro conjunto.
                            </p>
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

                      {selectedComparisonIds.length > 0 && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20">
                          <div className="text-xs text-brand-text">
                            <span className="font-extrabold">
                              {selectedComparisonIds.length} comparativa{selectedComparisonIds.length === 1 ? '' : 's'} seleccionada{selectedComparisonIds.length === 1 ? '' : 's'}
                            </span>
                            <span className="text-brand-subtext"> · Ahorro conjunto estimado </span>
                            <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(selectedComparisonsSavings)}/año
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedComparisonIds([])}
                              className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-brand-subtext hover:text-brand-text transition-colors"
                            >
                              Limpiar selección
                            </button>
                            <button
                              onClick={handleDownloadJointHistoryPdf}
                              disabled={selectedComparisonIds.length < 2 || isGeneratingJointPdf}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-[10px] rounded-xl tracking-wider uppercase shadow transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>
                                {isGeneratingJointPdf ? 'Generando...' : 'PDF estudio conjunto'}
                              </span>
                            </button>
                          </div>
                        </div>
                      )}

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
                                <th className="pb-3 px-2 w-8">
                                  <input
                                    type="checkbox"
                                    aria-label="Seleccionar todas las comparativas"
                                    className="w-3.5 h-3.5 accent-emerald-600 cursor-pointer"
                                    checked={
                                      filteredComparisonsHistory.length > 0 &&
                                      filteredComparisonsHistory.every((item) =>
                                        selectedComparisonIds.includes(item.id)
                                      )
                                    }
                                    onChange={(e) =>
                                      setSelectedComparisonIds(
                                        e.target.checked
                                          ? Array.from(
                                              new Set([
                                                ...selectedComparisonIds,
                                                ...filteredComparisonsHistory.map((item) => item.id),
                                              ])
                                            )
                                          : selectedComparisonIds.filter(
                                              (id) =>
                                                !filteredComparisonsHistory.some(
                                                  (item) => item.id === id
                                                )
                                            )
                                      )
                                    }
                                  />
                                </th>
                                <th className="pb-3 px-2">Cliente / Fecha</th>
                                <th className="pb-3 px-2">CUPS / Tarifa Acceso</th>
                                <th className="pb-3 px-2 text-right">Gasto Actual</th>
                                <th className="pb-3 px-2 text-right">Ahorro Máx.</th>
                                <th className="pb-3 px-2">Mejor Oferta</th>
                                <th className="pb-3 px-2 text-right">Propuesta</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border">
                              {filteredComparisonsHistory
                                .map((item, idx) => {
                                  const savingsPercent = item.currentAnnualExpense > 0 
                                    ? Math.round((item.maxAnnualSavings / item.currentAnnualExpense) * 100) 
                                    : 0;
                                  const isSelected = selectedComparisonIds.includes(item.id);
                                  return (
                                    <tr
                                      key={item.id || idx}
                                      className={`border-b border-brand-border transition-all ${isSelected ? 'bg-emerald-50/60 dark:bg-emerald-950/10' : 'hover:bg-slate-50/50 dark:hover:bg-white/[0.01]'}`}
                                    >
                                      <td className="py-4 px-2">
                                        <input
                                          type="checkbox"
                                          aria-label={`Seleccionar comparativa de ${item.clientName}`}
                                          className="w-3.5 h-3.5 accent-emerald-600 cursor-pointer"
                                          checked={isSelected}
                                          onChange={() => toggleComparisonSelection(item.id)}
                                        />
                                      </td>
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
                                          onClick={() => handleDownloadHistoryPdf(item)}
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

                {currentMenuTab === 'Base de Datos' && activeModule === 'erp' && (
                  <SensitiveScreenShell
                    userLabel={
                      [activeUser.fullName.trim(), activeUser.email]
                        .filter(Boolean)
                        .join(' · ') || 'Usuario'
                    }
                  >
                    <GeneralDatabasePage
                      importedLeadIds={generalDbImportedLeadIds}
                      highlightLeadId={generalDbHighlightLeadId}
                      onConvertToProspecto={convertGeneralDatabaseLeadToProspecto}
                      onOpenProspecto={openVentasFromGeneralDatabase}
                    />
                  </SensitiveScreenShell>
                )}

                {/* VIEW: TARIFAS */}
                {currentMenuTab === 'Tarifas' && activeModule === 'erp' && (
                  <ProductosPanel
                    title="Tarifas"
                    subtitle="Catálogo de tarifas activas por comercializadora — crea contratos desde aquí."
                    activeRole={activeRole}
                    activeUserId={activeUserId}
                    canEditMarco={canEditMarcoEntries}
                    onNavigateContratos={() => setCurrentMenuTab('Contratos')}
                    onCreateContract={openContractWizardFromProducto}
                    renderCompaniaLogo={renderCompaniaLogo}
                  />
                )}

                {/* VIEW: MARCO RETRIBUTIVO (comercial, jefe_comercial, superadmin modo comercial) */}
                {currentMenuTab === 'Marco Retributivo' && activeModule === 'erp' && canViewMarcoRetributivo && (
                  <MarcoRetributivoPanel
                    activeRole={activeRole as 'superadmin' | 'tramitacion' | 'jefe_comercial' | 'comercial'}
                    activeUserId={activeUserId}
                    commissionPercentage={activeUser.commissionPercentage}
                    formatCurrency={formatCurrency}
                    renderCompaniaLogo={renderCompaniaLogo}
                    canEditMarco={canEditMarcoEntries}
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


                {currentMenuTab === 'FTP' && activeModule === 'erp' && (
                  <FtpPanel canEdit={canEditFtpEntries} activeUserId={activeUserId} />
                )}

                {currentMenuTab === 'Calendario' && activeModule === 'erp' && (
                  <CalendarioPanel
                    activeRole={
                      activeRole === 'superadmin'
                        ? superadminViewMode === 'comercial'
                          ? 'comercial'
                          : 'superadmin'
                        : (activeRole as 'jefe_comercial' | 'comercial' | 'tramitacion')
                    }
                    activeUserId={activeUserId}
                    profiles={profiles}
                    eventos={calendarioEventos}
                    onEventosChange={setCalendarioEventos}
                  />
                )}

                {currentMenuTab === 'Comunicaciones' && activeModule === 'erp' && (
                  <AvisosPanel
                    avisos={avisos}
                    activeUserId={activeUserId}
                    canPublish={canPublishAvisos}
                    resolvePublisherName={resolveAvisoPublisherName}
                    onAvisoCreated={(aviso) => setAvisos((prev) => [aviso, ...prev])}
                  />
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
                        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-xs"
                      />

                      {/* Modal Content container */}
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="relative bg-brand-panel border border-brand-border rounded-2xl w-full max-w-lg p-6 overflow-hidden space-y-4 shadow-2xl z-10"
                      >
                        <div className="flex items-center space-x-3 text-emerald-600 dark:text-emerald-400">
                          <Zap className="w-5 h-5" />
                          <h3 className="text-sm font-black uppercase font-mono tracking-wider text-brand-text">
                            Aprobación, Activación e Insert RLS
                          </h3>
                        </div>

                        <p className="text-xs text-brand-subtext leading-relaxed">
                          Se calcula la liquidación según el marco retributivo del contrato y el reparto configurado para cada persona antes de activar el suministro.
                        </p>

                        {/* Customer details banner */}
                        <div className="p-3 bg-brand-surface border border-brand-border rounded-xl text-xs space-y-1">
                          <div className="flex justify-between gap-2">
                            <span className="text-brand-subtext font-mono text-[10px] shrink-0">CLIENTE:</span>
                            <span className="text-brand-text font-bold text-right">{selectedContractForActivation.clientName}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-brand-subtext font-mono text-[10px] shrink-0">CUPS SUMINISTRO:</span>
                            <span className="text-brand-text font-mono text-[10px] text-right break-all">{selectedContractForActivation.cups}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-brand-subtext font-mono text-[10px] shrink-0">TIPO COMERCIAL:</span>
                            <span className="text-brand-text font-bold uppercase">{selectedContractForActivation.tipo}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-brand-subtext font-mono text-[10px] shrink-0">ASESOR DE REPORTE:</span>
                            <span className="text-brand-text text-right">{selectedContractForActivation.comercialName}</span>
                          </div>
                        </div>

                        {/* Inputs area */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block text-[9px] font-mono text-brand-subtext uppercase tracking-widest mb-1">
                              Consumo Real (kWh/año)
                            </label>
                            <input
                              type="number"
                              value={activateConsumoKwh}
                              onChange={(e) => setActivateConsumoKwh(Math.max(0, Number(e.target.value)))}
                              className="w-full bg-brand-surface border border-brand-border rounded-lg p-2 font-mono text-brand-text text-xs focus:border-emerald-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-mono text-brand-subtext uppercase tracking-widest mb-1">
                              Potencia Suministro (kW)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={activatePowerKw}
                              onChange={(e) => setActivatePowerKw(Math.max(0, Number(e.target.value)))}
                              className="w-full bg-brand-surface border border-brand-border rounded-lg p-2 font-mono text-brand-text text-xs focus:border-emerald-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 text-xs">
                          <div>
                            <label className="block text-[9px] font-mono text-brand-subtext uppercase tracking-widest mb-1">
                              Fecha de efecto (activación)
                            </label>
                            <input
                              type="date"
                              required
                              value={activateEffectiveDate}
                              onChange={(e) => setActivateEffectiveDate(e.target.value)}
                              className="w-full bg-brand-surface border border-brand-border rounded-lg p-2 font-mono text-brand-text text-xs focus:border-emerald-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-mono text-brand-subtext uppercase tracking-widest mb-1">
                              Motivo del cambio (opcional)
                            </label>
                            <textarea
                              value={activateMotivo}
                              onChange={(e) => setActivateMotivo(e.target.value)}
                              rows={2}
                              placeholder="Ej. activación confirmada por comercializadora"
                              className="w-full bg-brand-surface border border-brand-border rounded-lg p-2 text-brand-text text-xs resize-none focus:border-emerald-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Comisión según marco retributivo */}
                        {(() => {
                          const comercialProfile = profiles.find(
                            (p) => p.id === selectedContractForActivation.comercialId
                          );
                          const commissionPct = comercialProfile?.commissionPercentage ?? 70;
                          const marcoEntry = resolveMarcoCatalogEntry(
                            selectedContractForActivation.marcoEntryId,
                            selectedContractForActivation.compania,
                            selectedContractForActivation.tarifa,
                            selectedContractForActivation.tipo,
                            marcoEntries
                          );
                          const breakdown =
                            marcoEntry && activateConsumoKwh > 0
                              ? computeComisionBreakdown(
                                  marcoEntry,
                                  commissionPct,
                                  activateConsumoKwh,
                                  formatCurrency
                                )
                              : null;

                          if (!breakdown) {
                            return (
                              <p className="text-[10px] text-brand-subtext italic p-3 bg-brand-surface border border-brand-border rounded-xl">
                                Indica consumo y potencia para calcular la comisión según marco retributivo.
                              </p>
                            );
                          }

                          return (
                            <div className="p-4 bg-brand-surface border border-emerald-500/25 rounded-xl space-y-2 text-xs font-mono">
                              <div className="flex justify-between text-brand-text border-b border-brand-border pb-1.5 text-[10px]">
                                <span>Comisión empresa (marco):</span>
                                <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                                  {formatCurrency(breakdown.comisionEmpresa)}
                                </span>
                              </div>
                              <div className="flex justify-between text-amber-700 dark:text-amber-400 font-semibold text-[10px]">
                                <span>↳ Comercial ({commissionPct}%):</span>
                                <span>{formatCurrency(breakdown.comisionComercial)}</span>
                              </div>
                              <p className="text-[8px] text-brand-subtext pl-1">
                                Destinatario: {selectedContractForActivation.comercialName}
                              </p>
                              <p className="text-[9px] text-brand-subtext leading-relaxed pt-1 border-t border-brand-border">
                                {breakdown.detalle}
                              </p>
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
                            className="px-4 py-2 bg-brand-surface hover:bg-brand-elevated text-brand-text font-bold rounded-xl border border-brand-border"
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
                        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-xs"
                      />

                      {/* Modal Panel Container */}
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="relative bg-brand-panel border border-brand-border rounded-2xl w-full max-w-lg p-6 overflow-hidden space-y-4 shadow-2xl z-10 text-brand-text"
                      >
                        <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-rose-500 to-amber-500" />
                        
                        <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
                          <Trash2 className="w-5 h-5 text-rose-500" />
                          <h3 className="text-sm font-black uppercase font-mono tracking-wider text-brand-text">
                            Registro de Baja e Inicio de Retrocomisión
                          </h3>
                        </div>

                        <div>
                          <p className="text-xs text-brand-subtext leading-relaxed">
                            Al cancelar el suministro eléctrico o de gas antes del periodo de cobertura, se genera una liquidación negativa proporcional contra la cuenta del comercial implicado:
                          </p>
                        </div>

                        {/* Customer details banner */}
                        <div className="p-3 bg-brand-surface border border-brand-border rounded-xl text-xs space-y-1">
                          <div className="flex justify-between gap-2">
                            <span className="text-brand-subtext font-mono text-[10px] shrink-0">CLIENTE AFECTADO:</span>
                            <span className="text-brand-text font-bold text-right">{selectedContractForBaja.clientName}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-brand-subtext font-mono text-[10px] shrink-0">CUPS:</span>
                            <span className="text-brand-text font-mono text-[10px] text-right break-all">{selectedContractForBaja.cups}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-brand-subtext font-mono text-[10px] shrink-0">COMPAÑÍA / TIPO:</span>
                            <span className="text-brand-text font-bold uppercase text-right">{selectedContractForBaja.compania} ({selectedContractForBaja.tipo})</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-brand-subtext font-mono text-[10px] shrink-0">COMISIÓN ORIGINAL LIQUIDADA:</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{formatCurrency(selectedContractForBaja.montoExterno)}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-brand-subtext font-mono text-[10px] shrink-0">FECHA DE ACTIVACIÓN:</span>
                            <span className="text-brand-text font-mono">{selectedContractForBaja.createdAt}</span>
                          </div>
                        </div>

                        {/* Date input area */}
                        <div className="space-y-3 text-xs">
                          <div className="space-y-1.5">
                            <label className="block text-[9px] font-mono text-brand-subtext tracking-widest uppercase font-bold">
                              Fecha Oficial de Baja de Suministro
                            </label>
                            <input
                              type="date"
                              required
                              value={bajaDate}
                              onChange={(e) => setBajaDate(e.target.value)}
                              className="w-full bg-brand-surface border border-brand-border rounded-lg p-2.5 font-mono text-brand-text text-xs text-center focus:border-rose-500 focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[9px] font-mono text-brand-subtext tracking-widest uppercase font-bold">
                              Motivo del cambio (opcional)
                            </label>
                            <textarea
                              value={bajaMotivo}
                              onChange={(e) => setBajaMotivo(e.target.value)}
                              rows={2}
                              placeholder="Ej. cliente cambió de comercializadora antes del plazo"
                              className="w-full bg-brand-surface border border-brand-border rounded-lg p-2.5 text-brand-text text-xs resize-none focus:border-rose-500 focus:outline-none"
                            />
                          </div>
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
                              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] rounded-lg font-mono">
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
                            <div className="p-3.5 bg-brand-surface border border-brand-border rounded-md text-xs font-mono space-y-2">
                              {secure ? (
                                <div className="text-emerald-600 dark:text-emerald-400 font-bold text-center py-1">
                                  ✓ SEGURO: El contrato ha consumido todo el periodo de cobertura ({limitMonths} meses). No se aplicará retrocomisión negativa.
                                </div>
                              ) : (
                                <>
                                  <div className="flex justify-between text-rose-600 dark:text-rose-400 border-b border-brand-border pb-1">
                                    <span>PENALIZACIÓN CORRESPONDIENTE:</span>
                                    <span className="font-extrabold">{(clawbackPercent * 100).toFixed(0)} %</span>
                                  </div>
                                  <div className="flex justify-between text-brand-text font-bold text-[11px] pt-2">
                                    <span>SALDO NEGATIVO RECOBRABLE:</span>
                                    <span className="text-rose-600 dark:text-rose-400 font-black">-{formatCurrency(clawbackAmount)}</span>
                                  </div>
                                  <p className="text-[9px] text-brand-subtext mt-1 leading-snug">
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
                            className="px-4 py-2 bg-brand-surface hover:bg-brand-elevated text-brand-text font-bold rounded-xl border border-brand-border cursor-safe"
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
                      deleting={isDeletingUserId === activeUserForSheet.id}
                      canDelete={activeRole === 'superadmin'}
                      currentUserId={activeUserId}
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
                                  onPaste={createNoSpacePasteHandler(
                                    modalNif,
                                    (v) => setModalNif(v.toUpperCase()),
                                    { transform: (s) => s.toUpperCase() }
                                  )}
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
                                    onPaste={createNoSpacePasteHandler(modalTelefono, setModalTelefono)}
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
                                    onPaste={createNoSpacePasteHandler(modalEmail, setModalEmail)}
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
                                  onPaste={createNoSpacePasteHandler(
                                    modalIban,
                                    (v) => setModalIban(v.toUpperCase()),
                                    { transform: (s) => s.toUpperCase() }
                                  )}
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
                                  onPaste={createNoSpacePasteHandler(
                                    modalCups,
                                    (v) => setModalCups(v.toUpperCase()),
                                    { transform: normalizeCups }
                                  )}
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
      <Suspense fallback={null}>
      <NuevoContratoWizard
        open={contractWizardOpen}
        mode={editingContractId ? 'edit' : 'create'}
        onClose={() => {
          setContractWizardOpen(false);
          setContractWizardProspectoId(null);
          setEditingContractId(null);
          resetNewContractForm();
        }}
        form={newContractForm}
        onChange={patchNewContractForm}
        onSubmit={(e, opts) => {
          if (editingContractId) {
            void handleUpdateContractFromWizard(
              e,
              () => {
                setContractWizardOpen(false);
                setEditingContractId(null);
              },
              { incomplete: opts?.incomplete }
            );
            return;
          }
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
          );
        }}
        isSubmitting={isCreatingContract}
        commissionPercentage={activeUser.commissionPercentage}
        formatCurrency={formatCurrency}
        renderCompaniaLogo={renderCompaniaLogo}
        profiles={profiles}
        activeUserId={activeUserId}
        activeUserName={activeUser.fullName}
        activeUserRole={activeRole}
        clients={clients}
        contracts={contracts}
        settlements={settlements}
        editingContractId={editingContractId}
        onDeleteContract={
          editingContractId
            ? () => void handleDeleteContract(editingContractId)
            : undefined
        }
      />
      </Suspense>
      {isLoggedIn && remoteVersion ? (
        <AppUpdateBanner remoteVersion={remoteVersion} onDismiss={dismissAppUpdate} />
      ) : null}
      {isLoggedIn && isRuntimeIntegrityEnforced() && integrityBlocked ? (
        <RuntimeIntegrityBlockModal
          userName={activeUser.fullName}
          findings={integrityFindings}
        />
      ) : null}
      {isLoggedIn && canEditFiscalProfile ? (
        <PerfilComercialModal
          open={perfilComercialOpen}
          onClose={() => setPerfilComercialOpen(false)}
          comercialId={activeUserId}
          fullName={activeUser.fullName}
          email={activeUser.email}
          initialForm={fiscalFormFromComercial(erpComercialFromProfile(activeUser))}
          onSaved={handleSaveFiscalProfile}
        />
      ) : null}
      {isLoggedIn && activeModule === 'erp' ? (
        <AvisosModal
          open={avisosModalOpen}
          avisos={avisos}
          activeUserId={activeUserId}
          onClose={() => setAvisosModalOpen(false)}
          onMarcarVistos={handleMarcarAvisosVistos}
        />
      ) : null}
    </div>
  );
}
