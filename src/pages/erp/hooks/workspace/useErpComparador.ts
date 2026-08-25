import { useState, useEffect, useCallback, type FormEvent, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';
import type { Profile } from '@/types/profile';
import type { Contract } from '@/types/contract';
import type { Settlement } from '@/types/settlement';
import type { Client } from '@/types/client';
import { upsertClient, syncClientEstados } from '@/lib/clients';
import {
  contractRegistrationErrorMessage,
  validateContractRegistration,
} from '@/lib/contract-registration';
import { companiesTariffsCatalog } from '@/data/tarifas-catalog';
import {
  type ComparadorAccessTariff,
  type ComparadorPeriodValues,
  type ComparadorRateOption,
  type ComparadorRateSummary,
} from '@/lib/erp/comparador-rates';
import { computeComparadorOffers } from '@/lib/erp/comparador-offers';
import { formatCurrency } from '@/lib/erp/format-currency';
import type { CompProposalFilterId } from '@/lib/comparador-proposal-filters';
import type { ComparadorSortMode } from '@/lib/comparador-sort';
import { applyComparadorOcrResult } from '@/lib/comparador-ocr-apply';
import { extractContractDataFromDocument } from '@/lib/contract-ocr';
import { listMarcoRetributivo, type MarcoRetributivoRow } from '@/lib/supabase/marco-retributivo';
import {
  mapComparadorHistoryListToEstudioAhorroConjunto,
  mapComparadorHistoryToEstudioAhorro,
  mapComparadorToEstudioAhorro,
} from '@/lib/pdf/map-comparador-estudio-ahorro';
import {
  downloadEstudioAhorroPdf,
  generateEstudioAhorroConjuntoPdf,
  generateEstudioAhorroPdf,
} from '@/lib/pdf/estudio-ahorro-pdf';
import { generarEmailPropuesta } from '@/lib/ia/email-propuesta-generator';
import {
  buildMailtoHref,
  buildPeriodosMayorConsumo,
  inferTarifaPrecioTipoFromNombre,
} from '@/lib/ia/comparador-email-helpers';

export interface ComparisonHistoryEntry {
  id: string;
  clientName: string;
  cups: string;
  accessTariff: ComparadorAccessTariff;
  currentAnnualExpense: number;
  maxAnnualSavings: number;
  bestTariffName: string;
  date: string;
}

import type { AppModule } from '@/constants/navigation';

interface UseErpComparadorParams {
  activeUser: Profile;
  activeModule: string;
  currentMenuTab: string;
  contracts: Contract[];
  clients: Client[];
  settlements: Settlement[];
  setContracts: Dispatch<SetStateAction<Contract[]>>;
  setClients: Dispatch<SetStateAction<Client[]>>;
  setSettlements: Dispatch<SetStateAction<Settlement[]>>;
  navigateToTab: (module: AppModule, tab: string) => void;
}

export function useErpComparador({
  activeUser,
  activeModule,
  currentMenuTab,
  contracts,
  clients,
  settlements,
  setContracts,
  setClients,
  setSettlements,
  navigateToTab,
}: UseErpComparadorParams) {
  const [compClient, setCompClient] = useState('');
  const [compCups, setCompCups] = useState('');
  const [compTipo, setCompTipo] = useState<'luz' | 'gas'>('luz');
  const [compTarifaActual, setCompTarifaActual] = useState('');
  const [compCompaniaActual, setCompCompaniaActual] = useState('');
  const [compSegment, setCompSegment] = useState<'residencial' | 'pyme'>('residencial');
  const [compAccessTariff, setCompAccessTariff] = useState<ComparadorAccessTariff>('2.0TD');
  const [compPotencias, setCompPotencias] = useState<ComparadorPeriodValues>({
    p1: 4.6,
    p2: 4.6,
    p3: 0,
    p4: 0,
    p5: 0,
    p6: 0,
  });
  const [compConsumos, setCompConsumos] = useState<ComparadorPeriodValues>({
    p1: 1200,
    p2: 900,
    p3: 1500,
    p4: 0,
    p5: 0,
    p6: 0,
  });
  const [compRentMeter, setCompRentMeter] = useState<number>(1.84);
  const [compCurrentBill, setCompCurrentBill] = useState<number>(85);
  const [compResults, setCompResults] = useState<ComparadorRateOption[] | null>(null);
  const [compSummary, setCompSummary] = useState<ComparadorRateSummary | null>(null);
  const [compLoading] = useState<boolean>(false);
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
  const [compHistorySearch, setCompHistorySearch] = useState<string>('');

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
  const [modalAccessTariff, setModalAccessTariff] = useState<ComparadorAccessTariff>('2.0TD');
  const [modalFiles, setModalFiles] = useState<{ name: string; size: string }[]>([]);
  const [selectedComparisonIds, setSelectedComparisonIds] = useState<string[]>([]);
  const [isGeneratingJointPdf, setIsGeneratingJointPdf] = useState(false);

  const [comparisonsHistory, setComparisonsHistory] = useState<ComparisonHistoryEntry[]>([
    {
      id: 'comp-1',
      clientName: 'Ferretería El Candado',
      cups: 'ES0021000000882244XX',
      accessTariff: '3.0TD',
      currentAnnualExpense: 4800,
      maxAnnualSavings: 960,
      bestTariffName: 'EnerLuz Inteligente Indexada',
      date: '2026-05-18',
    },
    {
      id: 'comp-2',
      clientName: 'Lavandería Burbujas',
      cups: 'ES0021000000119988YY',
      accessTariff: '2.0TD',
      currentAnnualExpense: 2300,
      maxAnnualSavings: 450,
      bestTariffName: 'EnerLuz Inteligente Indexada',
      date: '2026-05-20',
    },
    {
      id: 'comp-3',
      clientName: 'Conservas del Cantábrico',
      cups: 'ES0021000000776655ZZ',
      accessTariff: '6.0TD',
      currentAnnualExpense: 14500,
      maxAnnualSavings: 3100,
      bestTariffName: 'EnerLuz Industrial Pool Max 6.0',
      date: '2026-05-22',
    },
  ]);

  const handleCompareRates = useCallback(() => {
    const { results, summary } = computeComparadorOffers({
      accessTariff: compAccessTariff,
      segment: compSegment,
      tipo: compTipo,
      potencias: compPotencias,
      consumos: compConsumos,
      rentMeter: compRentMeter,
      currentBill: compCurrentBill,
      proposalFilters: compProposalFilters,
      sortMode: compSortMode,
      commissionPercentage: activeUser.commissionPercentage,
      formatCurrency,
      marcoRows: marcoRowsForComparador,
    });
    setCompResults(results);
    setCompSummary(summary);
  }, [
    compAccessTariff,
    compSegment,
    compTipo,
    compPotencias,
    compConsumos,
    compRentMeter,
    compCurrentBill,
    compProposalFilters,
    compSortMode,
    activeUser.commissionPercentage,
    marcoRowsForComparador,
  ]);

  useEffect(() => {
    void listMarcoRetributivo().then((result) => {
      if (result.ok) setMarcoRowsForComparador(result.data);
    });
  }, []);

  useEffect(() => {
    handleCompareRates();
  }, [handleCompareRates]);

  useEffect(() => {
    if (
      (currentMenuTab === 'Comparador' || currentMenuTab === 'Comparador de Facturas') &&
      !compResults &&
      !compLoading
    ) {
      handleCompareRates();
    }
  }, [currentMenuTab, compResults, compLoading, handleCompareRates]);

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

  async function handleDownloadComparadorPdf(option?: ComparadorRateOption) {
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
        comercializadoraActual: compCompaniaActual,
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

  async function handleDownloadHistoryPdf(item: ComparisonHistoryEntry) {
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

  async function handleGenerarEmailPropuesta(option: ComparadorRateOption) {
    setEmailPropuestaGeneratingId(option.id);
    setEmailPropuestaOpen(true);
    setEmailPropuestaLoading(true);
    setEmailPropuestaDestino(modalEmail);
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

  const openNewContractModal = (opt: ComparadorRateOption) => {
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
      const tariffsForCompany =
        (companiesTariffsCatalog[modalAccessTariff] || {})[modalCompany] || [];
      if (tariffsForCompany.length > 0) {
        if (!tariffsForCompany.includes(modalTariff)) {
          setModalTariff(tariffsForCompany[0]);
        }
      }
    }
  }, [modalCompany, modalAccessTariff, isContractModalOpen]);

  function appendModalFiles(files: File[]) {
    if (files.length === 0) return;
    const filesArray = files.map((file) => ({
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
    }));
    setModalFiles((prev) => [...prev, ...filesArray]);
    toast.success(`${filesArray.length} archivo(s) acoplado(s).`);
  }

  const handleCreateContractFromModal = (e: FormEvent) => {
    e.preventDefault();

    const totalConsumo =
      compConsumos.p1 +
      compConsumos.p2 +
      compConsumos.p3 +
      (compConsumos.p4 || 0) +
      (compConsumos.p5 || 0) +
      (compConsumos.p6 || 0);
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

    const internalMargin = calculatedConsumo * (modalAccessTariff === '2.0TD' ? 0.01 : 0.012);
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

    const newHistoryEntry: ComparisonHistoryEntry = {
      id: `comp-${Date.now()}`,
      clientName: modalClientName || 'Demo Empresa SL',
      cups: modalCups || 'ES0021000555',
      accessTariff: modalAccessTariff,
      currentAnnualExpense: Math.round(compSummary ? compSummary.currentAnnualExpense : 1200),
      maxAnnualSavings: Math.round(compSummary ? compSummary.maxAnnualSavings : 400),
      bestTariffName: modalTariff,
      date: new Date().toISOString().split('T')[0],
    };
    setComparisonsHistory((prev) => [newHistoryEntry, ...prev]);

    setIsContractModalOpen(false);
    navigateToTab(
      activeModule === 'ventas' ? 'ventas' : 'erp',
      activeModule === 'ventas' ? 'Mis Contratos' : 'Contratos'
    );
    toast.success(
      `¡Contrato registrado con éxito para ${modalClientName}! Se ha redirigido al gestor de contrataciones.`
    );
  };

  return {
    compClient,
    setCompClient,
    compCups,
    setCompCups,
    compTipo,
    setCompTipo,
    compSegment,
    setCompSegment,
    compAccessTariff,
    setCompAccessTariff,
    compPotencias,
    setCompPotencias,
    compConsumos,
    setCompConsumos,
    compRentMeter,
    setCompRentMeter,
    compCurrentBill,
    setCompCurrentBill,
    compResults,
    compSummary,
    compLoading,
    compProposalFilters,
    setCompProposalFilters,
    compSortMode,
    setCompSortMode,
    compOcrLoading,
    compOcrProgress,
    emailPropuestaOpen,
    setEmailPropuestaOpen,
    emailPropuestaLoading,
    emailPropuestaGeneratingId,
    emailPropuestaDestino,
    setEmailPropuestaDestino,
    emailPropuestaAsunto,
    setEmailPropuestaAsunto,
    emailPropuestaCuerpo,
    setEmailPropuestaCuerpo,
    compHistorySearch,
    setCompHistorySearch,
    comparisonsHistory,
    selectedComparisonIds,
    isGeneratingJointPdf,
    toggleComparisonSelection,
    handleDownloadHistoryPdf,
    handleDownloadJointHistoryPdf,
    isContractModalOpen,
    setIsContractModalOpen,
    modalClientName,
    setModalClientName,
    modalNif,
    setModalNif,
    modalTelefono,
    setModalTelefono,
    modalEmail,
    setModalEmail,
    modalIban,
    setModalIban,
    modalDireccionCompleta,
    setModalDireccionCompleta,
    modalDireccionSuministro,
    setModalDireccionSuministro,
    modalCups,
    setModalCups,
    modalPotencia,
    setModalPotencia,
    modalPrecioFijoConsumo,
    setModalPrecioFijoConsumo,
    modalTipoPrecio,
    setModalTipoPrecio,
    modalFechaInicio,
    setModalFechaInicio,
    modalCompany,
    setModalCompany,
    modalTariff,
    setModalTariff,
    modalSegment,
    modalAccessTariff,
    modalFiles,
    setModalFiles,
    openNewContractModal,
    appendModalFiles,
    handleCreateContractFromModal,
    handleComparadorInvoiceOcr,
    handleDownloadComparadorPdf,
    handleGenerarEmailPropuesta,
    handleOpenEmailPropuestaMailClient,
  };
}
