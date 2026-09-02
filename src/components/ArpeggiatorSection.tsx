import React from 'react';
import { SynthPatchConfig, ArpMode } from '../types/synth';
import { Knob } from './Knob';
import { Power, Play, RotateCw } from 'lucide-react';

interface ArpeggiatorSectionProps {
  config: SynthPatchConfig;
  onChange: (config: SynthPatchConfig) => void;
}

const arpModes: { id: ArpMode; label: string }[] = [
  { id: 'up', label: 'UP ▲' },
  { id: 'down', label: 'DOWN ▼' },
  { id: 'upDown', label: 'UP/DN ⬍' },
  { id: 'random', label: 'RAND 🔀' },
];

const rateDivisions: ('1/4' | '1/8' | '1/16' | '1/32' | '1/8T')[] = ['1/4', '1/8', '1/16', '1/32', '1/8T'];

export const ArpeggiatorSection: React.FC<ArpeggiatorSectionProps> = ({ config, onChange }) => {
  const updateArp = (key: string, val: unknown) => {
    onChange({
      ...config,
      arp: { ...config.arp, [key]: val },
    });
  };

  return (
    <div className={`rounded-xl border p-3.5 transition-all duration-200 ${
      config.arp.enabled ? 'bg-neutral-900/70 border-rose-500/40 shadow-sm' : 'bg-neutral-950/60 border-neutral-800 opacity-70'
    }`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateArp('enabled', !config.arp.enabled)}
            className={`p-1.5 rounded-lg border transition ${
              config.arp.enabled
                ? 'bg-rose-500 text-neutral-950 border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                : 'bg-neutral-800 text-neutral-400 border-neutral-700'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono font-bold text-sm text-neutral-100 flex items-center gap-1.5">
            <RotateCw className={`w-3.5 h-3.5 text-rose-400 ${config.arp.enabled ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
            АРПЕДЖИАТОР (ARP)
          </span>
        </div>

        {/* Mode Selector */}
        <div className="flex bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
          {arpModes.map((m) => (
            <button
              key={m.id}
              onClick={() => updateArp('mode', m.id)}
              className={`px-2 py-1 text-[10px] font-mono rounded transition ${
                config.arp.mode === m.id
                  ? 'bg-rose-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Rate Division */}
        <div className="flex bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
          {rateDivisions.map((div) => (
            <button
              key={div}
              onClick={() => updateArp('rateDivision', div)}
              className={`px-1.5 py-1 text-[10px] font-mono rounded transition ${
                config.arp.rateDivision === div
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {div}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-neutral-800/80">
        <Knob
          label="TEMPO"
          value={config.arp.bpm}
          min={40}
          max={240}
          step={1}
          defaultValue={120}
          unit=" BPM"
          color="rose"
          size="sm"
          onChange={(v) => updateArp('bpm', v)}
        />
        <Knob
          label="OCTAVES"
          value={config.arp.octaves}
          min={1}
          max={3}
          step={1}
          defaultValue={2}
          unit=" Oct"
          color="rose"
          size="sm"
          onChange={(v) => updateArp('octaves', v)}
        />
        <Knob
          label="GATE"
          value={config.arp.gate}
          min={0.1}
          max={0.95}
          step={0.05}
          defaultValue={0.75}
          color="rose"
          size="sm"
          displayFormatter={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => updateArp('gate', v)}
        />
        <div className="flex flex-col items-center justify-center">
          <span className="text-[10px] font-mono text-neutral-400 mb-1">СТАТУС</span>
          <div className="px-2 py-1 rounded bg-neutral-950 border border-neutral-800 text-[10px] font-mono text-center">
            {config.arp.enabled ? (
              <span className="text-rose-400 font-bold animate-pulse">● PLAYING</span>
            ) : (
              <span className="text-neutral-500">OFF</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
