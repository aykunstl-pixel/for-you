import { useCallback, useEffect, useState } from 'react';
import { Delete, Lock, Unlock, X } from 'lucide-react';
import { soundEngine } from '../game/audio';
import { OVERLOOK_PASSCODE } from '../game/worldMap';

interface KeypadModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

export function KeypadModal({ onSuccess, onClose }: KeypadModalProps) {
  const [digits, setDigits] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'error' | 'unlocked'>('idle');

  const evaluateCode = useCallback(
    (code: string) => {
      if (code === OVERLOOK_PASSCODE) {
        setStatus('unlocked');
        soundEngine.playDoorUnlock();
        window.setTimeout(() => {
          onSuccess();
        }, 720);
      } else {
        setStatus('error');
        soundEngine.playKeypadError();
        window.setTimeout(() => {
          setDigits('');
          setStatus('idle');
        }, 560);
      }
    },
    [onSuccess]
  );

  const pressDigit = useCallback(
    (d: string) => {
      if (status !== 'idle') return;
      soundEngine.playKeypadDigit(Number(d));
      setDigits((prev) => {
        if (prev.length >= 4) return prev;
        const next = prev + d;
        if (next.length === 4) {
          window.setTimeout(() => evaluateCode(next), 120);
        }
        return next;
      });
    },
    [status, evaluateCode]
  );

  const pressBackspace = useCallback(() => {
    if (status !== 'idle') return;
    soundEngine.playKeypadDigit(0);
    setDigits((prev) => prev.slice(0, -1));
  }, [status]);

  const pressClear = useCallback(() => {
    if (status !== 'idle') return;
    soundEngine.playKeypadDigit(0);
    setDigits('');
  }, [status]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        pressDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        pressBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pressDigit, pressBackspace, onClose]);

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#161229]/68 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Starry Overlook Gate Keypad"
        onClick={(e) => e.stopPropagation()}
        className={`animate-dialogue-enter cozy-pixel-parchment relative w-full max-w-[324px] rounded-2xl p-5 ${
          status === 'error' ? 'animate-keypad-shake' : ''
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            {status === 'unlocked' ? (
              <Unlock className="w-4 h-4 text-[#42946d]" />
            ) : (
              <Lock className="w-4 h-4 text-[#6d4b7d]" />
            )}
            <h2 className="font-pixel text-base font-bold text-[#4a2f54]">
              Shrine Archway Gate
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close keypad"
            className="w-8 h-8 flex items-center justify-center rounded-xl text-[#7d5885] hover:text-[#3d2345] hover:bg-[#ecdce8] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          className={`mb-4 rounded-xl border-2 px-3 py-3 transition-colors ${
            status === 'unlocked'
              ? 'bg-[#e6f5ec] border-[#6cb890]'
              : status === 'error'
                ? 'bg-[#fae8e8] border-[#d98484]'
                : 'bg-[#f0e2ec] border-[#b68fb8]'
          }`}
        >
          <div className="grid grid-cols-4 gap-2 text-center font-keypad">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`h-11 flex items-center justify-center rounded-lg border text-2xl font-bold ${
                  status === 'unlocked'
                    ? 'border-[#6cb890]/50 text-[#2e7853] bg-[#f5fcf8]'
                    : status === 'error'
                      ? 'border-[#d98484]/50 text-[#b54848] bg-[#fff5f5]'
                      : digits[idx]
                        ? 'border-[#966ca3] text-[#4a2f54] bg-[#fffafd]'
                        : 'border-[#cfb4cf] text-[#b395b8] bg-[#f7edf5]'
                }`}
              >
                {digits[idx] ?? '·'}
              </div>
            ))}
          </div>
          <div className="mt-2 text-center text-xs font-semibold min-h-[16px]">
            {status === 'unlocked' ? (
              <span className="text-[#2e7853]">Archway Unlocked · Welcome</span>
            ) : status === 'error' ? (
              <span className="text-[#b54848]">Wrong passcode · Try again</span>
            ) : (
              <span className="text-[#785380]">Enter 4-digit gate code</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 font-keypad">
          {keys.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => pressDigit(k)}
              disabled={status !== 'idle'}
              className="h-12 text-lg font-bold text-[#452b4f] bg-[#fff9fc] hover:bg-[#f2e2ee] active:translate-y-[1px] border-2 border-[#a882b0] rounded-xl shadow-[0_2px_0_#a882b0] transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[#754d7a]"
            >
              {k}
            </button>
          ))}

          <button
            type="button"
            onClick={pressClear}
            disabled={status !== 'idle'}
            className="h-12 text-xs font-pixel font-bold text-[#664370] bg-[#eedee8] hover:bg-[#e5cfe0] active:translate-y-[1px] border-2 border-[#a882b0] rounded-xl transition-colors cursor-pointer disabled:opacity-60"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => pressDigit('0')}
            disabled={status !== 'idle'}
            className="h-12 text-lg font-bold text-[#452b4f] bg-[#fff9fc] hover:bg-[#f2e2ee] active:translate-y-[1px] border-2 border-[#a882b0] rounded-xl shadow-[0_2px_0_#a882b0] transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[#754d7a]"
          >
            0
          </button>

          <button
            type="button"
            onClick={pressBackspace}
            disabled={status !== 'idle'}
            aria-label="Backspace"
            className="h-12 flex items-center justify-center text-[#664370] bg-[#eedee8] hover:bg-[#e5cfe0] active:translate-y-[1px] border-2 border-[#a882b0] rounded-xl transition-colors cursor-pointer disabled:opacity-60"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
