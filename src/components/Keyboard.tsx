import React, { useState, useEffect, useRef, useCallback } from 'react';
import { synthEngine } from '../audio/synthEngine';
import { ChevronLeft, ChevronRight, Keyboard as KeyboardIcon } from 'lucide-react';

interface KeyInfo {
  midiNote: number;
  noteName: string;
  isBlack: boolean;
  keyBinding?: string;
  whiteIndex: number;
}

// 2-octave computer keyboard mapping:
// Lower octave: A W S E D F T G Y H U J K
// Upper octave: O L P ; '
const KEY_MAP: { [code: string]: number } = {
  // Lower octave (C to B)
  KeyA: 0,  // C
  KeyW: 1,  // C#
  KeyS: 2,  // D
  KeyE: 3,  // D#
  KeyD: 4,  // E
  KeyF: 5,  // F
  KeyT: 6,  // F#
  KeyG: 7,  // G
  KeyY: 8,  // G#
  KeyH: 9,  // A
  KeyU: 10, // A#
  KeyJ: 11, // B
  KeyK: 12, // C (next octave)
  KeyO: 13, // C#
  KeyL: 14, // D
  KeyP: 15, // D#
  Semicolon: 16, // E
  Quote: 17,     // F
  BracketLeft: 18, // F#
  BracketRight: 19, // G
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const Keyboard: React.FC = () => {
  const [octaveShift, setOctaveShift] = useState<number>(0); // 0 = C3 base (midi 48)
  const [showKeyLabels, setShowKeyLabels] = useState<boolean>(true);
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const [pitchBend, setPitchBend] = useState<number>(0); // -1 to +1
  const [modWheel, setModWheel] = useState<number>(0);   // 0 to 1

  const isMouseDownRef = useRef<boolean>(false);
  const activeMouseNotesRef = useRef<Set<number>>(new Set());
  const pitchBendDraggingRef = useRef<boolean>(false);
  const modWheelDraggingRef = useRef<boolean>(false);
  const pressedKeyCodesRef = useRef<Set<string>>(new Set());

  const baseMidi = 48 + octaveShift * 12; // C3 is 48, C4 is 60

  // Subscribe to engine note active events
  useEffect(() => {
    return synthEngine.onActiveNotesChange((notes) => {
      setActiveNotes(new Set(notes));
    });
  }, []);

  const playNote = useCallback((midiNote: number) => {
    synthEngine.noteOn(midiNote, 0.85);
  }, []);

  const stopNote = useCallback((midiNote: number) => {
    synthEngine.noteOff(midiNote);
  }, []);

  // Global mouse, visibility, and focus listeners to guarantee notes never get stuck
  useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      // If left button is no longer pressed, release all mouse-held notes
      if ((e.buttons & 1) === 0) {
        isMouseDownRef.current = false;
        if (activeMouseNotesRef.current.size > 0) {
          activeMouseNotesRef.current.forEach((n) => stopNote(n));
          activeMouseNotesRef.current.clear();
        }
      }
      if (pitchBendDraggingRef.current) {
        pitchBendDraggingRef.current = false;
        setPitchBend(0);
        synthEngine.setPitchBend(0);
      }
      modWheelDraggingRef.current = false;
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      // If mouse is moving but primary button is not pressed, clean up any stuck notes
      if ((e.buttons & 1) === 0 && (isMouseDownRef.current || activeMouseNotesRef.current.size > 0)) {
        isMouseDownRef.current = false;
        if (activeMouseNotesRef.current.size > 0) {
          activeMouseNotesRef.current.forEach((n) => stopNote(n));
          activeMouseNotesRef.current.clear();
        }
      }
    };

    const handleBlurOrHide = () => {
      isMouseDownRef.current = false;
      if (activeMouseNotesRef.current.size > 0) {
        activeMouseNotesRef.current.forEach((n) => stopNote(n));
        activeMouseNotesRef.current.clear();
      }
      pressedKeyCodesRef.current.forEach((code) => {
        const offset = KEY_MAP[code];
        if (offset !== undefined) {
          stopNote(baseMidi + offset);
        }
      });
      pressedKeyCodesRef.current.clear();

      if (pitchBendDraggingRef.current) {
        pitchBendDraggingRef.current = false;
        setPitchBend(0);
        synthEngine.setPitchBend(0);
      }
      modWheelDraggingRef.current = false;
      synthEngine.panic();
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('blur', handleBlurOrHide);
    document.addEventListener('visibilitychange', handleBlurOrHide);

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('blur', handleBlurOrHide);
      document.removeEventListener('visibilitychange', handleBlurOrHide);
    };
  }, [baseMidi, stopNote]);

  // Computer QWERTY Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'KeyZ') {
        setOctaveShift((prev) => Math.max(-2, prev - 1));
        return;
      }
      if (e.code === 'KeyX') {
        setOctaveShift((prev) => Math.min(2, prev + 1));
        return;
      }

      const offset = KEY_MAP[e.code];
      if (offset !== undefined) {
        e.preventDefault();
        pressedKeyCodesRef.current.add(e.code);
        const midi = baseMidi + offset;
        playNote(midi);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const offset = KEY_MAP[e.code];
      if (offset !== undefined) {
        pressedKeyCodesRef.current.delete(e.code);
        const midi = baseMidi + offset;
        stopNote(midi);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [baseMidi, playNote, stopNote]);

  // Generate 29 piano keys (2 full octaves + 5 notes = C to E)
  const numKeys = 29;
  const keys: KeyInfo[] = [];
  let whiteCount = 0;

  const bindingMap: { [offset: number]: string } = {
    0: 'A', 1: 'W', 2: 'S', 3: 'E', 4: 'D', 5: 'F', 6: 'T',
    7: 'G', 8: 'Y', 9: 'H', 10: 'U', 11: 'J', 12: 'K',
    13: 'O', 14: 'L', 15: 'P', 16: ';', 17: "'", 18: '[', 19: ']',
  };

  for (let i = 0; i < numKeys; i++) {
    const midi = baseMidi + i;
    const noteInOctave = midi % 12;
    const isBlack = [1, 3, 6, 8, 10].includes(noteInOctave);
    const noteName = `${NOTE_NAMES[noteInOctave]}${Math.floor(midi / 12) - 1}`;
    const keyBinding = bindingMap[i];

    keys.push({
      midiNote: midi,
      noteName,
      isBlack,
      keyBinding,
      whiteIndex: isBlack ? -1 : whiteCount++,
    });
  }

  // Pitch Bend handling (only left mouse button)
  const handlePitchBendMove = (clientY: number, rect: DOMRect) => {
    const norm = (clientY - rect.top) / rect.height; // 0 top, 1 bottom
    const val = (0.5 - norm) * 2; // -1 to +1 (clamped)
    const clamped = Math.max(-1, Math.min(1, val));
    setPitchBend(clamped);
    synthEngine.setPitchBend(clamped * 200); // +/- 200 cents (2 semitones)
  };

  // Mod Wheel handling (only left mouse button)
  const handleModWheelMove = (clientY: number, rect: DOMRect) => {
    const norm = 1 - (clientY - rect.top) / rect.height; // 0 at bottom, 1 at top
    const clamped = Math.max(0, Math.min(1, norm));
    setModWheel(clamped);
    synthEngine.setModWheel(clamped);
  };

  // Piano Key Handlers with strict mouse button protection:
  // e.button === 0: Primary (Left) button.
  // Auxiliary buttons (1, 2, 3, 4, etc.) are strictly prevented and ignored.
  const handleKeyMouseDown = (e: React.MouseEvent, midiNote: number) => {
    if (e.button !== 0) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    isMouseDownRef.current = true;
    if (!activeMouseNotesRef.current.has(midiNote)) {
      activeMouseNotesRef.current.add(midiNote);
      playNote(midiNote);
    }
  };

  const handleKeyMouseUp = (e: React.MouseEvent, midiNote: number) => {
    if (activeMouseNotesRef.current.has(midiNote)) {
      activeMouseNotesRef.current.delete(midiNote);
      stopNote(midiNote);
    }
    if ((e.buttons & 1) === 0) {
      isMouseDownRef.current = false;
    }
  };

  const handleKeyMouseEnter = (e: React.MouseEvent, midiNote: number) => {
    if ((e.buttons & 1) === 1 && isMouseDownRef.current) {
      if (!activeMouseNotesRef.current.has(midiNote)) {
        activeMouseNotesRef.current.add(midiNote);
        playNote(midiNote);
      }
    } else {
      isMouseDownRef.current = false;
      if (activeMouseNotesRef.current.size > 0) {
        activeMouseNotesRef.current.forEach((n) => stopNote(n));
        activeMouseNotesRef.current.clear();
      }
    }
  };

  const handleKeyMouseLeave = (_e: React.MouseEvent, midiNote: number) => {
    if (activeMouseNotesRef.current.has(midiNote)) {
      activeMouseNotesRef.current.delete(midiNote);
      stopNote(midiNote);
    }
  };

  const handleKeyTouchStart = (midiNote: number) => {
    if (!activeMouseNotesRef.current.has(midiNote)) {
      activeMouseNotesRef.current.add(midiNote);
      playNote(midiNote);
    }
  };

  const handleKeyTouchEnd = (midiNote: number) => {
    if (activeMouseNotesRef.current.has(midiNote)) {
      activeMouseNotesRef.current.delete(midiNote);
      stopNote(midiNote);
    }
  };

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      onAuxClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className="bg-neutral-900/90 rounded-2xl border border-neutral-800 p-4 shadow-2xl select-none"
    >
      {/* Keyboard Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-2 border-b border-neutral-800">
        {/* Octave Shift Controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-neutral-400">ОКТАВА:</span>
          <div className="flex items-center bg-neutral-950 rounded-xl p-1 border border-neutral-800">
            <button
              onClick={() => setOctaveShift((prev) => Math.max(-2, prev - 1))}
              disabled={octaveShift <= -2}
              className="p-1 rounded text-neutral-400 hover:text-neutral-100 disabled:opacity-30 transition"
              title="Октава вниз (клавиша Z)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs font-bold text-amber-400 px-2 min-w-[50px] text-center">
              {octaveShift > 0 ? `+${octaveShift}` : octaveShift} (C{3 + octaveShift})
            </span>
            <button
              onClick={() => setOctaveShift((prev) => Math.min(2, prev + 1))}
              disabled={octaveShift >= 2}
              className="p-1 rounded text-neutral-400 hover:text-neutral-100 disabled:opacity-30 transition"
              title="Октава вверх (клавиша X)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="text-[10px] font-mono text-neutral-500 hidden sm:inline">[Z / X]</span>
        </div>

        {/* Keyboard shortcut badges toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowKeyLabels((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border transition ${
              showKeyLabels
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
            }`}
          >
            <KeyboardIcon className="w-3.5 h-3.5" />
            <span>Подсказки клавиш [QWERTY]</span>
          </button>
        </div>
      </div>

      {/* Main Keyboard Deck: Wheels + Piano Keys */}
      <div className="flex gap-4 items-stretch justify-center select-none overflow-x-auto pb-2">
        {/* Pitch Bend & Mod Wheels */}
        <div className="flex gap-2 shrink-0 pr-2 border-r border-neutral-800/80">
          {/* Pitch Bend Wheel */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-mono text-neutral-400 mb-1">PITCH</span>
            <div
              className="w-9 h-32 md:h-36 bg-neutral-950 rounded-xl border border-neutral-800 relative flex items-center justify-center cursor-ns-resize overflow-hidden shadow-inner"
              onMouseDown={(e) => {
                if (e.button !== 0) {
                  e.preventDefault();
                  return;
                }
                pitchBendDraggingRef.current = true;
                const rect = e.currentTarget.getBoundingClientRect();
                handlePitchBendMove(e.clientY, rect);

                const onMove = (mEvent: MouseEvent) => {
                  if (pitchBendDraggingRef.current) {
                    handlePitchBendMove(mEvent.clientY, rect);
                  }
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', () => {
                  window.removeEventListener('mousemove', onMove);
                }, { once: true });
              }}
            >
              {/* Wheel center groove */}
              <div className="w-full h-0.5 bg-neutral-700 absolute top-1/2 -translate-y-1/2" />
              {/* Draggable thumb */}
              <div
                className="w-7 h-9 rounded-lg bg-neutral-800 border border-neutral-600 shadow-md absolute flex flex-col justify-center gap-0.5 px-1 transition-all duration-75"
                style={{ top: `${Math.round(50 - pitchBend * 35)}%`, transform: 'translateY(-50%)' }}
              >
                <div className="h-0.5 w-full bg-neutral-400 rounded" />
                <div className="h-0.5 w-full bg-amber-400 rounded" />
                <div className="h-0.5 w-full bg-neutral-400 rounded" />
              </div>
            </div>
            <span className="text-[9px] font-mono text-neutral-500 mt-1">±2 Semi</span>
          </div>

          {/* Modulation Wheel */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-mono text-neutral-400 mb-1">MOD</span>
            <div
              className="w-9 h-32 md:h-36 bg-neutral-950 rounded-xl border border-neutral-800 relative flex items-center justify-center cursor-ns-resize overflow-hidden shadow-inner"
              onMouseDown={(e) => {
                if (e.button !== 0) {
                  e.preventDefault();
                  return;
                }
                modWheelDraggingRef.current = true;
                const rect = e.currentTarget.getBoundingClientRect();
                handleModWheelMove(e.clientY, rect);

                const onMove = (mEvent: MouseEvent) => {
                  if (modWheelDraggingRef.current) {
                    handleModWheelMove(mEvent.clientY, rect);
                  }
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', () => {
                  window.removeEventListener('mousemove', onMove);
                }, { once: true });
              }}
            >
              {/* Draggable thumb */}
              <div
                className="w-7 h-9 rounded-lg bg-neutral-800 border border-neutral-600 shadow-md absolute flex flex-col justify-center gap-0.5 px-1 transition-all duration-75"
                style={{ bottom: `${Math.round(modWheel * 70)}%` }}
              >
                <div className="h-0.5 w-full bg-cyan-400 rounded" />
                <div className="h-0.5 w-full bg-neutral-400 rounded" />
              </div>
            </div>
            <span className="text-[9px] font-mono text-cyan-400 mt-1">{Math.round(modWheel * 100)}%</span>
          </div>
        </div>

        {/* Piano Keys Stage */}
        <div
          className="relative h-32 md:h-36 flex shrink-0"
          style={{ width: `${whiteCount * 36}px` }}
          onContextMenu={(e) => e.preventDefault()}
          onAuxClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {/* White Keys */}
          {keys
            .filter((k) => !k.isBlack)
            .map((k) => {
              const isActive = activeNotes.has(k.midiNote);

              return (
                <button
                  key={k.midiNote}
                  type="button"
                  onContextMenu={(e) => e.preventDefault()}
                  onAuxClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onMouseDown={(e) => handleKeyMouseDown(e, k.midiNote)}
                  onMouseUp={(e) => handleKeyMouseUp(e, k.midiNote)}
                  onMouseEnter={(e) => handleKeyMouseEnter(e, k.midiNote)}
                  onMouseLeave={(e) => handleKeyMouseLeave(e, k.midiNote)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleKeyTouchStart(k.midiNote);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleKeyTouchEnd(k.midiNote);
                  }}
                  onTouchCancel={(e) => {
                    e.preventDefault();
                    handleKeyTouchEnd(k.midiNote);
                  }}
                  className={`w-[36px] h-full rounded-b-lg border-x border-b transition-all duration-75 flex flex-col justify-end items-center pb-2 relative z-10 ${
                    isActive
                      ? 'bg-amber-300 border-amber-500 shadow-[inset_0_-2px_10px_rgba(245,158,11,0.8)] translate-y-1'
                      : 'bg-gradient-to-b from-neutral-100 to-neutral-200 hover:from-white hover:to-neutral-100 border-neutral-400 shadow-[inset_0_-4px_6px_rgba(0,0,0,0.15)] active:translate-y-1'
                  }`}
                >
                  {showKeyLabels && k.keyBinding && (
                    <span className="text-[10px] font-mono font-extrabold text-neutral-800 bg-neutral-300/80 px-1 rounded shadow-xs mb-1 pointer-events-none">
                      {k.keyBinding}
                    </span>
                  )}
                  <span className="text-[9px] font-mono text-neutral-500 font-semibold leading-none pointer-events-none">
                    {k.noteName}
                  </span>
                </button>
              );
            })}

          {/* Black Keys */}
          {keys
            .filter((k) => k.isBlack)
            .map((k) => {
              const isActive = activeNotes.has(k.midiNote);

              const noteInOctave = k.midiNote % 12;
              const octaveIndex = Math.floor((k.midiNote - baseMidi) / 12);
              const whiteKeyWidth = 36;

              let blackKeyOffsetInOctave = 0;
              if (noteInOctave === 1) blackKeyOffsetInOctave = whiteKeyWidth * 1 - 12; // C#
              else if (noteInOctave === 3) blackKeyOffsetInOctave = whiteKeyWidth * 2 - 10; // D#
              else if (noteInOctave === 6) blackKeyOffsetInOctave = whiteKeyWidth * 4 - 13; // F#
              else if (noteInOctave === 8) blackKeyOffsetInOctave = whiteKeyWidth * 5 - 11; // G#
              else if (noteInOctave === 10) blackKeyOffsetInOctave = whiteKeyWidth * 6 - 9; // A#

              const leftPos = octaveIndex * (whiteKeyWidth * 7) + blackKeyOffsetInOctave;

              return (
                <button
                  key={k.midiNote}
                  type="button"
                  onContextMenu={(e) => e.preventDefault()}
                  onAuxClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleKeyMouseDown(e, k.midiNote);
                  }}
                  onMouseUp={(e) => {
                    e.stopPropagation();
                    handleKeyMouseUp(e, k.midiNote);
                  }}
                  onMouseEnter={(e) => handleKeyMouseEnter(e, k.midiNote)}
                  onMouseLeave={(e) => handleKeyMouseLeave(e, k.midiNote)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleKeyTouchStart(k.midiNote);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleKeyTouchEnd(k.midiNote);
                  }}
                  onTouchCancel={(e) => {
                    e.preventDefault();
                    handleKeyTouchEnd(k.midiNote);
                  }}
                  style={{ left: `${leftPos}px` }}
                  className={`w-[22px] h-[60%] rounded-b-md absolute top-0 z-20 transition-all duration-75 flex flex-col justify-end items-center pb-1 ${
                    isActive
                      ? 'bg-amber-500 border border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.8)] translate-y-0.5'
                      : 'bg-gradient-to-b from-neutral-900 to-neutral-950 hover:from-neutral-800 hover:to-neutral-900 border-x border-b border-neutral-950 shadow-[0_4px_6px_rgba(0,0,0,0.7)] active:translate-y-0.5'
                  }`}
                >
                  {showKeyLabels && k.keyBinding && (
                    <span className="text-[9px] font-mono font-bold text-neutral-300 bg-neutral-800 px-0.5 rounded leading-none mb-1 pointer-events-none">
                      {k.keyBinding}
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
};
