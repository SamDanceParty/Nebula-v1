export type WaveformType = 'sine' | 'sawtooth' | 'square' | 'triangle' | 'noise';

export type FilterMode = 'lowpass' | 'highpass' | 'bandpass' | 'notch';

export type LfoTarget = 'cutoff' | 'pitch' | 'amplitude' | 'pan';

export type ArpMode = 'off' | 'up' | 'down' | 'upDown' | 'random';

export type DistortionType = 'soft' | 'hard' | 'fuzz' | 'bitcrush';

export type PlayMode = 'poly' | 'mono' | 'legato';

export interface EnvelopeConfig {
  attack: number;   // seconds 0.002 to 4.0
  decay: number;    // seconds 0.01 to 4.0
  sustain: number;  // level 0.0 to 1.0
  release: number;  // seconds 0.01 to 6.0
}

export interface OscillatorConfig {
  enabled: boolean;
  wave: WaveformType;
  octave: number;   // -2, -1, 0, 1, 2
  semi: number;     // -12 to +12
  detune: number;   // -50 to +50 cents
  gain: number;     // 0 to 1
  pan: number;      // -1 to +1
}

export interface SubOscConfig {
  enabled: boolean;
  wave: 'sine' | 'square' | 'triangle';
  octave: -1 | -2;
  gain: number;
}

export interface NoiseConfig {
  enabled: boolean;
  gain: number;
}

export interface FilterConfig {
  enabled: boolean;
  type: FilterMode;
  cutoff: number;      // 20 Hz to 20000 Hz
  resonance: number;   // 0.1 to 24 (Q factor)
  envAmount: number;   // -1 to 1 (depth of filter ADSR)
  keyTracking: number; // 0 to 1
}

export interface LFOConfig {
  enabled: boolean;
  wave: 'sine' | 'triangle' | 'sawtooth' | 'square';
  rate: number;    // 0.1 Hz to 20 Hz
  depth: number;   // 0 to 1
  target: LfoTarget;
}

export interface ArpConfig {
  enabled: boolean;
  mode: ArpMode;
  bpm: number;      // 40 to 240
  rateDivision: '1/4' | '1/8' | '1/16' | '1/32' | '1/8T';
  octaves: number;  // 1 to 3
  gate: number;     // 0.1 to 1.0
}

export interface DistortionConfig {
  enabled: boolean;
  type: DistortionType;
  drive: number;   // 0 to 1
  tone: number;    // 200 Hz to 12000 Hz
  mix: number;     // 0 to 1
}

export interface ChorusConfig {
  enabled: boolean;
  rate: number;    // 0.1 to 8 Hz
  depth: number;   // 0 to 1
  feedback: number;// 0 to 0.8
  mix: number;     // 0 to 1
}

export interface DelayConfig {
  enabled: boolean;
  time: number;       // 0.02 to 1.0s
  feedback: number;   // 0 to 0.9
  damping: number;    // 500 to 12000 Hz
  pingPong: boolean;
  mix: number;        // 0 to 1
}

export interface ReverbConfig {
  enabled: boolean;
  decay: number;      // 0.3 to 8.0 s
  preDelay: number;   // 0 to 0.1 s
  damping: number;    // 1000 to 16000 Hz
  mix: number;        // 0 to 1
}

export interface EqConfig {
  enabled: boolean;
  lowGain: number;    // -12 to +12 dB
  midGain: number;    // -12 to +12 dB
  highGain: number;   // -12 to +12 dB
}

export interface EffectsConfig {
  distortion: DistortionConfig;
  chorus: ChorusConfig;
  delay: DelayConfig;
  reverb: ReverbConfig;
  eq: EqConfig;
}

export interface MasterConfig {
  volume: number;     // 0 to 1
  glide: number;      // 0 to 0.5 s (portamento)
  mode: PlayMode;
}

export interface SynthPatchConfig {
  osc1: OscillatorConfig;
  osc2: OscillatorConfig;
  sub: SubOscConfig;
  noise: NoiseConfig;
  filter: FilterConfig;
  filterEnv: EnvelopeConfig;
  ampEnv: EnvelopeConfig;
  lfo: LFOConfig;
  arp: ArpConfig;
  effects: EffectsConfig;
  master: MasterConfig;
}

export interface Preset {
  id: string;
  name: string;
  category: 'Lead' | 'Bass' | 'Pad' | 'Pluck' | 'Keys' | 'Solo' | 'FX';
  description: string;
  config: SynthPatchConfig;
}

export interface AudioRecording {
  id: string;
  name: string;
  durationSeconds: number;
  createdAt: number;
  blobUrl: string;
  blob: Blob;
  sizeBytes: number;
  type: 'audio/wav' | 'audio/webm';
}
