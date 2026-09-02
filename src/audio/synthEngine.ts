import { SynthPatchConfig, WaveformType, PlayMode, AudioRecording } from '../types/synth';
import { DEFAULT_PATCH } from './presets';
import { EffectsChain } from './effectsChain';
import { AudioRecorderManager } from './recorder';

interface ActiveVoice {
  midiNote: number;
  startTime: number;
  osc1: OscillatorNode | null;
  osc2: OscillatorNode | null;
  subOsc: OscillatorNode | null;
  noiseSource: AudioBufferSourceNode | null;
  voiceFilter: BiquadFilterNode;
  voiceAmpGain: GainNode;
  voiceMixer: GainNode;
  panner1: StereoPannerNode;
  panner2: StereoPannerNode;
}

export class SynthEngine {
  private ctx: AudioContext | null = null;
  private masterGain!: GainNode;
  private preEffectsGain!: GainNode;
  public analyserNode!: AnalyserNode;
  public effectsChain!: EffectsChain;
  public recorderManager!: AudioRecorderManager;

  private config: SynthPatchConfig = JSON.parse(JSON.stringify(DEFAULT_PATCH));
  private activeVoices: Map<number, ActiveVoice> = new Map();
  private noiseBuffer: AudioBuffer | null = null;

  // LFO nodes
  private lfoOsc: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private tremoloGain: GainNode | null = null;

  // Pitch bend & Mod wheel
  private pitchBendCents = 0;
  private modWheelAmount = 0;

  // Arpeggiator state
  private arpActiveNotes: number[] = [];
  private arpTimerId: number | null = null;
  private arpIndex = 0;
  private arpDir = 1;

  // Mono/Legato glide tracking
  private lastMidiNote: number | null = null;

  // Listeners for active note changes (for keyboard visual feedback)
  private activeNotesListeners: Set<(notes: number[]) => void> = new Set();

  constructor() {
    // Lazy AudioContext init will be triggered by user action
  }

  public init() {
    if (this.ctx) return;

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass({ latencyHint: 'interactive' });

    // Master chain setup
    this.preEffectsGain = this.ctx.createGain();
    this.preEffectsGain.gain.value = 0.85;

    // Effects chain
    this.effectsChain = new EffectsChain(this.ctx);

    // Tremolo stage
    this.tremoloGain = this.ctx.createGain();
    this.tremoloGain.gain.value = 1.0;

    // Master volume & Analyser
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.config.master.volume;

    this.analyserNode = this.ctx.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.analyserNode.smoothingTimeConstant = 0.85;

    // Connect:
    // preEffects -> EffectsChain -> TremoloGain -> MasterGain -> Analyser -> Destination
    this.preEffectsGain.connect(this.effectsChain.inputNode);
    this.effectsChain.outputNode.connect(this.tremoloGain);
    this.tremoloGain.connect(this.masterGain);
    this.masterGain.connect(this.analyserNode);
    this.analyserNode.connect(this.ctx.destination);

    // Recorder Manager connects to master output before destination
    this.recorderManager = new AudioRecorderManager(this.ctx, this.masterGain);

    // Prepare white noise buffer
    this.createNoiseBuffer();

    // Start global LFO
    this.setupLfo();

    // Apply initial patch settings
    this.applyPatch(this.config);
  }

  public async ensureAudioUnlocked(): Promise<void> {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public isUnlocked(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  private createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  private setupLfo() {
    if (!this.ctx) return;

    if (this.lfoOsc) {
      try {
        this.lfoOsc.stop();
        this.lfoOsc.disconnect();
      } catch {
        // ignore
      }
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = this.config.lfo.wave;
    osc.frequency.setValueAtTime(this.config.lfo.rate, this.ctx.currentTime);
    gain.gain.setValueAtTime(this.config.lfo.depth, this.ctx.currentTime);

    osc.connect(gain);
    osc.start();

    this.lfoOsc = osc;
    this.lfoGain = gain;

    this.routeLfo();
  }

  private routeLfo() {
    if (!this.ctx || !this.lfoGain) return;
    const t = this.ctx.currentTime;
    const target = this.config.lfo.target;
    const isEnabled = this.config.lfo.enabled;
    const depth = isEnabled ? this.config.lfo.depth + this.modWheelAmount * 0.4 : 0;

    if (this.lfoOsc) {
      this.lfoOsc.frequency.setTargetAtTime(this.config.lfo.rate, t, 0.02);
    }
    this.lfoGain.gain.setTargetAtTime(depth, t, 0.02);

    // Tremolo target
    if (this.tremoloGain) {
      if (isEnabled && target === 'amplitude') {
        // Tremolo modulation
        this.tremoloGain.gain.setTargetAtTime(1 - depth * 0.5, t, 0.05);
      } else {
        this.tremoloGain.gain.setTargetAtTime(1.0, t, 0.05);
      }
    }

    // Update active voices with LFO if targeting pitch or cutoff
    this.activeVoices.forEach((voice) => {
      this.applyLfoToVoice(voice);
    });
  }

  private applyLfoToVoice(voice: ActiveVoice) {
    if (!this.ctx || !this.lfoGain) return;
    const isEnabled = this.config.lfo.enabled;
    const target = this.config.lfo.target;
    const depth = isEnabled ? this.config.lfo.depth + this.modWheelAmount * 0.3 : 0;

    if (isEnabled && target === 'pitch') {
      const semitoneVariance = depth * 1.5; // up to 1.5 semitones vibrato
      if (voice.osc1) {
        voice.osc1.detune.setTargetAtTime(
          this.config.osc1.detune + this.pitchBendCents + semitoneVariance * 50 * Math.sin(this.ctx.currentTime * this.config.lfo.rate * 6.28),
          this.ctx.currentTime,
          0.05
        );
      }
    }
  }

  public noteOn(midiNote: number, velocity: number = 0.8) {
    this.ensureAudioUnlocked();
    if (!this.ctx) return;

    if (this.config.arp.enabled) {
      if (!this.arpActiveNotes.includes(midiNote)) {
        this.arpActiveNotes.push(midiNote);
        this.arpActiveNotes.sort((a, b) => a - b);
      }
      this.startArpeggiator();
      this.notifyActiveNotes();
      return;
    }

    this.playVoice(midiNote, velocity);
    this.notifyActiveNotes();
  }

  public noteOff(midiNote: number) {
    if (this.config.arp.enabled) {
      this.arpActiveNotes = this.arpActiveNotes.filter((n) => n !== midiNote);
      if (this.arpActiveNotes.length === 0) {
        this.stopArpeggiator();
      }
      this.notifyActiveNotes();
      return;
    }

    this.releaseVoice(midiNote);
    this.notifyActiveNotes();
  }

  private playVoice(midiNote: number, velocity: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const mode = this.config.master.mode;

    // If Mono or Legato, stop or glide existing voice
    if (mode === 'mono' || mode === 'legato') {
      if (this.activeVoices.size > 0) {
        if (mode === 'legato' && this.lastMidiNote !== null) {
          // Glide frequency of existing voice
          const targetFreq = this.midiToFreq(midiNote);
          const glideTime = this.config.master.glide;
          this.activeVoices.forEach((voice) => {
            if (voice.osc1) voice.osc1.frequency.setTargetAtTime(targetFreq, t, glideTime);
            if (voice.osc2) voice.osc2.frequency.setTargetAtTime(this.midiToFreq(midiNote + this.config.osc2.semi), t, glideTime);
            if (voice.subOsc) voice.subOsc.frequency.setTargetAtTime(targetFreq / (this.config.sub.octave === -2 ? 4 : 2), t, glideTime);
          });
          this.lastMidiNote = midiNote;
          return;
        } else {
          // Stop previous voices in mono
          this.activeVoices.forEach((_, note) => this.releaseVoice(note, true));
        }
      }
    }

    // Release existing voice for the exact same midiNote to prevent orphan voices
    if (this.activeVoices.has(midiNote)) {
      this.releaseVoice(midiNote, true);
    }

    // Polyphonic: max 12 concurrent voices to manage CPU
    if (this.activeVoices.size >= 12) {
      const oldestKey = this.activeVoices.keys().next().value;
      if (oldestKey !== undefined) {
        this.releaseVoice(oldestKey, true);
      }
    }

    const baseFreq = this.midiToFreq(midiNote);

    // Create voice nodes
    const voiceMixer = this.ctx.createGain();
    const voiceFilter = this.ctx.createBiquadFilter();
    const voiceAmpGain = this.ctx.createGain();
    const panner1 = this.ctx.createStereoPanner();
    const panner2 = this.ctx.createStereoPanner();

    panner1.pan.value = this.config.osc1.pan;
    panner2.pan.value = this.config.osc2.pan;

    // Filter setup
    voiceFilter.type = this.config.filter.type;
    const baseCutoff = Math.max(20, Math.min(20000, this.config.filter.cutoff));
    const keyTrackOffset = (midiNote - 60) * this.config.filter.keyTracking * 40;
    const effectiveCutoff = Math.max(20, Math.min(20000, baseCutoff + keyTrackOffset));

    voiceFilter.frequency.setValueAtTime(effectiveCutoff, t);
    voiceFilter.Q.setValueAtTime(this.config.filter.resonance, t);

    // Filter Envelope Modulation
    if (this.config.filter.enabled && Math.abs(this.config.filter.envAmount) > 0.01) {
      const envMod = this.config.filter.envAmount * 8000;
      const peakCutoff = Math.max(20, Math.min(20000, effectiveCutoff + envMod));
      const sustainCutoff = Math.max(20, Math.min(20000, effectiveCutoff + envMod * this.config.filterEnv.sustain));

      voiceFilter.frequency.setValueAtTime(effectiveCutoff, t);
      voiceFilter.frequency.linearRampToValueAtTime(peakCutoff, t + Math.max(0.005, this.config.filterEnv.attack));
      voiceFilter.frequency.exponentialRampToValueAtTime(sustainCutoff, t + this.config.filterEnv.attack + Math.max(0.01, this.config.filterEnv.decay));
    }

    // Amp Envelope setup
    voiceAmpGain.gain.setValueAtTime(0.0001, t);
    const targetPeak = velocity * 0.9;
    const attackTime = Math.max(0.002, this.config.ampEnv.attack);
    const decayTime = Math.max(0.01, this.config.ampEnv.decay);
    const sustainLevel = Math.max(0.0001, targetPeak * this.config.ampEnv.sustain);

    voiceAmpGain.gain.linearRampToValueAtTime(targetPeak, t + attackTime);
    voiceAmpGain.gain.exponentialRampToValueAtTime(sustainLevel, t + attackTime + decayTime);

    // Osc 1
    let osc1: OscillatorNode | null = null;
    if (this.config.osc1.enabled) {
      osc1 = this.ctx.createOscillator();
      osc1.type = (this.config.osc1.wave === 'noise' ? 'sawtooth' : this.config.osc1.wave) as OscillatorType;
      const freq1 = baseFreq * Math.pow(2, this.config.osc1.octave) * Math.pow(2, this.config.osc1.semi / 12);
      osc1.frequency.setValueAtTime(freq1, t);
      osc1.detune.setValueAtTime(this.config.osc1.detune + this.pitchBendCents, t);

      const osc1Gain = this.ctx.createGain();
      osc1Gain.gain.value = this.config.osc1.gain;
      osc1.connect(osc1Gain);
      osc1Gain.connect(panner1);
      panner1.connect(voiceMixer);
      osc1.start(t);
    }

    // Osc 2
    let osc2: OscillatorNode | null = null;
    if (this.config.osc2.enabled) {
      osc2 = this.ctx.createOscillator();
      osc2.type = (this.config.osc2.wave === 'noise' ? 'square' : this.config.osc2.wave) as OscillatorType;
      const freq2 = baseFreq * Math.pow(2, this.config.osc2.octave) * Math.pow(2, this.config.osc2.semi / 12);
      osc2.frequency.setValueAtTime(freq2, t);
      osc2.detune.setValueAtTime(this.config.osc2.detune + this.pitchBendCents, t);

      const osc2Gain = this.ctx.createGain();
      osc2Gain.gain.value = this.config.osc2.gain;
      osc2.connect(osc2Gain);
      osc2Gain.connect(panner2);
      panner2.connect(voiceMixer);
      osc2.start(t);
    }

    // Sub Osc
    let subOsc: OscillatorNode | null = null;
    if (this.config.sub.enabled) {
      subOsc = this.ctx.createOscillator();
      subOsc.type = this.config.sub.wave;
      const subFreq = baseFreq * Math.pow(2, this.config.sub.octave);
      subOsc.frequency.setValueAtTime(subFreq, t);

      const subGain = this.ctx.createGain();
      subGain.gain.value = this.config.sub.gain;
      subOsc.connect(subGain);
      subGain.connect(voiceMixer);
      subOsc.start(t);
    }

    // Noise Generator
    let noiseSource: AudioBufferSourceNode | null = null;
    if (this.config.noise.enabled && this.noiseBuffer) {
      noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = this.noiseBuffer;
      noiseSource.loop = true;

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.value = this.config.noise.gain;
      noiseSource.connect(noiseGain);
      noiseGain.connect(voiceMixer);
      noiseSource.start(t);
    }

    // Chain: voiceMixer -> voiceFilter -> voiceAmpGain -> preEffectsGain
    voiceMixer.connect(voiceFilter);
    voiceFilter.connect(voiceAmpGain);
    voiceAmpGain.connect(this.preEffectsGain);

    const voice: ActiveVoice = {
      midiNote,
      startTime: t,
      osc1,
      osc2,
      subOsc,
      noiseSource,
      voiceFilter,
      voiceAmpGain,
      voiceMixer,
      panner1,
      panner2,
    };

    this.activeVoices.set(midiNote, voice);
    this.lastMidiNote = midiNote;
  }

  private releaseVoice(midiNote: number, immediate = false) {
    if (!this.ctx) return;
    const voice = this.activeVoices.get(midiNote);
    if (!voice) return;

    this.activeVoices.delete(midiNote);
    const t = this.ctx.currentTime;
    const releaseTime = immediate ? 0.02 : Math.max(0.02, this.config.ampEnv.release);

    try {
      const currentGain = Math.max(0.0001, voice.voiceAmpGain.gain.value);
      voice.voiceAmpGain.gain.cancelScheduledValues(t);
      voice.voiceAmpGain.gain.setValueAtTime(currentGain, t);
      voice.voiceAmpGain.gain.exponentialRampToValueAtTime(0.0001, t + releaseTime);

      // Release filter envelope
      if (this.config.filter.enabled) {
        const currentCutoff = Math.max(20, voice.voiceFilter.frequency.value);
        voice.voiceFilter.frequency.cancelScheduledValues(t);
        voice.voiceFilter.frequency.setValueAtTime(currentCutoff, t);
        voice.voiceFilter.frequency.exponentialRampToValueAtTime(Math.max(20, this.config.filter.cutoff), t + releaseTime);
      }
    } catch {
      // ignore ramp calculation errors
    }

    // Always schedule node cleanup
    setTimeout(() => {
      try {
        if (voice.osc1) {
          voice.osc1.stop();
          voice.osc1.disconnect();
        }
        if (voice.osc2) {
          voice.osc2.stop();
          voice.osc2.disconnect();
        }
        if (voice.subOsc) {
          voice.subOsc.stop();
          voice.subOsc.disconnect();
        }
        if (voice.noiseSource) {
          voice.noiseSource.stop();
          voice.noiseSource.disconnect();
        }
        voice.voiceAmpGain.disconnect();
        voice.voiceFilter.disconnect();
        voice.voiceMixer.disconnect();
      } catch {
        // ignore
      }
    }, (releaseTime + 0.05) * 1000);
  }

  public panic() {
    // Panic / All Notes Off: force stop and disconnect all voices
    this.activeVoices.forEach((voice) => {
      try {
        if (voice.osc1) {
          voice.osc1.stop();
          voice.osc1.disconnect();
        }
        if (voice.osc2) {
          voice.osc2.stop();
          voice.osc2.disconnect();
        }
        if (voice.subOsc) {
          voice.subOsc.stop();
          voice.subOsc.disconnect();
        }
        if (voice.noiseSource) {
          voice.noiseSource.stop();
          voice.noiseSource.disconnect();
        }
        voice.voiceAmpGain.disconnect();
        voice.voiceFilter.disconnect();
        voice.voiceMixer.disconnect();
      } catch {
        // ignore
      }
    });
    this.activeVoices.clear();
    this.stopArpeggiator();
    this.arpActiveNotes = [];
    this.notifyActiveNotes();
  }

  // --- Arpeggiator Implementation ---
  private startArpeggiator() {
    if (this.arpTimerId !== null) return;
    this.arpIndex = 0;
    this.arpDir = 1;
    this.stepArpeggiator();
  }

  private stopArpeggiator() {
    if (this.arpTimerId !== null) {
      clearTimeout(this.arpTimerId);
      this.arpTimerId = null;
    }
    this.activeVoices.forEach((_, note) => this.releaseVoice(note, true));
  }

  private stepArpeggiator() {
    if (!this.config.arp.enabled || this.arpActiveNotes.length === 0) {
      this.stopArpeggiator();
      return;
    }

    // Build full arpeggio note list across octave span
    const baseNotes = [...this.arpActiveNotes].sort((a, b) => a - b);
    const octaves = Math.max(1, this.config.arp.octaves);
    const fullSequence: number[] = [];

    for (let o = 0; o < octaves; o++) {
      for (const n of baseNotes) {
        fullSequence.push(n + o * 12);
      }
    }

    if (fullSequence.length === 0) return;

    let currentNote = fullSequence[0];
    const mode = this.config.arp.mode;

    if (mode === 'up') {
      this.arpIndex = this.arpIndex % fullSequence.length;
      currentNote = fullSequence[this.arpIndex];
      this.arpIndex++;
    } else if (mode === 'down') {
      fullSequence.reverse();
      this.arpIndex = this.arpIndex % fullSequence.length;
      currentNote = fullSequence[this.arpIndex];
      this.arpIndex++;
    } else if (mode === 'upDown') {
      if (this.arpIndex >= fullSequence.length) {
        this.arpIndex = fullSequence.length - 2;
        this.arpDir = -1;
      }
      if (this.arpIndex < 0) {
        this.arpIndex = 1;
        this.arpDir = 1;
      }
      currentNote = fullSequence[Math.max(0, Math.min(fullSequence.length - 1, this.arpIndex))];
      this.arpIndex += this.arpDir;
    } else if (mode === 'random') {
      currentNote = fullSequence[Math.floor(Math.random() * fullSequence.length)];
    }

    // Play note
    this.playVoice(currentNote, 0.85);

    // Compute step duration from BPM and division
    const bpm = Math.max(40, Math.min(240, this.config.arp.bpm));
    const quarterMs = (60 / bpm) * 1000;
    let stepMs = quarterMs;

    switch (this.config.arp.rateDivision) {
      case '1/4':
        stepMs = quarterMs;
        break;
      case '1/8':
        stepMs = quarterMs / 2;
        break;
      case '1/16':
        stepMs = quarterMs / 4;
        break;
      case '1/32':
        stepMs = quarterMs / 8;
        break;
      case '1/8T':
        stepMs = (quarterMs / 2) * (2 / 3);
        break;
    }

    const gateDuration = stepMs * Math.max(0.1, Math.min(0.95, this.config.arp.gate));
    setTimeout(() => {
      this.releaseVoice(currentNote, false);
    }, gateDuration);

    this.arpTimerId = window.setTimeout(() => {
      this.arpTimerId = null;
      this.stepArpeggiator();
    }, stepMs);
  }

  // --- Real-time Parameter Updates ---
  public applyPatch(newConfig: SynthPatchConfig) {
    this.config = JSON.parse(JSON.stringify(newConfig));
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Master volume
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.config.master.volume, t, 0.02);
    }

    // LFO update
    this.routeLfo();

    // Effects updates
    if (this.effectsChain) {
      this.effectsChain.updateDistortion(this.config.effects.distortion);
      this.effectsChain.updateChorus(this.config.effects.chorus);
      this.effectsChain.updateDelay(this.config.effects.delay);
      this.effectsChain.updateReverb(this.config.effects.reverb);
      this.effectsChain.updateEq(this.config.effects.eq);
    }

    // Active voices update
    this.activeVoices.forEach((voice) => {
      voice.voiceFilter.type = this.config.filter.type;
      voice.voiceFilter.frequency.setTargetAtTime(this.config.filter.cutoff, t, 0.05);
      voice.voiceFilter.Q.setTargetAtTime(this.config.filter.resonance, t, 0.05);
      voice.panner1.pan.setTargetAtTime(this.config.osc1.pan, t, 0.05);
      voice.panner2.pan.setTargetAtTime(this.config.osc2.pan, t, 0.05);
    });
  }

  public setPitchBend(cents: number) {
    this.pitchBendCents = cents;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.activeVoices.forEach((voice) => {
      if (voice.osc1) voice.osc1.detune.setTargetAtTime(this.config.osc1.detune + cents, t, 0.02);
      if (voice.osc2) voice.osc2.detune.setTargetAtTime(this.config.osc2.detune + cents, t, 0.02);
    });
  }

  public setModWheel(amount: number) {
    this.modWheelAmount = amount;
    this.routeLfo();
  }

  public setMasterVolume(vol: number) {
    this.config.master.volume = vol;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.02);
    }
  }

  // --- Real-time Recording Interface ---
  public startRecording(): boolean {
    this.ensureAudioUnlocked();
    if (!this.recorderManager) return false;
    return this.recorderManager.start();
  }

  public async stopRecording(): Promise<AudioRecording | null> {
    if (!this.recorderManager) return null;
    return await this.recorderManager.stop();
  }

  public isRecording(): boolean {
    return !!this.recorderManager && this.recorderManager.getIsRecording();
  }

  // --- Helpers & Listeners ---
  private midiToFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  public onActiveNotesChange(callback: (notes: number[]) => void) {
    this.activeNotesListeners.add(callback);
    return () => this.activeNotesListeners.delete(callback);
  }

  private notifyActiveNotes() {
    const notes = this.config.arp.enabled ? [...this.arpActiveNotes] : Array.from(this.activeVoices.keys());
    this.activeNotesListeners.forEach((cb) => cb(notes));
  }

  public getConfig(): SynthPatchConfig {
    return JSON.parse(JSON.stringify(this.config));
  }
}

// Export singleton instance
export const synthEngine = new SynthEngine();
