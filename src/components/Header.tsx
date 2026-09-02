import React, { useState, useRef } from 'react';
import { synthEngine } from '../audio/synthEngine';
import { SynthPatchConfig, Preset } from '../types/synth';
import { PRESETS } from '../audio/presets';
import { Knob } from './Knob';
import {
  Sliders,
  RotateCcw,
  Sparkles,
  BookmarkPlus,
  PlayCircle,
  Dices,
  Download,
  Upload,
  Cpu,
  Info,
  X,
  CheckCircle2,
} from 'lucide-react';

interface HeaderProps {
  config: SynthPatchConfig;
  activePresetId: string | null;
  onSelectPreset: (preset: Preset) => void;
  onUpdateConfig: (newConfig: SynthPatchConfig) => void;
  isAudioUnlocked: boolean;
  onUnlockAudio: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  activePresetId,
  onSelectPreset,
  onUpdateConfig,
  isAudioUnlocked,
  onUnlockAudio,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [customPresets, setCustomPresets] = useState<Preset[]>(() => {
    try {
      const saved = localStorage.getItem('synth_user_presets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);

  const categories = ['All', 'Solo', 'Lead', 'Bass', 'Pad', 'Pluck', 'Keys', 'FX'];
  const allPresets = [...PRESETS, ...customPresets];

  const filteredPresets = selectedCategory === 'All'
    ? allPresets
    : allPresets.filter((p) => p.category === selectedCategory);

  const handleSaveCustomPreset = () => {
    const name = window.prompt('Введите название пресета:', 'Мой пресет');
    if (!name || !name.trim()) return;

    const newPreset: Preset = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      category: 'Lead',
      description: 'Пользовательский пресет (сохранен локально)',
      config: JSON.parse(JSON.stringify(config)),
    };

    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    try {
      localStorage.setItem('synth_user_presets', JSON.stringify(updated));
    } catch {
      // ignore
    }
    onSelectPreset(newPreset);
  };

  // Algorithmic local patch generator (100% client-side DSP, zero AI/Gemini API dependency)
  const handleGenerateRandomPatch = () => {
    const ADJECTIVES = ['Analog', 'Warm', 'Cosmic', 'Acid', 'Hyper', 'Velvet', 'Cyber', 'Vintage', 'Astral', 'Deep', 'Lush', 'Neon'];
    const NOUNS = ['Lead', 'Bass', 'Pad', 'Pluck', 'Drone', 'Wave', 'Pulse', 'Atmosphere', 'Synth'];
    const WAVES: ('sine' | 'square' | 'sawtooth' | 'triangle')[] = ['sine', 'square', 'sawtooth', 'triangle'];

    const isPad = Math.random() > 0.65;
    const isBass = !isPad && Math.random() > 0.6;
    const wave1 = WAVES[Math.floor(Math.random() * WAVES.length)];
    const wave2 = WAVES[Math.floor(Math.random() * WAVES.length)];

    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = isBass ? 'Bass' : isPad ? 'Pad' : NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const patchName = `${adj} ${noun}`;

    const newConfig: SynthPatchConfig = {
      ...config,
      osc1: {
        enabled: true,
        wave: wave1,
        octave: isBass ? -1 : 0,
        semi: 0,
        detune: Math.round((Math.random() - 0.5) * 14),
        gain: 0.75,
        pan: -0.15,
      },
      osc2: {
        enabled: Math.random() > 0.2,
        wave: wave2,
        octave: isBass ? -1 : Math.random() > 0.7 ? 1 : 0,
        semi: Math.random() > 0.85 ? 7 : 0,
        detune: Math.round((Math.random() - 0.5) * 18),
        gain: 0.6,
        pan: 0.15,
      },
      sub: {
        enabled: isBass || Math.random() > 0.4,
        wave: 'sine',
        octave: -1,
        gain: isBass ? 0.35 : 0.2,
      },
      noise: {
        enabled: Math.random() > 0.7,
        gain: 0.03,
      },
      filter: {
        enabled: true,
        type: 'lowpass',
        cutoff: isBass ? 700 + Math.random() * 1400 : 1800 + Math.random() * 5000,
        resonance: 1.5 + Math.random() * 4.5,
        envAmount: 0.2 + Math.random() * 0.5,
        keyTracking: 0.7,
      },
      filterEnv: {
        attack: isPad ? 0.2 + Math.random() * 0.5 : 0.008,
        decay: 0.3 + Math.random() * 0.8,
        sustain: 0.4 + Math.random() * 0.4,
        release: isPad ? 0.8 + Math.random() * 1.2 : 0.25,
      },
      ampEnv: {
        attack: isPad ? 0.2 + Math.random() * 0.6 : 0.005,
        decay: 0.4 + Math.random() * 0.8,
        sustain: isPad ? 0.75 : isBass ? 0.5 : 0.65,
        release: isPad ? 0.9 + Math.random() * 1.4 : 0.28,
      },
      lfo: {
        enabled: Math.random() > 0.35,
        wave: 'sine',
        rate: 1.5 + Math.random() * 5,
        depth: 0.12 + Math.random() * 0.3,
        target: Math.random() > 0.5 ? 'filter' : 'pitch',
      },
      effects: {
        ...config.effects,
        distortion: {
          ...config.effects.distortion,
          enabled: isBass ? Math.random() > 0.35 : Math.random() > 0.65,
          drive: 0.2 + Math.random() * 0.45,
          mix: 0.25 + Math.random() * 0.35,
        },
        chorus: {
          ...config.effects.chorus,
          enabled: isPad || Math.random() > 0.5,
          rate: 0.8 + Math.random() * 1.4,
          depth: 0.25 + Math.random() * 0.35,
          mix: 0.3,
        },
        delay: {
          ...config.effects.delay,
          enabled: !isBass && Math.random() > 0.35,
          time: 0.2 + Math.random() * 0.25,
          feedback: 0.25 + Math.random() * 0.3,
          mix: 0.25,
        },
        reverb: {
          ...config.effects.reverb,
          enabled: true,
          decay: isPad ? 3.0 + Math.random() * 1.8 : 1.4 + Math.random() * 1.2,
          mix: isPad ? 0.45 : 0.26,
        },
      },
      master: {
        ...config.master,
        mode: isBass ? 'mono' : 'poly',
        glide: isBass ? 0.04 : 0,
      },
    };

    const newPreset: Preset = {
      id: `algo-${Date.now()}`,
      name: patchName,
      category: isBass ? 'Bass' : isPad ? 'Pad' : 'Lead',
      description: 'Автономный алгоритмический DSP патч',
      config: newConfig,
    };

    onSelectPreset(newPreset);
  };

  // Export current patch to a JSON file
  const handleExportPatch = () => {
    const activePreset = allPresets.find((p) => p.id === activePresetId);
    const exportData = {
      version: '1.0',
      presetName: activePreset?.name || 'Custom Synth Patch',
      category: activePreset?.category || 'Lead',
      config,
      timestamp: new Date().toISOString(),
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `synth-patch-${(activePreset?.name || 'patch').toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Import patch from a JSON file
  const handleImportPatch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && parsed.config) {
          const importedPreset: Preset = {
            id: `import-${Date.now()}`,
            name: parsed.presetName || 'Импортированный патч',
            category: parsed.category || 'Lead',
            description: 'Импортировано из JSON файла',
            config: parsed.config,
          };
          const updated = [...customPresets, importedPreset];
          setCustomPresets(updated);
          try {
            localStorage.setItem('synth_user_presets', JSON.stringify(updated));
          } catch {
            // ignore
          }
          onSelectPreset(importedPreset);
        }
      } catch {
        // ignore parse error
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleModeChange = (mode: 'poly' | 'mono' | 'legato') => {
    const next = {
      ...config,
      master: { ...config.master, mode },
    };
    onUpdateConfig(next);
  };

  return (
    <header className="bg-neutral-900/90 backdrop-blur border-b border-neutral-800 px-4 py-3 text-neutral-100 flex flex-wrap items-center justify-between gap-4">
      {/* Brand & Studio Status */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 text-black font-bold">
          <Sliders className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-wider font-mono text-neutral-100">
              SYNTH LAB <span className="text-amber-400 font-extrabold text-sm px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/30">DSP-8</span>
            </h1>
            {!isAudioUnlocked ? (
              <button
                onClick={onUnlockAudio}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500 text-black font-semibold text-xs animate-pulse hover:bg-amber-400 transition"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                ВКЛЮЧИТЬ ЗВУК
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  ONLINE
                </span>
                <button
                  onClick={() => setShowInfoModal(true)}
                  title="Синтезатор работает на 100% локально в браузере без обращения к Gemini API"
                  className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 bg-cyan-950/70 border border-cyan-800/50 hover:bg-cyan-900/50 px-2 py-0.5 rounded-full transition cursor-pointer"
                >
                  <Cpu className="w-3 h-3" />
                  <span>OFFLINE DSP</span>
                  <Info className="w-2.5 h-2.5 opacity-70" />
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-neutral-400">Автономный Web Audio DSP-синтезатор с записью (без внешних API)</p>
        </div>
      </div>

      {/* Preset Selector Section */}
      <div className="flex flex-wrap items-center gap-1.5 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800">
        <div className="flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 ml-1" />
          <span className="text-xs font-mono text-neutral-400 mr-1 hidden sm:inline">ПРЕСЕТ:</span>
          <select
            value={activePresetId || ''}
            onChange={(e) => {
              const found = allPresets.find((p) => p.id === e.target.value);
              if (found) onSelectPreset(found);
            }}
            className="bg-neutral-900 border border-neutral-700 text-xs font-mono text-neutral-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-amber-400 cursor-pointer min-w-[150px]"
          >
            {filteredPresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                [{preset.category}] {preset.name}
              </option>
            ))}
          </select>
        </div>

        {/* Local Algorithmic Randomizer (zero AI/Gemini API dependency) */}
        <button
          onClick={handleGenerateRandomPatch}
          title="Случайный алгоритмический патч (генерируется локально без обращения к Gemini API)"
          className="flex items-center gap-1 px-2 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-amber-500/50 text-xs text-amber-400 rounded-lg font-mono transition"
        >
          <Dices className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Случайный</span>
        </button>

        {/* Save preset button */}
        <button
          onClick={handleSaveCustomPreset}
          title="Сохранить текущие настройки в локальную память"
          className="flex items-center gap-1 px-2 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs text-neutral-300 rounded-lg font-mono transition"
        >
          <BookmarkPlus className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">Сохранить</span>
        </button>

        {/* Export JSON file */}
        <button
          onClick={handleExportPatch}
          title="Экспортировать текущий патч в файл .JSON"
          className="flex items-center gap-1 px-2 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs text-neutral-300 rounded-lg font-mono transition"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden xl:inline">Экспорт</span>
        </button>

        {/* Import JSON file */}
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Импортировать патч из файла .JSON"
          className="flex items-center gap-1 px-2 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs text-neutral-300 rounded-lg font-mono transition"
        >
          <Upload className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden xl:inline">Импорт</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportPatch}
          className="hidden"
        />

        {/* Category filters */}
        <div className="hidden lg:flex items-center gap-1 pl-1.5 border-l border-neutral-800">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition ${
                selectedCategory === cat
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Voice Mode & Master Section */}
      <div className="flex items-center gap-4">
        {/* Play Mode Switcher */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-mono text-neutral-400 mb-1">РЕЖИМ ГОЛОСОВ</span>
          <div className="flex bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
            {(['poly', 'mono', 'legato'] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`px-2 py-1 text-[11px] font-mono uppercase rounded transition ${
                  config.master.mode === m
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Panic / Reset Button */}
        <button
          onClick={() => synthEngine.panic()}
          title="Panic: сбросить все звучащие ноты"
          className="flex flex-col items-center justify-center p-2 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-rose-500/50 text-neutral-400 hover:text-rose-400 transition group"
        >
          <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition duration-300" />
          <span className="text-[9px] font-mono mt-0.5">PANIC</span>
        </button>

        {/* Master Volume Knob */}
        <div className="flex items-center pl-2 border-l border-neutral-800">
          <Knob
            label="MASTER"
            value={config.master.volume}
            min={0}
            max={1}
            step={0.01}
            defaultValue={0.8}
            color="amber"
            size="sm"
            displayFormatter={(v) => `${Math.round(v * 100)}%`}
            onChange={(val) => {
              synthEngine.setMasterVolume(val);
              onUpdateConfig({
                ...config,
                master: { ...config.master, volume: val },
              });
            }}
          />
        </div>
      </div>

      {/* Autonomous / Offline Engine Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-neutral-200 font-sans">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-mono font-bold text-base">
                <Cpu className="w-5 h-5 text-cyan-400" />
                <span>АВТОНОМНЫЙ РЕЖИМ (100% КЛИЕНТСКИЙ DSP)</span>
              </div>
              <button
                onClick={() => setShowInfoModal(false)}
                className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-neutral-300 leading-relaxed">
              Этот синтезатор работает <strong className="text-emerald-400 font-medium">полностью автономно</strong> прямо в вашем браузере с помощью встроенного API <strong className="text-amber-400 font-medium">Web Audio API</strong>.
            </p>

            <div className="space-y-2.5 bg-neutral-950 p-4 rounded-xl border border-neutral-800 text-xs">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-neutral-100">Без привязки к Gemini API:</strong> Для игры на синтезаторе, записи аудио и смены эффектов не требуется Gemini API key или платные токены.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-neutral-100">Работа без интернета:</strong> Синтез звука, осцилляторы, огибающие, стерео-эффекты и визуализация работают локально в памяти устройства.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-neutral-100">Локальный экспорт/импорт:</strong> Вы можете экспортировать пресеты в файл <code className="text-amber-400 font-mono">.json</code> и загружать их на любом компьютере.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-neutral-100">Алгоритмический генератор (кнопка 🎲):</strong> Создание случайных гармоничных патчей происходит с помощью математических алгоритмов DSP, без вызова облачных нейросетей.
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowInfoModal(false)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs font-mono transition"
              >
                ПОНЯТНО
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
