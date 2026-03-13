'use client';
import { useMemo } from 'react';

const CX = 200, CY = 220, R = 155;
const START_DEG = -148, TOTAL_DEG = 296;

function polar(deg: number, r = R) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function arcPath(from: number, to: number, r = R) {
  if (Math.abs(to - from) < 0.01) return '';
  const s = polar(from, r), e = polar(to, r);
  const large = (to - from) > 180 ? 1 : 0;
  return 'M ' + s.x.toFixed(2) + ' ' + s.y.toFixed(2) +
         ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' +
         e.x.toFixed(2) + ' ' + e.y.toFixed(2);
}

function dialColor(v: number) {
  if (v < 60) return '#0ea5e9';  // sky blue
  if (v < 80) return '#f59e0b';  // amber
  return '#ef4444';               // red
}

function dialLabel(v: number) {
  if (v === 0) return 'SILENCE';
  if (v < 30)  return 'QUIET';
  if (v < 55)  return 'MODERATE';
  if (v < 75)  return 'LOUD';
  if (v < 85)  return 'INTENSE';
  return 'CRITICAL';
}

interface Props { value: number; active: boolean }

export function LiveDial({ value, active }: Props) {
  const v = Math.max(0, Math.min(100, value));
  const valueDeg = START_DEG + (v / 100) * TOTAL_DEG;
  const color = active ? dialColor(v) : '#94a3b8';
  const label = dialLabel(v);

  const ticks = useMemo(() =>
    Array.from({ length: 26 }, (_, i) => {
      const pct  = i / 25;
      const deg  = START_DEG + pct * TOTAL_DEG;
      const major = i % 5 === 0;
      const lit  = pct * 100 <= v && active;
      return {
        outer: polar(deg, R - 2),
        inner: polar(deg, R - (major ? 20 : 11)),
        numPt: major ? polar(deg, R - 30) : null,
        val:   major ? Math.round(pct * 100) : null,
        lit, major,
      };
    }), [v, active]
  );

  const nTip   = polar(valueDeg, R - 20);
  const nL     = polar(valueDeg - 90, 10);
  const nR     = polar(valueDeg + 90, 10);
  const nBase  = polar(valueDeg + 180, 24);

  return (
    <svg viewBox="0 0 400 290" className="w-full max-w-[340px] mx-auto">
      {/* Background arc track */}
      <path d={arcPath(START_DEG, START_DEG + TOTAL_DEG)}
        fill="none" stroke="#e2e8f0" strokeWidth="18" strokeLinecap="round" />

      {/* Zone shading */}
      <path d={arcPath(START_DEG, START_DEG + 0.6 * TOTAL_DEG)}
        fill="none" stroke="#bae6fd22" strokeWidth="18" />
      <path d={arcPath(START_DEG + 0.6 * TOTAL_DEG, START_DEG + 0.8 * TOTAL_DEG)}
        fill="none" stroke="#fde68a22" strokeWidth="18" />
      <path d={arcPath(START_DEG + 0.8 * TOTAL_DEG, START_DEG + TOTAL_DEG)}
        fill="none" stroke="#fecaca22" strokeWidth="18" />

      {/* 85 threshold dash */}
      {(() => {
        const thDeg = START_DEG + 0.85 * TOTAL_DEG;
        const o = polar(thDeg, R + 5);
        const i2 = polar(thDeg, R - 24);
        return <line x1={o.x} y1={o.y} x2={i2.x} y2={i2.y}
          stroke="#ef4444" strokeWidth="2" strokeDasharray="3 2" opacity="0.5" />;
      })()}

      {/* Active fill arc */}
      {v > 0 && active && (
        <path d={arcPath(START_DEG, valueDeg)}
          fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 2px 6px ' + color + '66)', transition: 'stroke 0.35s' }} />
      )}

      {/* Ticks */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={t.inner.x} y1={t.inner.y} x2={t.outer.x} y2={t.outer.y}
            stroke={t.lit ? color : '#cbd5e1'} strokeWidth={t.major ? 2.5 : 1.2}
            style={t.lit ? { transition: 'stroke 0.3s' } : undefined} />
          {t.numPt && t.val !== null && (
            <text x={t.numPt.x} y={t.numPt.y} textAnchor="middle" dominantBaseline="middle"
              fill={t.lit ? color : '#94a3b8'} fontSize="10"
              fontFamily="ui-monospace,SFMono-Regular,monospace" fontWeight={t.major ? '600' : '400'}>
              {t.val}
            </text>
          )}
        </g>
      ))}

      {/* 85 label */}
      {(() => {
        const p = polar(START_DEG + 0.85 * TOTAL_DEG, R - 38);
        return <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
          fill="#ef444480" fontSize="9" fontFamily="ui-monospace,SFMono-Regular,monospace">85</text>;
      })()}

      {/* Needle */}
      <polygon
        points={
          nTip.x.toFixed(1) + ',' + nTip.y.toFixed(1) + ' ' +
          nL.x.toFixed(1)   + ',' + nL.y.toFixed(1)   + ' ' +
          nBase.x.toFixed(1) + ',' + nBase.y.toFixed(1) + ' ' +
          nR.x.toFixed(1)   + ',' + nR.y.toFixed(1)
        }
        fill={color}
        opacity={active ? 1 : 0.35}
        style={{ filter: active ? 'drop-shadow(0 2px 4px ' + color + '88)' : 'none', transition: 'all 0.07s linear' }}
      />

      {/* Hub */}
      <circle cx={CX} cy={CY} r="12" fill="white"
        style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.12))' }} />
      <circle cx={CX} cy={CY} r="4.5" fill={color} style={{ transition: 'fill 0.35s' }} />

      {/* Value text */}
      <text x={CX} y={CY - 58} textAnchor="middle" dominantBaseline="middle"
        fill={active ? color : '#94a3b8'} fontSize="52" fontFamily="ui-monospace,SFMono-Regular,monospace"
        fontWeight="800" style={{ transition: 'fill 0.35s' }}>
        {String(v).padStart(2, '0')}
      </text>
      <text x={CX} y={CY - 16} textAnchor="middle" dominantBaseline="middle"
        fill={active ? color : '#cbd5e1'} fontSize="11"
        fontFamily="ui-sans-serif,sans-serif" fontWeight="600" letterSpacing="3">
        {label}
      </text>
      <text x={CX} y={CY + 2} textAnchor="middle" dominantBaseline="middle"
        fill="#94a3b8" fontSize="9" fontFamily="ui-monospace,SFMono-Regular,monospace">
        {active ? 'LIVE · /100' : 'STANDBY'}
      </text>
    </svg>
  );
}
