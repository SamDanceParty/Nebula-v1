import React from 'react';
import { SynthPatchConfig, FilterMode } from '../types/synth';
import { Knob } from './Knob';
import { Power, SlidersHorizontal } from 'lucide-react';

interface FilterSectionProps {
  config: SynthPatchConfig;
  onChange: (config: SynthPatchConfig) => void;
}

const filterTypes: { type: FilterMode; label: string }[] = [
  { type: 'lowpass', label: 'LP (НЧ)' },
  { type: 'highpass', label: 'HP (ВЧ)' },
  { type: 'bandpass', label: 'BP (Полоса)' },
  { type: 'notch', label: 'Notch (Режект)' },
];

export const FilterSection: React.FC<FilterSectionProps> = ({ config, onChange }) => {
  const updateFilter = (key: string, val: unknown) => {
    onChange({
      ...config,
      filter: { ...config.filter, [key]: val },
    });
  };

  const updateFilterEnv = (key: string, val: unknown) => {
    onChange({
      ...config,
      filterEnv: { ...config.filterEnv, [key]: val },
    });
  };

  // Generate mini SVG envelope curve
  const { attack, decay, sustain, release } = config.filterEnv;
  const totalTime = attack + decay + 0.4 + release;
  const w = 180;
  const h = 48;
  const pad = 4;
  const usableW = w - pad * 2;
  const usableH = h - pad * 2;

  const aX = pad + (attack / totalTime) * usableW;
  const aY = pad;
  const dX = aX + (decay / totalTime) * usableW;
  const dY = pad + (1 - sustain) * usableH;
  const sX = dX + (0.4 / totalTime) * usableW;
  const sY = dY;
  const rX = sX + (release / totalTime) * usableW;
  const rY = pad + usableH;

  const pathD = `M ${pad} ${pad + usableH} L ${aX} ${aY} L ${dX} ${dY} L ${sX} ${sY} L ${rX} ${rY}`;

  return (
    <div className={`rounded-xl border p-4 transition-all duration-200 ${
      config.filter.enabled ? 'bg-neutral-900/70 border-amber-500/30' : 'bg-neutral-950/60 border-neutral-800 opacity-60'
    }`}>
      {/* Filter Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateFilter('enabled', !config.filter.enabled)}
            className={`p-1.5 rounded-lg border transition ${
              config.filter.enabled
                ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                : 'bg-neutral-800 text-neutral-400 border-neutral-700'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono font-bold text-sm text-neutral-100 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            ФИЛЬТР (VCF)
          </span>
        </div>

        {/* Filter Type Buttons */}
        <div className="flex bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
          {filterTypes.map((ft) => (
            <button
              key={ft.type}
              onClick={() => updateFilter('type', ft.type)}
              className={`px-2 py-1 text-[11px] font-mono rounded transition ${
                config.filter.type === ft.type
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {ft.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Filter Cutoff & Resonance Knobs */}
      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-neutral-800/80 mb-4">
        <Knob
          label="CUTOFF"
          value={config.filter.cutoff}
          min={20}
          max={18000}
          step={10}
          defaultValue={2400}
          logarithmic
          color="amber"
          size="md"
          displayFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}Hz`)}
          onChange={(v) => updateFilter('cutoff', v)}
        />
        <Knob
          label="RESONANCE"
          value={config.filter.resonance}
          min={0.2}
          max={18}
          step={0.1}
          defaultValue={3.5}
          color="amber"
          size="md"
          displayFormatter={(v) => `Q ${v.toFixed(1)}`}
          onChange={(v) => updateFilter('resonance', v)}
        />
        <Knob
          label="ENV DEPTH"
          value={config.filter.envAmount}
          min={-1}
          max={1}
          step={0.02}
          defaultValue={0.4}
          color="amber"
          size="md"
          displayFormatter={(v) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`}
          onChange={(v) => updateFilter('envAmount', v)}
        />
        <Knob
          label="KEY TRACK"
          value={config.filter.keyTracking}
          min={0}
          max={1}
          step={0.05}
          defaultValue={0.5}
          color="amber"
          size="md"
          displayFormatter={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => updateFilter('keyTracking', v)}
        />
      </div>

      {/* Dedicated Filter ADSR Envelope */}
      <div className="bg-neutral-950/80 rounded-lg p-3 border border-neutral-800/80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono text-neutral-400 font-semibold">ОГИБАЮЩАЯ ФИЛЬТРА (FILTER ADSR)</span>
          {/* Mini SVG curve preview */}
          <div className="hidden sm:block">
            <svg width={w} height={h} className="rounded bg-neutral-900/90 border border-neutral-800">
              <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <Knob
            label="ATTACK"
            value={config.filterEnv.attack}
            min={0.005}
            max={3.0}
            step={0.01}
            defaultValue={0.05}
            color="amber"
            size="sm"
            displayFormatter={(v) => (v < 1 ? `${Math.round(v * 1000)}ms` : `${v.toFixed(2)}s`)}
            onChange={(v) => updateFilterEnv('attack', v)}
          />
          <Knob
            label="DECAY"
            value={config.filterEnv.decay}
            min={0.01}
            max={3.0}
            step={0.01}
            defaultValue={0.6}
            color="amber"
            size="sm"
            displayFormatter={(v) => (v < 1 ? `${Math.round(v * 1000)}ms` : `${v.toFixed(2)}s`)}
            onChange={(v) => updateFilterEnv('decay', v)}
          />
          <Knob
            label="SUSTAIN"
            value={config.filterEnv.sustain}
            min={0}
            max={1}
            step={0.02}
            defaultValue={0.25}
            color="amber"
            size="sm"
            displayFormatter={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => updateFilterEnv('sustain', v)}
          />
          <Knob
            label="RELEASE"
            value={config.filterEnv.release}
            min={0.01}
            max={4.0}
            step={0.02}
            defaultValue={0.4}
            color="amber"
            size="sm"
            displayFormatter={(v) => (v < 1 ? `${Math.round(v * 1000)}ms` : `${v.toFixed(2)}s`)}
            onChange={(v) => updateFilterEnv('release', v)}
          />
        </div>
      </div>
    </div>
  );
};
