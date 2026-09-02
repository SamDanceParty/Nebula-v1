import React, { useState, useRef, useEffect, useCallback } from 'react';

interface KnobProps {
  id?: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  unit?: string;
  displayFormatter?: (val: number) => string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'amber' | 'cyan' | 'rose' | 'emerald' | 'violet';
  logarithmic?: boolean;
  onChange: (val: number) => void;
}

export const Knob: React.FC<KnobProps> = ({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  defaultValue,
  unit = '',
  displayFormatter,
  size = 'md',
  color = 'amber',
  logarithmic = false,
  onChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startValRef = useRef(value);

  // Convert value to 0..1 range
  const toNormalized = useCallback(
    (val: number): number => {
      if (logarithmic && min > 0) {
        const minLog = Math.log(min);
        const maxLog = Math.log(max);
        return (Math.log(val) - minLog) / (maxLog - minLog);
      }
      return (val - min) / (max - min);
    },
    [min, max, logarithmic]
  );

  // Convert 0..1 to actual value
  const fromNormalized = useCallback(
    (norm: number): number => {
      const clamped = Math.max(0, Math.min(1, norm));
      if (logarithmic && min > 0) {
        const minLog = Math.log(min);
        const maxLog = Math.log(max);
        const res = Math.exp(minLog + clamped * (maxLog - minLog));
        return Math.round(res / step) * step;
      }
      const raw = min + clamped * (max - min);
      return Math.round(raw / step) * step;
    },
    [min, max, step, logarithmic]
  );

  const norm = toNormalized(value);
  // Angle: -135deg to +135deg (total 270deg rotation)
  const angle = -135 + norm * 270;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValRef.current = toNormalized(value);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if ((moveEvent.buttons & 1) === 0) {
        onMouseUp();
        return;
      }
      const deltaY = startYRef.current - moveEvent.clientY;
      const sensitivity = 0.005; // 200px drag for full scale
      const newNorm = Math.max(0, Math.min(1, startValRef.current + deltaY * sensitivity));
      const newVal = fromNormalized(newNorm);
      onChange(newVal);
    };

    const onMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleDoubleClick = () => {
    if (defaultValue !== undefined) {
      onChange(defaultValue);
    }
  };

  const sizeDims = {
    sm: { box: 'w-10 h-10', knob: 'w-8 h-8', font: 'text-[10px]' },
    md: { box: 'w-13 h-13', knob: 'w-10 h-10', font: 'text-xs' },
    lg: { box: 'w-16 h-16', knob: 'w-13 h-13', font: 'text-xs' },
  }[size];

  const colorStyles = {
    amber: {
      arc: '#f59e0b',
      indicator: 'bg-amber-400',
      glow: 'shadow-[0_0_10px_rgba(245,158,11,0.4)]',
      text: 'text-amber-400',
    },
    cyan: {
      arc: '#06b6d4',
      indicator: 'bg-cyan-400',
      glow: 'shadow-[0_0_10px_rgba(6,182,212,0.4)]',
      text: 'text-cyan-400',
    },
    rose: {
      arc: '#f43f5e',
      indicator: 'bg-rose-400',
      glow: 'shadow-[0_0_10px_rgba(244,63,94,0.4)]',
      text: 'text-rose-400',
    },
    emerald: {
      arc: '#10b981',
      indicator: 'bg-emerald-400',
      glow: 'shadow-[0_0_10px_rgba(16,185,129,0.4)]',
      text: 'text-emerald-400',
    },
    violet: {
      arc: '#8b5cf6',
      indicator: 'bg-violet-400',
      glow: 'shadow-[0_0_10px_rgba(139,92,246,0.4)]',
      text: 'text-violet-400',
    },
  }[color];

  // SVG arc calculation
  const radius = size === 'sm' ? 18 : size === 'md' ? 22 : 28;
  const strokeWidth = 3;
  const cx = size === 'sm' ? 20 : size === 'md' ? 26 : 32;
  const cy = cx;

  // Arc path math (angles in radians, 0 is at 12 o'clock)
  const startAngle = (135 * Math.PI) / 180;
  const endAngle = ((135 + norm * 270) * Math.PI) / 180;

  const startX = cx + radius * Math.cos(startAngle);
  const startY = cy + radius * Math.sin(startAngle);
  const endX = cx + radius * Math.cos(endAngle);
  const endY = cy + radius * Math.sin(endAngle);
  const largeArcFlag = norm * 270 > 180 ? 1 : 0;

  const displayText = displayFormatter
    ? displayFormatter(value)
    : `${step < 1 ? value.toFixed(step < 0.01 ? 3 : 2) : Math.round(value)}${unit}`;

  return (
    <div id={id} className="flex flex-col items-center select-none group cursor-ns-resize">
      <div
        className={`relative ${sizeDims.box} flex items-center justify-center`}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        title={`${label}: ${displayText} (тяните вверх/вниз, 2x клик для сброса)`}
      >
        {/* SVG background track & active fill arc */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={cx * 2}
          height={cy * 2}
          viewBox={`0 0 ${cx * 2} ${cy * 2}`}
        >
          {/* Background grey arc */}
          <path
            d={`M ${cx + radius * Math.cos((135 * Math.PI) / 180)} ${cy + radius * Math.sin((135 * Math.PI) / 180)} A ${radius} ${radius} 0 1 1 ${cx + radius * Math.cos((405 * Math.PI) / 180)} ${cy + radius * Math.sin((405 * Math.PI) / 180)}`}
            fill="none"
            stroke="#262626"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Active colored arc */}
          {norm > 0.01 && (
            <path
              d={`M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`}
              fill="none"
              stroke={colorStyles.arc}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          )}
        </svg>

        {/* Central Rotary Knob Body */}
        <div
          className={`${sizeDims.knob} rounded-full bg-neutral-900 border border-neutral-700/80 shadow-md flex items-center justify-center transition-transform duration-75 relative ${
            isDragging ? colorStyles.glow : ''
          }`}
          style={{ transform: `rotate(${angle}deg)` }}
        >
          {/* Top Notch Pointer Indicator */}
          <div className={`w-1 h-2.5 rounded-full ${colorStyles.indicator} absolute top-1`} />
          {/* Subtle inner center rim */}
          <div className="w-3 h-3 rounded-full bg-neutral-950/60 border border-neutral-800" />
        </div>
      </div>

      {/* Label and Value readouts */}
      <span className="text-[11px] font-medium text-neutral-400 mt-1 tracking-tight text-center truncate max-w-[70px]">
        {label}
      </span>
      <span className={`font-mono text-[10px] ${colorStyles.text} font-semibold leading-tight`}>
        {displayText}
      </span>
    </div>
  );
};
