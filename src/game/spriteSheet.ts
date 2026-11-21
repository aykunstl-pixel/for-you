import { Direction, HerExpression, HimExpression } from './types';

export const SPRITE_SHEET_URL =
  '/assets/aistudio/Pastel_Cherry_Blossom_RPG_World_e4eb964a.png';

export interface ArtBoardSpriteAtlas {
  // Portraits (large square defaults + bottom-row dynamic expressions)
  herPortraits: Record<HerExpression, HTMLCanvasElement>;
  himPortraits: Record<HimExpression, HTMLCanvasElement>;

  // Overworld character walk & idle animations
  herIdle: Record<Direction, HTMLCanvasElement[]>;
  herWalk: Record<Direction, HTMLCanvasElement[]>;
  himIdle: Record<Direction, HTMLCanvasElement[]>;
  himWalk: Record<Direction, HTMLCanvasElement[]>;
  himWave: HTMLCanvasElement[];

  // Extracted pet sprites (White Bunny & Black Cat)
  bunnyIdleFront: HTMLCanvasElement;
  bunnyAlert: HTMLCanvasElement;
  bunnyHopRight: HTMLCanvasElement[];
  bunnyHopLeft: HTMLCanvasElement[];
  bunnySleep: HTMLCanvasElement;

  catSitFront: HTMLCanvasElement;
  catSitSide: HTMLCanvasElement;
  catWalk: HTMLCanvasElement;
  catCurled: HTMLCanvasElement;

  // Extracted world props (Bottom-Right)
  cherryTree: HTMLCanvasElement;
  streetlamp: HTMLCanvasElement;
  benchWithPlants: HTMLCanvasElement;
  benchClean: HTMLCanvasElement;
  flowerBush1: HTMLCanvasElement;
  flowerBush2: HTMLCanvasElement;
  flowerBush3: HTMLCanvasElement;
  whitePicketFence: HTMLCanvasElement;

  // Extracted HUD & effect icons
  hudAvatar: HTMLCanvasElement;
  hudHeartFull: HTMLCanvasElement;
  hudHeartEmpty: HTMLCanvasElement;
  pixelSparkle: HTMLCanvasElement;
}

interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ============================================================================
// EXACT MEASURED COORDINATES ON 1672 × 941 ART BOARD
// ============================================================================

// Bottom-Left Row 1: Large square portraits (cropped cleanly inside their rounded frames)
const HER_MAIN_PORTRAIT_BOX: CropBox = { x: 13, y: 684, w: 125, h: 131 };
const HIM_MAIN_PORTRAIT_BOX: CropBox = { x: 149, y: 684, w: 125, h: 131 };

// Bottom Row: Smaller dynamic expression portraits
// Meriem (6 expressions left-to-right): calm/sleepy, cheerful, blush, pout/annoyed, surprised (!), happy heart (♥)
const HER_EXPR_BOXES: Record<HerExpression, CropBox> = {
  happy: HER_MAIN_PORTRAIT_BOX,
  sleepy: { x: 8, y: 830, w: 88, h: 106 },
  shy: { x: 185, y: 830, w: 89, h: 106 },
  annoyed: { x: 274, y: 830, w: 83, h: 106 },
  surprised: { x: 358, y: 830, w: 90, h: 106 },
  laugh: { x: 448, y: 830, w: 104, h: 106 },
};

// Ayoub (large square + 5 bottom-row expressions: !, ?, !, warm, ?)
const HIM_EXPR_BOXES: Record<HimExpression, CropBox> = {
  confident: HIM_MAIN_PORTRAIT_BOX,
  shocked: { x: 576, y: 828, w: 93, h: 108 },
  sideglance: { x: 672, y: 828, w: 95, h: 108 },
  nervous: { x: 770, y: 828, w: 84, h: 108 },
  warm: { x: 856, y: 828, w: 84, h: 108 },
};

// Bottom-Middle Row 1: Meriem's 5-frame white-dress walking/turning sprites
const HER_WALK_FRAMES: CropBox[] = [
  { x: 298, y: 685, w: 66, h: 133 }, // 0: Front standing / step A
  { x: 365, y: 685, w: 66, h: 133 }, // 1: Front step B
  { x: 433, y: 685, w: 64, h: 133 }, // 2: Side-right stride A
  { x: 500, y: 685, w: 64, h: 133 }, // 3: Side-right stride B
  { x: 568, y: 685, w: 60, h: 133 }, // 4: Back-facing (up)
];

// Bottom-Middle Row 1: Ayoub's 5-frame all-black walking sprites (facing right)
const HIM_WALK_FRAMES: CropBox[] = [
  { x: 641, y: 685, w: 65, h: 133 }, // 0: Standing/stride 1
  { x: 707, y: 685, w: 62, h: 133 }, // 1: Stride 2
  { x: 772, y: 685, w: 64, h: 133 }, // 2: Stride 3
  { x: 839, y: 685, w: 64, h: 133 }, // 3: Stride 4
  { x: 908, y: 685, w: 68, h: 133 }, // 4: Stride 5
];

// Bottom-Right Pets: White Bunny (4 sprites) & Black Cat (4 sprites)
const BUNNY_BOXES = {
  idleFront: { x: 993, y: 690, w: 54, h: 63 },
  alert: { x: 1058, y: 688, w: 52, h: 65 },
  hopRight: { x: 1118, y: 691, w: 50, h: 62 },
  sleep: { x: 1177, y: 712, w: 64, h: 42 },
} as const;

const CAT_BOXES = {
  sitFront: { x: 997, y: 764, w: 52, h: 54 },
  sitSide: { x: 1059, y: 764, w: 56, h: 54 },
  walk: { x: 1121, y: 767, w: 56, h: 51 },
  curled: { x: 1179, y: 778, w: 66, h: 40 },
} as const;

// Bottom-Right Pixel Hearts & Sparkle
const HUD_HEART_FULL_BOX: CropBox = { x: 1072, y: 850, w: 31, h: 30 };
const HUD_HEART_EMPTY_BOX: CropBox = { x: 1072, y: 899, w: 31, h: 30 };
const PIXEL_SPARKLE_BOX: CropBox = { x: 1223, y: 896, w: 32, h: 32 };

// Bottom-Right World Props
const PROP_BOXES = {
  cherryTree: { x: 1317, y: 676, w: 146, h: 158 },
  streetlamp: { x: 1465, y: 690, w: 46, h: 144 },
  benchWithPlants: { x: 1514, y: 688, w: 94, h: 70 },
  benchClean: { x: 1514, y: 762, w: 94, h: 66 },
  flowerBush1: { x: 1316, y: 840, w: 60, h: 98 },
  flowerBush2: { x: 1378, y: 840, w: 88, h: 98 },
  flowerBush3: { x: 1468, y: 840, w: 90, h: 98 },
  whitePicketFence: { x: 1564, y: 866, w: 98, h: 64 },
} as const;

// ============================================================================
// SURGICAL TWILIGHT-PURPLE CHROMA-KEY & BORDER FLOOD-FILL
// ============================================================================

/**
 * Checks whether an RGB pixel matches the art board's solid dark purple-grey background
 * (~#483d54 to #593868; RGB [62..96, 40..66, 84..112], distinctly cool violet where B > R > G).
 */
function isPurpleBg(
  r: number,
  g: number,
  b: number,
  bgR: number,
  bgG: number,
  bgB: number,
  tol: number
): boolean {
  const dr = r - bgR;
  const dg = g - bgG;
  const db = b - bgB;
  if (dr * dr + dg * dg + db * db > tol * tol) return false;
  // Cool twilight purple-grey: B >= R + 4, B - G >= 20, R - G >= 12
  return b >= r + 4 && b - g >= 20 && r - g >= 12 && r < 118 && g < 86 && b < 130;
}

function sampleLocalBgColor(
  data: Uint8ClampedArray,
  w: number,
  h: number
): [number, number, number] {
  const samples: Array<[number, number, number]> = [];
  const stepX = Math.max(1, Math.floor(w / 10));
  const stepY = Math.max(1, Math.floor(h / 10));

  const trySample = (x: number, y: number) => {
    const idx = (y * w + x) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    // Close to typical board purple (~79, 52, 98)
    const dr = r - 79;
    const dg = g - 52;
    const db = b - 98;
    if (dr * dr + dg * dg + db * db < 32 * 32 && b >= r + 6 && b - g >= 24) {
      samples.push([r, g, b]);
    }
  };

  for (let x = 0; x < w; x += stepX) {
    trySample(x, 0);
    trySample(x, h - 1);
  }
  for (let y = 0; y < h; y += stepY) {
    trySample(0, y);
    trySample(w - 1, y);
  }

  if (samples.length === 0) return [80, 52, 98];
  let sr = 0;
  let sg = 0;
  let sb = 0;
  for (const [r, g, b] of samples) {
    sr += r;
    sg += g;
    sb += b;
  }
  return [
    Math.round(sr / samples.length),
    Math.round(sg / samples.length),
    Math.round(sb / samples.length),
  ];
}

interface ExtractOptions {
  /** Clear enclosed interior background pockets (great for picket fences, tree canopies, flower clusters; keep false for dark outfits/black cat). */
  clearInteriorBg?: boolean;
  /** Optional local mask rectangle (in crop-relative coords) to erase adjacent clutter (e.g. notice board next to cherry tree). */
  eraseRect?: CropBox;
  /** Keep untrimmed if exact box is desired */
  noTrim?: boolean;
}

function extractCleanCrop(
  sheet: HTMLCanvasElement,
  box: CropBox,
  options?: ExtractOptions
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = box.w;
  canvas.height = box.h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);

  const imgData = ctx.getImageData(0, 0, box.w, box.h);
  const { data, width: w, height: h } = imgData;
  const [bgR, bgG, bgB] = sampleLocalBgColor(data, w, h);

  // Erase any excluded sub-rectangle before flood fill
  if (options?.eraseRect) {
    const er = options.eraseRect;
    for (let y = Math.max(0, er.y); y < Math.min(h, er.y + er.h); y++) {
      for (let x = Math.max(0, er.x); x < Math.min(w, er.x + er.w); x++) {
        const i = (y * w + x) * 4;
        data[i] = bgR;
        data[i + 1] = bgG;
        data[i + 2] = bgB;
      }
    }
  }

  const bgMask = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;

  const enqueueIfBg = (x: number, y: number, tol: number) => {
    const p = y * w + x;
    if (bgMask[p]) return;
    const i = p * 4;
    if (isPurpleBg(data[i], data[i + 1], data[i + 2], bgR, bgG, bgB, tol)) {
      bgMask[p] = 1;
      queue[tail++] = p;
    }
  };

  // Seed flood fill from all 4 borders
  for (let x = 0; x < w; x++) {
    enqueueIfBg(x, 0, 34);
    enqueueIfBg(x, h - 1, 34);
  }
  for (let y = 0; y < h; y++) {
    enqueueIfBg(0, y, 34);
    enqueueIfBg(w - 1, y, 34);
  }

  // 4-neighbor BFS flood fill across exterior purple background
  while (head < tail) {
    const cur = queue[head++];
    const cx = cur % w;
    const cy = (cur - cx) / w;
    if (cx > 0) enqueueIfBg(cx - 1, cy, 34);
    if (cx < w - 1) enqueueIfBg(cx + 1, cy, 34);
    if (cy > 0) enqueueIfBg(cx, cy - 1, 34);
    if (cy < h - 1) enqueueIfBg(cx, cy + 1, 34);
  }

  // Optional interior pocket removal for porous props (fences, tree canopy holes, flowers)
  if (options?.clearInteriorBg) {
    for (let p = 0; p < w * h; p++) {
      if (bgMask[p]) continue;
      const i = p * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (isPurpleBg(r, g, b, bgR, bgG, bgB, 22)) {
        bgMask[p] = 1;
      }
    }
  }

  // 1-pixel anti-halo fringe cleanup along transparent boundary
  const fringe = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      if (bgMask[p]) continue;
      if (bgMask[p - 1] || bgMask[p + 1] || bgMask[p - w] || bgMask[p + w]) {
        const i = p * 4;
        if (isPurpleBg(data[i], data[i + 1], data[i + 2], bgR, bgG, bgB, 42)) {
          fringe[p] = 1;
        }
      }
    }
  }

  for (let p = 0; p < w * h; p++) {
    if (bgMask[p] || fringe[p]) {
      data[p * 4 + 3] = 0;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return options?.noTrim ? canvas : trimTransparentBounds(canvas);
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
      if (data[(y * w + x) * 4 + 3] > 20) {
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

function normalizeSprite(
  trimmed: HTMLCanvasElement,
  targetH: number,
  options?: {
    flipX?: boolean;
    offsetX?: number;
    offsetY?: number;
    scaleY?: number;
  }
): HTMLCanvasElement {
  const scale = targetH / Math.max(1, trimmed.height);
  const dw = Math.max(1, Math.round(trimmed.width * scale));
  const dh = Math.max(1, Math.round(trimmed.height * scale * (options?.scaleY ?? 1)));

  const padX = 6;
  const padTop = 8;
  const padBottom = 4;
  const canvasW = dw + padX * 2;
  const canvasH = targetH + padTop + padBottom;

  const out = document.createElement('canvas');
  out.width = canvasW;
  out.height = canvasH;
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const ox = Math.round((canvasW - dw) / 2) + (options?.offsetX ?? 0);
  const oy = canvasH - padBottom - dh + (options?.offsetY ?? 0);

  ctx.save();
  if (options?.flipX) {
    ctx.translate(canvasW, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(
      trimmed,
      0,
      0,
      trimmed.width,
      trimmed.height,
      canvasW - ox - dw,
      oy,
      dw,
      dh
    );
  } else {
    ctx.drawImage(trimmed, 0, 0, trimmed.width, trimmed.height, ox, oy, dw, dh);
  }
  ctx.restore();

  return out;
}

function buildIdlePair(
  trimmed: HTMLCanvasElement,
  targetH: number,
  flipX = false
): HTMLCanvasElement[] {
  return [
    normalizeSprite(trimmed, targetH, { flipX, offsetY: 0 }),
    normalizeSprite(trimmed, targetH, { flipX, offsetY: -1, scaleY: 1.014 }),
  ];
}

function buildAtlasFromImage(img: HTMLImageElement): ArtBoardSpriteAtlas {
  const sheetCanvas = document.createElement('canvas');
  sheetCanvas.width = img.naturalWidth || img.width;
  sheetCanvas.height = img.naturalHeight || img.height;
  const sctx = sheetCanvas.getContext('2d', { willReadFrequently: true })!;
  sctx.imageSmoothingEnabled = false;
  sctx.drawImage(img, 0, 0);

  // 1. Slice Meriem's large square portrait + 5 bottom-row expression portraits
  const herPortraits = {} as Record<HerExpression, HTMLCanvasElement>;
  (Object.keys(HER_EXPR_BOXES) as HerExpression[]).forEach((expr) => {
    const clean = extractCleanCrop(sheetCanvas, HER_EXPR_BOXES[expr]);
    herPortraits[expr] = framePortraitSquare(clean, 160);
  });

  // 2. Slice Ayoub's large square portrait + 4 bottom-row expression portraits
  const himPortraits = {} as Record<HimExpression, HTMLCanvasElement>;
  (Object.keys(HIM_EXPR_BOXES) as HimExpression[]).forEach((expr) => {
    const clean = extractCleanCrop(sheetCanvas, HIM_EXPR_BOXES[expr]);
    himPortraits[expr] = framePortraitSquare(clean, 160);
  });

  // 3. Slice Meriem's 5-frame white-dress walking/turning sprites
  const HER_H = 74; // 37 world pixels tall at RENDER_SCALE=2
  const herRaw = HER_WALK_FRAMES.map((b) => extractCleanCrop(sheetCanvas, b));

  const herIdle: Record<Direction, HTMLCanvasElement[]> = {
    down: buildIdlePair(herRaw[0], HER_H),
    right: buildIdlePair(herRaw[2], HER_H),
    left: buildIdlePair(herRaw[2], HER_H, true),
    up: buildIdlePair(herRaw[4], HER_H),
  };

  const herWalk: Record<Direction, HTMLCanvasElement[]> = {
    down: [
      normalizeSprite(herRaw[0], HER_H, { offsetY: 0 }),
      normalizeSprite(herRaw[1], HER_H, { offsetY: -2 }),
      normalizeSprite(herRaw[0], HER_H, { offsetY: 0 }),
      normalizeSprite(herRaw[1], HER_H, { flipX: true, offsetY: -2 }),
    ],
    right: [
      normalizeSprite(herRaw[2], HER_H, { offsetY: 0 }),
      normalizeSprite(herRaw[3], HER_H, { offsetY: -2 }),
      normalizeSprite(herRaw[2], HER_H, { offsetY: -1 }),
      normalizeSprite(herRaw[3], HER_H, { offsetY: 0 }),
    ],
    left: [
      normalizeSprite(herRaw[2], HER_H, { flipX: true, offsetY: 0 }),
      normalizeSprite(herRaw[3], HER_H, { flipX: true, offsetY: -2 }),
      normalizeSprite(herRaw[2], HER_H, { flipX: true, offsetY: -1 }),
      normalizeSprite(herRaw[3], HER_H, { flipX: true, offsetY: 0 }),
    ],
    up: [
      normalizeSprite(herRaw[4], HER_H, { offsetX: -1, offsetY: -2 }),
      normalizeSprite(herRaw[4], HER_H, { offsetX: 0, offsetY: 0 }),
      normalizeSprite(herRaw[4], HER_H, { offsetX: 1, offsetY: -2 }),
      normalizeSprite(herRaw[4], HER_H, { offsetX: 0, offsetY: 0 }),
    ],
  };

  // 4. Slice Ayoub's 5-frame all-black walking sprites (mirrored horizontally for left)
  const HIM_H = 78; // 39 world pixels tall at RENDER_SCALE=2
  const himRaw = HIM_WALK_FRAMES.map((b) => extractCleanCrop(sheetCanvas, b));

  const himWalkRight = himRaw.map((f, i) =>
    normalizeSprite(f, HIM_H, { offsetY: i % 2 === 1 ? -2 : 0 })
  );
  const himWalkLeft = himRaw.map((f, i) =>
    normalizeSprite(f, HIM_H, { flipX: true, offsetY: i % 2 === 1 ? -2 : 0 })
  );

  const himIdle: Record<Direction, HTMLCanvasElement[]> = {
    right: buildIdlePair(himRaw[0], HIM_H),
    left: buildIdlePair(himRaw[0], HIM_H, true),
    down: buildIdlePair(himRaw[0], HIM_H),
    up: buildIdlePair(himRaw[0], HIM_H, true),
  };

  const himWalk: Record<Direction, HTMLCanvasElement[]> = {
    right: himWalkRight,
    left: himWalkLeft,
    down: himWalkRight,
    up: himWalkLeft,
  };

  const himWave: HTMLCanvasElement[] = [
    normalizeSprite(himRaw[0], HIM_H, { flipX: true, offsetY: 0 }),
    normalizeSprite(himRaw[0], HIM_H, { flipX: true, offsetY: -3, scaleY: 1.02 }),
    normalizeSprite(himRaw[1], HIM_H, { flipX: true, offsetY: -1 }),
    normalizeSprite(himRaw[0], HIM_H, { flipX: true, offsetY: -2, scaleY: 1.015 }),
  ];

  // 5. Slice White Bunny sprites (idle, alert, hopping right/left, sleeping)
  const BUNNY_H = 34; // 17 world pixels tall
  const bunnyFrontRaw = extractCleanCrop(sheetCanvas, BUNNY_BOXES.idleFront);
  const bunnyAlertRaw = extractCleanCrop(sheetCanvas, BUNNY_BOXES.alert);
  const bunnyHopRaw = extractCleanCrop(sheetCanvas, BUNNY_BOXES.hopRight);
  const bunnySleepRaw = extractCleanCrop(sheetCanvas, BUNNY_BOXES.sleep);

  const bunnyIdleFront = normalizeSprite(bunnyFrontRaw, BUNNY_H);
  const bunnyAlert = normalizeSprite(bunnyAlertRaw, BUNNY_H + 2);
  const bunnyHopRight = [
    normalizeSprite(bunnyHopRaw, BUNNY_H, { offsetY: 0 }),
    normalizeSprite(bunnyHopRaw, BUNNY_H, { offsetY: -5, scaleY: 1.05 }),
    normalizeSprite(bunnyHopRaw, BUNNY_H, { offsetY: -2 }),
    normalizeSprite(bunnyFrontRaw, BUNNY_H, { offsetY: 0 }),
  ];
  const bunnyHopLeft = [
    normalizeSprite(bunnyHopRaw, BUNNY_H, { flipX: true, offsetY: 0 }),
    normalizeSprite(bunnyHopRaw, BUNNY_H, { flipX: true, offsetY: -5, scaleY: 1.05 }),
    normalizeSprite(bunnyHopRaw, BUNNY_H, { flipX: true, offsetY: -2 }),
    normalizeSprite(bunnyFrontRaw, BUNNY_H, { flipX: true, offsetY: 0 }),
  ];
  const bunnySleep = normalizeSprite(bunnySleepRaw, 24);

  // 6. Slice Black Cat sprites (sitting, walking, curled up)
  const CAT_H = 34;
  const catSitFrontRaw = extractCleanCrop(sheetCanvas, CAT_BOXES.sitFront);
  const catSitSideRaw = extractCleanCrop(sheetCanvas, CAT_BOXES.sitSide);
  const catWalkRaw = extractCleanCrop(sheetCanvas, CAT_BOXES.walk);
  const catCurledRaw = extractCleanCrop(sheetCanvas, CAT_BOXES.curled);

  const catSitFront = normalizeSprite(catSitFrontRaw, CAT_H);
  const catSitSide = normalizeSprite(catSitSideRaw, CAT_H);
  const catWalk = normalizeSprite(catWalkRaw, CAT_H);
  const catCurled = normalizeSprite(catCurledRaw, 24);

  // 7. Slice World Props from Bottom-Right
  // Cherry blossom tree: cleanly erase the detached notice board at local x >= 99, y >= 104
  const cherryTree = extractCleanCrop(sheetCanvas, PROP_BOXES.cherryTree, {
    clearInteriorBg: true,
    eraseRect: { x: 99, y: 104, w: 47, h: 54 },
  });
  const streetlamp = extractCleanCrop(sheetCanvas, PROP_BOXES.streetlamp, {
    clearInteriorBg: true,
  });
  const benchWithPlants = extractCleanCrop(sheetCanvas, PROP_BOXES.benchWithPlants, {
    clearInteriorBg: true,
  });
  const benchClean = extractCleanCrop(sheetCanvas, PROP_BOXES.benchClean, {
    clearInteriorBg: true,
  });
  const flowerBush1 = extractCleanCrop(sheetCanvas, PROP_BOXES.flowerBush1, {
    clearInteriorBg: true,
  });
  const flowerBush2 = extractCleanCrop(sheetCanvas, PROP_BOXES.flowerBush2, {
    clearInteriorBg: true,
  });
  const flowerBush3 = extractCleanCrop(sheetCanvas, PROP_BOXES.flowerBush3, {
    clearInteriorBg: true,
  });
  const whitePicketFence = extractCleanCrop(sheetCanvas, PROP_BOXES.whitePicketFence, {
    clearInteriorBg: true,
  });

  // 8. Slice HUD character head avatar & pixel hearts
  const hudHeartFull = extractCleanCrop(sheetCanvas, HUD_HEART_FULL_BOX);
  const hudHeartEmpty = extractCleanCrop(sheetCanvas, HUD_HEART_EMPTY_BOX);
  const pixelSparkle = extractCleanCrop(sheetCanvas, PIXEL_SPARKLE_BOX);
  const hudAvatar = framePortraitSquare(
    extractCleanCrop(sheetCanvas, { x: 185, y: 830, w: 89, h: 92 }),
    48
  );

  return {
    herPortraits,
    himPortraits,
    herIdle,
    herWalk,
    himIdle,
    himWalk,
    himWave,
    bunnyIdleFront,
    bunnyAlert,
    bunnyHopRight,
    bunnyHopLeft,
    bunnySleep,
    catSitFront,
    catSitSide,
    catWalk,
    catCurled,
    cherryTree,
    streetlamp,
    benchWithPlants,
    benchClean,
    flowerBush1,
    flowerBush2,
    flowerBush3,
    whitePicketFence,
    hudAvatar,
    hudHeartFull,
    hudHeartEmpty,
    pixelSparkle,
  };
}

// ============================================================================
// SINGLETON ASYNC LOADER WITH SUBSCRIPTION NOTIFICATIONS
// ============================================================================

let cachedAtlas: ArtBoardSpriteAtlas | null = null;
let loadStarted = false;
const listeners = new Set<() => void>();

export function preloadSpriteSheet(): void {
  if (loadStarted || typeof window === 'undefined') return;
  loadStarted = true;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    cachedAtlas = buildAtlasFromImage(img);
    for (const cb of listeners) {
      cb();
    }
  };
  img.src = SPRITE_SHEET_URL;
}

export function getHumanSpriteSheet(): ArtBoardSpriteAtlas | null {
  if (!loadStarted && typeof window !== 'undefined') {
    preloadSpriteSheet();
  }
  return cachedAtlas;
}

export function subscribeSpriteSheet(listener: () => void): () => void {
  if (!loadStarted && typeof window !== 'undefined') {
    preloadSpriteSheet();
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

if (typeof window !== 'undefined') {
  preloadSpriteSheet();
}
