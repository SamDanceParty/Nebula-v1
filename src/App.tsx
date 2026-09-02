/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { synthEngine } from './audio/synthEngine';
import { SynthPatchConfig, Preset } from './types/synth';
import { PRESETS, DEFAULT_PATCH } from './audio/presets';

import { Header } from './components/Header';
import { Visualizer } from './components/Visualizer';
import { RecorderSection } from './components/RecorderSection';
import { OscillatorSection } from './components/OscillatorSection';
import { FilterSection } from './components/FilterSection';
import { EnvelopeSection } from './components/EnvelopeSection';
import { ArpeggiatorSection } from './components/ArpeggiatorSection';
import { EffectsRack } from './components/EffectsRack';
import { Keyboard } from './components/Keyboard';

export default function App() {
  const [config, setConfig] = useState<SynthPatchConfig>(() => JSON.parse(JSON.stringify(DEFAULT_PATCH)));
  const [activePresetId, setActivePresetId] = useState<string | null>(PRESETS[0].id);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(false);

  // Initialize engine on first interaction
  const unlockAudio = useCallback(async () => {
    await synthEngine.ensureAudioUnlocked();
    setIsAudioUnlocked(synthEngine.isUnlocked());
  }, []);

  // Update engine whenever patch config changes
  const handleConfigChange = (newConfig: SynthPatchConfig) => {
    setConfig(newConfig);
    synthEngine.applyPatch(newConfig);
  };

  const handleSelectPreset = (preset: Preset) => {
    setActivePresetId(preset.id);
    const cloned = JSON.parse(JSON.stringify(preset.config));
    setConfig(cloned);
    synthEngine.applyPatch(cloned);
  };

  // Keyboard shortcut to quickly toggle recording with 'R' (if not typing in input)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') {
        // Trigger recording or ensure unlocked
        unlockAudio();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [unlockAudio]);

  return (
    <div
      onClick={() => {
        if (!isAudioUnlocked) unlockAudio();
      }}
      className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black"
    >
      {/* Top Header & Preset Toolbar */}
      <Header
        config={config}
        activePresetId={activePresetId}
        onSelectPreset={handleSelectPreset}
        onUpdateConfig={handleConfigChange}
        isAudioUnlocked={isAudioUnlocked}
        onUnlockAudio={unlockAudio}
      />

      {/* Main Studio Deck */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 space-y-4">
        {/* Row 1: Real-time Oscilloscope/Spectrum Visualizer & Real-time Sound Recorder */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-6">
            <Visualizer id="main-scope" />
          </div>
          <div className="lg:col-span-6">
            <RecorderSection onUnlockAudio={unlockAudio} />
          </div>
        </div>

        {/* Row 2: Sound Generators (Oscillators, Sub, Noise) & Filter Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7">
            <OscillatorSection config={config} onChange={handleConfigChange} />
          </div>
          <div className="lg:col-span-5">
            <FilterSection config={config} onChange={handleConfigChange} />
          </div>
        </div>

        {/* Row 3: Amp Envelope (ADSR) & Modulation (LFO) & Arpeggiator */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8">
            <EnvelopeSection config={config} onChange={handleConfigChange} />
          </div>
          <div className="lg:col-span-4">
            <ArpeggiatorSection config={config} onChange={handleConfigChange} />
          </div>
        </div>

        {/* Row 4: Built-in Signal Processing Effects Rack (Distortion, Chorus, Delay, Reverb, EQ) */}
        <div>
          <EffectsRack config={config} onChange={handleConfigChange} />
        </div>

        {/* Row 5: Interactive 2.5-Octave Piano Keyboard with Pitch Bend, Mod Wheel & QWERTY */}
        <div className="sticky bottom-2 z-30 pt-2">
          <Keyboard />
        </div>
      </main>

      {/* Studio Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950/90 py-2.5 px-4 text-center text-xs font-mono text-neutral-500 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
          <span>Синтезатор с DSP-эффектами и записью WAV в реальном времени</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Клавиши QWERTY: A-K</span>
          <span>Октавы: Z / X</span>
          <span>Запись: REC</span>
        </div>
      </footer>
    </div>
  );
}
