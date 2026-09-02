import React, { useState } from 'react';
import { SynthPatchConfig, DistortionType } from '../types/synth';
import { Knob } from './Knob';
import {
  Power,
  Flame,
  Sparkles,
  Repeat,
  CloudFog,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

interface EffectsRackProps {
  config: SynthPatchConfig;
  onChange: (config: SynthPatchConfig) => void;
}

export const EffectsRack: React.FC<EffectsRackProps> = ({ config, onChange }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'distortion' | 'chorus' | 'delay' | 'reverb' | 'eq'>('all');

  const updateDistortion = (key: string, val: unknown) => {
    onChange({
      ...config,
      effects: {
        ...config.effects,
        distortion: { ...config.effects.distortion, [key]: val },
      },
    });
  };

  const updateChorus = (key: string, val: unknown) => {
    onChange({
      ...config,
      effects: {
        ...config.effects,
        chorus: { ...config.effects.chorus, [key]: val },
      },
    });
  };

  const updateDelay = (key: string, val: unknown) => {
    onChange({
      ...config,
      effects: {
        ...config.effects,
        delay: { ...config.effects.delay, [key]: val },
      },
    });
  };

  const updateReverb = (key: string, val: unknown) => {
    onChange({
      ...config,
      effects: {
        ...config.effects,
        reverb: { ...config.effects.reverb, [key]: val },
      },
    });
  };

  const updateEq = (key: string, val: unknown) => {
    onChange({
      ...config,
      effects: {
        ...config.effects,
        eq: { ...config.effects.eq, [key]: val },
      },
    });
  };

  const distTypes: { id: DistortionType; label: string }[] = [
    { id: 'soft', label: 'Soft' },
    { id: 'hard', label: 'Hard' },
    { id: 'fuzz', label: 'Fuzz' },
    { id: 'bitcrush', label: 'Bitcrush' },
  ];

  return (
    <div className="bg-neutral-900/80 rounded-2xl border border-neutral-800 p-4 shadow-xl">
      {/* Rack Title and Module Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-mono font-bold text-sm tracking-wide text-neutral-100 uppercase">
              DSP ЭФФЕКТЫ ОБРАБОТКИ СИГНАЛА
            </h2>
            <p className="text-[11px] text-neutral-400">Студийная аналоговая цепь эффектов</p>
          </div>
        </div>

        {/* Filter tab buttons */}
        <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800">
          {[
            { id: 'all', label: 'ВСЕ' },
            { id: 'distortion', label: 'ДИСТОРШН' },
            { id: 'chorus', label: 'ХОРУС' },
            { id: 'delay', label: 'ДИЛЕЙ' },
            { id: 'reverb', label: 'РЕВЕРБ' },
            { id: 'eq', label: 'EQ' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-2.5 py-1 text-[11px] font-mono rounded-lg transition ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {/* 1. DISTORTION / DRIVE */}
        {(activeTab === 'all' || activeTab === 'distortion') && (
          <div className={`rounded-xl border p-3 flex flex-col justify-between transition-all duration-200 ${
            config.effects.distortion.enabled
              ? 'bg-neutral-950/90 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
              : 'bg-neutral-950/40 border-neutral-800 opacity-60'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  <span className="font-mono font-bold text-xs text-neutral-200">DISTORTION</span>
                </div>
                <button
                  onClick={() => updateDistortion('enabled', !config.effects.distortion.enabled)}
                  className={`p-1 rounded-md border transition ${
                    config.effects.distortion.enabled
                      ? 'bg-rose-500 text-neutral-950 border-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.5)]'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                  }`}
                >
                  <Power className="w-3 h-3" />
                </button>
              </div>

              {/* Distortion Types */}
              <div className="grid grid-cols-2 gap-1 mb-2 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                {distTypes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => updateDistortion('type', t.id)}
                    className={`px-1.5 py-0.5 text-[9px] font-mono rounded text-center truncate ${
                      config.effects.distortion.type === t.id
                        ? 'bg-rose-500 text-neutral-950 font-bold'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1 pt-2 border-t border-neutral-800/80">
              <Knob
                label="DRIVE"
                value={config.effects.distortion.drive}
                min={0}
                max={1}
                step={0.02}
                defaultValue={0.35}
                color="rose"
                size="sm"
                displayFormatter={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => updateDistortion('drive', v)}
              />
              <Knob
                label="TONE"
                value={config.effects.distortion.tone}
                min={300}
                max={10000}
                step={100}
                defaultValue={4500}
                logarithmic
                color="rose"
                size="sm"
                displayFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`)}
                onChange={(v) => updateDistortion('tone', v)}
              />
              <Knob
                label="WET"
                value={config.effects.distortion.mix}
                min={0}
                max={1}
                step={0.02}
                defaultValue={0.3}
                color="rose"
                size="sm"
                displayFormatter={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => updateDistortion('mix', v)}
              />
            </div>
          </div>
        )}

        {/* 2. CHORUS / MODULATION */}
        {(activeTab === 'all' || activeTab === 'chorus') && (
          <div className={`rounded-xl border p-3 flex flex-col justify-between transition-all duration-200 ${
            config.effects.chorus.enabled
              ? 'bg-neutral-950/90 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
              : 'bg-neutral-950/40 border-neutral-800 opacity-60'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-mono font-bold text-xs text-neutral-200">CHORUS</span>
                </div>
                <button
                  onClick={() => updateChorus('enabled', !config.effects.chorus.enabled)}
                  className={`p-1 rounded-md border transition ${
                    config.effects.chorus.enabled
                      ? 'bg-cyan-500 text-neutral-950 border-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.5)]'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                  }`}
                >
                  <Power className="w-3 h-3" />
                </button>
              </div>
              <p className="text-[10px] text-neutral-400 mb-2 font-mono">Широкий стерео-хорус</p>
            </div>

            <div className="grid grid-cols-4 gap-1 pt-2 border-t border-neutral-800/80">
              <Knob
                label="RATE"
                value={config.effects.chorus.rate}
                min={0.1}
                max={6}
                step={0.1}
                defaultValue={1.2}
                color="cyan"
                size="sm"
                displayFormatter={(v) => `${v.toFixed(1)}Hz`}
                onChange={(v) => updateChorus('rate', v)}
              />
              <Knob
                label="DEPTH"
                value={config.effects.chorus.depth}
                min={0}
                max={1}
                step={0.02}
                defaultValue={0.45}
                color="cyan"
                size="sm"
                displayFormatter={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => updateChorus('depth', v)}
              />
              <Knob
                label="FDBK"
                value={config.effects.chorus.feedback}
                min={0}
                max={0.75}
                step={0.02}
                defaultValue={0.25}
                color="cyan"
                size="sm"
                displayFormatter={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => updateChorus('feedback', v)}
              />
              <Knob
                label="WET"
                value={config.effects.chorus.mix}
                min={0}
                max={1}
                step={0.02}
                defaultValue={0.35}
                color="cyan"
                size="sm"
                displayFormatter={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => updateChorus('mix', v)}
              />
            </div>
          </div>
        )}

        {/* 3. STEREO DELAY / ECHO */}
        {(activeTab === 'all' || activeTab === 'delay') && (
          <div className={`rounded-xl border p-3 flex flex-col justify-between transition-all duration-200 ${
            config.effects.delay.enabled
              ? 'bg-neutral-950/90 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
              : 'bg-neutral-950/40 border-neutral-800 opacity-60'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-mono font-bold text-xs text-neutral-200">DELAY</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateDelay('pingPong', !config.effects.delay.pingPong)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono border transition ${
                      config.effects.delay.pingPong
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                        : 'text-neutral-500 border-neutral-800'
                    }`}
                  >
                    PING-PONG
                  </button>
                  <button
                    onClick={() => updateDelay('enabled', !config.effects.delay.enabled)}
                    className={`p-1 rounded-md border transition ${
                      config.effects.delay.enabled
                        ? 'bg-emerald-500 text-neutral-950 border-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                    }`}
                  >
                    <Power className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-neutral-400 mb-2 font-mono">Аналоговое стерео эхо</p>
            </div>

            <div className="grid grid-cols-4 gap-1 pt-2 border-t border-neutral-800/80">
              <Knob
                label="TIME"
                value={config.effects.delay.time}
                min={0.04}
                max={0.9}
                step={0.01}
                defaultValue={0.32}
                color="emerald"
                size="sm"
                displayFormatter={(v) => `${Math.round(v * 1000)}ms`}
                onChange={(v) => updateDelay('time', v)}
              />
              <Knob
                label="FEEDBK"
                value={config.effects.delay.feedback}
                min={0}
                max={0.88}
                step={0.02}
                defaultValue={0.4}
                color="emerald"
                size="sm"
                displayFormatter={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => updateDelay('feedback', v)}
              />
              <Knob
                label="DAMP"
                value={config.effects.delay.damping}
                min={800}
                max={10000}
                step={100}
                defaultValue={3800}
                logarithmic
                color="emerald"
                size="sm"
                displayFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`)}
                onChange={(v) => updateDelay('damping', v)}
              />
              <Knob
                label="WET"
                value={config.effects.delay.mix}
                min={0}
                max={1}
                step={0.02}
                defaultValue={0.28}
                color="emerald"
                size="sm"
                displayFormatter={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => updateDelay('mix', v)}
              />
            </div>
          </div>
        )}

        {/* 4. STUDIO REVERB */}
        {(activeTab === 'all' || activeTab === 'reverb') && (
          <div className={`rounded-xl border p-3 flex flex-col justify-between transition-all duration-200 ${
            config.effects.reverb.enabled
              ? 'bg-neutral-950/90 border-violet-500/40 shadow-[0_0_12px_rgba(139,92,246,0.15)]'
              : 'bg-neutral-950/40 border-neutral-800 opacity-60'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <CloudFog className="w-3.5 h-3.5 text-violet-400" />
                  <span className="font-mono font-bold text-xs text-neutral-200">REVERB</span>
                </div>
                <button
                  onClick={() => updateReverb('enabled', !config.effects.reverb.enabled)}
                  className={`p-1 rounded-md border transition ${
                    config.effects.reverb.enabled
                      ? 'bg-violet-500 text-neutral-950 border-violet-400 shadow-[0_0_6px_rgba(139,92,246,0.5)]'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                  }`}
                >
                  <Power className="w-3 h-3" />
                </button>
              </div>
              <p className="text-[10px] text-neutral-400 mb-2 font-mono">Пространственный конвольвер</p>
            </div>

            <div className="grid grid-cols-4 gap-1 pt-2 border-t border-neutral-800/80">
              <Knob
                label="DECAY"
                value={config.effects.reverb.decay}
                min={0.4}
                max={5.5}
                step={0.1}
                defaultValue={2.2}
                color="violet"
                size="sm"
                displayFormatter={(v) => `${v.toFixed(1)}s`}
                onChange={(v) => updateReverb('decay', v)}
              />
              <Knob
                label="PRE-DLY"
                value={config.effects.reverb.preDelay}
                min={0}
                max={0.08}
                step={0.005}
                defaultValue={0.02}
                color="violet"
                size="sm"
                displayFormatter={(v) => `${Math.round(v * 1000)}ms`}
                onChange={(v) => updateReverb('preDelay', v)}
              />
              <Knob
                label="DAMP"
                value={config.effects.reverb.damping}
                min={1500}
                max={12000}
                step={200}
                defaultValue={6000}
                logarithmic
                color="violet"
                size="sm"
                displayFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`)}
                onChange={(v) => updateReverb('damping', v)}
              />
              <Knob
                label="WET"
                value={config.effects.reverb.mix}
                min={0}
                max={1}
                step={0.02}
                defaultValue={0.3}
                color="violet"
                size="sm"
                displayFormatter={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => updateReverb('mix', v)}
              />
            </div>
          </div>
        )}

        {/* 5. 3-BAND MASTER EQ */}
        {(activeTab === 'all' || activeTab === 'eq') && (
          <div className={`rounded-xl border p-3 flex flex-col justify-between transition-all duration-200 ${
            config.effects.eq.enabled
              ? 'bg-neutral-950/90 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
              : 'bg-neutral-950/40 border-neutral-800 opacity-60'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-mono font-bold text-xs text-neutral-200">3-BAND EQ</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-mono text-emerald-400 px-1 py-0.5 rounded bg-emerald-950 border border-emerald-800">
                    LIMITER ON
                  </span>
                  <button
                    onClick={() => updateEq('enabled', !config.effects.eq.enabled)}
                    className={`p-1 rounded-md border transition ${
                      config.effects.eq.enabled
                        ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.5)]'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                    }`}
                  >
                    <Power className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-neutral-400 mb-2 font-mono">НЧ / СЧ / ВЧ коррекция</p>
            </div>

            <div className="grid grid-cols-3 gap-1 pt-2 border-t border-neutral-800/80">
              <Knob
                label="LOW"
                value={config.effects.eq.lowGain}
                min={-12}
                max={12}
                step={0.5}
                defaultValue={2}
                color="amber"
                size="sm"
                displayFormatter={(v) => (v > 0 ? `+${v}dB` : `${v}dB`)}
                onChange={(v) => updateEq('lowGain', v)}
              />
              <Knob
                label="MID"
                value={config.effects.eq.midGain}
                min={-12}
                max={12}
                step={0.5}
                defaultValue={-1}
                color="amber"
                size="sm"
                displayFormatter={(v) => (v > 0 ? `+${v}dB` : `${v}dB`)}
                onChange={(v) => updateEq('midGain', v)}
              />
              <Knob
                label="HIGH"
                value={config.effects.eq.highGain}
                min={-12}
                max={12}
                step={0.5}
                defaultValue={3}
                color="amber"
                size="sm"
                displayFormatter={(v) => (v > 0 ? `+${v}dB` : `${v}dB`)}
                onChange={(v) => updateEq('highGain', v)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
