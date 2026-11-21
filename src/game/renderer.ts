import { drawPixelHeart, getSpriteAtlas } from './sprites';
import { getRomanceSpriteSheet, RomanceSpriteAtlas } from './romanceSheet';
import { ArtBoardSpriteAtlas, getHumanSpriteSheet } from './spriteSheet';
import {
  BunnyState,
  CameraState,
  CatState,
  CoupleAnimState,
  FloatingParticle,
  GamePhase,
  GameProgress,
  InteractableObject,
  PlayerState,
  ShootingStar,
  TargetNpcState,
  ZoneId,
} from './types';
import {
  FIREPLACE_LIGHT_CENTER,
  RENDER_SCALE,
  VIEWPORT_HEIGHT,
  VIEWPORT_WIDTH,
} from './worldMap';

export interface RenderContextState {
  time: number;
  zone: ZoneId;
  phase: GamePhase;
  player: PlayerState;
  npc: TargetNpcState;
  bunny: BunnyState;
  cat: CatState;
  progress: GameProgress;
  gateOpenAmount: number;
  nearestInteractable: InteractableObject | null;
  allowInteractBubble?: boolean;
  coupleAnim?: CoupleAnimState | null;
  camera?: CameraState;
  particles: FloatingParticle[];
  shootingStars: ShootingStar[];
}

function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawGroundShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  alpha = 0.28
): void {
  ctx.save();
  ctx.fillStyle = `rgba(26, 16, 40, ${alpha})`;
  px(ctx, cx - rx + 2, cy - ry, (rx - 2) * 2, ry * 2, ctx.fillStyle);
  px(ctx, cx - rx, cy - ry + 1, rx * 2, Math.max(1, (ry - 1) * 2), ctx.fillStyle);
  ctx.restore();
}

function drawNativeSprite(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  worldX: number,
  worldY: number,
  footAnchorPx: number
): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const dw = sprite.width / RENDER_SCALE;
  const dh = sprite.height / RENDER_SCALE;
  const drawX = Math.round((worldX - dw / 2) * RENDER_SCALE) / RENDER_SCALE;
  const drawY =
    Math.round((worldY - dh + footAnchorPx / RENDER_SCALE) * RENDER_SCALE) / RENDER_SCALE;
  ctx.drawImage(sprite, drawX, drawY, dw, dh);
  ctx.restore();
}

/** Draw an extracted prop from the art board scaled cleanly in world units, bottom-center anchored */
function drawProp(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  cx: number,
  bottomY: number,
  worldH: number,
  flipX = false
): void {
  const aspect = sprite.width / Math.max(1, sprite.height);
  const dw = Math.round(worldH * aspect);
  const dh = Math.round(worldH);
  const dx = Math.round(cx - dw / 2);
  const dy = Math.round(bottomY - dh);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (flipX) {
    ctx.translate(Math.round(cx * 2), 0);
    ctx.scale(-1, 1);
    ctx.drawImage(sprite, Math.round(cx - dw / 2), dy, dw, dh);
  } else {
    ctx.drawImage(sprite, dx, dy, dw, dh);
  }
  ctx.restore();
}

/**
 * Gentle, periodic golden pixel sparkle (✦) + soft warm aura pulse
 * drawn over unopened/active clue objects so they catch Meriem's eye naturally.
 */
function drawGoldenClueGlint(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  time: number,
  phaseOffset = 0,
  auraRadius = 26,
  emphasized = false
): void {
  const breath = 0.5 + 0.5 * Math.sin(time * 3.1 + phaseOffset);
  const auraAlpha = (emphasized ? 0.22 : 0.14) + breath * (emphasized ? 0.16 : 0.11);

  ctx.save();
  // Soft warm golden radial aura
  const aura = ctx.createRadialGradient(cx, cy, 3, cx, cy, auraRadius);
  aura.addColorStop(0, `rgba(255, 236, 158, ${auraAlpha.toFixed(3)})`);
  aura.addColorStop(0.55, `rgba(255, 214, 128, ${(auraAlpha * 0.42).toFixed(3)})`);
  aura.addColorStop(1, 'rgba(255, 214, 128, 0)');
  ctx.fillStyle = aura;
  ctx.fillRect(cx - auraRadius, cy - auraRadius, auraRadius * 2, auraRadius * 2);

  // Periodic 4-point golden pixel sparkle (✦) with gentle rise & fade
  const cycle = (time * 0.72 + phaseOffset) % 1;
  if (cycle < 0.65) {
    const t = cycle / 0.65;
    const twinkle = Math.sin(t * Math.PI);
    const sx = Math.round(cx + Math.sin(phaseOffset * 3.1) * 3);
    const sy = Math.round(cy - 6 - t * 5);
    ctx.globalAlpha = Math.min(1, twinkle * (emphasized ? 1.05 : 0.92));

    // Crisp 4-point pixel ✦ star
    px(ctx, sx - 1, sy - 4, 2, 8, '#ffe68a');
    px(ctx, sx - 4, sy - 1, 8, 2, '#ffe68a');
    px(ctx, sx - 2, sy - 2, 4, 4, '#fff4bd');
    px(ctx, sx - 1, sy - 1, 2, 2, '#ffffff');
  }

  // Secondary smaller alternating twinkle pixel
  const cycle2 = (time * 0.72 + phaseOffset + 0.48) % 1;
  if (cycle2 < 0.5) {
    const t2 = cycle2 / 0.5;
    const tw2 = Math.sin(t2 * Math.PI);
    const sx2 = Math.round(cx - 9 + Math.cos(phaseOffset * 2.3) * 4);
    const sy2 = Math.round(cy - 1 - t2 * 4);
    ctx.globalAlpha = tw2 * 0.85;
    px(ctx, sx2, sy2 - 2, 1, 5, '#ffe899');
    px(ctx, sx2 - 2, sy2, 5, 1, '#ffe899');
    px(ctx, sx2, sy2, 1, 1, '#ffffff');
  }
  ctx.restore();
}

// ============================================================================
// ZONE 1: COZY COTTAGE INTERIOR (Matches Middle-Left Panel of Art Board)
// ============================================================================

function drawCottageFloorAndRug(ctx: CanvasRenderingContext2D): void {
  // Warm honey-caramel wooden floorboards
  px(ctx, 0, 96, VIEWPORT_WIDTH, VIEWPORT_HEIGHT - 96, '#8f634c');
  const plankH = 12;
  const tones = ['#9c6e55', '#93664e', '#a3755b', '#8e614a'];
  for (let y = 100; y < VIEWPORT_HEIGHT - 12; y += plankH) {
    const row = Math.floor((y - 100) / plankH);
    px(ctx, 26, y, VIEWPORT_WIDTH - 52, plankH - 1, tones[row % tones.length]);
    px(ctx, 26, y + plankH - 1, VIEWPORT_WIDTH - 52, 1, '#724c3a');
    const offset = (row % 3) * 34;
    for (let x = 26 + offset; x < VIEWPORT_WIDTH - 36; x += 68) {
      px(ctx, x, y, 1, plankH - 1, '#78513d');
      px(ctx, x + 2, y + 3, 14, 1, 'rgba(255, 224, 190, 0.08)');
    }
  }

  // Soft warm ambient shadow under back wall furniture
  px(ctx, 28, 100, VIEWPORT_WIDTH - 56, 6, 'rgba(42, 24, 34, 0.24)');

  // Iconic Center Dusty-Rose Pink Area Rug (Middle-Left Panel)
  const rx = 144;
  const ry = 156;
  const rw = 192;
  const rh = 96;
  px(ctx, rx + 2, ry + 3, rw, rh, 'rgba(42, 22, 34, 0.22)');
  px(ctx, rx, ry, rw, rh, '#9e5d7a'); // Outer plum-rose edge
  px(ctx, rx + 2, ry + 2, rw - 4, rh - 4, '#c47d99'); // Main dusty pink field
  px(ctx, rx + 6, ry + 6, rw - 12, rh - 12, '#e8c4d4'); // Crisp cream-pink inner frame
  px(ctx, rx + 8, ry + 8, rw - 16, rh - 16, '#b87290'); // Inner rose weave
  // Subtle woven rug highlight stripes
  for (let y = ry + 14; y < ry + rh - 12; y += 8) {
    px(ctx, rx + 12, y, rw - 24, 1, 'rgba(255, 228, 240, 0.14)');
  }
  // Tiny drifted pink blossom petals on the rug
  px(ctx, rx + 22, ry + 18, 3, 2, '#ffd6e6');
  px(ctx, rx + 24, ry + 19, 2, 1, '#f5a5c4');
  px(ctx, rx + 158, ry + 70, 3, 2, '#ffd6e6');

  // South-Center Open Doorway Threshold to Cherry Blossom Courtyard
  const dx = 204;
  const dy = VIEWPORT_HEIGHT - 16;
  px(ctx, dx - 4, dy - 2, 80, 130, '#543836');
  px(ctx, dx, dy, 72, 128, '#705882'); // Twilight cobblestones peeking outside
  px(ctx, dx + 4, dy + 2, 64, 124, '#8b6f9c');
  // Cozy woven welcome doormat inside doorway
  px(ctx, dx + 12, dy - 16, 48, 14, '#7d5244');
  px(ctx, dx + 14, dy - 14, 44, 10, '#c79776');
  px(ctx, dx + 16, dy - 12, 40, 6, '#dfb796');
  // Soft floor arrow cue
  px(ctx, 237, dy - 10, 6, 2, '#7d5244');
  px(ctx, 238, dy - 8, 4, 2, '#7d5244');
  px(ctx, 239, dy - 6, 2, 2, '#7d5244');
}

function drawCottageBackWallAndFurniture(
  ctx: CanvasRenderingContext2D,
  time: number,
  progress: GameProgress
): void {
  // Deep plum-brown outer cottage framing walls (extended downward for smooth camera framing)
  px(ctx, 0, 0, VIEWPORT_WIDTH, 18, '#362333');
  px(ctx, 0, 0, 28, VIEWPORT_HEIGHT + 120, '#362333');
  px(ctx, VIEWPORT_WIDTH - 28, 0, 28, VIEWPORT_HEIGHT + 120, '#362333');
  px(ctx, 0, VIEWPORT_HEIGHT - 16, 204, 136, '#362333');
  px(ctx, 276, VIEWPORT_HEIGHT - 16, 204, 136, '#362333');

  // Warm rose-cream interior wallpaper & timber wainscot
  px(ctx, 28, 18, VIEWPORT_WIDTH - 56, 82, '#c8a69d');
  px(ctx, 28, 18, VIEWPORT_WIDTH - 56, 6, '#5c3d3b'); // Ceiling timber beam
  px(ctx, 28, 72, VIEWPORT_WIDTH - 56, 28, '#9e7564'); // Lower wood paneling
  px(ctx, 28, 70, VIEWPORT_WIDTH - 56, 3, '#6e4c42'); // Chair rail trim
  px(ctx, 28, 97, VIEWPORT_WIDTH - 56, 4, '#593b35'); // Baseboard

  // Subtle vertical wood paneling stripes
  for (let x = 36; x < VIEWPORT_WIDTH - 32; x += 14) {
    px(ctx, x, 73, 1, 24, 'rgba(68, 40, 34, 0.22)');
  }

  // ---- Center-Back Stone Chimney Brick Pillar (Middle-Left Panel) ----
  const sx = 196;
  px(ctx, sx, 18, 60, 82, '#7c708a');
  const stoneTones = ['#9e91ab', '#8b7f9a', '#ab9eb8', '#837691'];
  for (let row = 0; row < 8; row++) {
    const sy = 20 + row * 10;
    const shift = (row % 2) * 8;
    for (let col = 0; col < 4; col++) {
      const bx = sx + 2 + ((col * 15 + shift) % 52);
      const bw = Math.min(13, sx + 58 - bx);
      if (bw > 2) {
        px(ctx, bx, sy, bw, 8, stoneTones[(row + col) % stoneTones.length]);
        px(ctx, bx, sy, bw, 1, 'rgba(255, 245, 255, 0.22)');
      }
    }
  }
  // Low wooden hearth bench directly in front of stone pillar
  px(ctx, 200, 90, 52, 12, '#5c3c34');
  px(ctx, 202, 91, 48, 7, '#a87458');
  px(ctx, 204, 92, 44, 2, '#c49072');

  // ---- Two Warm Glowing Curtained Windows (flanking stone pillar) ----
  const drawCottageWindow = (wx: number, wy: number, ww: number, wh: number) => {
    px(ctx, wx - 4, wy - 3, ww + 8, 4, '#6b4942'); // Curtain rod
    px(ctx, wx, wy, ww, wh, '#5c3d3b'); // Outer frame
    px(ctx, wx + 2, wy + 2, ww - 4, wh - 4, '#ffdda6'); // Warm golden twilight glass
    px(ctx, wx + 3, wy + 3, ww - 6, wh - 12, '#fff0c7');
    // Window cross mullions
    px(ctx, wx + Math.floor(ww / 2) - 1, wy + 2, 2, wh - 4, '#7a5248');
    px(ctx, wx + 2, wy + Math.floor(wh / 2), ww - 4, 2, '#7a5248');
    // Soft pink-rose curtains framing sides
    px(ctx, wx - 3, wy, 9, wh + 3, '#c98099');
    px(ctx, wx - 2, wy + 1, 4, wh + 1, '#e39fb6');
    px(ctx, wx + ww - 6, wy, 9, wh + 3, '#c98099');
    px(ctx, wx + ww - 2, wy + 1, 4, wh + 1, '#e39fb6');
    // Window sill
    px(ctx, wx - 4, wy + wh, ww + 8, 4, '#7a5248');
  };
  drawCottageWindow(142, 26, 44, 42);
  drawCottageWindow(278, 22, 68, 36);

  // Small potted greenery shelf beneath left window
  px(ctx, 146, 80, 38, 18, '#6e4a3f');
  px(ctx, 148, 82, 34, 8, '#a67458');
  px(ctx, 152, 74, 10, 8, '#5c8c64');
  px(ctx, 154, 72, 6, 4, '#8cc284');
  px(ctx, 166, 73, 12, 9, '#4e7a58');
  px(ctx, 169, 71, 6, 4, '#f5a5c4');

  // ---- Top-Left Wooden Bookshelf (CLUE 1: Code Geass) ----
  const bx = 42;
  const by = 28;
  px(ctx, bx, by, 86, 84, '#4d312c');
  px(ctx, bx + 3, by + 3, 80, 78, '#7a5042');
  px(ctx, bx - 2, by - 2, 90, 6, '#946350'); // Top crown molding
  // Tiny knick-knacks on top of shelf
  px(ctx, bx + 10, by - 10, 12, 8, '#5c8c64');
  px(ctx, bx + 12, by - 12, 8, 4, '#8cc284');
  px(ctx, bx + 42, by - 9, 8, 7, '#d9889e');
  px(ctx, bx + 64, by - 11, 10, 9, '#e0b084');

  // 3 shelves packed with colorful books
  const shelfYs = [by + 8, by + 32, by + 56];
  const bookColors = [
    '#d96c85',
    '#6684ba',
    '#e3b668',
    '#79ab86',
    '#9e73b5',
    '#cf7865',
    '#63a3ad',
    '#d998ad',
  ];
  for (let s = 0; s < shelfYs.length; s++) {
    const sy = shelfYs[s];
    px(ctx, bx + 6, sy, 74, 18, '#3b2424');
    px(ctx, bx + 4, sy + 18, 78, 4, '#966552');
    let curX = bx + 8;
    let idx = s * 3;
    while (curX < bx + 74) {
      const bw = 6 + (idx % 3);
      const bh = 13 + (idx % 4);
      const isCodeGeass = s === 1 && idx === 5;
      const col = isCodeGeass ? '#732945' : bookColors[idx % bookColors.length];
      px(ctx, curX, sy + 18 - bh, bw, bh, col);
      px(ctx, curX + 1, sy + 19 - bh, 1, bh - 2, 'rgba(255,255,255,0.22)');
      if (isCodeGeass) {
        // Golden crest & cream bookmark ribbon peeking out!
        px(ctx, curX + 2, sy + 18 - bh + 4, 3, 3, '#ffd97a');
        px(ctx, curX + 3, sy + 16, 2, 5, '#fff4d6');
      }
      curX += bw + 1;
      idx++;
    }
  }
  // Subtle warm aura + periodic golden pixel sparkle (✦) on bookshelf until read
  if (!progress.readBookshelf) {
    drawGoldenClueGlint(ctx, bx + 44, by + 40, time, 0.2, 32, true);
  }

  // ---- Stone Fireplace on Back Wall Right of Chimney ----
  const fx = 280;
  const fy = 56;
  px(ctx, fx, fy, 78, 52, '#4a363c'); // Outer hearth shadow
  px(ctx, fx + 2, fy + 2, 74, 48, '#8a7378'); // Warm carved stone surround
  px(ctx, fx - 3, fy - 2, 84, 7, '#a37158'); // Timber mantelpiece
  px(ctx, fx - 1, fy - 1, 80, 2, '#c79476');
  // Cute candle & frame on mantle
  px(ctx, fx + 8, fy - 11, 12, 9, '#d9b58f');
  px(ctx, fx + 10, fy - 9, 8, 5, '#f2b8c6');
  px(ctx, fx + 62, fy - 9, 4, 7, '#fff3db');
  px(ctx, fx + 63, fy - 12, 2, 3, '#ffd36b');

  // Firebox interior
  px(ctx, fx + 15, fy + 15, 48, 30, '#261721');
  px(ctx, fx + 17, fy + 17, 44, 26, '#381e24');
  // Logs
  px(ctx, fx + 22, fy + 36, 34, 6, '#5c362c');
  px(ctx, fx + 26, fy + 33, 26, 5, '#754636');
  // Animated crackling golden flames
  const flicker = Math.sin(time * 11) * 2;
  const flicker2 = Math.cos(time * 14) * 1.5;
  px(ctx, fx + 24, fy + 25 + flicker * 0.4, 30, 14, '#e66c3c');
  px(ctx, fx + 28, fy + 21 + flicker2 * 0.6, 22, 16, '#ffa147');
  px(ctx, fx + 32, fy + 25 - flicker * 0.4, 14, 12, '#ffe073');
  px(ctx, fx + 35, fy + 29, 8, 7, '#fff7c4');
  // Stone hearth base ledge
  px(ctx, fx - 4, fy + 46, 86, 8, '#75616a');
  px(ctx, fx - 2, fy + 47, 82, 3, '#9c8690');

  // ---- Framed Cozy Art on Far-Right Back Wall ----
  px(ctx, 376, 32, 38, 28, '#6e4942');
  px(ctx, 379, 35, 32, 22, '#e8ced8');
  px(ctx, 383, 41, 10, 12, '#c4839d');
  px(ctx, 396, 39, 10, 14, '#7b6b9e');

  // ---- Cozy Bed on Right Wall (Middle-Left Panel) ----
  const bedX = 376;
  const bedY = 104;
  // Shadow
  px(ctx, bedX - 3, bedY + 6, 74, 96, 'rgba(38, 20, 32, 0.24)');
  // Wooden bed frame & headboard
  px(ctx, bedX, bedY, 68, 98, '#593932');
  px(ctx, bedX + 2, bedY + 2, 64, 14, '#8c5c49');
  px(ctx, bedX + 4, bedY + 4, 60, 4, '#ad7861');
  // Bedposts
  px(ctx, bedX - 2, bedY - 4, 6, 16, '#754b3c');
  px(ctx, bedX + 64, bedY - 4, 6, 16, '#754b3c');
  // Fluffy white/cream pillows
  px(ctx, bedX + 6, bedY + 15, 26, 16, '#e0c6cf');
  px(ctx, bedX + 8, bedY + 16, 22, 12, '#fff5f7');
  px(ctx, bedX + 36, bedY + 15, 26, 16, '#e0c6cf');
  px(ctx, bedX + 38, bedY + 16, 22, 12, '#fff5f7');
  // Dusty-pink quilted blanket
  px(ctx, bedX + 4, bedY + 32, 60, 58, '#c97e9c');
  px(ctx, bedX + 6, bedY + 32, 56, 12, '#f0cedb'); // Folded top sheet
  px(ctx, bedX + 6, bedY + 44, 56, 44, '#db91ae');
  px(ctx, bedX + 8, bedY + 52, 52, 4, '#ebb1c7');
  px(ctx, bedX + 8, bedY + 66, 52, 4, '#ebb1c7');
  px(ctx, bedX + 8, bedY + 78, 52, 4, '#bd6f8f');
  // Footboard
  px(ctx, bedX, bedY + 90, 68, 8, '#754b3c');
  px(ctx, bedX + 2, bedY + 91, 64, 3, '#9c6854');

  // ---- Small Side Tea Table (Bottom-Left) ----
  const tx = 38;
  const ty = 214;
  px(ctx, tx + 2, ty + 28, 56, 8, 'rgba(38, 20, 32, 0.25)');
  px(ctx, tx + 4, ty + 18, 6, 14, '#5e3c32');
  px(ctx, tx + 48, ty + 18, 6, 14, '#5e3c32');
  px(ctx, tx, ty, 58, 22, '#5e3c32');
  px(ctx, tx + 2, ty + 2, 54, 16, '#a36f56');
  px(ctx, tx + 4, ty + 3, 50, 4, '#bd896e');
  // Tea mugs & little lavender bottle on table
  px(ctx, tx + 10, ty + 5, 7, 8, '#f5e4d7');
  px(ctx, tx + 11, ty + 6, 5, 3, '#c78c72');
  px(ctx, tx + 26, ty + 4, 6, 9, '#d699b8');
  px(ctx, tx + 40, ty + 6, 7, 7, '#f5e4d7');

  // ---- Rose Nightstand & Glowing Floor Lamp (Bottom-Right) ----
  const nx = 368;
  const ny = 224;
  px(ctx, nx + 2, ny + 26, 40, 8, 'rgba(38, 20, 32, 0.24)');
  px(ctx, nx, ny, 40, 28, '#663c4b');
  px(ctx, nx + 2, ny + 2, 36, 22, '#b5728a');
  px(ctx, nx + 4, ny + 4, 32, 8, '#cc89a0');
  px(ctx, nx + 18, ny + 14, 4, 3, '#ffe4b5'); // Drawer knob
  // Warm Floor Lamp beside nightstand
  const lx = 420;
  const ly = 216;
  px(ctx, lx - 5, ly + 30, 12, 4, '#5c3c36');
  px(ctx, lx, ly + 8, 2, 22, '#7d5345');
  px(ctx, lx - 6, ly - 2, 14, 11, '#ffe6a8');
  px(ctx, lx - 4, ly, 10, 7, '#fff7d4');

  // ---- Potted Plants on Left Wall (including Decoy Potted Plant!) ----
  const drawCottagePot = (cx: number, cy: number, hasNote: boolean) => {
    drawGroundShadow(ctx, cx, cy + 12, 10, 4, 0.25);
    px(ctx, cx - 7, cy + 2, 14, 10, '#8f5546');
    px(ctx, cx - 8, cy, 16, 4, '#b06d5a');
    px(ctx, cx - 9, cy - 10, 18, 11, '#4c7a57');
    px(ctx, cx - 6, cy - 14, 12, 8, '#6ca370');
    px(ctx, cx - 3, cy - 12, 4, 3, '#f7b2cb');
    px(ctx, cx + 3, cy - 8, 4, 3, '#ffd4e4');
    if (hasNote) {
      // Peeking yellow sticky note tucked under the pot!
      px(ctx, cx + 4, cy + 8, 7, 5, '#fff09e');
      px(ctx, cx + 5, cy + 10, 5, 1, '#b88856');
    }
  };
  drawCottagePot(46, 138, true); // Decoy plant interactable
  drawCottagePot(46, 184, false);
}

// ============================================================================
// ZONE 2: CHERRY BLOSSOM COURTYARD & BRIDGE (Top Banner + Middle-Center Panel)
// ============================================================================

function drawCourtyardBase(
  ctx: CanvasRenderingContext2D,
  time: number,
  sheet: ArtBoardSpriteAtlas | null,
  progress: GameProgress,
  gateOpenAmount: number
): void {
  // Lush twilight mossy grass & pastel cobblestone ground (extended downward for camera framing)
  px(ctx, 0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT + 120, '#36404a');
  px(ctx, 0, 74, VIEWPORT_WIDTH, VIEWPORT_HEIGHT + 120 - 74, '#435454');

  // Soft mossy grass patches & edge framing
  for (let y = 76; y < VIEWPORT_HEIGHT + 116; y += 16) {
    for (let x = 0; x < VIEWPORT_WIDTH; x += 24) {
      const h = ((x * 13 + y * 7) % 19) / 19;
      if (h > 0.45) {
        px(ctx, x, y, 10, 6, '#4f665f');
        px(ctx, x + 2, y + 1, 5, 2, '#627d6e');
      }
    }
  }

  // ---- Rose-Lavender Flagstone Cobblestone Plaza (Top Banner palette) ----
  const drawFlagstones = (x0: number, y0: number, w: number, h: number) => {
    px(ctx, x0, y0, w, h, '#6b5370'); // Plum mortar seams
    const tileW = 16;
    const tileH = 10;
    const stoneTones = ['#a887a8', '#9c7b9e', '#b594b3', '#947496', '#ad8dad'];
    for (let ty = y0; ty < y0 + h; ty += tileH) {
      const row = Math.floor((ty - y0) / tileH);
      const shift = (row % 2) * 8;
      for (let tx = x0 - shift; tx < x0 + w; tx += tileW) {
        const sx = Math.max(x0 + 1, tx + 1);
        const ex = Math.min(x0 + w - 1, tx + tileW - 1);
        const sy = ty + 1;
        const ey = Math.min(y0 + h - 1, ty + tileH - 1);
        if (ex <= sx || ey <= sy) continue;
        const hash = Math.abs((tx * 31 + ty * 17) % stoneTones.length);
        px(ctx, sx, sy, ex - sx, ey - sy, stoneTones[hash]);
        // Warm cream-lilac bevel highlight along top edge
        px(ctx, sx, sy, ex - sx, 1, 'rgba(255, 232, 245, 0.25)');
        // Occasional fallen cherry blossom petal on stones
        if ((tx + ty * 3) % 41 === 0) {
          px(ctx, sx + 3, sy + 3, 3, 2, '#f7b2cc');
        }
      }
    }
  };

  // Main courtyard promenade & paths connecting Cottage Door, Bridge, Fountain, and Shrine Steps
  drawFlagstones(122, 88, 344, 186);

  // Stone retaining terrace wall across upper courtyard (behind bench & fountain)
  px(ctx, 260, 46, 220, 34, '#665473');
  for (let x = 264; x < 476; x += 18) {
    px(ctx, x, 50, 16, 10, '#9682a3');
    px(ctx, x, 50, 16, 2, '#b8a4c4');
    px(ctx, x + 6, 62, 16, 12, '#867294');
  }

  // ---- Left Cascading Waterfall & Lily-Pad Twilight Stream (Top Banner Left!) ----
  // Dark rocky cliff framing the waterfall at top-left
  px(ctx, 0, 0, 122, 58, '#3d395c');
  px(ctx, 0, 0, 26, 138, '#36444f');
  px(ctx, 88, 0, 34, 136, '#3c4d52');
  // Sparkling twilight blue water channel
  px(ctx, 22, 46, 94, 362, '#3a5487');
  px(ctx, 30, 54, 78, 354, '#4c6ca6');
  // Animated water ripples
  const rippleShift = Math.floor(time * 12) % 16;
  for (let wy = 66; wy < VIEWPORT_HEIGHT + 108; wy += 18) {
    const rx = 38 + ((wy * 7) % 34);
    px(ctx, rx, wy + (rippleShift > 8 ? 1 : 0), 14, 2, '#7ba4d9');
    px(ctx, rx + 18, wy + 7, 10, 1, '#a9cff5');
  }
  // Cascading animated waterfall at top-left (x: 34..76, y: 0..58)
  px(ctx, 34, 0, 42, 58, '#75a6e0');
  for (let wx = 36; wx < 74; wx += 6) {
    const fy = (Math.floor(time * 42) + wx * 3) % 48;
    px(ctx, wx, fy, 3, 14, '#c9e6ff');
    px(ctx, wx + 2, (fy + 24) % 48, 2, 12, '#eef8ff');
  }
  // Frothy white mist foam at waterfall base
  const foamBob = Math.round(Math.sin(time * 7) * 1.5);
  px(ctx, 30, 52 + foamBob, 50, 8, '#cbe6ff');
  px(ctx, 36, 54 - foamBob, 38, 6, '#f2f9ff');

  // Green lily pads & pink lotus blossoms floating on the stream
  const drawLilyPad = (lx: number, ly: number, hasFlower: boolean) => {
    px(ctx, lx - 5, ly - 3, 10, 6, '#487a58');
    px(ctx, lx - 4, ly - 2, 8, 4, '#6aa372');
    px(ctx, lx + 1, ly - 1, 3, 2, '#3a5487'); // Leaf notch
    if (hasFlower) {
      px(ctx, lx - 2, ly - 5, 5, 4, '#f7a6c4');
      px(ctx, lx - 1, ly - 4, 3, 2, '#fff0f6');
    }
  };
  drawLilyPad(44, 96, true);
  drawLilyPad(90, 114, false);
  drawLilyPad(88, 206, true);
  drawLilyPad(104, 238, false);
  drawLilyPad(84, 260, true);

  // ---- Left Riverbank Island across the Bridge (Solid Grass + Cobblestone Clearing for Locked Chest) ----
  // Deep water shadow & mossy stone embankment curving along the river edge
  px(ctx, 0, 126, 67, 146, '#2b4066');
  px(ctx, 0, 124, 65, 146, '#395249');
  // Lush mossy twilight grass island ground
  px(ctx, 0, 126, 63, 144, '#4e6d5b');
  px(ctx, 4, 128, 55, 138, '#5a7a65');
  // Stone embankment blocks edging the eastern shoreline beside the river
  for (let sy = 130; sy < 266; sy += 12) {
    px(ctx, 59, sy, 6, 10, '#786585');
    px(ctx, 60, sy + 1, 4, 7, '#a18ca8');
    px(ctx, 60, sy + 1, 4, 2, '#c7b4cf');
  }
  // Tiny pastel wildflowers dotted across the grassy island edges
  px(ctx, 8, 136, 3, 2, '#f7b2cc');
  px(ctx, 48, 134, 3, 2, '#ffe3ef');
  px(ctx, 48, 246, 3, 2, '#f7b2cc');
  px(ctx, 10, 242, 3, 2, '#ffd6e6');

  // Short stone walkway from the left end of the bridge straight to the Locked Chest clearing
  drawFlagstones(14, 148, 50, 30);
  drawFlagstones(14, 174, 46, 62);

  // ---- Arched Wooden Bridge over the Stream (Connects Left Island to Main Courtyard) ----
  const brX = 58;
  const brY = 142;
  const brW = 72;
  const brH = 40;
  // Bridge shadow on water
  px(ctx, brX + 4, brY + brH - 2, brW - 8, 8, 'rgba(20, 28, 56, 0.45)');
  // Bridge deck wooden planks (curved arch highlight)
  for (let i = 0; i < brW; i += 6) {
    const t = (i - brW / 2) / (brW / 2);
    const archLift = Math.round((1 - t * t) * 6);
    px(ctx, brX + i, brY + 6 - archLift, 5, brH - 8, '#8f5e47');
    px(ctx, brX + i + 1, brY + 7 - archLift, 3, brH - 12, '#b07b5d');
    px(ctx, brX + i + 1, brY + 7 - archLift, 3, 2, '#cca07e');
  }
  // Curved top & bottom wooden handrails with posts
  for (let i = 0; i <= brW; i += 4) {
    const t = (i - brW / 2) / (brW / 2);
    const archLift = Math.round((1 - t * t) * 7);
    px(ctx, brX + i, brY - 2 - archLift, 4, 4, '#663f32');
    px(ctx, brX + i, brY - 1 - archLift, 4, 2, '#b88263');
    px(ctx, brX + i, brY + brH - 6 - archLift, 4, 4, '#663f32');
    px(ctx, brX + i, brY + brH - 5 - archLift, 4, 2, '#b88263');
    if (i % 16 === 0) {
      px(ctx, brX + i, brY - 4 - archLift, 4, 12, '#59362b');
      px(ctx, brX + i, brY + brH - 10 - archLift, 4, 12, '#59362b');
    }
  }

  // ---- Cozy Cottage Facade at Top-Left/Center (Top Banner!) ----
  const cx = 126;
  const cy = 0;
  const cw = 136;
  // Shingled twilight-purple roof
  px(ctx, cx - 4, cy, cw + 8, 36, '#483b5c');
  for (let ry = 4; ry < 34; ry += 6) {
    px(ctx, cx - 2, ry, cw + 4, 2, '#5f4e78');
  }
  // Warm cream plaster facade with dark timber framing
  px(ctx, cx + 4, 34, cw - 8, 52, '#d6b8b0');
  px(ctx, cx + 4, 34, cw - 8, 4, '#593b3b');
  px(ctx, cx + 4, 72, cw - 8, 14, '#7d6c87'); // Stone foundation
  // Central gable above arched front door
  px(ctx, cx + 52, 16, 40, 22, '#e6ccc5');
  px(ctx, cx + 50, 14, 44, 4, '#593b3b');
  // Arched Wooden Front Door (takes Meriem back inside Zone 1 Cottage!)
  const doorX = 186;
  px(ctx, doorX - 2, 42, 28, 44, '#523430');
  px(ctx, doorX, 44, 24, 42, '#9e6a50');
  px(ctx, doorX + 3, 47, 18, 12, '#ffdfa8'); // Warm glowing glass transom
  px(ctx, doorX + 3, 62, 18, 22, '#875742');
  px(ctx, doorX + 18, 70, 3, 3, '#ffe28f'); // Brass doorknob
  // Glowing porch wall sconces flanking front door
  px(ctx, doorX - 8, 54, 4, 7, '#ffd984');
  px(ctx, doorX + 28, 54, 4, 7, '#ffd984');

  // Two glowing paned cottage windows with pink flower boxes
  const drawFacadeWindow = (wx: number) => {
    px(ctx, wx, 46, 26, 22, '#593b3b');
    px(ctx, wx + 2, 48, 22, 18, '#ffd996');
    px(ctx, wx + 4, 50, 18, 14, '#fff1c4');
    px(ctx, wx + 12, 48, 2, 18, '#6e4942');
    px(ctx, wx + 2, 56, 22, 2, '#6e4942');
    // Flower box under sill
    px(ctx, wx - 2, 68, 30, 6, '#7a4d40');
    px(ctx, wx, 65, 26, 4, '#55875e');
    px(ctx, wx + 3, 64, 4, 3, '#f7a6c4');
    px(ctx, wx + 12, 63, 5, 3, '#ffd4e4');
    px(ctx, wx + 20, 64, 4, 3, '#f7a6c4');
  };
  drawFacadeWindow(142);
  drawFacadeWindow(226);

  // ---- Shrine / Torii-Style Garden Archway Leading Up Stone Steps (Middle-Center Panel!) ----
  const gx = 342;
  const gy = 0;
  // Stone staircase ascending through archway
  px(ctx, gx + 12, 24, 56, 56, '#7d6b8a');
  for (let step = 0; step < 5; step++) {
    const sy = 32 + step * 9;
    px(ctx, gx + 10, sy, 60, 7, '#a894b3');
    px(ctx, gx + 10, sy, 60, 2, '#cbb8d4');
  }
  // Soft pink blossom runner mat on the shrine threshold
  px(ctx, gx + 24, 50, 32, 16, '#c77d99');
  px(ctx, gx + 26, 52, 28, 12, '#e39eb8');

  // Glowing archway portal when unlocked!
  if (gateOpenAmount > 0.05) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.85, gateOpenAmount * 0.85);
    const glow = ctx.createRadialGradient(gx + 40, 44, 4, gx + 40, 44, 38);
    glow.addColorStop(0, 'rgba(255, 232, 178, 0.95)');
    glow.addColorStop(0.55, 'rgba(247, 178, 208, 0.45)');
    glow.addColorStop(1, 'rgba(247, 178, 208, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(gx, 4, 80, 76);
    ctx.restore();
  }

  // Vermilion-Timber Torii Gate Columns & Curved Double Crossbeams
  px(ctx, gx + 8, 14, 9, 64, '#8a4846');
  px(ctx, gx + 10, 14, 3, 64, '#b8685c');
  px(ctx, gx + 63, 14, 9, 64, '#8a4846');
  px(ctx, gx + 65, 14, 3, 64, '#b8685c');
  // Upper curved kasagi roof beam
  px(ctx, gx - 4, 8, 88, 7, '#4f3548');
  px(ctx, gx - 2, 11, 84, 6, '#a85b54');
  px(ctx, gx + 2, 12, 76, 2, '#d48674');
  // Lower nuki beam + braided shimenawa rope + 3 fluttering white shide talismans
  px(ctx, gx + 4, 24, 72, 6, '#964e4a');
  px(ctx, gx + 16, 30, 48, 3, '#d6b485'); // Rope
  const sway = Math.round(Math.sin(time * 3.5));
  for (const sxOff of [26, 38, 50]) {
    px(ctx, gx + sxOff + sway, 33, 4, 8, '#fff7ed');
    px(ctx, gx + sxOff + 1 + sway, 37, 4, 4, '#f0d8e0');
  }

  // Twin Stone Tōrō Lanterns flanking the Shrine Steps
  const drawStoneLantern = (lx: number, ly: number) => {
    px(ctx, lx - 6, ly + 18, 12, 6, '#6e5e7d');
    px(ctx, lx - 4, ly + 6, 8, 13, '#8c7a9c');
    px(ctx, lx - 5, ly - 2, 10, 9, '#5e4f6e');
    px(ctx, lx - 3, ly, 6, 6, '#ffe599'); // Warm glowing lantern window
    px(ctx, lx - 2, ly + 1, 4, 4, '#fff9d6');
    px(ctx, lx - 8, ly - 6, 16, 4, '#7d6b8c');
    px(ctx, lx - 5, ly - 9, 10, 3, '#a18fb0');
  };
  drawStoneLantern(gx + 4, 58);
  drawStoneLantern(gx + 76, 58);

  // Golden Keypad Shrine Seal if gate is still locked
  if (!progress.gateUnlocked) {
    const pulse = 0.72 + 0.28 * Math.sin(time * 4.5);
    px(ctx, gx + 17, 50, 46, 3, '#543c59'); // Velvet cord barrier
    px(ctx, gx + 31, 43, 18, 15, '#593d34');
    px(ctx, gx + 33, 45, 14, 11, '#d9a455');
    ctx.save();
    ctx.globalAlpha = pulse;
    px(ctx, gx + 36, 48, 8, 5, '#fff4bd');
    ctx.restore();
    // Periodic golden sparkle & warm aura (brighter once chest clue is opened!)
    drawGoldenClueGlint(ctx, gx + 40, 48, time, 2.4, 30, progress.openedChest);
  }

  // ---- Ornate Tiered Stone Water Fountain (Right Courtyard — Top Banner!) ----
  const fnX = 326;
  const fnY = 144;
  drawGroundShadow(ctx, fnX + 32, fnY + 46, 34, 8, 0.28);
  // Square stone basin outer rim
  px(ctx, fnX, fnY + 12, 64, 34, '#6b5b7a');
  px(ctx, fnX + 2, fnY + 10, 60, 32, '#9e8eb0');
  px(ctx, fnX + 4, fnY + 12, 56, 26, '#c2b3d1');
  // Sparkling blue water pool
  px(ctx, fnX + 7, fnY + 15, 50, 20, '#5a84c2');
  px(ctx, fnX + 10, fnY + 17, 44, 15, '#76a4e0');
  const wShift = Math.floor(time * 6) % 8;
  px(ctx, fnX + 14 + wShift, fnY + 21, 10, 2, '#d4edff');
  px(ctx, fnX + 36 - wShift, fnY + 28, 12, 2, '#d4edff');
  // Central two-tiered stone pedestal & water jets
  px(ctx, fnX + 26, fnY + 4, 12, 22, '#8b7b9c');
  px(ctx, fnX + 20, fnY + 6, 24, 6, '#b8a8c7');
  px(ctx, fnX + 28, fnY - 8, 8, 14, '#a696b5');
  px(ctx, fnX + 24, fnY - 10, 16, 4, '#cfc0de');
  // Animated fountain water arcs spraying into basin
  const jetH = Math.round(Math.sin(time * 9) * 2);
  px(ctx, fnX + 30, fnY - 15 - jetH, 4, 6 + jetH, '#d9f0ff');
  px(ctx, fnX + 22, fnY - 4, 3, 18, 'rgba(195, 232, 255, 0.78)');
  px(ctx, fnX + 39, fnY - 4, 3, 18, 'rgba(195, 232, 255, 0.78)');

  // ---- Locked Wooden Treasure Chest on the Left Riverbank Island (CLUE 3) ----
  const chX = 18;
  const chY = 198;
  drawGroundShadow(ctx, chX + 18, chY + 22, 18, 6, 0.32);
  px(ctx, chX, chY + 4, 36, 18, '#4a2e28');
  px(ctx, chX + 2, chY + 6, 32, 14, '#8c5a44');
  // Lid (open if unlocked)
  if (progress.openedChest) {
    px(ctx, chX, chY - 4, 36, 9, '#694032');
    px(ctx, chX + 2, chY - 2, 32, 5, '#b57b5b');
    px(ctx, chX + 4, chY + 5, 28, 5, '#ffe89c'); // Glowing note inside!
  } else {
    px(ctx, chX, chY, 36, 9, '#5e392d');
    px(ctx, chX + 2, chY + 2, 32, 5, '#a86e51');
  }
  // Golden metal bands & clasp
  px(ctx, chX + 6, chY + 1, 3, 20, '#d9aa57');
  px(ctx, chX + 27, chY + 1, 3, 20, '#d9aa57');
  px(ctx, chX + 15, chY + 7, 6, 6, progress.openedChest ? '#7ed4a4' : '#ffe082');
  // Periodic golden pixel sparkle (✦) + soft warm aura until opened
  if (!progress.openedChest) {
    drawGoldenClueGlint(ctx, chX + 18, chY + 8, time, 1.6, 30, progress.hasBrassKey);
  }

  // ---- Extracted White Picket Fences & Props from Art Board! ----
  if (sheet) {
    // White picket fence left of cottage porch (matching Top Banner!)
    drawProp(ctx, sheet.whitePicketFence, 148, 102, 24);
    // White picket fence right of fountain/courtyard wall
    drawProp(ctx, sheet.whitePicketFence, 302, 86, 20);
    // Extracted Cozy Wooden Wishing Bench beneath the blooming Cherry Blossom Tree (Clue 2!)
    drawProp(ctx, sheet.benchWithPlants, 288, 126, 38);
    // Extracted Flower Bushes framing the left riverbank island, bridge, and courtyard
    drawProp(ctx, sheet.flowerBush2, 26, 142, 30);
    drawProp(ctx, sheet.flowerBush1, 24, 264, 30);
    drawProp(ctx, sheet.flowerBush3, 148, 258, 34);
    drawProp(ctx, sheet.flowerBush2, 434, 246, 36);
    drawProp(ctx, sheet.flowerBush1, 456, 178, 32);
    // Extracted Bench along south-east garden promenade
    drawProp(ctx, sheet.benchClean, 254, 266, 28);
  }

  // Soft fallen cherry blossom petals & folded note/sparkle glint tucked by the Wishing Bench (Clue 2)
  px(ctx, 276, 111, 3, 2, '#ffd6e6');
  px(ctx, 297, 112, 3, 2, '#f7b2cc');
  px(ctx, 284, 122, 6, 4, '#fff7ed');
  px(ctx, 286, 123, 2, 2, '#eb7197');
  if (!progress.hasBrassKey) {
    drawGoldenClueGlint(ctx, 288, 112, time, 0.9, 30, true);
  }
}

// ============================================================================
// ZONE 3: STARRY CITY TERRACE FINALE (Matches Middle-Right Panel of Art Board)
// ============================================================================

function drawStarryCityTerrace(
  ctx: CanvasRenderingContext2D,
  time: number,
  shootingStars: ShootingStar[],
  sheet: ArtBoardSpriteAtlas | null
): void {
  // Deep twilight indigo-to-plum evening sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 146);
  skyGrad.addColorStop(0, '#1c183b');
  skyGrad.addColorStop(0.55, '#342657');
  skyGrad.addColorStop(1, '#5d3e73');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, VIEWPORT_WIDTH, 146);

  // Twinkling pixel stars across the night sky
  for (let i = 0; i < 42; i++) {
    const sx = (i * 73 + 19) % VIEWPORT_WIDTH;
    const sy = (i * 37 + 9) % 86;
    const tw = 0.38 + 0.62 * Math.sin(time * (2.2 + (i % 4)) + i);
    ctx.save();
    ctx.globalAlpha = tw;
    px(ctx, sx, sy, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1, i % 3 === 0 ? '#ffe8b8' : '#e8dcff');
    ctx.restore();
  }

  // Luminous Crescent Moon centered near top (Middle-Right Panel!)
  const mx = 240;
  const my = 32;
  const moonGlow = ctx.createRadialGradient(mx, my, 4, mx, my, 36);
  moonGlow.addColorStop(0, 'rgba(255, 240, 185, 0.42)');
  moonGlow.addColorStop(1, 'rgba(255, 240, 185, 0)');
  ctx.fillStyle = moonGlow;
  ctx.fillRect(mx - 36, my - 36, 72, 72);
  ctx.save();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(mx, my, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#241d45';
  ctx.beginPath();
  ctx.arc(mx + 5, my - 2, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Shooting stars streaking gently across sky
  for (const s of shootingStars) {
    const prog = s.life / s.maxLife;
    const alpha = Math.sin(prog * Math.PI);
    ctx.save();
    ctx.globalAlpha = alpha * 0.9;
    ctx.strokeStyle = '#fff5d4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - s.vx * s.length, s.y - s.vy * s.length);
    ctx.stroke();
    ctx.restore();
  }

  // ---- Distant Twilight City Skyline Silhouette with Warm Lit Windows ----
  const buildings = [
    { x: 0, w: 32, h: 48 },
    { x: 30, w: 28, h: 62 },
    { x: 56, w: 24, h: 42 },
    { x: 78, w: 36, h: 68 },
    { x: 112, w: 26, h: 50 },
    { x: 136, w: 32, h: 56 },
    { x: 166, w: 28, h: 38 },
    { x: 192, w: 34, h: 52 },
    { x: 224, w: 30, h: 46 },
    { x: 252, w: 36, h: 58 },
    { x: 286, w: 28, h: 44 },
    { x: 312, w: 32, h: 64 },
    { x: 342, w: 26, h: 48 },
    { x: 366, w: 38, h: 54 },
    { x: 402, w: 30, h: 44 },
    { x: 430, w: 50, h: 58 },
  ];
  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    const by = 140 - b.h;
    px(ctx, b.x, by, b.w, b.h, i % 2 === 0 ? '#2b244a' : '#352b59');
    // Warm amber skyscraper windows
    for (let wy = by + 6; wy < 134; wy += 8) {
      for (let wx = b.x + 5; wx < b.x + b.w - 6; wx += 7) {
        if ((wx * 7 + wy * 11 + i) % 5 !== 0) {
          px(ctx, wx, wy, 3, 4, (wx + wy) % 3 === 0 ? '#ffdfa3' : '#f2b885');
        }
      }
    }
  }

  // ---- Terrace Stone Flagstone Floor (extended downward for smooth camera framing) ----
  px(ctx, 0, 146, VIEWPORT_WIDTH, VIEWPORT_HEIGHT + 120 - 146, '#483e66');
  const tileW = 24;
  const tileH = 14;
  const floorTones = ['#635785', '#5a4e7a', '#6d6091', '#544873'];
  for (let ty = 148; ty < VIEWPORT_HEIGHT + 120; ty += tileH) {
    const row = Math.floor((ty - 148) / tileH);
    const shift = (row % 2) * 12;
    for (let tx = -shift; tx < VIEWPORT_WIDTH; tx += tileW) {
      const h = Math.abs((tx * 13 + ty * 7) % floorTones.length);
      px(ctx, tx + 1, ty + 1, tileW - 2, tileH - 2, floorTones[h]);
      px(ctx, tx + 1, ty + 1, tileW - 2, 1, 'rgba(220, 200, 255, 0.14)');
    }
  }

  // ---- Wrought-Iron & Stone Terrace Railing ----
  px(ctx, 0, 126, VIEWPORT_WIDTH, 4, '#2a2245'); // Top handrail
  px(ctx, 0, 127, VIEWPORT_WIDTH, 1, '#7868a1');
  px(ctx, 0, 142, VIEWPORT_WIDTH, 8, '#3d335c'); // Stone curb base
  px(ctx, 0, 142, VIEWPORT_WIDTH, 2, '#695c8c');
  for (let rx = 8; rx < VIEWPORT_WIDTH; rx += 10) {
    px(ctx, rx, 130, 2, 12, '#2a2245');
  }
  // Wooden corner string-light poles
  px(ctx, 36, 94, 5, 52, '#4d363e');
  px(ctx, 240, 108, 4, 38, '#4d363e');
  px(ctx, 440, 94, 5, 52, '#4d363e');

  // ---- Overhead Warm Glowing String Lights (Two Catenary Arcs — Middle-Right Panel!) ----
  const drawStringArc = (x1: number, y1: number, x2: number, y2: number, sag: number, bulbs: number) => {
    ctx.save();
    ctx.strokeStyle = '#33284f';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 + sag, x2, y2);
    ctx.stroke();

    for (let i = 1; i < bulbs; i++) {
      const t = i / bulbs;
      const bx = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * ((x1 + x2) / 2) + t * t * x2;
      const by = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * ((y1 + y2) / 2 + sag) + t * t * y2;
      const pulse = 0.8 + 0.2 * Math.sin(time * 4.2 + i * 0.9);
      const glow = ctx.createRadialGradient(bx, by, 1, bx, by, 13 * pulse);
      glow.addColorStop(0, 'rgba(255, 226, 152, 0.85)');
      glow.addColorStop(0.5, 'rgba(255, 190, 118, 0.25)');
      glow.addColorStop(1, 'rgba(255, 190, 118, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(bx - 14, by - 14, 28, 28);
      px(ctx, bx - 1.5, by - 1.5, 3, 3, '#fff7cc');
    }
    ctx.restore();
  };
  drawStringArc(38, 98, 242, 112, 22, 8);
  drawStringArc(242, 112, 442, 98, 22, 8);

  // ---- Rose-Pink & Lavender Striped Picnic Blanket (Middle-Right Panel!) ----
  const bx = 158;
  const by = 192;
  const bw = 164;
  const bh = 48;
  px(ctx, bx + 2, by + 3, bw, bh, 'rgba(20, 14, 36, 0.35)');
  px(ctx, bx, by, bw, bh, '#8c5575');
  px(ctx, bx + 2, by + 2, bw - 4, bh - 4, '#c77c99');
  // Soft vertical & horizontal pastel stripes matching the Middle-Right panel
  px(ctx, bx + 34, by + 2, 24, bh - 4, '#dfa0b8');
  px(ctx, bx + 98, by + 2, 28, bh - 4, '#b57091');
  px(ctx, bx + 2, by + 16, bw - 4, 8, 'rgba(255, 220, 236, 0.25)');
  // Fringe tassels along blanket edges
  for (let fx = bx + 4; fx < bx + bw - 4; fx += 8) {
    px(ctx, fx, by + bh, 3, 3, '#f0d0de');
  }

  // ---- Potted Plants & Glowing Floor Lanterns on Both Sides ----
  if (sheet) {
    drawProp(ctx, sheet.flowerBush3, 28, 198, 42);
    drawProp(ctx, sheet.flowerBush2, 456, 222, 40);
  }
  const drawFloorLantern = (lx: number, ly: number) => {
    drawGroundShadow(ctx, lx, ly + 12, 9, 4, 0.32);
    px(ctx, lx - 6, ly - 8, 12, 20, '#36263d');
    px(ctx, lx - 4, ly - 5, 8, 13, '#ffdf94');
    px(ctx, lx - 2, ly - 3, 4, 9, '#fff9d6');
    px(ctx, lx - 7, ly - 10, 14, 3, '#4c3857');
    px(ctx, lx - 3, ly - 13, 6, 3, '#634c70');
  };
  drawFloorLantern(62, 198);
  drawFloorLantern(422, 212);

  // ---- Brass/Slate Astronomical Telescope on Right Side (Middle-Right Panel!) ----
  const tx = 398;
  const ty = 178;
  drawGroundShadow(ctx, tx, ty + 16, 14, 5, 0.3);
  // Tripod legs
  ctx.save();
  ctx.strokeStyle = '#5e3e3d';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(tx, ty - 2);
  ctx.lineTo(tx - 11, ty + 16);
  ctx.moveTo(tx, ty - 2);
  ctx.lineTo(tx + 11, ty + 16);
  ctx.moveTo(tx, ty - 2);
  ctx.lineTo(tx, ty + 18);
  ctx.stroke();
  // Angled telescope barrel pointing toward crescent moon
  ctx.strokeStyle = '#2d2647';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(tx + 10, ty + 2);
  ctx.lineTo(tx - 16, ty - 14);
  ctx.stroke();
  ctx.strokeStyle = '#a3a8c9';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(tx + 9, ty + 1);
  ctx.lineTo(tx - 15, ty - 13);
  ctx.stroke();
  ctx.strokeStyle = '#e0e6ff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(tx + 6, ty - 2);
  ctx.lineTo(tx - 13, ty - 13);
  ctx.stroke();
  ctx.restore();
}

// ============================================================================
// CHARACTER & PET RENDERERS (USING EXTRACTED ART-BOARD SPRITES)
// ============================================================================

/** Cozy side-by-side back-facing seated pose on the Starry City Terrace picnic blanket (Middle-Right Panel) */
function drawSeatedTerracePerson(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  kind: 'her' | 'him',
  time: number
): void {
  const bob = Math.sin(time * 2.2 + (kind === 'him' ? 0.6 : 0)) > 0.65 ? -1 : 0;
  drawGroundShadow(ctx, x, y + 3, 14, 5, 0.32);

  if (kind === 'her') {
    // Meriem seated from behind: flowing dark layered hair & white puff-sleeve dress
    // Skirt spread neatly on picnic blanket
    px(ctx, x - 12, y - 10 + bob, 24, 13, '#332236');
    px(ctx, x - 11, y - 9 + bob, 22, 11, '#f2dde6');
    px(ctx, x - 9, y - 8 + bob, 18, 9, '#fff5f8');
    // Puff sleeves
    px(ctx, x - 12, y - 18 + bob, 6, 8, '#f0d8e2');
    px(ctx, x + 6, y - 18 + bob, 6, 8, '#f0d8e2');
    // Long flowing dark brown-black hair down her back
    px(ctx, x - 10, y - 34 + bob, 20, 24, '#241624');
    px(ctx, x - 9, y - 33 + bob, 18, 21, '#3d2536');
    px(ctx, x - 7, y - 31 + bob, 14, 15, '#4d3042');
    // Soft moonlight highlight on crown of hair
    px(ctx, x - 6, y - 32 + bob, 12, 3, '#6e495e');
    px(ctx, x - 4, y - 24 + bob, 2, 11, '#5e3c50');
    px(ctx, x + 3, y - 22 + bob, 2, 9, '#5e3c50');
  } else {
    // Ayoub seated from behind: dark curly shoulder-length hair, all-black tee & pants
    // Seated black legs / shoes
    px(ctx, x - 11, y - 8 + bob, 22, 11, '#1a1524');
    px(ctx, x - 9, y - 7 + bob, 18, 8, '#2d2638');
    // Black crew-neck t-shirt back
    px(ctx, x - 10, y - 20 + bob, 20, 14, '#1c1726');
    px(ctx, x - 9, y - 19 + bob, 18, 12, '#342d40');
    px(ctx, x - 7, y - 18 + bob, 14, 3, '#494059');
    // Shoulder-length curly dark hair silhouette
    px(ctx, x - 11, y - 35 + bob, 22, 18, '#1f1521');
    px(ctx, x - 10, y - 34 + bob, 20, 16, '#362333');
    px(ctx, x - 8, y - 33 + bob, 16, 12, '#473042');
    // Subtle curl texture highlights
    px(ctx, x - 7, y - 33 + bob, 5, 3, '#614359');
    px(ctx, x + 2, y - 32 + bob, 5, 3, '#614359');
    px(ctx, x - 9, y - 24 + bob, 3, 4, '#291a29');
    px(ctx, x + 7, y - 24 + bob, 3, 4, '#291a29');
  }
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  time: number,
  sheet: ArtBoardSpriteAtlas | null
): void {
  if (player.seated) {
    drawSeatedTerracePerson(ctx, player.x, player.y, 'her', time);
    return;
  }
  if (!sheet) return;
  const frames = player.isMoving ? sheet.herWalk[player.dir] : sheet.herIdle[player.dir];
  const idx = player.isMoving
    ? Math.floor(player.animTime * 9.5) % frames.length
    : Math.floor(time * 2.1) % frames.length;
  const sprite = frames[idx];
  if (!sprite) return;

  drawGroundShadow(ctx, player.x, player.y + 1, 9, 3, 0.3);
  drawNativeSprite(ctx, sprite, player.x, player.y, 4);
}

function drawTargetNpc(
  ctx: CanvasRenderingContext2D,
  npc: TargetNpcState,
  time: number,
  sheet: ArtBoardSpriteAtlas | null
): void {
  if (npc.seated) {
    drawSeatedTerracePerson(ctx, npc.x, npc.y, 'him', time);
    return;
  }
  if (!sheet) return;
  const frames = npc.waving ? sheet.himWave : sheet.himIdle[npc.dir];
  const idx = npc.waving
    ? Math.floor(time * 6.5) % frames.length
    : Math.floor(time * 1.9) % frames.length;
  const sprite = frames[idx];
  if (!sprite) return;

  drawGroundShadow(ctx, npc.x, npc.y + 1, 9, 3, 0.3);
  drawNativeSprite(ctx, sprite, npc.x, npc.y, 4);
}

/**
 * Renders the exact pixel-art pose panel from Kawaii_Pixel_Romance_Sprite_Sheet
 * cleanly centered on the Starry Overlook terrace with transparent background,
 * warm twilight aura, soft ground shadow, and subtle cozy breathing motion.
 */
function drawRomancePoseScene(
  ctx: CanvasRenderingContext2D,
  time: number,
  coupleAnim: CoupleAnimState,
  romance: RomanceSpriteAtlas
): void {
  const poseCanvas = romance.poses[coupleAnim.kind];
  if (!poseCanvas) return;

  // Center right on the Starry City Terrace picnic blanket
  const cx = 240;
  const bottomY = coupleAnim.kind === 'sit_cuddle' ? 228 : 224;
  const worldH =
    coupleAnim.kind === 'sit_cuddle'
      ? 92
      : coupleAnim.kind === 'watch_stars'
        ? 102
        : 106;

  const aspect = poseCanvas.width / Math.max(1, poseCanvas.height);
  const dw = Math.round(worldH * aspect);
  const dh = Math.round(worldH);
  const breathe = Math.sin(time * 2.5) * 0.7;
  const drawX = Math.round(cx - dw / 2);
  const drawY = Math.round(bottomY - dh + breathe);

  ctx.save();
  // Soft warm romantic twilight glow behind the couple & pets
  const glow = ctx.createRadialGradient(
    cx,
    bottomY - dh * 0.48,
    6,
    cx,
    bottomY - dh * 0.48,
    Math.max(dw, dh) * 0.62
  );
  glow.addColorStop(0, 'rgba(255, 198, 224, 0.28)');
  glow.addColorStop(0.55, 'rgba(220, 168, 232, 0.12)');
  glow.addColorStop(1, 'rgba(220, 168, 232, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - dw, bottomY - dh - 24, dw * 2, dh + 48);

  // Cozy oval ground shadow anchoring Meriem, Ayoub, white bunny & black cat onto the terrace
  drawGroundShadow(ctx, cx, bottomY - 1, Math.round(dw * 0.44), 6, 0.34);

  // Draw crisp extracted pixel-art illustration
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(poseCanvas, drawX, drawY, dw, dh);
  ctx.restore();
}

function drawBunny(
  ctx: CanvasRenderingContext2D,
  bunny: BunnyState,
  time: number,
  sheet: ArtBoardSpriteAtlas | null
): void {
  const isPetted = bunny.petTimer > 0;
  const isHintWiggling = (bunny.hintWiggleTimer ?? 0) > 0;
  const hopLift = isPetted
    ? Math.round(Math.abs(Math.sin(time * 14)) * 4)
    : isHintWiggling
      ? Math.round(Math.abs(Math.sin(time * 12)) * 3)
      : 0;

  drawGroundShadow(ctx, bunny.x, bunny.y + 1, 7, 3, 0.25);

  if (sheet) {
    let sprite: HTMLCanvasElement;
    if (isPetted) {
      sprite = Math.floor(time * 10) % 2 === 0 ? sheet.bunnyAlert : sheet.bunnyIdleFront;
    } else if (isHintWiggling) {
      // Cute rapid ear-wiggle facing toward the active clue!
      const hopFrames = bunny.dir === 'right' ? sheet.bunnyHopRight : sheet.bunnyHopLeft;
      sprite =
        Math.floor(time * 11) % 2 === 0
          ? sheet.bunnyAlert
          : hopFrames[0] ?? sheet.bunnyIdleFront;
    } else if (bunny.isMoving) {
      const frames = bunny.dir === 'right' ? sheet.bunnyHopRight : sheet.bunnyHopLeft;
      sprite = frames[Math.floor(bunny.animTime * 11) % frames.length];
    } else if (!bunny.following && Math.sin(time * 0.7) < -0.5) {
      sprite = sheet.bunnySleep;
    } else {
      sprite = Math.floor(time * 2.2) % 3 === 0 ? sheet.bunnyAlert : sheet.bunnyIdleFront;
    }
    drawNativeSprite(ctx, sprite, bunny.x, bunny.y - hopLift, 4);

    // Subtle ear-wiggle sparkle indicator while gently guiding Meriem
    if (isHintWiggling) {
      const wink = 0.55 + 0.45 * Math.sin(time * 14);
      const earX = Math.round(bunny.x + (bunny.dir === 'right' ? 5 : -5));
      const earY = Math.round(bunny.y - 21 - hopLift);
      ctx.save();
      ctx.globalAlpha = wink;
      px(ctx, earX, earY - 2, 2, 6, '#ffe68a');
      px(ctx, earX - 2, earY, 6, 2, '#ffe68a');
      px(ctx, earX, earY, 2, 2, '#ffffff');
      ctx.restore();
    }
    return;
  }

  // Brief fallback while image loads
  const fallback = getSpriteAtlas();
  const frame = fallback.bunnyIdleRight[0];
  drawNativeSprite(ctx, frame, bunny.x, bunny.y - hopLift, 4);
}

function drawBlackCat(
  ctx: CanvasRenderingContext2D,
  cat: CatState,
  time: number,
  sheet: ArtBoardSpriteAtlas | null
): void {
  const isPetted = cat.petTimer > 0;
  const purrBob = isPetted ? Math.round(Math.abs(Math.sin(time * 11)) * 2) : 0;

  drawGroundShadow(ctx, cat.x, cat.y + 1, 7, 3, 0.28);

  if (sheet) {
    let sprite: HTMLCanvasElement;
    if (isPetted) {
      sprite = Math.floor(time * 8) % 2 === 0 ? sheet.catSitFront : sheet.catSitSide;
    } else {
      const cycle = Math.floor(time * 0.9) % 8;
      sprite = cycle === 6 || cycle === 7 ? sheet.catSitSide : sheet.catSitFront;
    }
    drawNativeSprite(ctx, sprite, cat.x, cat.y - purrBob, 4);
    return;
  }

  const fallback = getSpriteAtlas();
  drawNativeSprite(ctx, fallback.catIdle[0], cat.x, cat.y - purrBob, 4);
}

// ============================================================================
// ATMOSPHERIC LIGHTING & FIREPLACE-REACTIVE PLAYER RADIAL LIGHT MASK
// ============================================================================

function drawZoneLighting(
  ctx: CanvasRenderingContext2D,
  zone: ZoneId,
  time: number,
  player: PlayerState
): void {
  const f1 = 0.92 + 0.08 * Math.sin(time * 5.2);
  const f2 = 0.92 + 0.08 * Math.cos(time * 4.4 + 1.1);

  const distToFire =
    zone === 'cottage'
      ? Math.hypot(
          player.x - FIREPLACE_LIGHT_CENTER.x,
          player.y - FIREPLACE_LIGHT_CENTER.y
        )
      : 999;
  const fireFactor = Math.max(0, Math.min(1, 1 - distToFire / 155));

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const glows: Array<{ x: number; y: number; r: number; a: number; rgb: string }> =
    zone === 'cottage'
      ? [
          { x: 164, y: 46, r: 66, a: 0.22 * f1, rgb: '255, 214, 146' }, // Left window warm light
          { x: 320, y: 84, r: 128, a: 0.32 * f1, rgb: '255, 166, 94' }, // Stone fireplace hearth glow
          { x: 420, y: 218, r: 78, a: 0.22 * f2, rgb: '255, 224, 156' }, // Floor lamp glow
        ]
      : zone === 'garden'
        ? [
            { x: 132, y: 74, r: 72, a: 0.26 * f1, rgb: '255, 214, 140' }, // Cottage streetlamp
            { x: 136, y: 180, r: 66, a: 0.24 * f2, rgb: '255, 212, 138' }, // South bridge entrance lamp
            { x: 252, y: 92, r: 70, a: 0.24 * f1, rgb: '255, 216, 144' }, // Bench streetlamp
            { x: 422, y: 144, r: 76, a: 0.26 * f2, rgb: '255, 214, 140' }, // East streetlamp
            { x: 346, y: 58, r: 52, a: 0.24 * f1, rgb: '255, 224, 152' }, // Left shrine lantern
            { x: 418, y: 58, r: 52, a: 0.24 * f2, rgb: '255, 224, 152' }, // Right shrine lantern
            { x: 198, y: 62, r: 54, a: 0.2 * f1, rgb: '255, 214, 148' }, // Cottage porch glow
          ]
        : [
            { x: 62, y: 196, r: 68, a: 0.28 * f1, rgb: '255, 206, 132' }, // Left terrace lantern
            { x: 422, y: 210, r: 68, a: 0.28 * f2, rgb: '255, 206, 132' }, // Right terrace lantern
            { x: 240, y: 198, r: 108, a: 0.16 * f1, rgb: '255, 212, 184' }, // Picnic blanket warm ambient
          ];

  for (const g of glows) {
    const grad = ctx.createRadialGradient(g.x, g.y, 2, g.x, g.y, g.r);
    grad.addColorStop(0, `rgba(${g.rgb}, ${g.a.toFixed(3)})`);
    grad.addColorStop(0.5, `rgba(${g.rgb}, ${(g.a * 0.36).toFixed(3)})`);
    grad.addColorStop(1, `rgba(${g.rgb}, 0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(g.x - g.r, g.y - g.r, g.r * 2, g.r * 2);
  }

  // Subtle Warm Radial Light Halo around Meriem (intensifies warmly near cottage fireplace!)
  const pRadius = (zone === 'cottage' ? 66 : 50) + fireFactor * 42;
  const pAlpha =
    ((zone === 'cottage' ? 0.16 : 0.09) + fireFactor * 0.22) *
    (0.94 + 0.06 * Math.sin(time * 7.2));
  const gCol = Math.round(224 - fireFactor * 44);
  const bCol = Math.round(176 - fireFactor * 74);

  const pGrad = ctx.createRadialGradient(
    player.x,
    player.y - 14,
    4,
    player.x,
    player.y - 14,
    pRadius
  );
  pGrad.addColorStop(0, `rgba(255, ${gCol}, ${bCol}, ${pAlpha.toFixed(3)})`);
  pGrad.addColorStop(0.48, `rgba(255, ${gCol}, ${bCol}, ${(pAlpha * 0.42).toFixed(3)})`);
  pGrad.addColorStop(1, `rgba(255, ${gCol}, ${bCol}, 0)`);
  ctx.fillStyle = pGrad;
  ctx.fillRect(
    player.x - pRadius,
    player.y - 14 - pRadius,
    pRadius * 2,
    pRadius * 2
  );
  ctx.restore();

  // Gentle player-centered twilight vignette
  const flicker = 0.96 + 0.04 * Math.sin(time * 7.8);
  const clearR = (zone === 'cottage' ? 92 : 122) + fireFactor * 26;
  const outerR = 266 + fireFactor * 18;
  const shadeAlpha = zone === 'cottage' ? 0.2 - fireFactor * 0.05 : 0.12;
  const maskGrad = ctx.createRadialGradient(
    player.x,
    player.y - 14,
    clearR * flicker,
    player.x,
    player.y - 14,
    outerR
  );
  maskGrad.addColorStop(0, 'rgba(26, 16, 40, 0)');
  maskGrad.addColorStop(1, `rgba(22, 14, 38, ${shadeAlpha.toFixed(3)})`);
  ctx.fillStyle = maskGrad;
  ctx.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT + 120);
}

// ============================================================================
// PARTICLES (PETALS, FIREFLIES, HEARTS, EMBERS) & INTERACTION BUBBLE
// ============================================================================

function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: FloatingParticle[],
  sheet: ArtBoardSpriteAtlas | null
): void {
  const atlas = getSpriteAtlas();
  for (const p of particles) {
    const progress = p.life / p.maxLife;
    const alpha =
      progress < 0.2
        ? progress / 0.2
        : progress > 0.72
          ? Math.max(0, (1 - progress) / 0.28)
          : 1;

    ctx.save();
    ctx.globalAlpha = alpha;

    if (p.kind === 'heart') {
      const swayX = Math.sin(p.life * 2.8 + p.phase) * 5;
      if (sheet) {
        const s = p.size >= 2 ? 12 : 9;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          sheet.hudHeartFull,
          Math.round(p.x + swayX - s / 2),
          Math.round(p.y - s / 2),
          s,
          s
        );
      } else {
        drawPixelHeart(ctx, p.x + swayX, p.y, p.size, p.color);
      }
    } else if (p.kind === 'petal') {
      const swayX = Math.sin(p.life * 2.6 + p.phase) * 9;
      px(ctx, p.x + swayX, p.y, 3, 2, p.color);
      px(ctx, p.x + swayX + 1, p.y - 1, 2, 1, '#ffe8f2');
    } else if (p.kind === 'firefly') {
      const swayX = Math.sin(p.life * 2.1 + p.phase) * 6;
      const swayY = Math.cos(p.life * 1.6 + p.phase) * 3.5;
      const fx = p.x + swayX;
      const fy = p.y + swayY;
      const pulse = 0.55 + 0.45 * Math.sin(p.life * 5.0 + p.phase);
      const glow = ctx.createRadialGradient(fx, fy, 0.5, fx, fy, 7 * pulse + 3);
      glow.addColorStop(0, `rgba(255, 245, 178, ${(0.88 * pulse).toFixed(2)})`);
      glow.addColorStop(0.5, `rgba(255, 214, 132, ${(0.32 * pulse).toFixed(2)})`);
      glow.addColorStop(1, 'rgba(255, 214, 132, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(fx - 11, fy - 11, 22, 22);
      px(ctx, fx - 1, fy - 1, 2, 2, '#fffce0');
    } else if (p.kind === 'dust_mote') {
      const swayX = Math.sin(p.life * 1.4 + p.phase) * 5;
      ctx.globalAlpha = alpha * 0.55;
      px(ctx, p.x + swayX, p.y, p.size, p.size, '#ffeec2');
    } else if (p.kind === 'key_popup') {
      const glow = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 16);
      glow.addColorStop(0, 'rgba(255, 232, 152, 0.8)');
      glow.addColorStop(1, 'rgba(255, 232, 152, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(p.x - 16, p.y - 16, 32, 32);
      ctx.drawImage(atlas.brassKey, Math.round(p.x - 8), Math.round(p.y - 8), 16, 16);
    } else if (p.kind === 'sparkle' || p.kind === 'ember') {
      px(ctx, p.x, p.y, p.size, p.size, p.color);
    }

    ctx.restore();
  }
}

// ============================================================================
// MAIN FIXED-CAMERA RENDERER (480 × 288 @ 2× NATIVE INTEGER RESOLUTION)
// ============================================================================

export function renderGameWorld(
  ctx: CanvasRenderingContext2D,
  state: RenderContextState
): void {
  const {
    time,
    zone,
    phase,
    player,
    npc,
    bunny,
    cat,
    progress,
    gateOpenAmount,
    nearestInteractable,
    allowInteractBubble,
    particles,
    shootingStars,
  } = state;

  const sheet = getHumanSpriteSheet();
  const zoom = state.camera?.zoom ?? 1;
  const camX = state.camera?.x ?? 0;
  const camY = state.camera?.y ?? 0;

  ctx.save();
  ctx.setTransform(
    RENDER_SCALE * zoom,
    0,
    0,
    RENDER_SCALE * zoom,
    Math.round(-camX * RENDER_SCALE * zoom),
    Math.round(-camY * RENDER_SCALE * zoom)
  );
  ctx.imageSmoothingEnabled = false;

  // 1. Render base scene background for the active zone
  if (zone === 'cottage') {
    drawCottageFloorAndRug(ctx);
    drawCottageBackWallAndFurniture(ctx, time, progress);
  } else if (zone === 'garden') {
    drawCourtyardBase(ctx, time, sheet, progress, gateOpenAmount);
  } else {
    drawStarryCityTerrace(ctx, time, shootingStars, sheet);
  }

  // 2. Depth-sorted entities & tall extracted world props (cherry trees, streetlamps, characters, pets)
  const drawables: Array<{ y: number; draw: () => void }> = [];

  if (zone === 'garden' && sheet) {
    // Blooming Cherry Blossom Trees from art board
    drawables.push({
      y: 94,
      draw: () => drawProp(ctx, sheet.cherryTree, 288, 102, 86),
    });
    drawables.push({
      y: 78,
      draw: () => drawProp(ctx, sheet.cherryTree, 324, 80, 66, true),
    });
    drawables.push({
      y: 80,
      draw: () => drawProp(ctx, sheet.cherryTree, 438, 86, 74),
    });
    drawables.push({
      y: 146,
      draw: () => drawProp(ctx, sheet.cherryTree, 456, 152, 86, true),
    });

    // Vintage Glowing Streetlamps from art board
    drawables.push({
      y: 108,
      draw: () => drawProp(ctx, sheet.streetlamp, 132, 112, 48),
    });
    drawables.push({
      y: 210,
      draw: () => drawProp(ctx, sheet.streetlamp, 136, 214, 46),
    });
    drawables.push({
      y: 122,
      draw: () => drawProp(ctx, sheet.streetlamp, 252, 126, 46),
    });
    drawables.push({
      y: 176,
      draw: () => drawProp(ctx, sheet.streetlamp, 422, 180, 48),
    });
  }

  const romance = getRomanceSpriteSheet();
  const showRomancePose = Boolean(
    zone === 'overlook' &&
      romance &&
      state.coupleAnim &&
      (state.coupleAnim.persistent || state.coupleAnim.timer > 0)
  );

  if (showRomancePose && romance && state.coupleAnim) {
    // Unified pixel-art romance pose includes Meriem, Ayoub, white bunny & black cat together!
    drawRomancePoseScene(ctx, time, state.coupleAnim, romance);
  } else {
    // Meriem
    drawables.push({
      y: player.y,
      draw: () => drawPlayer(ctx, player, time, sheet),
    });

    // Fluffy White Bunny follower (Cottage, Courtyard, and Starry City Terrace)
    if (zone === 'cottage' || bunny.following || zone === 'overlook') {
      drawables.push({
        y: bunny.y,
        draw: () => drawBunny(ctx, bunny, time, sheet),
      });
    }

    // Ayoub & Sleek Black Cat on the Starry City Terrace
    if (zone === 'overlook') {
      drawables.push({
        y: npc.y,
        draw: () => drawTargetNpc(ctx, npc, time, sheet),
      });
      drawables.push({
        y: cat.y,
        draw: () => drawBlackCat(ctx, cat, time, sheet),
      });
    }

    drawables.sort((a, b) => a.y - b.y);
    for (const item of drawables) {
      item.draw();
    }
  }

  // 3. Atmospheric lighting, lantern halos & fireplace-reactive player radial glow
  drawZoneLighting(ctx, zone, time, player);

  // 4. Floating particles (cherry blossom petals, hearts, fireflies, embers)
  drawParticles(ctx, particles, sheet);

  ctx.restore();
}
