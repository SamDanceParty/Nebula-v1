import React from 'react';
import { SynthPatchConfig, WaveformType } from '../types/synth';
import { Knob } from './Knob';
import { Volume2, Power } from 'lucide-react';

interface OscillatorSectionProps {
  config: SynthPatchConfig;
  onChange: (config: SynthPatchConfig) => void;
}

const waveforms: { type: WaveformType; label: string; symbol: string }[] = [
  { type: 'sawtooth', label: 'Saw', symbol: '⩘' },
  { type: 'square', label: 'Square', symbol: '⊓' },
  { type: 'triangle', label: 'Tri', symbol: '▲' },
  { type: 'sine', label: 'Sine', symbol: '∿' },
];

export const OscillatorSection: React.FC<OscillatorSectionProps> = ({ config, onChange }) => {
  const updateOsc1 = (key: string, val: unknown) => {
    onChange({
      ...config,
      osc1: { ...config.osc1, [key]: val },
    });
  };

  const updateOsc2 = (key: string, val: unknown) => {
    onChange({
      ...config,
      osc2: { ...config.osc2, [key]: val },
    });
  };

  const updateSub = (key: string, val: unknown) => {
    onChange({
      ...config,
      sub: { ...config.sub, [key]: val },
    });
  };

  const updateNoise = (key: string, val: unknown) => {
    onChange({
      ...config,
      noise: { ...config.noise, [key]: val },
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* OSCILLATOR 1 */}
      <div className={`rounded-xl border p-4 transition-all duration-200 ${
        config.osc1.enabled ? 'bg-neutral-900/70 border-amber-500/30' : 'bg-neutral-950/60 border-neutral-800/80 opacity-60'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateOsc1('enabled', !config.osc1.enabled)}
              className={`p-1.5 rounded-lg border transition ${
                config.osc1.enabled
                  ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono font-bold text-sm text-neutral-100">OSC 1</span>
          </div>

          {/* Waveform Selector */}
          <div className="flex items-center bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
            {waveforms.map((w) => (
              <button
                key={w.type}
                onClick={() => updateOsc1('wave', w.type)}
                className={`px-2 py-1 text-xs font-mono rounded transition flex items-center gap-1 ${
                  config.osc1.wave === w.type
                    ? 'bg-amber-500 text-neutral-950 font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
                title={w.label}
              >
                <span className="text-sm leading-none">{w.symbol}</span>
                <span className="text-[10px] hidden sm:inline">{w.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* OSC 1 Knobs */}
        <div className="grid grid-cols-5 gap-2 pt-2 border-t border-neutral-800/80">
          <Knob
            label="OCT"
            value={config.osc1.octave}
            min={-2}
            max={2}
            step={1}
            defaultValue={0}
            color="amber"
            size="sm"
            displayFormatter={(v) => (v > 0 ? `+${v}` : `${v}`)}
            onChange={(v) => updateOsc1('octave', v)}
          />
          <Knob
            label="SEMI"
            value={config.osc1.semi}
            min={-12}
            max={12}
            step={1}
            defaultValue={0}
            color="amber"
            size="sm"
            displayFormatter={(v) => (v > 0 ? `+${v}st` : `${v}st`)}
            onChange={(v) => updateOsc1('semi', v)}
          />
          <Knob
            label="DETUNE"
            value={config.osc1.detune}
            min={-50}
            max={50}
            step={1}
            defaultValue={0}
            unit="c"
            color="amber"
            size="sm"
            displayFormatter={(v) => (v > 0 ? `+${v}c` : `${v}c`)}
            onChange={(v) => updateOsc1('detune', v)}
          />
          <Knob
            label="PAN"
            value={config.osc1.pan}
            min={-1}
            max={1}
            step={0.05}
            defaultValue={0}
            color="amber"
            size="sm"
            displayFormatter={(v) => (v === 0 ? 'C' : v < 0 ? `L${Math.round(-v * 100)}` : `R${Math.round(v * 100)}`)}
            onChange={(v) => updateOsc1('pan', v)}
          />
          <Knob
            label="LEVEL"
            value={config.osc1.gain}
            min={0}
            max={1}
            step={0.01}
            defaultValue={0.7}
            color="amber"
            size="sm"
            displayFormatter={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => updateOsc1('gain', v)}
          />
        </div>
      </div>

      {/* OSCILLATOR 2 */}
      <div className={`rounded-xl border p-4 transition-all duration-200 ${
        config.osc2.enabled ? 'bg-neutral-900/70 border-cyan-500/30' : 'bg-neutral-950/60 border-neutral-800/80 opacity-60'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateOsc2('enabled', !config.osc2.enabled)}
              className={`p-1.5 rounded-lg border transition ${
                config.osc2.enabled
                  ? 'bg-cyan-500 text-neutral-950 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.5)]'
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono font-bold text-sm text-neutral-100">OSC 2</span>
          </div>

          {/* Waveform Selector */}
          <div className="flex items-center bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
            {waveforms.map((w) => (
              <button
                key={w.type}
                onClick={() => updateOsc2('wave', w.type)}
                className={`px-2 py-1 text-xs font-mono rounded transition flex items-center gap-1 ${
                  config.osc2.wave === w.type
                    ? 'bg-cyan-500 text-neutral-950 font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
                title={w.label}
              >
                <span className="text-sm leading-none">{w.symbol}</span>
                <span className="text-[10px] hidden sm:inline">{w.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* OSC 2 Knobs */}
        <div className="grid grid-cols-5 gap-2 pt-2 border-t border-neutral-800/80">
          <Knob
            label="OCT"
            value={config.osc2.octave}
            min={-2}
            max={2}
            step={1}
            defaultValue={0}
            color="cyan"
            size="sm"
            displayFormatter={(v) => (v > 0 ? `+${v}` : `${v}`)}
            onChange={(v) => updateOsc2('octave', v)}
          />
          <Knob
            label="SEMI"
            value={config.osc2.semi}
            min={-12}
            max={12}
            step={1}
            defaultValue={7}
            color="cyan"
            size="sm"
            displayFormatter={(v) => (v > 0 ? `+${v}st` : `${v}st`)}
            onChange={(v) => updateOsc2('semi', v)}
          />
          <Knob
            label="DETUNE"
            value={config.osc2.detune}
            min={-50}
            max={50}
            step={1}
            defaultValue={0}
            unit="c"
            color="cyan"
            size="sm"
            displayFormatter={(v) => (v > 0 ? `+${v}c` : `${v}c`)}
            onChange={(v) => updateOsc2('detune', v)}
          />
          <Knob
            label="PAN"
            value={config.osc2.pan}
            min={-1}
            max={1}
            step={0.05}
            defaultValue={0}
            color="cyan"
            size="sm"
            displayFormatter={(v) => (v === 0 ? 'C' : v < 0 ? `L${Math.round(-v * 100)}` : `R${Math.round(v * 100)}`)}
            onChange={(v) => updateOsc2('pan', v)}
          />
          <Knob
            label="LEVEL"
            value={config.osc2.gain}
            min={0}
            max={1}
            step={0.01}
            defaultValue={0.5}
            color="cyan"
            size="sm"
            displayFormatter={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => updateOsc2('gain', v)}
          />
        </div>
      </div>

      {/* SUB OSCILLATOR & NOISE GENERATOR */}
      <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* SUB OSC */}
        <div className={`rounded-xl border p-3 flex items-center justify-between ${
          config.sub.enabled ? 'bg-neutral-900/60 border-neutral-700' : 'bg-neutral-950/60 border-neutral-800 opacity-60'
        }`}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateSub('enabled', !config.sub.enabled)}
              className={`p-1.5 rounded-lg border transition ${
                config.sub.enabled ? 'bg-emerald-500 text-neutral-950 border-emerald-400' : 'bg-neutral-800 text-neutral-400 border-neutral-700'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
            </button>
            <div>
              <span className="font-mono font-bold text-xs text-neutral-200">SUB OSC</span>
              <div className="flex items-center gap-1 mt-1">
                {(['sine', 'square', 'triangle'] as const).map((w) => (
                  <button
                    key={w}
                    onClick={() => updateSub('wave', w)}
                    className={`px-1.5 py-0.5 text-[9px] font-mono rounded ${
                      config.sub.wave === w ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono text-neutral-400 mb-1">OCT</span>
              <div className="flex bg-neutral-950 p-0.5 rounded border border-neutral-800">
                {([-1, -2] as const).map((oct) => (
                  <button
                    key={oct}
                    onClick={() => updateSub('octave', oct)}
                    className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
                      config.sub.octave === oct ? 'bg-emerald-500 text-neutral-950 font-bold' : 'text-neutral-400'
                    }`}
                  >
                    {oct}
                  </button>
                ))}
              </div>
            </div>

            <Knob
              label="LEVEL"
              value={config.sub.gain}
              min={0}
              max={1}
              step={0.02}
              defaultValue={0.3}
              color="emerald"
              size="sm"
              displayFormatter={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => updateSub('gain', v)}
            />
          </div>
        </div>

        {/* NOISE GENERATOR */}
        <div className={`rounded-xl border p-3 flex items-center justify-between ${
          config.noise.enabled ? 'bg-neutral-900/60 border-neutral-700' : 'bg-neutral-950/60 border-neutral-800 opacity-60'
        }`}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateNoise('enabled', !config.noise.enabled)}
              className={`p-1.5 rounded-lg border transition ${
                config.noise.enabled ? 'bg-violet-500 text-neutral-950 border-violet-400' : 'bg-neutral-800 text-neutral-400 border-neutral-700'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
            </button>
            <div>
              <span className="font-mono font-bold text-xs text-neutral-200">NOISE GEN</span>
              <p className="text-[10px] text-neutral-400">Аналоговый белый шум</p>
            </div>
          </div>

          <Knob
            label="LEVEL"
            value={config.noise.gain}
            min={0}
            max={0.5}
            step={0.01}
            defaultValue={0.05}
            color="violet"
            size="sm"
            displayFormatter={(v) => `${Math.round(v * 200)}%`}
            onChange={(v) => updateNoise('gain', v)}
          />
        </div>
      </div>
    </div>
  );
};
