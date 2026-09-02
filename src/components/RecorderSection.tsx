import React, { useState, useEffect, useRef } from 'react';
import { synthEngine } from '../audio/synthEngine';
import { AudioRecording } from '../types/synth';
import {
  Mic,
  Square,
  Play,
  Pause,
  Download,
  Trash2,
  Volume2,
  Disc3,
  Clock,
  Music,
  Repeat,
  FileAudio,
} from 'lucide-react';

interface RecorderSectionProps {
  onUnlockAudio: () => void;
}

export const RecorderSection: React.FC<RecorderSectionProps> = ({ onUnlockAudio }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [recordings, setRecordings] = useState<AudioRecording[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playProgress, setPlayProgress] = useState<{ [id: string]: number }>({});
  const [isLooping, setIsLooping] = useState<{ [id: string]: boolean }>({});

  const timerRef = useRef<number | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Record timer
  useEffect(() => {
    if (isRecording) {
      const startTime = performance.now();
      timerRef.current = window.setInterval(() => {
        setRecordDuration((performance.now() - startTime) / 1000);
      }, 50);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const handleToggleRecord = async () => {
    onUnlockAudio();

    if (!isRecording) {
      const started = synthEngine.startRecording();
      if (started) {
        setIsRecording(true);
      }
    } else {
      setIsRecording(false);
      const newRec = await synthEngine.stopRecording();
      if (newRec) {
        setRecordings((prev) => [newRec, ...prev]);
      }
    }
  };

  const handlePlayToggle = (rec: AudioRecording) => {
    let audio = audioElementsRef.current.get(rec.id);

    if (!audio) {
      audio = new Audio(rec.blobUrl);
      audio.loop = !!isLooping[rec.id];

      audio.ontimeupdate = () => {
        if (!audio) return;
        setPlayProgress((prev) => ({
          ...prev,
          [rec.id]: audio.currentTime / (audio.duration || 1),
        }));
      };

      audio.onended = () => {
        if (!isLooping[rec.id]) {
          setPlayingId(null);
          setPlayProgress((prev) => ({ ...prev, [rec.id]: 0 }));
        }
      };

      audioElementsRef.current.set(rec.id, audio);
    }

    if (playingId === rec.id) {
      audio.pause();
      setPlayingId(null);
    } else {
      // Pause any currently playing audio
      audioElementsRef.current.forEach((el, id) => {
        if (id !== rec.id) {
          el.pause();
        }
      });
      audio.play();
      setPlayingId(rec.id);
    }
  };

  const handleSeek = (rec: AudioRecording, normValue: number) => {
    const audio = audioElementsRef.current.get(rec.id);
    if (audio && audio.duration) {
      audio.currentTime = normValue * audio.duration;
      setPlayProgress((prev) => ({ ...prev, [rec.id]: normValue }));
    }
  };

  const handleToggleLoop = (id: string) => {
    const nextVal = !isLooping[id];
    setIsLooping((prev) => ({ ...prev, [id]: nextVal }));
    const audio = audioElementsRef.current.get(id);
    if (audio) {
      audio.loop = nextVal;
    }
  };

  const handleDelete = (id: string) => {
    const audio = audioElementsRef.current.get(id);
    if (audio) {
      audio.pause();
      audioElementsRef.current.delete(id);
    }
    setRecordings((prev) => prev.filter((r) => r.id !== id));
    if (playingId === id) setPlayingId(null);
  };

  const handleRename = (id: string, newName: string) => {
    setRecordings((prev) =>
      prev.map((r) => (r.id === id ? { ...r, name: newName } : r))
    );
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-neutral-900/80 rounded-2xl border border-neutral-800 p-4 shadow-xl flex flex-col justify-between">
      {/* Top Header & Record Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <Disc3 className={`w-4 h-4 ${isRecording ? 'animate-spin text-rose-500' : ''}`} />
          </div>
          <div>
            <h2 className="font-mono font-bold text-sm tracking-wide text-neutral-100 uppercase">
              ЗАПИСЬ ЗВУКА В РЕАЛЬНОМ ВРЕМЕНИ
            </h2>
            <p className="text-[11px] text-neutral-400">Прямой захват выхода синтезатора и эффектов в Lossless WAV</p>
          </div>
        </div>

        {/* Big Record Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800">
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
            <span className="font-mono text-xs text-neutral-200 w-16 tabular-nums">
              {formatTime(recordDuration)}
            </span>
          </div>

          <button
            onClick={handleToggleRecord}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all shadow-lg ${
              isRecording
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/40 animate-pulse'
                : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 hover:border-rose-400 shadow-rose-500/10'
            }`}
          >
            {isRecording ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span>ОСТАНОВИТЬ ЗАПИСЬ</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>НАЧАТЬ ЗАПИСЬ (REC)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Recordings List */}
      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {recordings.length === 0 ? (
          <div className="p-6 rounded-xl bg-neutral-950/40 border border-dashed border-neutral-800 text-center flex flex-col items-center justify-center">
            <FileAudio className="w-8 h-8 text-neutral-600 mb-2" />
            <p className="text-xs font-mono text-neutral-400 font-medium">Нет сохраненных записей</p>
            <p className="text-[11px] text-neutral-500 mt-1 max-w-sm">
              Нажмите кнопку «НАЧАТЬ ЗАПИСЬ», играйте на синтезаторе с любыми эффектами, и затем нажмите «ОСТАНОВИТЬ». Файл будет доступен для прослушивания и экспорта в WAV!
            </p>
          </div>
        ) : (
          recordings.map((rec) => {
            const isThisPlaying = playingId === rec.id;
            const progress = playProgress[rec.id] || 0;
            const looping = !!isLooping[rec.id];

            return (
              <div
                key={rec.id}
                className="bg-neutral-950/70 border border-neutral-800 hover:border-neutral-700 rounded-xl p-3 flex flex-col gap-2 transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => handlePlayToggle(rec)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold transition shrink-0 ${
                        isThisPlaying
                          ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                          : 'bg-neutral-900 text-neutral-200 hover:bg-neutral-800 border border-neutral-700'
                      }`}
                    >
                      {isThisPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                    </button>

                    <div className="min-w-0">
                      <input
                        type="text"
                        value={rec.name}
                        onChange={(e) => handleRename(rec.id, e.target.value)}
                        className="bg-transparent hover:bg-neutral-900 focus:bg-neutral-900 border border-transparent hover:border-neutral-700 focus:border-amber-400 text-xs font-mono font-semibold text-neutral-200 rounded px-1.5 py-0.5 w-44 truncate focus:outline-none"
                      />
                      <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-500 px-1.5">
                        <span>{formatTime(rec.durationSeconds)}</span>
                        <span>•</span>
                        <span>{formatSize(rec.sizeBytes)}</span>
                        <span>•</span>
                        <span className="text-amber-500/80 font-bold uppercase">WAV 16-BIT</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Loop button */}
                    <button
                      onClick={() => handleToggleLoop(rec.id)}
                      title={looping ? 'Зацикливание включено' : 'Включить повтор'}
                      className={`p-1.5 rounded-lg border text-xs transition ${
                        looping
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                      }`}
                    >
                      <Repeat className="w-3.5 h-3.5" />
                    </button>

                    {/* Download WAV button */}
                    <a
                      href={rec.blobUrl}
                      download={`${rec.name.replace(/\s+/g, '_')}.wav`}
                      title="Скачать WAV файл на компьютер"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-mono transition"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">WAV</span>
                    </a>

                    {/* Delete track */}
                    <button
                      onClick={() => handleDelete(rec.id)}
                      title="Удалить запись"
                      className="p-1.5 rounded-lg bg-neutral-900 hover:bg-rose-950/50 border border-neutral-800 hover:border-rose-800/50 text-neutral-400 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Scrubber Progress Bar */}
                <div
                  className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden cursor-pointer relative"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const norm = Math.max(0, Math.min(1, clickX / rect.width));
                    handleSeek(rec, norm);
                  }}
                >
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-75"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
