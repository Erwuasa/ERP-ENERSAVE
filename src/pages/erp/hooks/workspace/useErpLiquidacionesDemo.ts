import { useState, useEffect } from 'react';
import type { LiquidacionesConsolidadasView } from '@/lib/liquidaciones-consolidadas';

export function useErpLiquidacionesDemo(currentMenuTab: string) {
  const [liqLoading, setLiqLoading] = useState<boolean>(false);
  const [liquidacionesSearchQuery, setLiquidacionesSearchQuery] = useState('');
  const [liquidacionesConsolidadasView, setLiquidacionesConsolidadasView] =
    useState<LiquidacionesConsolidadasView>('overview');
  const [selectedCompaniaTab, setSelectedCompaniaTab] = useState<string>('Todos');
  const [isConsolidating, setIsConsolidating] = useState<boolean>(false);

  const [pendingContracts, setPendingContracts] = useState<any[]>([
    {
      id: 'pcon-1',
      code: '04AE54BBX',
      cups: 'ES875404715066446',
      dateFirm: '28-abr-2025',
      dateAct: '13-may-2025',
      direction: 'Calle Mayor 53 , Barcelona 25006',
      agentId: 'staff-ignacio',
      agentName: 'Ignacio Ortiz',
      brand: 'Niba',
      tariff: 'Tarifa 2.0TD',
      price: 150.0,
      checked: false,
      clientName: 'Suministros Pérez',
      tipo: 'luz',
    },
    {
      id: 'pcon-2',
      code: 'EC900F84X',
      cups: 'ES963107157423318',
      dateFirm: '04-jun-2025',
      dateAct: '19-jun-2025',
      direction: 'Calle Mayor 7 , Barcelona 33367',
      agentId: 'staff-marta',
      agentName: 'Marta Rivas',
      brand: 'Global Connect',
      tariff: 'Tarifa 2.0TD',
      price: 50.0,
      checked: false,
      clientName: 'Clínica Dental Les Corts',
      tipo: 'luz',
    },
    {
      id: 'pcon-3',
      code: 'F5264AD0X',
      cups: 'ES94130653587045',
      dateFirm: '28-jun-2025',
      dateAct: '13-jul-2025',
      direction: 'Calle Mayor 54 , Barcelona 9297',
      agentId: 'staff-ignacio',
      agentName: 'Ignacio Ortiz',
      brand: 'Niba',
      tariff: 'Tarifa 3.0TD',
      price: 230.0,
      checked: true,
      clientName: 'Panadería Barcelona',
      tipo: 'gas',
    },
    {
      id: 'pcon-4',
      code: '79B45E63X',
      cups: 'ES727908497439937',
      dateFirm: '17-jul-2025',
      dateAct: '01-ago-2025',
      direction: 'Calle Mayor 35 , Barcelona 11367',
      agentId: 'staff-santiago',
      agentName: 'Santiago Cano',
      brand: 'Axpo',
      tariff: 'Tarifa 3.0TD',
      price: 230.0,
      checked: false,
      clientName: 'Restaurante El Celler',
      tipo: 'luz',
    },
    {
      id: 'pcon-5',
      code: 'A828A291A',
      cups: 'ES102983719283712',
      dateFirm: '02-ago-2025',
      dateAct: '15-ago-2025',
      direction: 'Gran Via 122, Madrid 28008',
      agentId: 'staff-elena',
      agentName: 'Elena Garrido',
      brand: 'Endesa',
      tariff: 'Tarifa Fija Pyme',
      price: 180.0,
      checked: false,
      clientName: 'Talleres Mecánicos Gran Vía',
      tipo: 'luz',
    },
  ]);

  const [consolidatedLiquidations, setConsolidatedLiquidations] = useState<any[]>([
    {
      id: 'cliq-1',
      brand: 'Repsol',
      operator: 'Desconocida',
      dateConsolidated: '09-feb-2026 | 07:16 PM',
      contractsCount: 1,
      amount: 250.0,
      code: '728A92BB',
    },
    {
      id: 'cliq-2',
      brand: 'Factorenergia',
      operator: 'Desconocida',
      dateConsolidated: '15-ene-2026 | 04:30 PM',
      contractsCount: 2,
      amount: 380.0,
      code: '028F91CC',
    },
  ]);

  useEffect(() => {
    if (
      currentMenuTab === 'Liquidaciones externas' ||
      currentMenuTab === 'Liquidaciones internas'
    ) {
      setLiqLoading(true);
      const timer = setTimeout(() => {
        setLiqLoading(false);
      }, 800);
      return () => clearTimeout(timer);
    }
    setLiquidacionesConsolidadasView('overview');
  }, [currentMenuTab]);

  return {
    liqLoading,
    liquidacionesSearchQuery,
    setLiquidacionesSearchQuery,
    liquidacionesConsolidadasView,
    setLiquidacionesConsolidadasView,
    selectedCompaniaTab,
    setSelectedCompaniaTab,
    pendingContracts,
    setPendingContracts,
    consolidatedLiquidations,
    setConsolidatedLiquidations,
    isConsolidating,
    setIsConsolidating,
  };
}
