import { useState } from 'react';
import type { AppModule } from '@/constants/navigation';
import type { Prospecto } from '@/lib/ventas/types';

interface UseErpVentasBridgeParams {
  navigateToTab: (module: AppModule, tab: string) => void;
}

export function useErpVentasBridge({ navigateToTab }: UseErpVentasBridgeParams) {
  const [ventasFichaProspectoId, setVentasFichaProspectoId] = useState<string | null>(null);
  const [ventasFichaSnapshot, setVentasFichaSnapshot] = useState<Prospecto | null>(null);
  const [ventasPipelineCentroMandoId, setVentasPipelineCentroMandoId] = useState<string | null>(null);

  function openVentasFicha(prospecto: Prospecto) {
    setVentasFichaProspectoId(prospecto.id);
    setVentasFichaSnapshot(prospecto);
  }

  function openVentasPipelineCentroMando(prospectoId: string) {
    setVentasPipelineCentroMandoId(prospectoId);
    navigateToTab('ventas', 'Pipeline');
  }

  function closeVentasFicha() {
    setVentasFichaProspectoId(null);
    setVentasFichaSnapshot(null);
  }

  return {
    ventasFichaProspectoId,
    ventasFichaSnapshot,
    ventasPipelineCentroMandoId,
    setVentasPipelineCentroMandoId,
    openVentasFicha,
    openVentasPipelineCentroMando,
    closeVentasFicha,
  };
}
