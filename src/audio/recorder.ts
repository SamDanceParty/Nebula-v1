import { AudioRecording } from '../types/synth';

export class AudioRecorderManager {
  private ctx: AudioContext;
  private sourceNode: AudioNode;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording = false;
  private startTime = 0;
  private streamDestination: MediaStreamAudioDestinationNode | null = null;

  // For high-fidelity lossless WAV recording
  private scriptProcessor: ScriptProcessorNode | null = null;
  private leftChannelData: Float32Array[] = [];
  private rightChannelData: Float32Array[] = [];
  private recordingLength = 0;

  constructor(ctx: AudioContext, sourceNode: AudioNode) {
    this.ctx = ctx;
    this.sourceNode = sourceNode;
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }

  public start(): boolean {
    if (this.isRecording) return false;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.recordedChunks = [];
    this.leftChannelData = [];
    this.rightChannelData = [];
    this.recordingLength = 0;
    this.startTime = performance.now();
    this.isRecording = true;

    // 1. WAV Raw PCM recorder using buffer tap
    const bufferSize = 4096;
    this.scriptProcessor = this.ctx.createScriptProcessor(bufferSize, 2, 2);
    this.scriptProcessor.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const left = e.inputBuffer.getChannelData(0);
      const right = e.inputBuffer.getChannelData(1);

      this.leftChannelData.push(new Float32Array(left));
      this.rightChannelData.push(new Float32Array(right));
      this.recordingLength += left.length;
    };

    this.sourceNode.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.ctx.destination);

    // 2. Also prepare MediaRecorder as complementary stream if needed
    try {
      this.streamDestination = this.ctx.createMediaStreamDestination();
      this.sourceNode.connect(this.streamDestination);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      this.mediaRecorder = new MediaRecorder(this.streamDestination.stream, { mimeType });
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };
      this.mediaRecorder.start(100);
    } catch {
      // MediaRecorder fallback handled by WAV processor
    }

    return true;
  }

  public async stop(): Promise<AudioRecording | null> {
    if (!this.isRecording) return null;
    this.isRecording = false;

    const durationSeconds = Math.max(0.2, (performance.now() - this.startTime) / 1000);

    // Disconnect script processor
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.sourceNode.disconnect(this.scriptProcessor);
      this.scriptProcessor.onaudioprocess = null;
      this.scriptProcessor = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
    if (this.streamDestination) {
      try {
        this.sourceNode.disconnect(this.streamDestination);
      } catch {
        // ignore
      }
      this.streamDestination = null;
    }

    // Generate lossless 16-bit WAV file from the captured raw PCM
    let wavBlob: Blob;
    try {
      wavBlob = this.encodeWAV(this.leftChannelData, this.rightChannelData, this.recordingLength, this.ctx.sampleRate);
    } catch {
      // Fallback to mediaRecorder chunks if available
      wavBlob = new Blob(this.recordedChunks, { type: 'audio/webm' });
    }

    const timestamp = Date.now();
    const dateStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const blobUrl = URL.createObjectURL(wavBlob);

    const recording: AudioRecording = {
      id: `rec-${timestamp}`,
      name: `Запись ${dateStr}`,
      durationSeconds,
      createdAt: timestamp,
      blobUrl,
      blob: wavBlob,
      sizeBytes: wavBlob.size,
      type: wavBlob.type.includes('wav') ? 'audio/wav' : 'audio/webm',
    };

    return recording;
  }

  private encodeWAV(
    leftChunks: Float32Array[],
    rightChunks: Float32Array[],
    totalLength: number,
    sampleRate: number
  ): Blob {
    // Flatten buffers
    const leftFlat = new Float32Array(totalLength);
    const rightFlat = new Float32Array(totalLength);

    let offset = 0;
    for (const chunk of leftChunks) {
      leftFlat.set(chunk, offset);
      offset += chunk.length;
    }

    offset = 0;
    for (const chunk of rightChunks) {
      rightFlat.set(chunk, offset);
      offset += chunk.length;
    }

    // Interleave left and right into 16-bit PCM
    const buffer = new ArrayBuffer(44 + totalLength * 2 * 2);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + totalLength * 4, true);
    this.writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
    view.setUint16(22, 2, true); // NumChannels (2 = Stereo)
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * 4, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
    view.setUint16(32, 4, true); // BlockAlign (NumChannels * BitsPerSample/8)
    view.setUint16(34, 16, true); // BitsPerSample (16 bits)

    // data sub-chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, totalLength * 4, true);

    // Write PCM samples with soft limiting
    let index = 44;
    for (let i = 0; i < totalLength; i++) {
      let sampleL = leftFlat[i];
      let sampleR = rightFlat[i];

      // Soft clamp
      sampleL = Math.max(-1, Math.min(1, sampleL));
      sampleR = Math.max(-1, Math.min(1, sampleR));

      const intL = sampleL < 0 ? sampleL * 0x8000 : sampleL * 0x7fff;
      const intR = sampleR < 0 ? sampleR * 0x8000 : sampleR * 0x7fff;

      view.setInt16(index, intL, true);
      index += 2;
      view.setInt16(index, intR, true);
      index += 2;
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}
