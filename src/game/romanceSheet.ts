import { HerExpression, HimExpression, RomancePoseKind } from './types';

export const ROMANCE_SHEET_URL =
  '/assets/aistudio/Kawaii_Pixel_Romance_Sprite_Sheet_5c839dde.png';

export interface RomanceSpriteAtlas {
  poses: Record<RomancePoseKind, HTMLCanvasElement>;
  herPortraits: Record<HerExpression, HTMLCanvasElement>;
  himPortraits: Record<HimExpression, HTMLCanvasElement>;
  heartIcon: HTMLCanvasElement;
  envelopeIcon: HTMLCanvasElement;
}

interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ============================================================================
// EXACT MEASURED PANEL COORDINATES ON 1312 × 1199 ROMANCE SPRITE SHEET
// ============================================================================

const POSE_BOXES: Record<RomancePoseKind, CropBox> = {
  // Top Row, 2nd Panel: Him sitting cross-legged blushing while Meriem pats his curly hair
  pet_him: { x: 377, y: 9, w: 338, h: 396 },
  // Top Row, 3rd Panel: Meriem wraps arms around his neck, he holds her waist (bunny left, cat right)
  hug: { x: 725, y: 9, w: 277, h: 396 },
  // Top Row, 4th Panel: Meriem leans up on tiptoe kissing him, both blushing happily
  kiss: { x: 1013, y: 9, w: 289, h: 396 },
  // Middle Row, 1st Panel: Meriem holding pink heart-sealed envelope with both hands while he watches fondly
  read_letter: { x: 9, y: 415, w: 413, h: 379 },
  // Middle Row, 2nd Panel: Standing side-by-side holding hands looking out over starry skyline
  watch_stars: { x: 434, y: 415, w: 422, h: 379 },
  // Middle Row, 3rd Panel: He sits cross-legged, Meriem leans on his shoulder, bunny & cat asleep
  sit_cuddle: { x: 868, y: 415, w: 434, h: 379 },
};

// Bottom Expression Portraits Row (y: 818..1013)
// Meriem (5 left-side portraits):
// 1. Soft smile, 2. Beaming heart smile, 3. Blushing !, 4. Surprised ?, 5. Pouty swirl
const HER_PORTRAIT_BOXES: Record<HerExpression, CropBox> = {
  happy: { x: 7, y: 818, w: 147, h: 195 },
  sleepy: { x: 7, y: 818, w: 147, h: 195 },
  laugh: { x: 154, y: 818, w: 154, h: 195 },
  shy: { x: 304, y: 818, w: 150, h: 195 },
  surprised: { x: 453, y: 818, w: 136, h: 195 },
  annoyed: { x: 582, y: 818, w: 158, h: 195 },
};

// Ayoub (4 right-side portraits):
// 1. Calm smile, 2. Soft eyes-closed heart smile, 3. Annoyed vein, 4. Confused ?
const HIM_PORTRAIT_BOXES: Record<HimExpression, CropBox> = {
  confident: { x: 750, y: 818, w: 133, h: 195 },
  warm: { x: 882, y: 818, w: 144, h: 195 },
  nervous: { x: 1026, y: 818, w: 134, h: 195 },
  shocked: { x: 1026, y: 818, w: 134, h: 195 },
  sideglance: { x: 1168, y: 818, w: 135, h: 195 },
};

// Bottom-row icons (envelope & pixel heart)
const ENVELOPE_BOX: CropBox = { x: 386, y: 1052, w: 70, h: 68 };
const HEART_BOX: CropBox = { x: 482, y: 1052, w: 66, h: 68 };

// ============================================================================
// SURGICAL PLUM-PURPLE CHROMA-KEY & BORDER FLOOD-FILL
// ============================================================================

/**
 * Matches the solid dark plum-purple background of Kawaii_Pixel_Romance_Sprite_Sheet
 * (gently graded ~rgb(63,42,84) at top to rgb(84,56,106) at bottom).
 * Strictly protects dark hair, black outfits, and the black cat (which have b - r <= 10).
 */
function isPlumBg(r: number, g: number, b: number): boolean {
  return (
    b >= r + 11 &&
    b - g >= 28 &&
    r - g >= 13 &&
    r >= 46 &&
    r <= 116 &&
    g >= 28 &&
    g <= 84 &&
    b >= 66 &&
    b <= 132
  );
}

/**
 * Matches the muted magenta-plum ground shadow ellipse under the characters' feet
 * in the bottom ~20% of pose panels (~rgb(112..142, 54..78, 96..124)).
 */
function isGroundOval(r: number, g: number, b: number): boolean {
  return (
    r >= 94 &&
    r <= 146 &&
    g >= 48 &&
    g <= 82 &&
    b >= 88 &&
    b <= 128 &&
    r - g >= 34 &&
    b - g >= 30 &&
    Math.abs(r - b) <= 28
  );
}

function trimTransparentBounds(src: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = src.getContext('2d', { willReadFrequently: true })!;
  const { data, width: w, height: h } = ctx.getImageData(0, 0, src.width, src.height);

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return src;

  const tw = maxX - minX + 1;
  const th = maxY - minY + 1;
  const out = document.createElement('canvas');
  out.width = tw;
  out.height = th;
  const octx = out.getContext('2d')!;
  octx.imageSmoothingEnabled = false;
  octx.drawImage(src, minX, minY, tw, th, 0, 0, tw, th);
  return out;
}

function extractTransparentPanel(
  sheet: HTMLCanvasElement,
  box: CropBox,
  options?: { removeGroundOval?: boolean; clearInteriorBg?: boolean }
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = box.w;
  canvas.height = box.h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);

  const imgData = ctx.getImageData(0, 0, box.w, box.h);
  const { data, width: w, height: h } = imgData;

  const bgMask = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  const groundStartY = Math.floor(h * 0.78);

  const canFill = (x: number, y: number): boolean => {
    const i = (y * w + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (isPlumBg(r, g, b)) return true;
    if (options?.removeGroundOval && y >= groundStartY && isGroundOval(r, g, b)) {
      return true;
    }
    return false;
  };

  const enqueue = (x: number, y: number) => {
    const p = y * w + x;
    if (bgMask[p]) return;
    if (canFill(x, y)) {
      bgMask[p] = 1;
      queue[tail++] = p;
    }
  };

  // Seed flood-fill from all 4 outer edges
  for (let x = 0; x < w; x++) {
    enqueue(x, 0);
    enqueue(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    enqueue(0, y);
    enqueue(w - 1, y);
  }

  // 4-neighbor BFS across exterior background
  while (head < tail) {
    const cur = queue[head++];
    const cx = cur % w;
    const cy = (cur - cx) / w;
    if (cx > 0) enqueue(cx - 1, cy);
    if (cx < w - 1) enqueue(cx + 1, cy);
    if (cy > 0) enqueue(cx, cy - 1);
    if (cy < h - 1) enqueue(cx, cy + 1);
  }

  // Clear interior background pockets (e.g., gap between Meriem & Ayoub's arms/legs)
  if (options?.clearInteriorBg) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (bgMask[p]) continue;
        const i = p * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // Strict interior plum match so dark outlines/clothes/cat stay 100% intact
        if (
          b >= r + 15 &&
          b - g >= 34 &&
          r - g >= 16 &&
          r >= 54 &&
          r <= 104 &&
          g >= 34 &&
          g <= 72 &&
          b >= 74 &&
          b <= 122
        ) {
          bgMask[p] = 1;
        }
      }
    }
  }

  // Soft 1-pixel anti-halo edge cleanup along transparent boundary
  const fringe = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      if (bgMask[p]) continue;
      if (bgMask[p - 1] || bgMask[p + 1] || bgMask[p - w] || bgMask[p + w]) {
        const i = p * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (
          (b >= r + 8 && b - g >= 22 && r < 126 && g < 92 && b < 140) ||
          (options?.removeGroundOval && y >= groundStartY && isGroundOval(r, g, b))
        ) {
          fringe[p] = 1;
        }
      }
    }
  }

  for (let p = 0; p < w * h; p++) {
    if (bgMask[p]) {
      data[p * 4 + 3] = 0;
    } else if (fringe[p]) {
      data[p * 4 + 3] = 0;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return trimTransparentBounds(canvas);
}

function framePortraitSquare(
  trimmed: HTMLCanvasElement,
  size = 160
): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = size;
  out.height = size;
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const padX = 6;
  const padTop = 8;
  const availW = size - padX * 2;
  const availH = size - padTop;
  const scale = Math.min(availW / trimmed.width, availH / trimmed.height);
  const dw = Math.round(trimmed.width * scale);
  const dh = Math.round(trimmed.height * scale);
  const dx = Math.round((size - dw) / 2);
  const dy = size - dh;
  ctx.drawImage(trimmed, 0, 0, trimmed.width, trimmed.height, dx, dy, dw, dh);
  return out;
}

function buildRomanceAtlas(img: HTMLImageElement): RomanceSpriteAtlas {
  const sheetCanvas = document.createElement('canvas');
  sheetCanvas.width = img.naturalWidth || img.width;
  sheetCanvas.height = img.naturalHeight || img.height;
  const sctx = sheetCanvas.getContext('2d', { willReadFrequently: true })!;
  sctx.imageSmoothingEnabled = false;
  sctx.drawImage(img, 0, 0);

  // 1. Extract all 6 interactive romance pose panels with clean transparency
  const poses = {} as Record<RomancePoseKind, HTMLCanvasElement>;
  (Object.keys(POSE_BOXES) as RomancePoseKind[]).forEach((kind) => {
    poses[kind] = extractTransparentPanel(sheetCanvas, POSE_BOXES[kind], {
      removeGroundOval: true,
      clearInteriorBg: true,
    });
  });

  // 2. Extract Meriem's 5 updated expression portraits
  const herPortraits = {} as Record<HerExpression, HTMLCanvasElement>;
  (Object.keys(HER_PORTRAIT_BOXES) as HerExpression[]).forEach((expr) => {
    const clean = extractTransparentPanel(sheetCanvas, HER_PORTRAIT_BOXES[expr], {
      clearInteriorBg: true,
    });
    herPortraits[expr] = framePortraitSquare(clean, 160);
  });

  // 3. Extract Ayoub's 4 updated expression portraits
  const himPortraits = {} as Record<HimExpression, HTMLCanvasElement>;
  (Object.keys(HIM_PORTRAIT_BOXES) as HimExpression[]).forEach((expr) => {
    const clean = extractTransparentPanel(sheetCanvas, HIM_PORTRAIT_BOXES[expr], {
      clearInteriorBg: true,
    });
    himPortraits[expr] = framePortraitSquare(clean, 160);
  });

  // 4. Extract bottom-row icons
  const heartIcon = extractTransparentPanel(sheetCanvas, HEART_BOX);
  const envelopeIcon = extractTransparentPanel(sheetCanvas, ENVELOPE_BOX);

  return {
    poses,
    herPortraits,
    himPortraits,
    heartIcon,
    envelopeIcon,
  };
}

// ============================================================================
// SINGLETON ASYNC LOADER WITH SUBSCRIPTION NOTIFICATIONS
// ============================================================================

let cachedRomanceAtlas: RomanceSpriteAtlas | null = null;
let loadStarted = false;
const listeners = new Set<() => void>();

export function preloadRomanceSheet(): void {
  if (loadStarted || typeof window === 'undefined') return;
  loadStarted = true;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    cachedRomanceAtlas = buildRomanceAtlas(img);
    for (const cb of listeners) {
      cb();
    }
  };
  img.src = ROMANCE_SHEET_URL;
}

export function getRomanceSpriteSheet(): RomanceSpriteAtlas | null {
  if (!loadStarted && typeof window !== 'undefined') {
    preloadRomanceSheet();
  }
  return cachedRomanceAtlas;
}

export function subscribeRomanceSheet(listener: () => void): () => void {
  if (!loadStarted && typeof window !== 'undefined') {
    preloadRomanceSheet();
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

if (typeof window !== 'undefined') {
  preloadRomanceSheet();
}
