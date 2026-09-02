import React, { useRef, useEffect, useState } from 'react';
import { synthEngine } from '../audio/synthEngine';
import { Activity, BarChart3, Radio } from 'lucide-react';

interface VisualizerProps {
  id?: string;
}

export const Visualizer: React.FC<VisualizerProps> = ({ id }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [viewMode, setViewMode] = useState<'wave' | 'fft' | 'both'>('both');
  const [peakLevel, setPeakLevel] = useState<number>(0);
  const animFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let timeDomainData: Uint8Array;
    let freqData: Uint8Array;

    const render = () => {
      animFrameIdRef.current = requestAnimationFrame(render);

      const analyser = synthEngine.analyserNode;
      const width = canvas.width;
      const height = canvas.height;

      // Dark analog phosphor background
      ctx.fillStyle = '#090a0f';
      ctx.fillRect(0, 0, width, height);

      // Subtle grid overlay
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      const gridSpacingX = width / 12;
      const gridSpacingY = height / 6;

      ctx.beginPath();
      for (let x = gridSpacingX; x < width; x += gridSpacingX) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = gridSpacingY; y < height; y += gridSpacingY) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Center crosshair axis
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      if (!analyser) {
        // Idle flatline
        ctx.strokeStyle = '#06b6d4';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 6;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        return;
      }

      if (!timeDomainData || timeDomainData.length !== analyser.frequencyBinCount) {
        timeDomainData = new Uint8Array(analyser.frequencyBinCount);
        freqData = new Uint8Array(analyser.frequencyBinCount);
      }

      analyser.getByteTimeDomainData(timeDomainData);
      analyser.getByteFrequencyData(freqData);

      // Calculate peak amplitude
      let maxDev = 0;
      for (let i = 0; i < timeDomainData.length; i++) {
        const dev = Math.abs(timeDomainData[i] - 128);
        if (dev > maxDev) maxDev = dev;
      }
      setPeakLevel(Math.min(1, maxDev / 128));

      // Draw Spectrum (FFT)
      if (viewMode === 'fft' || viewMode === 'both') {
        const barCount = 48;
        const barWidth = width / barCount;
        const binStep = Math.floor(freqData.length / 2 / barCount);

        for (let i = 0; i < barCount; i++) {
          let sum = 0;
          for (let j = 0; j < binStep; j++) {
            sum += freqData[i * binStep + j] || 0;
          }
          const avg = sum / binStep;
          const barHeight = (avg / 255) * (height * (viewMode === 'both' ? 0.7 : 0.85));

          const grad = ctx.createLinearGradient(0, height, 0, height - barHeight);
          grad.addColorStop(0, 'rgba(6, 182, 212, 0.1)');
          grad.addColorStop(0.7, 'rgba(6, 182, 212, 0.4)');
          grad.addColorStop(1, 'rgba(245, 158, 11, 0.8)');

          ctx.fillStyle = grad;
          ctx.fillRect(i * barWidth + 1, height - barHeight, barWidth - 2, barHeight);
        }
      }

      // Draw Oscilloscope (Time Domain Waveform)
      if (viewMode === 'wave' || viewMode === 'both') {
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#22d3ee';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 8;
        ctx.beginPath();

        const sliceWidth = width / timeDomainData.length;
        let x = 0;

        for (let i = 0; i < timeDomainData.length; i++) {
          const v = timeDomainData[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    };

    render();

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [viewMode]);

  return (
    <div id={id} className="relative bg-neutral-950 rounded-xl border border-neutral-800 overflow-hidden shadow-inner p-3 flex flex-col justify-between">
      {/* Scope Header Controls */}
      <div className="flex items-center justify-between mb-2 z-10">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 text-[11px] font-mono">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>ОСЦИЛЛОГРАФ / СПЕКТР</span>
          </div>
          <span className="text-[11px] text-neutral-500 font-mono hidden sm:inline">60 FPS REALTIME</span>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-neutral-900/90 p-1 rounded-lg border border-neutral-800">
          <button
            onClick={() => setViewMode('both')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
              viewMode === 'both' ? 'bg-cyan-600 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            КОМБО
          </button>
          <button
            onClick={() => setViewMode('wave')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors flex items-center gap-1 ${
              viewMode === 'wave' ? 'bg-cyan-600 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Activity className="w-3 h-3" />
            ВОЛНА
          </button>
          <button
            onClick={() => setViewMode('fft')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors flex items-center gap-1 ${
              viewMode === 'fft' ? 'bg-cyan-600 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <BarChart3 className="w-3 h-3" />
            БАРЫ
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative w-full h-32 md:h-36 rounded-lg overflow-hidden border border-neutral-900">
        <canvas
          ref={canvasRef}
          width={640}
          height={160}
          className="w-full h-full block"
        />

        {/* Level meter overlay on right edge */}
        <div className="absolute right-2 top-2 bottom-2 w-2 bg-neutral-900/80 rounded-full overflow-hidden flex flex-col justify-end p-0.5 border border-neutral-800">
          <div
            className={`w-full rounded-full transition-all duration-75 ${
              peakLevel > 0.9 ? 'bg-rose-500' : peakLevel > 0.6 ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
            style={{ height: `${Math.min(100, Math.round(peakLevel * 100))}%` }}
          />
        </div>
      </div>
    </div>
  );
};
