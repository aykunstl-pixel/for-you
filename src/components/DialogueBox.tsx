import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import { soundEngine } from '../game/audio';
import { DialoguePayload } from '../game/types';
import { PixelPortrait } from './PixelPortrait';

interface DialogueBoxProps {
  dialogue: DialoguePayload;
  onClose: () => void;
  onPlayAgain?: () => void;
  onStayOnOverlook?: () => void;
}

export function DialogueBox({
  dialogue,
  onClose,
  onPlayAgain,
  onStayOnOverlook,
}: DialogueBoxProps) {
  const [visibleChars, setVisibleChars] = useState(0);
  const fullText = dialogue.text;
  const isComplete = visibleChars >= fullText.length;
  const blipCounter = useRef(0);

  useEffect(() => {
    setVisibleChars(0);
    blipCounter.current = 0;
  }, [dialogue]);

  useEffect(() => {
    if (isComplete) return;
    const speedMs = dialogue.isEnding ? 24 : 18;
    const timer = window.setInterval(() => {
      setVisibleChars((prev) => {
        const next = Math.min(fullText.length, prev + 1);
        blipCounter.current++;
        const ch = fullText[next - 1];
        if (ch && ch !== ' ' && blipCounter.current % 3 === 0) {
          const pitch =
            dialogue.portrait === 'him' || dialogue.isEnding
              ? 'him'
              : dialogue.portrait === 'her'
                ? 'her'
                : 'narrator';
          soundEngine.playTextBlip(pitch);
        }
        return next;
      });
    }, speedMs);

    return () => window.clearInterval(timer);
  }, [fullText, isComplete, dialogue.isEnding, dialogue.portrait]);

  const handleAdvance = () => {
    if (!isComplete) {
      setVisibleChars(fullText.length);
      return;
    }
    if (!dialogue.isEnding) {
      soundEngine.playInteract();
      onClose();
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        if (!isComplete) {
          setVisibleChars(fullText.length);
        } else if (!dialogue.isEnding) {
          soundEngine.playInteract();
          onClose();
        }
      } else if (e.key === 'Escape' && !dialogue.isEnding) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isComplete, fullText.length, dialogue.isEnding, onClose]);

  const displayedText = fullText.slice(0, visibleChars);
  const herExpr = dialogue.herExpression ?? (dialogue.isEnding ? 'laugh' : 'happy');
  const himExpr = dialogue.himExpression ?? (dialogue.isEnding ? 'warm' : 'confident');

  const isCompact = Boolean(dialogue.compact && !dialogue.isEnding);

  return (
    <div
      key={dialogue.text}
      className={`animate-dialogue-enter pointer-events-auto w-full ${
        dialogue.isEnding
          ? 'max-w-[660px]'
          : isCompact
            ? 'max-w-[600px]'
            : 'max-w-[640px]'
      } mx-auto px-3 sm:px-5`}
    >
      <div
        role="dialog"
        aria-live="polite"
        onClick={handleAdvance}
        className={`relative rounded-2xl cursor-pointer transition-transform ${
          isCompact ? 'p-3 sm:p-3.5 backdrop-blur-[3px]' : 'p-4 sm:p-5'
        } ${
          dialogue.isEnding
            ? 'cozy-pixel-parchment-twilight'
            : isCompact
              ? 'cozy-pixel-parchment !bg-[#fff8f5]/92'
              : 'cozy-pixel-parchment'
        }`}
      >
        {dialogue.portrait === 'both' && !isCompact ? (
          /* Side-by-Side Portraits ABOVE the Final Love Letter */
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-center gap-4 sm:gap-6">
              <div className="flex flex-col items-center gap-1">
                <div className="rounded-xl overflow-hidden border-[2.5px] border-[#754d7a] bg-gradient-to-b from-[#5a3d6e] to-[#422c54] shadow-sm">
                  <PixelPortrait
                    kind="her"
                    herExpression={herExpr}
                    size={76}
                    alt="Meriem pixel art portrait"
                    className="sm:w-[84px] sm:h-[84px]"
                  />
                </div>
                <span className="font-pixel text-[11px] sm:text-xs font-bold text-[#4e3157] tracking-wide">
                  Meriem
                </span>
              </div>

              <div className="flex flex-col items-center gap-1">
                <div className="rounded-xl overflow-hidden border-[2.5px] border-[#754d7a] bg-gradient-to-b from-[#493463] to-[#302145] shadow-sm">
                  <PixelPortrait
                    kind="him"
                    himExpression={himExpr}
                    size={76}
                    alt="Ayoub pixel art portrait"
                    className="sm:w-[84px] sm:h-[84px]"
                  />
                </div>
                <span className="font-pixel text-[11px] sm:text-xs font-bold text-[#4e3157] tracking-wide">
                  Ayoub
                </span>
              </div>
            </div>

            <div className="w-full text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-between gap-2 mb-1">
                <span className="font-pixel text-base sm:text-[17px] font-bold text-[#4e3157] tracking-wide">
                  {dialogue.speaker}
                </span>
              </div>

              <p className="font-pixel text-[16px] sm:text-[18px] leading-[1.55] text-[#3a263d] whitespace-pre-line">
                {displayedText}
                {!isComplete && (
                  <span className="inline-block w-2 h-4 ml-1 bg-[#c77294] align-middle animate-pulse" />
                )}
              </p>

              {dialogue.isEnding &&
                (isComplete ? (
                  <div
                    className="mt-4 pt-3 border-t border-[#cca7bd]/55 flex flex-wrap items-center justify-between gap-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-xs sm:text-sm font-semibold text-[#754e6c]">
                      10/02 · Starry City Terrace
                    </span>
                    <div className="flex items-center gap-2.5">
                      {onStayOnOverlook && (
                        <button
                          type="button"
                          onClick={onStayOnOverlook}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#54345c] bg-[#f2dce8] hover:bg-[#ead0df] border-2 border-[#b584a8] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#754d7a]"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#c7698e]" />
                          <span>Keep Hanging Out</span>
                        </button>
                      )}
                      {onPlayAgain && (
                        <button
                          type="button"
                          onClick={onPlayAgain}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-[#fff9fb] bg-[#6c4678] hover:bg-[#593863] rounded-xl shadow-[0_2px_0_#3f254a] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#c77294]"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Replay</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2.5 flex justify-end">
                    <span className="text-xs font-medium text-[#825978]">
                      Tap or press Space to read all
                    </span>
                  </div>
                ))}
            </div>
          </div>
        ) : dialogue.portrait === 'both' && isCompact ? (
          /* Compact Horizontal Dual-Portrait Banner (Hug / Kiss / Pet Him — keeps characters 100% visible above!) */
          <div className="relative flex items-center gap-3 sm:gap-3.5">
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="rounded-xl overflow-hidden border-2 border-[#754d7a] bg-gradient-to-b from-[#5a3d6e] to-[#422c54] shadow-sm">
                <PixelPortrait
                  kind="her"
                  herExpression={herExpr}
                  size={56}
                  alt="Meriem pixel art portrait"
                  className="sm:w-[64px] sm:h-[64px]"
                />
              </div>
              <div className="rounded-xl overflow-hidden border-2 border-[#754d7a] bg-gradient-to-b from-[#493463] to-[#302145] shadow-sm">
                <PixelPortrait
                  kind="him"
                  himExpression={himExpr}
                  size={56}
                  alt="Ayoub pixel art portrait"
                  className="sm:w-[64px] sm:h-[64px]"
                />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="font-pixel text-sm sm:text-[15px] font-bold text-[#4e3157] tracking-wide">
                  {dialogue.speaker}
                </span>
                <span className="text-[11px] font-semibold text-[#754e7a] shrink-0">
                  {isComplete ? 'Continue ▼' : 'Skip'}
                </span>
              </div>
              <p className="font-pixel text-[14px] sm:text-[15.5px] leading-[1.45] text-[#3a263d] whitespace-pre-line">
                {displayedText}
                {!isComplete && (
                  <span className="inline-block w-2 h-3.5 ml-1 bg-[#c77294] align-middle animate-pulse" />
                )}
              </p>
            </div>
          </div>
        ) : (
          /* Standard / Compact Single-Portrait Cozy Twilight-Parchment Dialogue Box */
          <div className="relative flex flex-row items-center sm:items-start gap-3 sm:gap-4">
            {dialogue.portrait !== 'none' && (
              <div className="shrink-0">
                <div
                  className={`rounded-xl overflow-hidden border-[2.5px] border-[#664978] shadow-sm ${
                    dialogue.portrait === 'her'
                      ? 'bg-gradient-to-b from-[#5a3d6e] to-[#422c54]'
                      : 'bg-gradient-to-b from-[#493463] to-[#302145]'
                  }`}
                >
                  <PixelPortrait
                    kind={dialogue.portrait === 'him' ? 'him' : 'her'}
                    herExpression={herExpr}
                    himExpression={himExpr}
                    size={isCompact ? 60 : 78}
                    alt={
                      dialogue.portrait === 'her'
                        ? 'Meriem pixel art portrait'
                        : 'Ayoub pixel art portrait'
                    }
                    className={isCompact ? 'sm:w-[68px] sm:h-[68px]' : 'sm:w-[88px] sm:h-[88px]'}
                  />
                </div>
              </div>
            )}

            <div className="flex-1 min-w-0 w-full">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <span className="font-pixel text-sm sm:text-[16px] font-bold text-[#4e3157] tracking-wide">
                  {dialogue.speaker}
                </span>
                {dialogue.itemIcon === 'brass_key' && (
                  <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#8a5728]">
                    <PixelPortrait kind="brass_key" size={16} alt="Brass Key" />
                    <span>Brass Key Obtained</span>
                  </span>
                )}
              </div>

              <p
                className={`font-pixel ${
                  isCompact ? 'text-[14px] sm:text-[15.5px] leading-[1.45]' : 'text-[15px] sm:text-[16.5px] leading-[1.55]'
                } text-[#3a263d] whitespace-pre-line`}
              >
                {displayedText}
                {!isComplete && (
                  <span className="inline-block w-2 h-4 ml-1 bg-[#c77294] align-middle animate-pulse" />
                )}
              </p>

              <div className="mt-1.5 flex items-center justify-end gap-1.5 text-xs font-semibold text-[#754e7a]">
                <span>{isComplete ? 'Continue' : 'Skip'}</span>
                <span
                  aria-hidden="true"
                  className={isComplete ? 'animate-soft-bob inline-block' : ''}
                >
                  ▼
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
