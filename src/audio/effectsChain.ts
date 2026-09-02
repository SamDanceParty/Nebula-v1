import { DistortionConfig, ChorusConfig, DelayConfig, ReverbConfig, EqConfig, DistortionType } from '../types/synth';

export class EffectsChain {
  private ctx: AudioContext;
  public inputNode: GainNode;
  public outputNode: GainNode;

  // Distortion nodes
  private distInput: GainNode;
  private distPreGain: GainNode;
  private distShaper: WaveShaperNode;
  private distToneFilter: BiquadFilterNode;
  private distWetGain: GainNode;
  private distDryGain: GainNode;
  private distOutput: GainNode;

  // Chorus nodes
  private chorusInput: GainNode;
  private chorusDelayL: DelayNode;
  private chorusDelayR: DelayNode;
  private chorusLfo: OscillatorNode | null = null;
  private chorusLfoGainL: GainNode;
  private chorusLfoGainR: GainNode;
  private chorusFeedbackL: GainNode;
  private chorusFeedbackR: GainNode;
  private chorusWetGain: GainNode;
  private chorusDryGain: GainNode;
  private chorusOutput: GainNode;

  // Delay nodes
  private delayInput: GainNode;
  private delayNodeL: DelayNode;
  private delayNodeR: DelayNode;
  private delayFeedbackGainL: GainNode;
  private delayFeedbackGainR: GainNode;
  private delayDampFilterL: BiquadFilterNode;
  private delayDampFilterR: BiquadFilterNode;
  private delayWetGain: GainNode;
  private delayDryGain: GainNode;
  private delayOutput: GainNode;

  // Reverb nodes
  private reverbInput: GainNode;
  private reverbConvolver: ConvolverNode;
  private reverbPreDelay: DelayNode;
  private reverbWetGain: GainNode;
  private reverbDryGain: GainNode;
  private reverbOutput: GainNode;

  // EQ nodes
  private eqLow: BiquadFilterNode;
  private eqMid: BiquadFilterNode;
  private eqHigh: BiquadFilterNode;

  // Limiter / Safety compressor
  private masterLimiter: DynamicsCompressorNode;

  private currentDistConfig: DistortionConfig | null = null;
  private currentReverbConfig: ReverbConfig | null = null;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;

    this.inputNode = ctx.createGain();
    this.outputNode = ctx.createGain();

    // 1. Distortion Chain setup
    this.distInput = ctx.createGain();
    this.distPreGain = ctx.createGain();
    this.distShaper = ctx.createWaveShaper();
    this.distToneFilter = ctx.createBiquadFilter();
    this.distToneFilter.type = 'lowpass';
    this.distWetGain = ctx.createGain();
    this.distDryGain = ctx.createGain();
    this.distOutput = ctx.createGain();

    this.distInput.connect(this.distDryGain);
    this.distInput.connect(this.distPreGain);
    this.distPreGain.connect(this.distShaper);
    this.distShaper.connect(this.distToneFilter);
    this.distToneFilter.connect(this.distWetGain);
    this.distDryGain.connect(this.distOutput);
    this.distWetGain.connect(this.distOutput);

    // 2. Chorus Chain setup
    this.chorusInput = ctx.createGain();
    this.chorusDelayL = ctx.createDelay(0.1);
    this.chorusDelayR = ctx.createDelay(0.1);
    this.chorusDelayL.delayTime.value = 0.015;
    this.chorusDelayR.delayTime.value = 0.02;

    this.chorusLfoGainL = ctx.createGain();
    this.chorusLfoGainR = ctx.createGain();
    this.chorusFeedbackL = ctx.createGain();
    this.chorusFeedbackR = ctx.createGain();

    this.chorusWetGain = ctx.createGain();
    this.chorusDryGain = ctx.createGain();
    this.chorusOutput = ctx.createGain();

    const splitter = ctx.createChannelSplitter(2);
    const merger = ctx.createChannelMerger(2);

    this.chorusInput.connect(this.chorusDryGain);
    this.chorusDryGain.connect(this.chorusOutput);

    this.chorusInput.connect(splitter);
    splitter.connect(this.chorusDelayL, 0);
    splitter.connect(this.chorusDelayR, 1);

    this.chorusDelayL.connect(this.chorusFeedbackL);
    this.chorusFeedbackL.connect(this.chorusDelayL);

    this.chorusDelayR.connect(this.chorusFeedbackR);
    this.chorusFeedbackR.connect(this.chorusDelayR);

    this.chorusDelayL.connect(merger, 0, 0);
    this.chorusDelayR.connect(merger, 0, 1);
    merger.connect(this.chorusWetGain);
    this.chorusWetGain.connect(this.chorusOutput);

    this.initChorusLfo();

    // 3. Stereo Ping-Pong / Tape Delay setup
    this.delayInput = ctx.createGain();
    this.delayNodeL = ctx.createDelay(2.0);
    this.delayNodeR = ctx.createDelay(2.0);
    this.delayFeedbackGainL = ctx.createGain();
    this.delayFeedbackGainR = ctx.createGain();
    this.delayDampFilterL = ctx.createBiquadFilter();
    this.delayDampFilterR = ctx.createBiquadFilter();
    this.delayDampFilterL.type = 'lowpass';
    this.delayDampFilterR.type = 'lowpass';

    this.delayWetGain = ctx.createGain();
    this.delayDryGain = ctx.createGain();
    this.delayOutput = ctx.createGain();

    const delayMerger = ctx.createChannelMerger(2);

    this.delayInput.connect(this.delayDryGain);
    this.delayDryGain.connect(this.delayOutput);

    this.delayInput.connect(this.delayNodeL);
    this.delayNodeL.connect(this.delayDampFilterL);
    this.delayDampFilterL.connect(this.delayFeedbackGainL);
    // Ping pong / cross route
    this.delayFeedbackGainL.connect(this.delayNodeR);

    this.delayNodeR.connect(this.delayDampFilterR);
    this.delayDampFilterR.connect(this.delayFeedbackGainR);
    this.delayFeedbackGainR.connect(this.delayNodeL);

    this.delayDampFilterL.connect(delayMerger, 0, 0);
    this.delayDampFilterR.connect(delayMerger, 0, 1);
    delayMerger.connect(this.delayWetGain);
    this.delayWetGain.connect(this.delayOutput);

    // 4. Reverb Setup (Synthetic Convolver IR)
    this.reverbInput = ctx.createGain();
    this.reverbPreDelay = ctx.createDelay(0.5);
    this.reverbConvolver = ctx.createConvolver();
    this.reverbWetGain = ctx.createGain();
    this.reverbDryGain = ctx.createGain();
    this.reverbOutput = ctx.createGain();

    this.reverbInput.connect(this.reverbDryGain);
    this.reverbDryGain.connect(this.reverbOutput);

    this.reverbInput.connect(this.reverbPreDelay);
    this.reverbPreDelay.connect(this.reverbConvolver);
    this.reverbConvolver.connect(this.reverbWetGain);
    this.reverbWetGain.connect(this.reverbOutput);

    // 5. 3-Band EQ setup
    this.eqLow = ctx.createBiquadFilter();
    this.eqLow.type = 'lowshelf';
    this.eqLow.frequency.value = 160;

    this.eqMid = ctx.createBiquadFilter();
    this.eqMid.type = 'peaking';
    this.eqMid.frequency.value = 1200;
    this.eqMid.Q.value = 1.0;

    this.eqHigh = ctx.createBiquadFilter();
    this.eqHigh.type = 'highshelf';
    this.eqHigh.frequency.value = 6500;

    // 6. Master Limiter / Compressor
    this.masterLimiter = ctx.createDynamicsCompressor();
    this.masterLimiter.threshold.value = -1.0;
    this.masterLimiter.knee.value = 0.0;
    this.masterLimiter.ratio.value = 20.0;
    this.masterLimiter.attack.value = 0.002;
    this.masterLimiter.release.value = 0.05;

    // Wire entire chain in serial sequence:
    // input -> Distortion -> Chorus -> Delay -> Reverb -> EQ (Low -> Mid -> High) -> Limiter -> output
    this.inputNode.connect(this.distInput);
    this.distOutput.connect(this.chorusInput);
    this.chorusOutput.connect(this.delayInput);
    this.delayOutput.connect(this.reverbInput);
    this.reverbOutput.connect(this.eqLow);
    this.eqLow.connect(this.eqMid);
    this.eqMid.connect(this.eqHigh);
    this.eqHigh.connect(this.masterLimiter);
    this.masterLimiter.connect(this.outputNode);

    // Generate initial reverb impulse
    this.generateReverbImpulse(2.0, 6000);
  }

  private initChorusLfo() {
    if (this.chorusLfo) {
      try {
        this.chorusLfo.stop();
        this.chorusLfo.disconnect();
      } catch {
        // ignore if already stopped
      }
    }
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 1.2;

    this.chorusLfoGainL.gain.value = 0.003;
    this.chorusLfoGainR.gain.value = -0.003; // inverted for stereo spread

    lfo.connect(this.chorusLfoGainL);
    lfo.connect(this.chorusLfoGainR);

    this.chorusLfoGainL.connect(this.chorusDelayL.delayTime);
    this.chorusLfoGainR.connect(this.chorusDelayR.delayTime);

    lfo.start();
    this.chorusLfo = lfo;
  }

  public updateDistortion(config: DistortionConfig) {
    const t = this.ctx.currentTime;
    if (!config.enabled || config.mix <= 0.001) {
      this.distDryGain.gain.setTargetAtTime(1.0, t, 0.02);
      this.distWetGain.gain.setTargetAtTime(0.0, t, 0.02);
      return;
    }

    const wet = Math.max(0, Math.min(1, config.mix));
    this.distDryGain.gain.setTargetAtTime(1 - wet * 0.7, t, 0.02);
    this.distWetGain.gain.setTargetAtTime(wet, t, 0.02);

    this.distPreGain.gain.setTargetAtTime(1 + config.drive * 8, t, 0.02);
    this.distToneFilter.frequency.setTargetAtTime(config.tone, t, 0.02);

    // Update curve if type or drive changed substantially
    if (!this.currentDistConfig || this.currentDistConfig.type !== config.type || Math.abs(this.currentDistConfig.drive - config.drive) > 0.03) {
      this.distShaper.curve = this.makeDistortionCurve(config.type, config.drive);
    }
    this.currentDistConfig = { ...config };
  }

  private makeDistortionCurve(type: DistortionType, drive: number): Float32Array {
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const k = drive * 50 + 1;
    const deg = Math.PI / 180;

    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      if (type === 'soft') {
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      } else if (type === 'hard') {
        const threshold = 1 - drive * 0.75;
        if (x > threshold) curve[i] = threshold;
        else if (x < -threshold) curve[i] = -threshold;
        else curve[i] = x;
        curve[i] = curve[i] / threshold;
      } else if (type === 'fuzz') {
        curve[i] = Math.tanh(x * (1 + drive * 15)) * 0.9;
        if (x > 0.2) curve[i] = Math.sin(curve[i] * Math.PI * 0.5);
      } else if (type === 'bitcrush') {
        const steps = Math.max(3, Math.round(32 * (1 - drive * 0.9)));
        curve[i] = Math.round(x * steps) / steps;
      }
    }
    return curve;
  }

  public updateChorus(config: ChorusConfig) {
    const t = this.ctx.currentTime;
    if (!config.enabled || config.mix <= 0.001) {
      this.chorusDryGain.gain.setTargetAtTime(1.0, t, 0.02);
      this.chorusWetGain.gain.setTargetAtTime(0.0, t, 0.02);
      return;
    }

    const wet = Math.max(0, Math.min(1, config.mix));
    this.chorusDryGain.gain.setTargetAtTime(1.0 - wet * 0.4, t, 0.02);
    this.chorusWetGain.gain.setTargetAtTime(wet, t, 0.02);

    if (this.chorusLfo) {
      this.chorusLfo.frequency.setTargetAtTime(config.rate, t, 0.02);
    }
    const depthSec = 0.001 + config.depth * 0.005;
    this.chorusLfoGainL.gain.setTargetAtTime(depthSec, t, 0.02);
    this.chorusLfoGainR.gain.setTargetAtTime(-depthSec, t, 0.02);

    this.chorusFeedbackL.gain.setTargetAtTime(config.feedback * 0.7, t, 0.02);
    this.chorusFeedbackR.gain.setTargetAtTime(config.feedback * 0.7, t, 0.02);
  }

  public updateDelay(config: DelayConfig) {
    const t = this.ctx.currentTime;
    if (!config.enabled || config.mix <= 0.001) {
      this.delayDryGain.gain.setTargetAtTime(1.0, t, 0.02);
      this.delayWetGain.gain.setTargetAtTime(0.0, t, 0.02);
      return;
    }

    const wet = Math.max(0, Math.min(1, config.mix));
    this.delayDryGain.gain.setTargetAtTime(1.0, t, 0.02);
    this.delayWetGain.gain.setTargetAtTime(wet, t, 0.02);

    const safeTime = Math.max(0.02, Math.min(1.5, config.time));
    this.delayNodeL.delayTime.setTargetAtTime(safeTime, t, 0.04);
    // Ping pong slightly offsets right channel or cross-feeds
    const rightTime = config.pingPong ? safeTime * 0.75 : safeTime;
    this.delayNodeR.delayTime.setTargetAtTime(rightTime, t, 0.04);

    const safeFb = Math.max(0, Math.min(0.88, config.feedback));
    this.delayFeedbackGainL.gain.setTargetAtTime(safeFb, t, 0.02);
    this.delayFeedbackGainR.gain.setTargetAtTime(safeFb, t, 0.02);

    this.delayDampFilterL.frequency.setTargetAtTime(config.damping, t, 0.02);
    this.delayDampFilterR.frequency.setTargetAtTime(config.damping, t, 0.02);
  }

  public updateReverb(config: ReverbConfig) {
    const t = this.ctx.currentTime;
    if (!config.enabled || config.mix <= 0.001) {
      this.reverbDryGain.gain.setTargetAtTime(1.0, t, 0.02);
      this.reverbWetGain.gain.setTargetAtTime(0.0, t, 0.02);
      return;
    }

    const wet = Math.max(0, Math.min(1, config.mix));
    this.reverbDryGain.gain.setTargetAtTime(1.0 - wet * 0.3, t, 0.02);
    this.reverbWetGain.gain.setTargetAtTime(wet, t, 0.02);

    this.reverbPreDelay.delayTime.setTargetAtTime(config.preDelay, t, 0.02);

    // Regenerate impulse if decay or damping changed
    if (
      !this.currentReverbConfig ||
      Math.abs(this.currentReverbConfig.decay - config.decay) > 0.2 ||
      Math.abs(this.currentReverbConfig.damping - config.damping) > 500
    ) {
      this.generateReverbImpulse(config.decay, config.damping);
      this.currentReverbConfig = { ...config };
    }
  }

  private generateReverbImpulse(decayTime: number, dampingFreq: number) {
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * Math.max(0.3, Math.min(6.0, decayTime)));
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    const decayConstant = 3 / decayTime;
    const alpha = Math.min(0.9, Math.max(0.1, dampingFreq / (rate / 2)));

    let prevL = 0;
    let prevR = 0;

    for (let i = 0; i < length; i++) {
      const t = i / rate;
      const envelope = Math.exp(-decayConstant * t);

      // White noise with lowpass filter simulation
      const noiseL = (Math.random() * 2 - 1) * envelope;
      const noiseR = (Math.random() * 2 - 1) * envelope;

      prevL = prevL + alpha * (noiseL - prevL);
      prevR = prevR + alpha * (noiseR - prevR);

      left[i] = prevL;
      right[i] = prevR;
    }

    this.reverbConvolver.buffer = impulse;
  }

  public updateEq(config: EqConfig) {
    const t = this.ctx.currentTime;
    if (!config.enabled) {
      this.eqLow.gain.setTargetAtTime(0, t, 0.02);
      this.eqMid.gain.setTargetAtTime(0, t, 0.02);
      this.eqHigh.gain.setTargetAtTime(0, t, 0.02);
      return;
    }
    this.eqLow.gain.setTargetAtTime(config.lowGain, t, 0.02);
    this.eqMid.gain.setTargetAtTime(config.midGain, t, 0.02);
    this.eqHigh.gain.setTargetAtTime(config.highGain, t, 0.02);
  }

  public destroy() {
    if (this.chorusLfo) {
      try {
        this.chorusLfo.stop();
        this.chorusLfo.disconnect();
      } catch {
        // ignore
      }
    }
    this.inputNode.disconnect();
    this.outputNode.disconnect();
  }
}
