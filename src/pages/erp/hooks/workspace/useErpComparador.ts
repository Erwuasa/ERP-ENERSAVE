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
import { normalizeComparadorAccessTariff, resolveComparadorCatalogPeajeKey } from '@/lib/comparador-access-tariff';
import { computeComparadorOffers } from '@/lib/erp/comparador-offers';
import { formatCurrency } from '@/lib/erp/format-currency';
import type { CompProposalFilterId } from '@/lib/comparador-proposal-filters';
import type { ComparadorSortMode } from '@/lib/comparador-sort';
import { applyComparadorOcrResult } from '@/lib/comparador-ocr-apply';
import { extractContractDataFromDocument } from '@/lib/contract-ocr';
import { listAtComparisons } from '@/lib/supabase/at-comparisons';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import type { MarcoRetributivoRow } from '@/lib/supabase/marco-retributivo';
import { loadMarcoRetributivoStaleWhileRevalidate } from '@/lib/supabase/marco-retributivo-cache';
import {
  mapComparadorHistoryListToEstudioAhorroConjunto,
  mapComparadorHistoryToEstudioAhorro,
  mapComparadorToEstudioAhorro,
  resolveOfferPrecios,
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
import type { ComparadorOfferOption } from '@/components/ComparadorOfferCard';
import {
  loadLocalComparisonHistory,
  persistLocalComparisonHistory,
  type ComparisonHistoryEntry,
} from '@/lib/comparador-history-storage';
import { COMPARADOR_MESES_ANUAL } from '@/lib/comparador-billing';
import type { AppModule } from '@/constants/navigation';
import { emptyComparadorPeriodValues } from '@/lib/comparador-periods';

export type { ComparisonHistoryEntry };

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
  const [compPotencias, setCompPotencias] = useState<ComparadorPeriodValues>(
    emptyComparadorPeriodValues()
  );
  const [compConsumos, setCompConsumos] = useState<ComparadorPeriodValues>(
    emptyComparadorPeriodValues()
  );
  const [compPreciosPotenciaActual, setCompPreciosPotenciaActual] =
    useState<ComparadorPeriodValues>({
      p1: 0,
      p2: 0,
      p3: 0,
      p4: 0,
      p5: 0,
      p6: 0,
    });
  const [compPreciosEnergiaActual, setCompPreciosEnergiaActual] =
    useState<ComparadorPeriodValues>({
      p1: 0,
      p2: 0,
      p3: 0,
      p4: 0,
      p5: 0,
      p6: 0,
    });
  const [compConsumoAnualKwh, setCompConsumoAnualKwh] = useState<number>(0);
  const [compDiasFacturados, setCompDiasFacturados] = useState<number>(30);
  const [compRentMeter, setCompRentMeter] = useState<number>(0);
  const [compBonoSocial, setCompBonoSocial] = useState<number>(0);
  const [compEnergiaReactiva, setCompEnergiaReactiva] = useState<number>(0);
  const [compOtrosCostesSva, setCompOtrosCostesSva] = useState<number>(0);
  const [compDescuentoPotencia, setCompDescuentoPotencia] = useState<number>(0);
  const [compDescuentoEnergia, setCompDescuentoEnergia] = useState<number>(0);
  const [compCurrentBill, setCompCurrentBill] = useState<number>(0);
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

  const [comparisonsHistory, setComparisonsHistory] = useState<ComparisonHistoryEntry[]>(
    () => loadLocalComparisonHistory()
  );

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    if (
      currentMenuTab !== 'Comparador' &&
      currentMenuTab !== 'Comparador de Facturas' &&
      currentMenuTab !== 'Historial de Comparativas'
    ) {
      return;
    }
    void listAtComparisons().then((result) => {
      if (!result.ok) return;
      const fromAt: ComparisonHistoryEntry[] = result.data.map((row) => ({
        id: row.id,
        clientName: row.clientName || row.name,
        cups: row.cups,
        accessTariff: normalizeComparadorAccessTariff(row.accessTariff),
        currentAnnualExpense: row.currentAnnualExpense,
        maxAnnualSavings: row.maxAnnualSavings,
        bestTariffName: row.bestTariffName || row.name,
        date: row.date,
        source: 'at',
      }));
      setComparisonsHistory((prev) => {
        const local = prev.filter((item) => item.source !== 'at');
        persistLocalComparisonHistory(local);
        return [...fromAt, ...local];
      });
    });
  }, [currentMenuTab]);

  useEffect(() => {
    persistLocalComparisonHistory(comparisonsHistory);
  }, [comparisonsHistory]);

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
    if (
      currentMenuTab !== 'Comparador' &&
      currentMenuTab !== 'Comparador de Facturas' &&
      currentMenuTab !== 'Historial de Comparativas'
    ) {
      return;
    }
    void loadMarcoRetributivoStaleWhileRevalidate({
      onRevalidated: (fresh) => setMarcoRowsForComparador(fresh),
    }).then((rows) => setMarcoRowsForComparador(rows));
  }, [currentMenuTab]);

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
        setCompConsumoAnualKwh,
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

  function buildEstudioParamsFromOffer(option: ComparadorOfferOption) {
    const currentAnnualExpense = Math.round(
      Number(compCurrentBill || 0) * COMPARADOR_MESES_ANUAL || option.annualCost + option.savingsAnnual
    );
    return {
      clienteNombre: compClient || 'Cliente',
      cups: compCups,
      accessTariff: compAccessTariff,
      tarifaActualNombre: compTarifaActual,
      comercializadoraActual: compCompaniaActual,
      potencias: compPotencias,
      consumos: compConsumos,
      preciosPotenciaActual: compPreciosPotenciaActual,
      preciosEnergiaActual: compPreciosEnergiaActual,
      diasFacturacion: compDiasFacturados,
      rentMeterMonthly: compRentMeter,
      bonoSocial: compBonoSocial,
      energiaReactiva: compEnergiaReactiva,
      otrosCostesSva: compOtrosCostesSva,
      descuentoPotencia: compDescuentoPotencia,
      descuentoEnergia: compDescuentoEnergia,
      currentBillMonthly: compCurrentBill,
      bestOption: {
        companyName: option.companyName,
        tariffName: option.tariffName,
        annualCost: option.annualCost,
        potenciaBreakdown: option.potenciaBreakdown,
        consumoBreakdown: option.consumoBreakdown,
        rentCostAnnual: Math.round(compRentMeter * COMPARADOR_MESES_ANUAL),
        savingsAnnual: option.savingsAnnual,
        savingsPercentage: option.savingsPercentage ?? 0,
        precios: option.precios ?? resolveOfferPrecios(option),
      },
      summary: {
        bestTariffName: option.tariffName,
        bestTariffCompany: option.companyName,
        maxAnnualSavings: option.savingsAnnual,
        maxSavingsPercentage: option.savingsPercentage ?? 0,
        currentAnnualExpense,
      },
    };
  }

  async function handleDownloadComparadorPdf(option?: ComparadorOfferOption) {
    const best = option ?? (compResults?.[0] as ComparadorOfferOption | undefined);
    if (!best) {
      toast.error('Ejecuta la comparativa antes de descargar el PDF.');
      return;
    }
    try {
      const input = mapComparadorToEstudioAhorro(buildEstudioParamsFromOffer(best));
      const blob = await generateEstudioAhorroPdf(input);
      downloadEstudioAhorroPdf(blob, compClient || 'cliente');
      toast.success('Estudio de ahorro descargado correctamente.');
    } catch (error) {
      console.error(error);
      toast.error('No se pudo generar el PDF. Inténtalo de nuevo.');
    }
  }

  function handleSaveComparativaToHistory(option: ComparadorOfferOption) {
    const already = comparisonsHistory.some(
      (item) =>
        item.source !== 'at' &&
        item.bestTariffName === option.tariffName &&
        item.cups === (compCups.trim() || item.cups) &&
        item.snapshot?.companyName === option.companyName
    );
    if (already) {
      toast.message('Esta comparativa ya está en el historial.');
      return;
    }

    const params = buildEstudioParamsFromOffer(option);
    const entry: ComparisonHistoryEntry = {
      id: `comp-${Date.now()}-${option.id}`,
      clientName: compClient.trim() || 'Cliente',
      cups: compCups.trim() || '—',
      accessTariff: compAccessTariff,
      currentAnnualExpense: params.summary.currentAnnualExpense,
      maxAnnualSavings: option.savingsAnnual,
      bestTariffName: option.tariffName,
      date: new Date().toISOString().split('T')[0],
      source: 'local',
      snapshot: {
        potencias: compPotencias,
        consumos: compConsumos,
        preciosPotenciaActual: compPreciosPotenciaActual,
        preciosEnergiaActual: compPreciosEnergiaActual,
        preciosOferta: option.precios ?? resolveOfferPrecios(option),
        diasFacturacion: compDiasFacturados,
        rentMeterMonthly: compRentMeter,
        bonoSocial: compBonoSocial,
        energiaReactiva: compEnergiaReactiva,
        otrosCostesSva: compOtrosCostesSva,
        descuentoPotencia: compDescuentoPotencia,
        descuentoEnergia: compDescuentoEnergia,
        currentBillMonthly: compCurrentBill,
        tarifaActualNombre: compTarifaActual,
        comercializadoraActual: compCompaniaActual,
        companyName: option.companyName,
        monthlyCost: option.monthlyCost,
        annualCost: option.annualCost,
      },
    };
    setComparisonsHistory((prev) => [entry, ...prev]);
    toast.success(`Comparativa de ${option.tariffName} guardada en el historial.`);
  }

  async function handleDownloadHistoryPdf(item: ComparisonHistoryEntry) {
    try {
      const snapshot = item.snapshot
        ? {
            clienteNombre: item.clientName,
            cups: item.cups,
            accessTariff: item.accessTariff,
            tarifaActualNombre: item.snapshot.tarifaActualNombre,
            comercializadoraActual: item.snapshot.comercializadoraActual,
            potencias: item.snapshot.potencias,
            consumos: item.snapshot.consumos,
            preciosPotenciaActual: item.snapshot.preciosPotenciaActual,
            preciosEnergiaActual: item.snapshot.preciosEnergiaActual,
            diasFacturacion: item.snapshot.diasFacturacion,
            rentMeterMonthly: item.snapshot.rentMeterMonthly,
            bonoSocial: item.snapshot.bonoSocial,
            energiaReactiva: item.snapshot.energiaReactiva,
            otrosCostesSva: item.snapshot.otrosCostesSva,
            descuentoPotencia: item.snapshot.descuentoPotencia ?? 0,
            descuentoEnergia: item.snapshot.descuentoEnergia ?? 0,
            currentBillMonthly: item.snapshot.currentBillMonthly,
            bestOption: {
              companyName: item.snapshot.companyName,
              tariffName: item.bestTariffName,
              annualCost: item.snapshot.annualCost,
              potenciaBreakdown: 0,
              consumoBreakdown: 0,
              rentCostAnnual: Math.round(
                item.snapshot.rentMeterMonthly * COMPARADOR_MESES_ANUAL
              ),
              savingsAnnual: item.maxAnnualSavings,
              savingsPercentage:
                item.currentAnnualExpense > 0
                  ? (item.maxAnnualSavings / item.currentAnnualExpense) * 100
                  : 0,
              precios: item.snapshot.preciosOferta,
            },
            summary: {
              bestTariffName: item.bestTariffName,
              bestTariffCompany: item.snapshot.companyName,
              maxAnnualSavings: item.maxAnnualSavings,
              maxSavingsPercentage:
                item.currentAnnualExpense > 0
                  ? (item.maxAnnualSavings / item.currentAnnualExpense) * 100
                  : 0,
              currentAnnualExpense: item.currentAnnualExpense,
            },
          }
        : undefined;
      const input = mapComparadorHistoryToEstudioAhorro({
        clientName: item.clientName,
        cups: item.cups,
        accessTariff: item.accessTariff,
        currentAnnualExpense: item.currentAnnualExpense,
        maxAnnualSavings: item.maxAnnualSavings,
        bestTariffName: item.bestTariffName,
        bestTariffCompany: item.snapshot?.companyName,
        snapshot,
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
          bestTariffCompany: item.snapshot?.companyName,
          snapshot: item.snapshot
            ? {
                clienteNombre: item.clientName,
                cups: item.cups,
                accessTariff: item.accessTariff,
                tarifaActualNombre: item.snapshot.tarifaActualNombre,
                comercializadoraActual: item.snapshot.comercializadoraActual,
                potencias: item.snapshot.potencias,
                consumos: item.snapshot.consumos,
                preciosPotenciaActual: item.snapshot.preciosPotenciaActual,
                preciosEnergiaActual: item.snapshot.preciosEnergiaActual,
                diasFacturacion: item.snapshot.diasFacturacion,
                rentMeterMonthly: item.snapshot.rentMeterMonthly,
                bonoSocial: item.snapshot.bonoSocial,
                energiaReactiva: item.snapshot.energiaReactiva,
                otrosCostesSva: item.snapshot.otrosCostesSva,
                currentBillMonthly: item.snapshot.currentBillMonthly,
                bestOption: {
                  companyName: item.snapshot.companyName,
                  tariffName: item.bestTariffName,
                  annualCost: item.snapshot.annualCost,
                  potenciaBreakdown: 0,
                  consumoBreakdown: 0,
                  rentCostAnnual: Math.round(
                    item.snapshot.rentMeterMonthly * COMPARADOR_MESES_ANUAL
                  ),
                  savingsAnnual: item.maxAnnualSavings,
                  savingsPercentage:
                    item.currentAnnualExpense > 0
                      ? (item.maxAnnualSavings / item.currentAnnualExpense) * 100
                      : 0,
                  precios: item.snapshot.preciosOferta,
                },
                summary: {
                  bestTariffName: item.bestTariffName,
                  bestTariffCompany: item.snapshot.companyName,
                  maxAnnualSavings: item.maxAnnualSavings,
                  maxSavingsPercentage:
                    item.currentAnnualExpense > 0
                      ? (item.maxAnnualSavings / item.currentAnnualExpense) * 100
                      : 0,
                  currentAnnualExpense: item.currentAnnualExpense,
                },
              }
            : undefined,
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

  async function handleGenerarEmailPropuesta(option: ComparadorOfferOption) {
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
      const companiesForTariff = Object.keys(
        companiesTariffsCatalog[resolveComparadorCatalogPeajeKey(modalAccessTariff)] || {}
      );
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
        (companiesTariffsCatalog[resolveComparadorCatalogPeajeKey(modalAccessTariff)] || {})[
          modalCompany
        ] || [];
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
      source: 'local',
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
    compCompaniaActual,
    setCompCompaniaActual,
    compSegment,
    setCompSegment,
    compAccessTariff,
    setCompAccessTariff,
    compPotencias,
    setCompPotencias,
    compConsumos,
    setCompConsumos,
    compPreciosPotenciaActual,
    setCompPreciosPotenciaActual,
    compPreciosEnergiaActual,
    setCompPreciosEnergiaActual,
    compConsumoAnualKwh,
    setCompConsumoAnualKwh,
    compDiasFacturados,
    setCompDiasFacturados,
    compRentMeter,
    setCompRentMeter,
    compBonoSocial,
    setCompBonoSocial,
    compEnergiaReactiva,
    setCompEnergiaReactiva,
    compOtrosCostesSva,
    setCompOtrosCostesSva,
    compDescuentoPotencia,
    setCompDescuentoPotencia,
    compDescuentoEnergia,
    setCompDescuentoEnergia,
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
    handleSaveComparativaToHistory,
    handleGenerarEmailPropuesta,
    handleOpenEmailPropuestaMailClient,
  };
}
