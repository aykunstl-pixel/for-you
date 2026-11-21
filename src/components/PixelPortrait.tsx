import { useEffect, useRef, useState } from 'react';
import { getRomanceSpriteSheet, subscribeRomanceSheet } from '../game/romanceSheet';
import { getSpriteAtlas } from '../game/sprites';
import { getHumanSpriteSheet, subscribeSpriteSheet } from '../game/spriteSheet';
import { HerExpression, HimExpression } from '../game/types';

interface PixelPortraitProps {
  kind:
    | 'her'
    | 'him'
    | 'brass_key'
    | 'hud_avatar'
    | 'hud_heart_full'
    | 'hud_heart_empty';
  herExpression?: HerExpression;
  himExpression?: HimExpression;
  size?: number;
  className?: string;
  alt: string;
}

export function PixelPortrait({
  kind,
  herExpression = 'happy',
  himExpression = 'confident',
  size = 80,
  className = '',
  alt,
}: PixelPortraitProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [sheetVersion, setSheetVersion] = useState(0);

  useEffect(() => {
    if (kind === 'brass_key') return;
    const unsubs: Array<() => void> = [];
    if (!getHumanSpriteSheet()) {
      unsubs.push(subscribeSpriteSheet(() => setSheetVersion((v) => v + 1)));
    }
    if ((kind === 'her' || kind === 'him') && !getRomanceSpriteSheet()) {
      unsubs.push(subscribeRomanceSheet(() => setSheetVersion((v) => v + 1)));
    }
    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, [kind]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (kind === 'brass_key') {
      const src = getSpriteAtlas().brassKey;
      canvas.width = src.width;
      canvas.height = src.height;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, src.width, src.height);
      ctx.drawImage(src, 0, 0);
      return;
    }

    const romance = getRomanceSpriteSheet();
    const sheet = getHumanSpriteSheet();

    let src: HTMLCanvasElement | null = null;
    if (kind === 'her') {
      src =
        romance?.herPortraits[herExpression] ??
        romance?.herPortraits.happy ??
        sheet?.herPortraits[herExpression] ??
        sheet?.herPortraits.happy ??
        null;
    } else if (kind === 'him') {
      src =
        romance?.himPortraits[himExpression] ??
        romance?.himPortraits.confident ??
        sheet?.himPortraits[himExpression] ??
        sheet?.himPortraits.confident ??
        null;
    } else if (sheet) {
      if (kind === 'hud_avatar') {
        src = sheet.hudAvatar;
      } else if (kind === 'hud_heart_full') {
        src = sheet.hudHeartFull;
      } else {
        src = sheet.hudHeartEmpty;
      }
    }

    if (!src) {
      canvas.width = 48;
      canvas.height = 48;
      ctx.clearRect(0, 0, 48, 48);
      return;
    }

    canvas.width = src.width;
    canvas.height = src.height;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, src.width, src.height);
    ctx.drawImage(src, 0, 0);
  }, [kind, herExpression, himExpression, sheetVersion]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={alt}
      style={{ width: size, height: size }}
      className={`pixelated block shrink-0 ${className}`}
    />
  );
}
