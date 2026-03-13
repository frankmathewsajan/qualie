'use client';
import { useMemo } from 'react';

const CX = 200, CY = 210, R = 160;
const START_DEG = -150, TOTAL_DEG = 300;

function polar(deg: number, r = R) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function arcPath(from: number, to: number, r = R) {
  if (Math.abs(to - from) < 0.01) return '';
  const s = polar(from, r), e = polar(to, r);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

function gaugeColor(v: number) {
  if (v < 60) return '#00e5ff';
  if (v < 80) return '#f59e0b';
  return '#ef4444';
}

function gaugeLabel(v: number): { label: string; sub: string } {
  if (v === 0) return { label: 'SILENCE',  sub: 'awaiting input'      };
  if (v < 30)  return { label: 'QUIET',    sub: 'low amplitude'        };
  if (v < 55)  return { label: 'MODERATE', sub: 'normal speech'        };
  if (v < 75)  return { label: 'LOUD',     sub: 'elevated vocal stress' };
  if (v < 85)  return { label: 'INTENSE',  sub: 'high stress detected' };
  return              { label: 'CRITICAL', sub: 'threshold breached'   };
}

interface Props { value: number; breached: boolean }

export function VolumeGauge({ value, breached }: Props) {
  const v = Math.min(100, Math.max(0, value));
  const valueDeg = START_DEG + (v / 100) * TOTAL_DEG;
  const color = gaugeColor(v);
  const { label, sub } = gaugeLabel(v);

  const ticks = useMemo(() =>
    Array.from({ length: 21 }, (_, i) => {
      const pct = i / 20;
      const deg = START_DEG + pct * TOTAL_DEG;
      const major = i % 5 === 0;
      return {
        outer: polar(deg, R + 4),
        inner: polar(deg, R - (major ? 18 : 10)),
        label: major ? polar(deg, R + 22) : null,
        val:   major ? Math.round(pct * 100) : null,
        lit:   pct * 100 <= v,
      };
    }), [v]);

  const needleTip   = polar(valueDeg, R - 18);
  const needleLeft  = polar(valueDeg - 90, 12);
  const needleRight = polar(valueDeg + 90, 12);
  const needleBase  = polar(valueDeg + 180, 28);

  return (
    <div className='relative w-full flex items-center justify-center'>
      <svg
        viewBox='0 0 400 280'
        className='w-full max-w-[380px] drop-shadow-2xl'
        style={{ filter: breached ? `drop-shadow(0 0 24px rgba(239,68,68,0.5))` : undefined }}
      >
        {/* Outer ring glow */}
        <circle cx={CX} cy={CY} r={R + 8} fill='none' stroke={color} strokeWidth='1' opacity='0.08' />
        <circle cx={CX} cy={CY} r={R + 16} fill='none' stroke={color} strokeWidth='0.5' opacity='0.04' />

        {/* Background track */}
        <path d={arcPath(START_DEG, START_DEG + TOTAL_DEG)} fill='none' stroke='#0a1e2a' strokeWidth='22' strokeLinecap='round' />

        {/* Zone bands */}
        <path d={arcPath(START_DEG, START_DEG + 0.6 * TOTAL_DEG)} fill='none' stroke='#00e5ff08' strokeWidth='22' />
        <path d={arcPath(START_DEG + 0.6 * TOTAL_DEG, START_DEG + 0.8 * TOTAL_DEG)} fill='none' stroke='#f59e0b08' strokeWidth='22' />
        <path d={arcPath(START_DEG + 0.8 * TOTAL_DEG, START_DEG + TOTAL_DEG)} fill='none' stroke='#ef444408' strokeWidth='22' />

        {/* 85 threshold marker */}
        {(() => {
          const thDeg = START_DEG + 0.85 * TOTAL_DEG;
          const o = polar(thDeg, R + 8), i2 = polar(thDeg, R - 22);
          return <line x1={o.x} y1={o.y} x2={i2.x} y2={i2.y} stroke='#ef4444' strokeWidth='2' strokeDasharray='3 2' opacity='0.7' />;
        })()}

        {/* Active arc */}
        {v > 0 && (
          <path
            d={arcPath(START_DEG, valueDeg)}
            fill='none' stroke={color} strokeWidth='16' strokeLinecap='round'
            style={{ filter: `drop-shadow(0 0 10px ${color})`, transition: 'stroke 0.3s' }}
          />
        )}

        {/* Tick marks */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={t.inner.x} y1={t.inner.y} x2={t.outer.x} y2={t.outer.y}
              stroke={t.lit ? color : '#1a3040'}
              strokeWidth={t.val !== null ? 2.5 : 1}
              style={t.lit ? { filter: `drop-shadow(0 0 3px ${color})` } : undefined}
            />
            {t.label && t.val !== null && (
              <text x={t.label.x} y={t.label.y} textAnchor='middle' dominantBaseline='middle'
                fill={t.lit ? color : '#2a4050'} fontSize='10' fontFamily='monospace' opacity={t.lit ? 1 : 0.5}>
                {t.val}
              </text>
            )}
          </g>
        ))}

        {/* "85" threshold label */}
        {(() => {
          const thDeg = START_DEG + 0.85 * TOTAL_DEG;
          const p = polar(thDeg, R - 34);
          return <text x={p.x} y={p.y} textAnchor='middle' dominantBaseline='middle'
            fill='#ef444480' fontSize='9' fontFamily='monospace'>85</text>;
        })()}

        {/* Needle */}
        <polygon
          points={`${needleTip.x.toFixed(1)},${needleTip.y.toFixed(1)} ${needleLeft.x.toFixed(1)},${needleLeft.y.toFixed(1)} ${needleBase.x.toFixed(1)},${needleBase.y.toFixed(1)} ${needleRight.x.toFixed(1)},${needleRight.y.toFixed(1)}`}
          fill={color}
          style={{
            filter: `drop-shadow(0 0 8px ${color})`,
            transition: 'all 0.08s linear',
          }}
        />

        {/* Hub */}
        <circle cx={CX} cy={CY} r='14' fill='#020c12' stroke={color} strokeWidth='2' />
        <circle cx={CX} cy={CY} r='5' fill={color} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />

        {/* Center readout */}
        <text x={CX} y={CY - 52} textAnchor='middle' fill={color} fontSize='46' fontFamily='monospace' fontWeight='900'
          style={{ textShadow: `0 0 30px ${color}`, transition: 'fill 0.3s' }}>
          {String(v).padStart(2, '0')}
        </text>
        <text x={CX} y={CY - 10} textAnchor='middle' fill={color} fontSize='12' fontFamily='monospace' fontWeight='700' letterSpacing='4' opacity='0.9'>
          {label}
        </text>
        <text x={CX} y={CY + 8} textAnchor='middle' fill='#334a56' fontSize='9' fontFamily='monospace' letterSpacing='1'>
          {sub}
        </text>
      </svg>
    </div>
  );
}
