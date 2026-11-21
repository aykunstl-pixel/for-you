import React, { useRef } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Hand } from 'lucide-react';
import { Direction } from '../game/types';

interface TouchControlsProps {
  onDirectionChange: (dir: Direction | null) => void;
  onInteract: () => void;
  canInteract: boolean;
  interactLabel?: string;
}

export function TouchControls({
  onDirectionChange,
  onInteract,
  canInteract,
  interactLabel,
}: TouchControlsProps) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const activePointerId = useRef<number | null>(null);

  const computeDirFromPoint = (clientX: number, clientY: number): Direction | null => {
    const el = padRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    if (Math.hypot(dx, dy) < 12) return null;
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    }
    return dy > 0 ? 'down' : 'up';
  };

  const handlePadDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    activePointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    onDirectionChange(computeDirFromPoint(e.clientX, e.clientY));
  };

  const handlePadMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId) return;
    e.preventDefault();
    onDirectionChange(computeDirFromPoint(e.clientX, e.clientY));
  };

  const handlePadUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId) return;
    activePointerId.current = null;
    onDirectionChange(null);
  };

  return (
    <div className="pointer-events-none flex items-end justify-between w-full px-4 pb-3 pt-2 select-none">
      {/* Cozy Rounded Virtual D-Pad */}
      <div
        ref={padRef}
        onPointerDown={handlePadDown}
        onPointerMove={handlePadMove}
        onPointerUp={handlePadUp}
        onPointerCancel={handlePadUp}
        role="group"
        aria-label="Movement controls"
        className="pointer-events-auto relative w-[136px] h-[136px] touch-none"
      >
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-11 h-11 flex items-center justify-center bg-[#f9eff5]/92 border-2 border-[#8c6999] rounded-t-2xl text-[#52355c] shadow-sm active:bg-[#ebd9e8]">
          <ArrowUp className="w-5 h-5" />
        </div>
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-11 h-11 flex items-center justify-center bg-[#f9eff5]/92 border-2 border-[#8c6999] rounded-b-2xl text-[#52355c] shadow-sm active:bg-[#ebd9e8]">
          <ArrowDown className="w-5 h-5" />
        </div>
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-[#f9eff5]/92 border-2 border-[#8c6999] rounded-l-2xl text-[#52355c] shadow-sm active:bg-[#ebd9e8]">
          <ArrowLeft className="w-5 h-5" />
        </div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-[#f9eff5]/92 border-2 border-[#8c6999] rounded-r-2xl text-[#52355c] shadow-sm active:bg-[#ebd9e8]">
          <ArrowRight className="w-5 h-5" />
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 bg-[#f9eff5]/95 flex items-center justify-center">
          <div className="w-3.5 h-3.5 rounded-full bg-[#b58fb8]/55" />
        </div>
      </div>

      {/* Tactile Cozy Cherry-Blossom Interact Button */}
      <div className="pointer-events-auto flex flex-col items-end gap-1.5 pb-2">
        {canInteract && interactLabel && (
          <span className="text-xs font-semibold text-[#472c4f] bg-[#fff7fc]/95 border border-[#a37ca8] px-2.5 py-0.5 rounded-xl shadow-sm whitespace-nowrap">
            {interactLabel}
          </span>
        )}
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            onInteract();
          }}
          aria-label="Interact"
          className={`w-[72px] h-[72px] rounded-full border-[2.5px] flex flex-col items-center justify-center gap-0.5 transition-transform active:scale-95 cursor-pointer touch-none shadow-md ${
            canInteract
              ? 'bg-[#f0a5c2] border-[#fff7fb] text-[#452236] shadow-[0_0_22px_rgba(245,169,198,0.6)]'
              : 'bg-[#f9eff5]/92 border-[#8c6999] text-[#52355c]'
          }`}
        >
          <Hand className="w-4 h-4" />
          <span className="text-sm font-bold leading-none">A</span>
          <span className="text-[10px] font-semibold leading-none opacity-85">Inspect</span>
        </button>
      </div>
    </div>
  );
}
