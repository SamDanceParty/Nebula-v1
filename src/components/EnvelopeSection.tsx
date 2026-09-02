import React from 'react';
import { SynthPatchConfig, LfoTarget } from '../types/synth';
import { Knob } from './Knob';
import { Power, Waves, Activity } from 'lucide-react';

interface EnvelopeSectionProps {
  config: SynthPatchConfig;
  onChange: (config: SynthPatchConfig) => void;
}

const lfoTargets: { id: LfoTarget; label: string }[] = [
  { id: 'cutoff', label: 'Cutoff' },
  { id: 'pitch', label: 'Pitch' },
  { id: 'amplitude', label: 'Tremolo' },
  { id: 'pan', label: 'Auto-Pan' },
];

export const EnvelopeSection: React.FC<EnvelopeSectionProps> = ({ config, onChange }) => {
  const updateAmpEnv = (key: string, val: unknown) => {
    onChange({
      ...config,
      ampEnv: { ...config.ampEnv, [key]: val },
    });
  };

  const updateLfo = (key: string, val: unknown) => {
    onChange({
      ...config,
      lfo: { ...config.lfo, [key]: val },
    });
  };

  const updateGlide = (val: number) => {
    onChange({
      ...config,
      master: { ...config.master, glide: val },
    });
  };

  // Amp ADSR Curve SVG calculations
  const { attack, decay, sustain, release } = config.ampEnv;
  const totalTime = attack + decay + 0.5 + release;
  const w = 180;
  const h = 48;
  const pad = 4;
  const usableW = w - pad * 2;
  const usableH = h - pad * 2;

  const aX = pad + (attack / totalTime) * usableW;
  const aY = pad;
  const dX = aX + (decay / totalTime) * usableW;
  const dY = pad + (1 - sustain) * usableH;
  const sX = dX + (0.5 / totalTime) * usableW;
  const sY = dY;
  const rX = sX + (release / totalTime) * usableW;
  const rY = pad + usableH;

  const pathD = `M ${pad} ${pad + usableH} L ${aX} ${aY} L ${dX} ${dY} L ${sX} ${sY} L ${rX} ${rY}`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* AMPLITUDE ENVELOPE (VCA) */}
      <div className="bg-neutral-900/70 rounded-xl border border-cyan-500/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <Activity className="w-3.5 h-3.5" />
            </span>
            <span className="font-mono font-bold text-sm text-neutral-100">ГРОМКОСТЬ (AMP ADSR)</span>
          </div>

          <div className="hidden sm:block">
            <svg width={w} height={h} className="rounded bg-neutral-950/90 border border-neutral-800">
              <path d={pathD} fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-neutral-800/80">
          <Knob
            label="ATTACK"
            value={config.ampEnv.attack}
            min={0.002}
            max={3.0}
            step={0.01}
            defaultValue={0.02}
            color="cyan"
            size="sm"
            displayFormatter={(v) => (v < 1 ? `${Math.round(v * 1000)}ms` : `${v.toFixed(2)}s`)}
            onChange={(v) => updateAmpEnv('attack', v)}
          />
          <Knob
            label="DECAY"
            value={config.ampEnv.decay}
            min={0.01}
            max={3.0}
            step={0.01}
            defaultValue={0.4}
            color="cyan"
            size="sm"
            displayFormatter={(v) => (v < 1 ? `${Math.round(v * 1000)}ms` : `${v.toFixed(2)}s`)}
            onChange={(v) => updateAmpEnv('decay', v)}
          />
          <Knob
            label="SUSTAIN"
            value={config.ampEnv.sustain}
            min={0}
            max={1}
            step={0.02}
            defaultValue={0.7}
            color="cyan"
            size="sm"
            displayFormatter={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => updateAmpEnv('sustain', v)}
          />
          <Knob
            label="RELEASE"
            value={config.ampEnv.release}
            min={0.01}
            max={5.0}
            step={0.02}
            defaultValue={0.35}
            color="cyan"
            size="sm"
            displayFormatter={(v) => (v < 1 ? `${Math.round(v * 1000)}ms` : `${v.toFixed(2)}s`)}
            onChange={(v) => updateAmpEnv('release', v)}
          />
        </div>
      </div>

      {/* MODULATION LFO & GLIDE */}
      <div className={`rounded-xl border p-4 transition-all duration-200 ${
        config.lfo.enabled ? 'bg-neutral-900/70 border-violet-500/30' : 'bg-neutral-950/60 border-neutral-800 opacity-60'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateLfo('enabled', !config.lfo.enabled)}
              className={`p-1.5 rounded-lg border transition ${
                config.lfo.enabled
                  ? 'bg-violet-500 text-neutral-950 border-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.5)]'
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono font-bold text-sm text-neutral-100 flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-violet-400" />
              МОДУЛЯТОР (LFO)
            </span>
          </div>

          {/* LFO Target Switcher */}
          <div className="flex bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
            {lfoTargets.map((t) => (
              <button
                key={t.id}
                onClick={() => updateLfo('target', t.id)}
                className={`px-1.5 py-1 text-[10px] font-mono rounded transition ${
                  config.lfo.target === t.id
                    ? 'bg-violet-500 text-neutral-950 font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-neutral-800/80">
          <Knob
            label="RATE"
            value={config.lfo.rate}
            min={0.1}
            max={20}
            step={0.1}
            defaultValue={3.5}
            color="violet"
            size="sm"
            displayFormatter={(v) => `${v.toFixed(1)}Hz`}
            onChange={(v) => updateLfo('rate', v)}
          />
          <Knob
            label="DEPTH"
            value={config.lfo.depth}
            min={0}
            max={1}
            step={0.02}
            defaultValue={0.2}
            color="violet"
            size="sm"
            displayFormatter={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => updateLfo('depth', v)}
          />
          <div className="flex flex-col items-center justify-center">
            <span className="text-[10px] font-mono text-neutral-400 mb-1">ФОРМА LFO</span>
            <div className="flex flex-col gap-1 w-full max-w-[60px]">
              {(['sine', 'triangle', 'sawtooth', 'square'] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => updateLfo('wave', w)}
                  className={`text-[9px] font-mono px-1 py-0.5 rounded ${
                    config.lfo.wave === w
                      ? 'bg-violet-500/30 text-violet-300 border border-violet-500/50 font-bold'
                      : 'text-neutral-400 hover:text-neutral-200 bg-neutral-950'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
          <Knob
            label="GLIDE"
            value={config.master.glide}
            min={0}
            max={0.4}
            step={0.01}
            defaultValue={0.04}
            color="violet"
            size="sm"
            displayFormatter={(v) => (v === 0 ? 'Off' : `${Math.round(v * 1000)}ms`)}
            onChange={(v) => updateGlide(v)}
          />
        </div>
      </div>
    </div>
  );
};
