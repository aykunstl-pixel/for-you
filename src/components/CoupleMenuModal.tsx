import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { soundEngine } from '../game/audio';
import { CoupleActionKind } from '../game/types';
import { PixelPortrait } from './PixelPortrait';

interface CoupleMenuModalProps {
  onSelect: (action: CoupleActionKind) => void;
  onClose: () => void;
}

interface MenuOption {
  id: CoupleActionKind;
  emoji: string;
  label: string;
  hint: string;
}

const COUPLE_OPTIONS: MenuOption[] = [
  {
    id: 'hug',
    emoji: '🤗',
    label: 'Hug',
    hint: 'Wrap him in the tightest hug',
  },
  {
    id: 'kiss',
    emoji: '💋',
    label: 'Kiss',
    hint: 'Lean up on tiptoe for a kiss',
  },
  {
    id: 'pet_him',
    emoji: '✨',
    label: 'Pet Him',
    hint: 'Pat his curly hair while he blushes',
  },
  {
    id: 'sit_cuddle',
    emoji: '💞',
    label: 'Sit Together',
    hint: 'Lean on his shoulder & cuddle',
  },
  {
    id: 'watch_stars',
    emoji: '🌃',
    label: 'Watch the Stars',
    hint: 'Hold hands overlooking the city',
  },
  {
    id: 'read_letter',
    emoji: '💌',
    label: 'Read Letter',
    hint: 'Open his pink-sealed love letter',
  },
];

export function CoupleMenuModal({ onSelect, onClose }: CoupleMenuModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'arrowup' || key === 'w') {
        e.preventDefault();
        soundEngine.playKeypadDigit(2);
        setSelectedIndex(
          (prev) => (prev - 2 + COUPLE_OPTIONS.length) % COUPLE_OPTIONS.length
        );
      } else if (key === 'arrowdown' || key === 's') {
        e.preventDefault();
        soundEngine.playKeypadDigit(3);
        setSelectedIndex((prev) => (prev + 2) % COUPLE_OPTIONS.length);
      } else if (key === 'arrowleft' || key === 'a') {
        e.preventDefault();
        soundEngine.playKeypadDigit(2);
        setSelectedIndex(
          (prev) => (prev - 1 + COUPLE_OPTIONS.length) % COUPLE_OPTIONS.length
        );
      } else if (key === 'arrowright' || key === 'd') {
        e.preventDefault();
        soundEngine.playKeypadDigit(3);
        setSelectedIndex((prev) => (prev + 1) % COUPLE_OPTIONS.length);
      } else if (e.key === 'Enter' || e.key === ' ' || key === 'e') {
        e.preventDefault();
        onSelect(COUPLE_OPTIONS[selectedIndex].id);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        soundEngine.playInteract();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, onSelect, selectedIndex]);

  return (
    <div
      className="pointer-events-auto w-full max-w-[430px] mx-auto px-3 sm:px-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        role="dialog"
        aria-label="Choose what to do with Ayoub"
        className="animate-dialogue-enter cozy-pixel-parchment-twilight !bg-[#fff6fa]/92 backdrop-blur-[3px] relative rounded-2xl p-3 sm:p-3.5"
      >
        <div className="flex items-center justify-between gap-2.5 mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl overflow-hidden border-2 border-[#754d7a] bg-gradient-to-b from-[#493463] to-[#302145] shadow-sm">
              <PixelPortrait
                kind="him"
                himExpression="warm"
                size={40}
                alt="Ayoub smiling"
              />
            </div>
            <div>
              <h3 className="font-pixel text-sm sm:text-[15.5px] font-bold text-[#4a2f54] leading-tight">
                Ayoub
              </h3>
              <p className="font-pixel text-[11px] text-[#785380]">
                He&apos;s smiling warmly at you under the stars...
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playInteract();
              onClose();
            }}
            aria-label="Close choice menu"
            className="w-7 h-7 flex items-center justify-center rounded-xl text-[#7d5885] hover:text-[#3d2345] hover:bg-[#ecdce8] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          {COUPLE_OPTIONS.map((opt, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={opt.id}
                type="button"
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => onSelect(opt.id)}
                className={`group flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-xl border-2 text-left transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[#754d7a] ${
                  isSelected
                    ? 'bg-[#f7dce9] border-[#8c5280] text-[#3d2140] shadow-[0_2px_0_#75426b] -translate-y-[1px]'
                    : 'bg-[#fff9fc] border-[#c4a1c7] text-[#4e3157] hover:bg-[#f7e7f0]'
                }`}
              >
                <span className="text-base leading-none shrink-0" aria-hidden="true">
                  {opt.emoji}
                </span>
                <div className="min-w-0">
                  <div className="font-pixel text-xs sm:text-sm font-bold leading-tight whitespace-nowrap">
                    {opt.label}
                  </div>
                  <div className="font-pixel text-[10.5px] text-[#7a567d] truncate">
                    {opt.hint}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
