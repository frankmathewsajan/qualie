'use client';
import { useMemo } from 'react';

interface Props { value: number }

const CX = 200, CY = 195, R = 155;
const START_DEG = -135, TOTAL_DEG = 270;

function polar(deg: number, r = R) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function arcPath(from: number, to: number, r = R) {
  const s = polar(from, r), e = polar(to, r);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

function threatColor(v: number) {
  if (v < 60) return '#00ff99';
  if (v < 80) return '#f59e0b';
  return '#ef4444';
}

function threatLabel(v: number) {
  if (v === 0)  return { label: 'NOMINAL',   cls: 'text-slate-500' };
  if (v < 40)   return { label: 'LOW',        cls: 'text-emerald-400' };
  if (v < 60)   return { label: 'ELEVATED',   cls: 'text-yellow-400' };
  if (v < 80)   return { label: 'HIGH',       cls: 'text-amber-400' };
  if (v < 90)   return { label: 'CRITICAL',   cls: 'text-red-400' };
  return           { label: 'BREACH',      cls: 'text-red-300 animate-pulse' };
}

export function ThreatGauge({ value }: Props) {
  const clampedVal = Math.min(100, Math.max(0, value));
  const valueDeg = START_DEG + (clampedVal / 100) * TOTAL_DEG;
  const color = threatColor(clampedVal);
  const { label, cls } = threatLabel(clampedVal);

  // Tick marks
  const ticks = useMemo(() =>
    Array.from({ length: 11 }, (_, i) => {
      const deg = START_DEG + (i / 10) * TOTAL_DEG;
      const outer = polar(deg, R + 2);
      const inner = polar(deg, R - 14);
      return { outer, inner, major: i % 5 === 0 };
    }), []);

  const needleTip = polar(valueDeg, R - 20);
  const needleLeft = polar(valueDeg - 90, 10);
  const needleRight = polar(valueDeg + 90, 10);

  return (
    <div className='ops-panel flex flex-col h-full'>
      <div className='border-b border-cyan-900/40 px-3 py-2 flex items-center justify-between shrink-0'>
        <span className='font-mono text-[10px] font-bold text-cyan-500 tracking-widest'>THREAT MATRIX</span>
        <span className='font-mono text-[9px] text-slate-600'>VOCAL STRESS · KINETIC · BEHAVIORAL</span>
      </div>

      <div className='flex-1 flex flex-col items-center justify-center px-4 py-2 gap-2'>
        <svg viewBox='0 0 400 260' className='w-full max-w-90'>
          {/* Background arc */}
          <path d={arcPath(START_DEG, START_DEG + TOTAL_DEG)} fill='none' stroke='#0f1e26' strokeWidth='20' strokeLinecap='round' />

          {/* Color zone bands */}
          <path d={arcPath(START_DEG, START_DEG + 0.59 * TOTAL_DEG)} fill='none' stroke='#00ff9910' strokeWidth='20' />
          <path d={arcPath(START_DEG + 0.59 * TOTAL_DEG, START_DEG + 0.79 * TOTAL_DEG)} fill='none' stroke='#f59e0b10' strokeWidth='20' />
          <path d={arcPath(START_DEG + 0.79 * TOTAL_DEG, START_DEG + TOTAL_DEG)} fill='none' stroke='#ef444410' strokeWidth='20' />

          {/* Value arc */}
          {clampedVal > 0 && (
            <path
              d={arcPath(START_DEG, valueDeg)}
              fill='none'
              stroke={color}
              strokeWidth='14'
              strokeLinecap='round'
              style={{ filter: `drop-shadow(0 0 8px ${color})` }}
            />
          )}

          {/* Tick marks */}
          {ticks.map((t, i) => (
            <line key={i}
              x1={t.inner.x} y1={t.inner.y} x2={t.outer.x} y2={t.outer.y}
              stroke={i * 10 <= clampedVal ? color : '#1e3040'}
              strokeWidth={t.major ? 2.5 : 1}
              style={i * 10 <= clampedVal ? { filter: `drop-shadow(0 0 4px ${color})` } : undefined}
            />
          ))}

          {/* Tick labels */}
          {[0, 25, 50, 75, 100].map(v => {
            const deg = START_DEG + (v / 100) * TOTAL_DEG;
            const p = polar(deg, R + 22);
            return <text key={v} x={p.x} y={p.y} textAnchor='middle' dominantBaseline='middle'
              fill='#334155' fontSize='10' fontFamily='monospace'>{v}</text>;
          })}

          {/* Needle */}
          <polygon
            points={`${needleTip.x.toFixed(1)},${needleTip.y.toFixed(1)} ${needleLeft.x.toFixed(1)},${needleLeft.y.toFixed(1)} ${needleRight.x.toFixed(1)},${needleRight.y.toFixed(1)}`}
            fill={color}
            style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: 'all 1.2s cubic-bezier(0.34,1.56,0.64,1)' }}
          />
          <circle cx={CX} cy={CY} r='8' fill='#0a1a24' stroke={color} strokeWidth='2' />
          <circle cx={CX} cy={CY} r='3' fill={color} />
        </svg>

        {/* Score display */}
        <div className='text-center -mt-4'>
          <div className='font-mono font-black leading-none' style={{ fontSize: '5rem', color, textShadow: `0 0 40px ${color}60`, transition: 'color 0.8s' }}>
            {String(clampedVal).padStart(2, '0')}
          </div>
          <div className={`font-mono font-bold tracking-[0.3em] text-sm mt-1 ${cls}`}>{label}</div>
        </div>
      </div>

      <div className='border-t border-cyan-900/30 px-3 py-1.5 flex items-center justify-between shrink-0'>
        <span className='font-mono text-[9px] text-slate-600'>THREAT INDEX / 100</span>
        <span className='font-mono text-[9px]' style={{ color }}>{clampedVal >= 85 ? '⚠ AUTONOMOUS ACTION ARMED' : 'MONITORING'}</span>
      </div>
    </div>
  );
}
