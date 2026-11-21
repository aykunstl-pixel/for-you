// ============================================================================
// HIGH-RESOLUTION PIXEL ART RASTERIZER TOOLKIT
// Draws smooth curved silhouettes, tapered anatomy, organic hair curls,
// multi-tone shading, and crisp 1-pixel outlines without blocky rectangles.
// ============================================================================

class PixelGrid {
  public readonly width: number;
  public readonly height: number;
  private readonly pixels: Array<string | null>;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.pixels = new Array<string | null>(width * height).fill(null);
  }

  public get(x: number, y: number): string | null {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) return null;
    return this.pixels[iy * this.width + ix];
  }

  public set(x: number, y: number, color: string | null): void {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) return;
    this.pixels[iy * this.width + ix] = color;
  }

  public setIfFilled(x: number, y: number, color: string): void {
    if (this.get(x, y) !== null) {
      this.set(x, y, color);
    }
  }

  public rect(x: number, y: number, w: number, h: number, color: string): void {
    const x0 = Math.round(x);
    const y0 = Math.round(y);
    const x1 = Math.round(x + w);
    const y1 = Math.round(y + h);
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        this.set(px, py, color);
      }
    }
  }

  public fillEllipse(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    color: string
  ): void {
    if (rx <= 0 || ry <= 0) return;
    const minX = Math.floor(cx - rx - 1);
    const maxX = Math.ceil(cx + rx + 1);
    const minY = Math.floor(cy - ry - 1);
    const maxY = Math.ceil(cy + ry + 1);
    for (let py = minY; py <= maxY; py++) {
      const dy = (py - cy) / ry;
      for (let px = minX; px <= maxX; px++) {
        const dx = (px - cx) / rx;
        if (dx * dx + dy * dy <= 1.0) {
          this.set(px, py, color);
        }
      }
    }
  }

  public fillEllipseClipped(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    color: string
  ): void {
    if (rx <= 0 || ry <= 0) return;
    const minX = Math.floor(cx - rx - 1);
    const maxX = Math.ceil(cx + rx + 1);
    const minY = Math.floor(cy - ry - 1);
    const maxY = Math.ceil(cy + ry + 1);
    for (let py = minY; py <= maxY; py++) {
      const dy = (py - cy) / ry;
      for (let px = minX; px <= maxX; px++) {
        const dx = (px - cx) / rx;
        if (dx * dx + dy * dy <= 1.0 && this.get(px, py) !== null) {
          this.set(px, py, color);
        }
      }
    }
  }

  public fillRoundedRect(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    color: string
  ): void {
    const rad = Math.min(r, w / 2, h / 2);
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.ceil(x + w) - 1;
    const y1 = Math.ceil(y + h) - 1;
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const cx = Math.max(x + rad, Math.min(x + w - 1 - rad, px));
        const cy = Math.max(y + rad, Math.min(y + h - 1 - rad, py));
        const dx = px - cx;
        const dy = py - cy;
        if (dx * dx + dy * dy <= rad * rad + 0.25) {
          this.set(px, py, color);
        }
      }
    }
  }

  public fillPolygon(points: Array<[number, number]>, color: string): void {
    if (points.length < 3) return;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, py] of points) {
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }
    const startY = Math.max(0, Math.floor(minY));
    const endY = Math.min(this.height - 1, Math.ceil(maxY));

    for (let y = startY; y <= endY; y++) {
      const sy = y + 0.5;
      const intersections: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[(i + 1) % points.length];
        if ((y1 <= sy && y2 > sy) || (y2 <= sy && y1 > sy)) {
          const t = (sy - y1) / (y2 - y1);
          intersections.push(x1 + t * (x2 - x1));
        }
      }
      intersections.sort((a, b) => a - b);
      for (let i = 0; i + 1 < intersections.length; i += 2) {
        const sx = Math.max(0, Math.round(intersections[i]));
        const ex = Math.min(this.width - 1, Math.round(intersections[i + 1]));
        for (let x = sx; x <= ex; x++) {
          this.set(x, y, color);
        }
      }
    }
  }

  public strokeSegment(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    radius: number,
    color: string
  ): void {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(dist * 2));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = x0 + (x1 - x0) * t;
      const py = y0 + (y1 - y0) * t;
      if (radius <= 0.6) {
        this.set(px, py, color);
      } else {
        this.fillEllipse(px, py, radius, radius, color);
      }
    }
  }

  public strokeQuadCurve(
    x0: number,
    y0: number,
    cx: number,
    cy: number,
    x1: number,
    y1: number,
    radius: number,
    color: string,
    endRadius?: number
  ): void {
    const approxLen = Math.hypot(cx - x0, cy - y0) + Math.hypot(x1 - cx, y1 - cy);
    const steps = Math.max(8, Math.ceil(approxLen * 2.5));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const mt = 1 - t;
      const px = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
      const py = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
      const r =
        endRadius !== undefined ? radius + (endRadius - radius) * t : radius;
      if (r <= 0.6) {
        this.set(px, py, color);
      } else {
        this.fillEllipse(px, py, r, r, color);
      }
    }
  }

  /** Blit another layer on top, optionally adding a crisp 1px colored outline first */
  public stampLayer(layer: PixelGrid, outlineColor?: string): void {
    if (outlineColor) {
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          if (layer.get(x, y) !== null) continue;
          if (
            layer.get(x - 1, y) !== null ||
            layer.get(x + 1, y) !== null ||
            layer.get(x, y - 1) !== null ||
            layer.get(x, y + 1) !== null
          ) {
            this.set(x, y, outlineColor);
          }
        }
      }
    }
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const c = layer.get(x, y);
        if (c !== null) {
          this.set(x, y, c);
        }
      }
    }
  }

  /** Adds a crisp 1px outer silhouette outline around all currently filled pixels */
  public addOuterOutline(outlineColor: string): void {
    const edge: Array<[number, number]> = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.get(x, y) !== null) continue;
        if (
          this.get(x - 1, y) !== null ||
          this.get(x + 1, y) !== null ||
          this.get(x, y - 1) !== null ||
          this.get(x, y + 1) !== null
        ) {
          edge.push([x, y]);
        }
      }
    }
    for (const [x, y] of edge) {
      this.set(x, y, outlineColor);
    }
  }

  public toCanvas(): HTMLCanvasElement {
    const [canvas, ctx] = createOffscreen(this.width, this.height);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const c = this.pixels[y * this.width + x];
        if (c !== null) {
          ctx.fillStyle = c;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    return canvas;
  }
}

function createOffscreen(
  w: number,
  h: number
): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [canvas, ctx];
}

function flipCanvasHorizontal(src: HTMLCanvasElement): HTMLCanvasElement {
  const [out, ctx] = createOffscreen(src.width, src.height);
  ctx.translate(src.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  return out;
}

// ============================================================================
// HER COMPANION — FLUFFY WHITE BUNNY (HIGH-RES 32×32 MOONFROST PIXEL SPRITE)
// Rounded long ears with pink inner stripe, fluffy cheeks, little pink nose,
// scalloped cottontail, cozy ear-twitch loaf idle, bouncy 4-frame hop & pet!
// ============================================================================

const BUNNY_PAL = {
  out: '#5e4c5a',
  furHi: '#fffefa',
  fur: '#faf3f3',
  furShade: '#e5d5de',
  furDeep: '#cfbcc8',
  pink: '#f7a5ba',
  pinkDeep: '#e07a96',
  eye: '#261c27',
  eyeIris: '#543c52',
  eyeHi: '#ffffff',
  blush: '#fab5c6',
};

function buildWhiteBunnySprite(
  mode: 'idle' | 'hop' | 'pet',
  frame: number
): HTMLCanvasElement {
  const g = new PixelGrid(32, 32);
  const f = frame % 4;

  let bob = 0;
  let earBackAngle = 0;
  let earFrontAngle = 0;
  let noseTwitch = 0;
  let blink = false;
  let happyEyes = false;
  let stretched = false;
  let crouch = false;

  if (mode === 'idle') {
    bob = f === 1 ? -1 : 0;
    earFrontAngle = f === 1 ? 1.8 : 0;
    earBackAngle = f === 2 ? -1.8 : 0;
    noseTwitch = f === 2 ? -1 : 0;
    blink = f === 3;
  } else if (mode === 'hop') {
    crouch = f === 0;
    bob = [1, -4, -6, 0][f];
    stretched = f === 1 || f === 2;
    earBackAngle = stretched ? -4.5 : crouch ? -1.5 : 0;
    earFrontAngle = stretched ? -3.5 : crouch ? -1.0 : 0;
  } else {
    bob = [0, -4, -2, -1][f];
    earFrontAngle = f % 2 === 0 ? 2.2 : -1.5;
    earBackAngle = f % 2 === 1 ? 2.0 : -2.0;
    happyEyes = true;
  }

  const by = bob + (crouch ? 1 : 0);

  // 1. Back long rounded bunny ear
  const backEar = new PixelGrid(32, 32);
  backEar.strokeQuadCurve(
    17,
    13 + by,
    15 + earBackAngle * 0.6,
    8 + by,
    14 + earBackAngle,
    4 + by,
    2.2,
    BUNNY_PAL.furShade,
    1.7
  );
  backEar.strokeQuadCurve(
    17,
    12 + by,
    15.3 + earBackAngle * 0.6,
    8 + by,
    14.5 + earBackAngle,
    4.8 + by,
    1.0,
    BUNNY_PAL.fur,
    0.8
  );
  g.stampLayer(backEar, BUNNY_PAL.out);

  // 2. Fluffy scalloped cottontail
  const tail = new PixelGrid(32, 32);
  tail.fillEllipse(5.5, 22.5 + by, 3.4, 3.2, BUNNY_PAL.furHi);
  tail.fillEllipse(4.5, 21.0 + by, 2.2, 2.2, BUNNY_PAL.furHi);
  tail.fillEllipse(6.5, 24.0 + by, 2.2, 1.8, BUNNY_PAL.furShade);
  g.stampLayer(tail, BUNNY_PAL.out);

  // 3. Plump Fluffy Body & Natural Hopping / Tucked Paws
  const body = new PixelGrid(32, 32);
  if (stretched) {
    // Stretched airborne bounding body
    body.fillEllipse(14, 20.5 + by, 8.2, 5.2, BUNNY_PAL.fur);
    body.fillEllipse(15, 19.0 + by, 6.2, 3.2, BUNNY_PAL.furHi);
    body.fillEllipseClipped(13.5, 24.5 + by, 7.2, 2.2, BUNNY_PAL.furShade);
    // Extended bounding hind foot & front paws
    body.strokeSegment(9, 23 + by, 4.5, 26.5 + by, 2.1, BUNNY_PAL.fur);
    body.fillEllipse(4.5, 26.8 + by, 2.4, 1.6, BUNNY_PAL.furShade);
    body.strokeSegment(19, 22.5 + by, 24.5, 25.2 + by, 1.9, BUNNY_PAL.furHi);
  } else {
    // Cozy rounded bunny loaf
    body.fillEllipse(13.5, 22.2 + by, 8.5, 6.2, BUNNY_PAL.fur);
    body.fillEllipse(14.5, 20.2 + by, 6.5, 4.0, BUNNY_PAL.furHi);
    body.fillEllipseClipped(13.0, 26.8 + by, 7.8, 2.5, BUNNY_PAL.furShade);
    body.fillEllipseClipped(13.0, 28.0 + by, 6.5, 1.5, BUNNY_PAL.furDeep);
    // Fluffy chest tuft & neat tucked front paws
    body.fillEllipse(20.5, 24.2 + by, 3.0, 2.8, BUNNY_PAL.furHi);
    body.fillEllipse(21.0, 27.2 + by, 2.6, 1.7, BUNNY_PAL.fur);
    body.fillEllipse(10.0, 27.2 + by, 3.4, 1.7, BUNNY_PAL.furShade);
  }
  g.stampLayer(body, BUNNY_PAL.out);

  // 4. Rounded Bunny Head with Fluffy Cheeks
  const head = new PixelGrid(32, 32);
  head.fillEllipse(20.5, 16.5 + by, 6.2, 5.8, BUNNY_PAL.fur);
  head.fillEllipse(21.0, 14.5 + by, 4.8, 3.6, BUNNY_PAL.furHi);
  // Soft cheek fluff bulge
  head.fillEllipse(19.0, 19.2 + by, 4.5, 3.2, BUNNY_PAL.fur);
  head.fillEllipse(23.5, 18.2 + by, 3.8, 3.2, BUNNY_PAL.fur);
  head.fillEllipseClipped(20.5, 21.5 + by, 5.2, 1.8, BUNNY_PAL.furShade);
  g.stampLayer(head, BUNNY_PAL.out);

  // 5. Front Long Rounded Ear with Pastel Pink Inner Ear
  const frontEar = new PixelGrid(32, 32);
  frontEar.strokeQuadCurve(
    20.2,
    12.5 + by,
    19.8 + earFrontAngle * 0.6,
    7.5 + by,
    19.5 + earFrontAngle,
    3.5 + by,
    2.4,
    BUNNY_PAL.furHi,
    1.8
  );
  frontEar.strokeQuadCurve(
    20.4,
    11.8 + by,
    20.1 + earFrontAngle * 0.6,
    7.6 + by,
    19.8 + earFrontAngle,
    4.6 + by,
    1.1,
    BUNNY_PAL.pink,
    0.75
  );
  g.stampLayer(frontEar, BUNNY_PAL.out);

  // 6. Expressive Glossy Eye, Rosy Cheek Blush & Cute Little Pink Nose
  if (happyEyes) {
    g.strokeQuadCurve(20.5, 16.8 + by, 22.0, 15.0 + by, 23.5, 16.8 + by, 0.55, BUNNY_PAL.eye);
    g.fillEllipse(20.2, 18.8 + by, 1.8, 1.0, BUNNY_PAL.blush);
  } else if (blink) {
    g.strokeSegment(20.6, 16.6 + by, 23.4, 16.6 + by, 0.5, BUNNY_PAL.eye);
    g.fillEllipse(20.2, 18.8 + by, 1.7, 0.9, BUNNY_PAL.blush);
  } else {
    g.fillEllipse(22.0, 16.2 + by, 1.5, 1.7, BUNNY_PAL.eye);
    g.set(22.3, 17.2 + by, BUNNY_PAL.eyeIris);
    g.set(21.4, 15.4 + by, BUNNY_PAL.eyeHi);
    g.fillEllipse(20.0, 18.8 + by, 1.7, 0.9, BUNNY_PAL.blush);
  }

  // Cute twitching little pink nose + tiny bunny mouth
  g.fillEllipse(26.4, 17.6 + by + noseTwitch * 0.5, 1.3, 1.0, BUNNY_PAL.pinkDeep);
  g.set(26.0, 17.2 + by + noseTwitch * 0.5, BUNNY_PAL.pink);
  g.set(25.6, 19.2 + by, BUNNY_PAL.out);

  return g.toCanvas();
}

// ============================================================================
// HIS COMPANION — SLEEK BLACK CAT (HIGH-RES 32×32 MOONFROST PIXEL SPRITE)
// Pointed tufted ears, bright golden-green eyes, curved animated S-wave tail,
// smooth feline seated anatomy, and multi-tone charcoal shading
// ============================================================================

const CAT_PAL = {
  out: '#0c0b14',
  furDeep: '#171524',
  furMid: '#242138',
  furLit: '#363252',
  furHi: '#4e4873',
  earIn: '#4b3b5e',
  eyeGlow: '#cbf76f',
  eyeGold: '#ffdf66',
  pupil: '#13111c',
  eyeHi: '#ffffff',
  nose: '#de8ca0',
  blush: '#cc6e8a',
  whisker: '#4d4869',
};

function buildBlackCatSprite(
  mode: 'idle' | 'pet',
  frame: number
): HTMLCanvasElement {
  const g = new PixelGrid(32, 32);
  const f = mode === 'idle' ? frame % 6 : frame % 4;
  const bob = mode === 'pet' ? (f % 2 === 1 ? -1 : 0) : 0;
  const blink = mode === 'idle' && f === 5;
  const happyEyes = mode === 'pet';

  // 1. Smooth Curved Animated Tail (S-wave swish in idle; affectionate curl when petted!)
  const tail = new PixelGrid(32, 32);
  if (mode === 'pet') {
    const sway = [0, 1.8, 2.2, 0.8][f];
    tail.strokeQuadCurve(20, 26 + bob, 26.5, 22 + bob, 25.0 + sway, 12.5 + bob, 1.8, CAT_PAL.furDeep, 1.3);
    tail.strokeQuadCurve(25.0 + sway, 12.5 + bob, 24.5 + sway, 9.2 + bob, 22.0 + sway, 9.6 + bob, 1.3, CAT_PAL.furMid, 1.0);
    tail.strokeQuadCurve(21, 25 + bob, 25.5, 21 + bob, 24.8 + sway, 13.5 + bob, 0.7, CAT_PAL.furLit);
  } else {
    const tipX = [25.5, 27.2, 28.4, 27.4, 25.6, 24.2][f];
    const tipY = [15.0, 14.0, 15.2, 16.2, 15.4, 14.4][f];
    const ctrlX = [25.0, 26.2, 26.8, 26.0, 25.0, 24.4][f];
    tail.strokeQuadCurve(20, 26.5, ctrlX, 23.5, tipX, tipY, 1.8, CAT_PAL.furDeep, 1.2);
    tail.strokeQuadCurve(21, 25.8, ctrlX - 0.4, 23.0, tipX - 0.3, tipY + 0.6, 0.7, CAT_PAL.furLit, 0.5);
  }
  g.stampLayer(tail, CAT_PAL.out);

  // 2. Graceful Seated Feline Body, Arched Haunches & Neat Tucked Paws
  const body = new PixelGrid(32, 32);
  // Sleek haunches & torso
  body.fillEllipse(15.5, 22.8 + bob, 6.8, 6.4, CAT_PAL.furDeep);
  body.fillPolygon(
    [
      [11.0, 16.5 + bob],
      [20.0, 16.5 + bob],
      [21.6, 27.5 + bob],
      [9.4, 27.5 + bob],
    ],
    CAT_PAL.furDeep
  );
  // Silky charcoal chest & shoulder sheen so the cat looks lush, not flat black!
  body.fillEllipse(15.5, 21.0 + bob, 4.4, 4.8, CAT_PAL.furMid);
  body.fillEllipse(15.5, 19.6 + bob, 2.6, 2.8, CAT_PAL.furLit);
  body.strokeQuadCurve(10.5, 21 + bob, 10.2, 24 + bob, 11.4, 26.8 + bob, 0.8, CAT_PAL.furMid);
  // Neat tucked front legs & cute little paws
  body.fillEllipse(12.6, 28.0 + bob, 2.4, 1.6, CAT_PAL.furMid);
  body.fillEllipse(18.4, 28.0 + bob, 2.4, 1.6, CAT_PAL.furMid);
  body.set(12.0, 27.5 + bob, CAT_PAL.furLit);
  body.set(18.0, 27.5 + bob, CAT_PAL.furLit);
  g.stampLayer(body, CAT_PAL.out);

  // 3. Sleek Head, Cheek Fluff & Pointed Tufted Cat Ears
  const head = new PixelGrid(32, 32);
  // Pointed triangular ears
  head.fillPolygon(
    [
      [9.5, 11.5 + bob],
      [10.2, 4.5 + bob],
      [14.5, 8.8 + bob],
    ],
    CAT_PAL.furDeep
  );
  head.fillPolygon(
    [
      [10.6, 10.2 + bob],
      [10.9, 6.4 + bob],
      [13.4, 9.0 + bob],
    ],
    CAT_PAL.earIn
  );
  head.fillPolygon(
    [
      [21.5, 11.5 + bob],
      [20.8, 4.5 + bob],
      [16.5, 8.8 + bob],
    ],
    CAT_PAL.furDeep
  );
  head.fillPolygon(
    [
      [20.4, 10.2 + bob],
      [20.1, 6.4 + bob],
      [17.6, 9.0 + bob],
    ],
    CAT_PAL.earIn
  );
  // Rounded sleek feline head + soft cheek tufts
  head.fillEllipse(15.5, 13.0 + bob, 6.4, 5.4, CAT_PAL.furDeep);
  head.fillEllipse(15.5, 14.0 + bob, 7.0, 3.8, CAT_PAL.furDeep);
  head.fillEllipse(15.5, 12.2 + bob, 4.8, 3.6, CAT_PAL.furMid);
  head.strokeQuadCurve(12.5, 9.2 + bob, 15.5, 8.4 + bob, 18.5, 9.2 + bob, 0.75, CAT_PAL.furLit);
  head.set(14.5, 8.8 + bob, CAT_PAL.furHi);
  head.set(16.5, 8.8 + bob, CAT_PAL.furHi);
  g.stampLayer(head, CAT_PAL.out);

  // Delicate whiskers
  g.set(7, 14 + bob, CAT_PAL.whisker);
  g.set(8, 14 + bob, CAT_PAL.whisker);
  g.set(7, 15.5 + bob, CAT_PAL.whisker);
  g.set(23, 14 + bob, CAT_PAL.whisker);
  g.set(24, 14 + bob, CAT_PAL.whisker);
  g.set(24, 15.5 + bob, CAT_PAL.whisker);

  // 4. Bright Glowing Golden-Green Cat Eyes OR Blissful Purring Smile
  if (happyEyes) {
    g.strokeQuadCurve(10.8, 13.4 + bob, 12.4, 11.8 + bob, 14.0, 13.4 + bob, 0.55, CAT_PAL.eyeGold);
    g.set(12.4, 12.0 + bob, CAT_PAL.eyeGlow);
    g.strokeQuadCurve(17.0, 13.4 + bob, 18.6, 11.8 + bob, 20.2, 13.4 + bob, 0.55, CAT_PAL.eyeGold);
    g.set(18.6, 12.0 + bob, CAT_PAL.eyeGlow);
    g.fillEllipse(10.8, 15.0 + bob, 1.3, 0.7, CAT_PAL.blush);
    g.fillEllipse(20.2, 15.0 + bob, 1.3, 0.7, CAT_PAL.blush);
  } else if (blink) {
    g.strokeSegment(11.0, 13.2 + bob, 14.0, 13.2 + bob, 0.5, CAT_PAL.furHi);
    g.strokeSegment(17.0, 13.2 + bob, 20.0, 13.2 + bob, 0.5, CAT_PAL.furHi);
  } else {
    // Left bright golden-green almond eye
    g.fillEllipse(12.4, 12.8 + bob, 1.9, 1.5, CAT_PAL.eyeGlow);
    g.rect(11.0, 13.0 + bob, 2.8, 1.1, CAT_PAL.eyeGold);
    g.rect(12.0, 11.6 + bob, 1.0, 2.6, CAT_PAL.pupil);
    g.set(11.4, 12.0 + bob, CAT_PAL.eyeHi);

    // Right bright golden-green almond eye
    g.fillEllipse(18.6, 12.8 + bob, 1.9, 1.5, CAT_PAL.eyeGlow);
    g.rect(17.2, 13.0 + bob, 2.8, 1.1, CAT_PAL.eyeGold);
    g.rect(18.0, 11.6 + bob, 1.0, 2.6, CAT_PAL.pupil);
    g.set(17.6, 12.0 + bob, CAT_PAL.eyeHi);
  }

  // Tiny pink nose & cute 'w' cat mouth
  g.rect(14.8, 14.8 + bob, 1.6, 1.0, CAT_PAL.nose);
  g.set(14.2, 16.0 + bob, CAT_PAL.furHi);
  g.set(15.5, 15.8 + bob, CAT_PAL.furHi);
  g.set(16.8, 16.0 + bob, CAT_PAL.furHi);

  return g.toCanvas();
}

// ============================================================================
// PASTEL-GOLD BRASS KEY & SOFT ROSE PIXEL HEART
// ============================================================================

export function buildBrassKeyIcon(): HTMLCanvasElement {
  const g = new PixelGrid(16, 16);
  const out = '#6b472a';
  const dark = '#bd8337';
  const mid = '#ebc063';
  const hi = '#fff0b0';

  g.rect(3, 4, 6, 8, out);
  g.rect(2, 5, 8, 6, out);
  g.rect(3, 5, 6, 6, dark);
  g.rect(4, 5, 4, 5, mid);
  g.rect(4, 5, 2, 2, hi);
  g.rect(5, 7, 2, 2, out);

  g.rect(9, 6, 6, 4, out);
  g.rect(9, 7, 5, 2, mid);
  g.rect(9, 7, 4, 1, hi);
  g.rect(11, 9, 2, 3, out);
  g.rect(12, 9, 1, 2, mid);
  g.rect(14, 9, 2, 3, out);
  g.rect(14, 9, 1, 2, dark);

  return g.toCanvas();
}

export function drawPixelHeart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale = 1,
  color = '#f57aa0'
): void {
  const s = Math.max(1, Math.round(scale));
  const pattern = [
    ' 11 11 ',
    '1221111',
    '1211111',
    '1111111',
    ' 11111 ',
    '  111  ',
    '   1   ',
  ];
  const ox = Math.round(cx - (pattern[0].length * s) / 2);
  const oy = Math.round(cy - (pattern.length * s) / 2);

  for (let row = 0; row < pattern.length; row++) {
    for (let col = 0; col < pattern[row].length; col++) {
      const ch = pattern[row][col];
      if (ch === ' ') continue;
      ctx.fillStyle = ch === '2' ? '#ffe0eb' : color;
      ctx.fillRect(ox + col * s, oy + row * s, s, s);
    }
  }
}

// ============================================================================
// SPRITE ATLAS CACHE
// ============================================================================

export interface SpriteAtlas {
  brassKey: HTMLCanvasElement;
  bunnyIdleRight: HTMLCanvasElement[];
  bunnyIdleLeft: HTMLCanvasElement[];
  bunnyHopRight: HTMLCanvasElement[];
  bunnyHopLeft: HTMLCanvasElement[];
  bunnyPetRight: HTMLCanvasElement[];
  bunnyPetLeft: HTMLCanvasElement[];
  catIdle: HTMLCanvasElement[];
  catPet: HTMLCanvasElement[];
}

let cachedAtlas: SpriteAtlas | null = null;

export function getSpriteAtlas(): SpriteAtlas {
  if (cachedAtlas) return cachedAtlas;

  const bunnyIdleRight = [0, 1, 2, 3].map((f) => buildWhiteBunnySprite('idle', f));
  const bunnyHopRight = [0, 1, 2, 3].map((f) => buildWhiteBunnySprite('hop', f));
  const bunnyPetRight = [0, 1, 2, 3].map((f) => buildWhiteBunnySprite('pet', f));

  cachedAtlas = {
    brassKey: buildBrassKeyIcon(),
    bunnyIdleRight,
    bunnyIdleLeft: bunnyIdleRight.map(flipCanvasHorizontal),
    bunnyHopRight,
    bunnyHopLeft: bunnyHopRight.map(flipCanvasHorizontal),
    bunnyPetRight,
    bunnyPetLeft: bunnyPetRight.map(flipCanvasHorizontal),
    catIdle: [0, 1, 2, 3, 4, 5].map((f) => buildBlackCatSprite('idle', f)),
    catPet: [0, 1, 2, 3].map((f) => buildBlackCatSprite('pet', f)),
  };

  return cachedAtlas;
}
