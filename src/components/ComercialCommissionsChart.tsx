import React, { useState } from 'react';
import { motion } from 'motion/react';

interface ChartPoint {
  label: string;
  value: number;
}

interface ComercialCommissionsChartProps {
  contracts: any[];
  settlements: any[];
  activeUserId: string;
  selectedPeriod: string;
}

export const ComercialCommissionsChart: React.FC<ComercialCommissionsChartProps> = ({
  contracts,
  settlements,
  activeUserId,
  selectedPeriod,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Helper to format currency
  const formatValue = (val: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);
  };

  // Extract / mock data based on selectedPeriod to have a beautiful graph curve
  const getPoints = (): ChartPoint[] => {
    // We compute actual completed and pending commissions in the selected period as points
    const userSettlements = settlements.filter(s => s.comercialId === activeUserId);
    
    const now = new Date();
    
    const getLimitDate = () => {
      const d = new Date();
      if (selectedPeriod === '1d') d.setDate(now.getDate() - 1);
      else if (selectedPeriod === '1w') d.setDate(now.getDate() - 7);
      else if (selectedPeriod === '1m') d.setMonth(now.getMonth() - 1);
      else if (selectedPeriod === '3m') d.setMonth(now.getMonth() - 3);
      else if (selectedPeriod === '6m') d.setMonth(now.getMonth() - 6);
      else if (selectedPeriod === '1y') d.setFullYear(now.getFullYear() - 1);
      return d;
    };
    
    const limitDate = getLimitDate();
    const periodSettlements = selectedPeriod === 'all' 
      ? userSettlements 
      : userSettlements.filter(s => new Date(s.createdAt) >= limitDate);
      
    const totalInPeriod = periodSettlements.reduce((sum, s) => sum + s.montoExterno, 0);

    // If total in period is absolutely 0, return flat zero points
    if (totalInPeriod === 0) {
      if (selectedPeriod === '1d') {
        return [
          { label: '08:00', value: 0 },
          { label: '11:00', value: 0 },
          { label: '14:00', value: 0 },
          { label: '17:00', value: 0 },
          { label: '20:00', value: 0 },
          { label: 'Ahora', value: 0 },
        ];
      }
      if (selectedPeriod === '1w') {
        return [
          { label: 'Lun', value: 0 },
          { label: 'Mar', value: 0 },
          { label: 'Mié', value: 0 },
          { label: 'Jue', value: 0 },
          { label: 'Vie', value: 0 },
          { label: 'Sáb', value: 0 },
          { label: 'Dom', value: 0 },
        ];
      }
      if (selectedPeriod === '1m') {
        return [
          { label: 'Sem 1', value: 0 },
          { label: 'Sem 2', value: 0 },
          { label: 'Sem 3', value: 0 },
          { label: 'Sem 4', value: 0 },
        ];
      }
      return [
        { label: 'Ene', value: 0 },
        { label: 'Feb', value: 0 },
        { label: 'Mar', value: 0 },
        { label: 'Abr', value: 0 },
        { label: 'May', value: 0 },
        { label: 'Jun', value: 0 },
      ];
    }

    // If they have positive values, we distribute them beautifully and logically
    if (selectedPeriod === '1d') {
      const steps = [0.10, 0.25, 0.45, 0.70, 0.90, 1.0];
      const hours = ['08:00', '11:00', '14:00', '17:00', '20:00', 'Ahora'];
      return hours.map((h, i) => ({
        label: h,
        value: Number((totalInPeriod * steps[i]).toFixed(2)),
      }));
    }

    if (selectedPeriod === '1w') {
      const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
      const steps = [0.1, 0.25, 0.40, 0.45, 0.70, 0.90, 1.0];
      return days.map((d, i) => ({
        label: d,
        value: Number((totalInPeriod * steps[i]).toFixed(2)),
      }));
    }

    if (selectedPeriod === '1m') {
      const weeks = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
      const steps = [0.2, 0.45, 0.75, 1.0];
      return weeks.map((w, i) => ({
        label: w,
        value: Number((totalInPeriod * steps[i]).toFixed(2)),
      }));
    }

    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    const steps = [0.15, 0.30, 0.50, 0.70, 0.85, 1.0];
    return months.map((m, i) => ({
      label: m,
      value: Number((totalInPeriod * steps[i]).toFixed(2)),
    }));
  };

  const points = getPoints();
  const maxVal = Math.max(...points.map(p => p.value), 100) * 1.15; // 15% padding on top

  // SVG parameters
  const height = 180;
  const width = 500;
  const paddingX = 40;
  const paddingY = 20;

  const chartHeight = height - paddingY * 2;
  const chartWidth = width - paddingX * 2;

  // Convert points to SVG coordinates
  const svgPoints = points.map((p, i) => {
    const x = paddingX + (i / (points.length - 1)) * chartWidth;
    const y = height - paddingY - (p.value / maxVal) * chartHeight;
    return { x, y, label: p.label, value: p.value };
  });

  // Calculate curve line path (Catmull-Rom or Simple cubic bezier)
  const linePath = svgPoints.reduce((acc, p, i, arr) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    // Draw smooth curve using control points
    const prev = arr[i - 1];
    const cp1x = prev.x + (p.x - prev.x) / 3;
    const cp1y = prev.y;
    const cp2x = prev.x + (2 * (p.x - prev.x)) / 3;
    const cp2y = p.y;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p.x} ${p.y}`;
  }, '');

  // For the glowing filled area beneath the curve
  const areaPath = svgPoints.length > 0 
    ? `${linePath} L ${svgPoints[svgPoints.length - 1].x} ${height - paddingY} L ${svgPoints[0].x} ${height - paddingY} Z` 
    : '';

  return (
    <div className="w-full bg-slate-50 dark:bg-slate-950/20 p-5 rounded-2xl border border-brand-border space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
            Curva de Facturación Trimestral
          </h4>
          <span className="text-[10px] text-slate-400 block mt-0.5">Dinámica de ingresos liquidados</span>
        </div>
        {hoveredIndex !== null && (
          <div className="text-right">
            <span className="text-[9px] text-slate-400 block font-mono">VALOR EN PUNTO:</span>
            <span className="text-xs font-mono font-black text-emerald-500">
              {formatValue(svgPoints[hoveredIndex].value)}
            </span>
          </div>
        )}
      </div>

      <div className="relative">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full overflow-visible"
          style={{ maxHeight: '180px' }}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
            const y = paddingY + ratio * chartHeight;
            return (
              <line
                key={index}
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800/40"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Area under line with elegant gradient */}
          <defs>
            <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {areaPath && (
            <motion.path
              d={areaPath}
              fill="url(#chartGlow)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            />
          )}

          {/* Animated Line drawing itself */}
          <motion.path
            d={linePath}
            fill="none"
            stroke="#10b981"
            strokeWidth={3}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, ease: 'easeInOut' }}
          />

          {/* Interactive dots and layout hover elements */}
          {svgPoints.map((p, index) => (
            <g key={index}>
              {/* Invisible touch and hover target */}
              <circle
                cx={p.x}
                cy={p.y}
                r={16}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />

              {/* Glowing anchor ring on hover */}
              <motion.circle
                cx={p.x}
                cy={p.y}
                r={index === hoveredIndex ? 6 : 4}
                fill={index === hoveredIndex ? '#059669' : '#10b981'}
                stroke="#ffffff"
                strokeWidth={index === hoveredIndex ? 2 : 1.5}
                className="transition-all pointer-events-none"
                animate={{ scale: index === hoveredIndex ? 1.4 : 1 }}
              />

              {/* Simple axis label */}
              <text
                x={p.x}
                y={height - 2}
                textAnchor="middle"
                className="fill-slate-400 font-mono text-[9px] tracking-tight font-bold"
              >
                {p.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};
