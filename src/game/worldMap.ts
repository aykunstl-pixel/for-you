import { InteractableObject, Rect, ZoneId } from './types';

/**
 * Fixed-Camera Full Side-to-Side Diorama Viewport (480 × 288)
 * Each of the 3 zones matches its corresponding panel on the art board:
 * 1. Cozy Cottage Interior (Middle-Left Panel)
 * 2. Cherry Blossom Courtyard & Bridge (Top Banner + Middle-Center Shrine Panel)
 * 3. Starry City Terrace Finale (Middle-Right Panel)
 */
export const VIEWPORT_WIDTH = 480;
export const VIEWPORT_HEIGHT = 288;
export const RENDER_SCALE = 2;

export const OVERLOOK_PASSCODE = '1002';

export const INITIAL_ZONE: ZoneId = 'cottage';

// Zone 1: Meriem stands in the center of the pink area rug
export const INITIAL_PLAYER_POS = {
  x: 244,
  y: 204,
};

/** Spawn coordinates when transitioning between the 3 fixed-camera zones */
export const ZONE_SPAWNS = {
  // Stepping back inside the cottage front door puts Meriem at the south doormat
  cottageFromGarden: { x: 240, y: 246 },
  // Stepping out the cottage front door puts Meriem right on the cobblestone front porch
  gardenFromCottage: { x: 196, y: 108 },
  // Stepping through the Torii shrine archway puts Meriem at the Starry City Terrace entry
  overlookFromGate: { x: 240, y: 262 },
} as const;

/** Fluffy White Bunny waiting on the pink rug beside Meriem inside the Cozy Cottage */
export const INITIAL_BUNNY_POS = {
  x: 194,
  y: 214,
};

/** Ayoub waiting on the pink-striped picnic blanket on the Starry City Terrace */
export const TARGET_NPC_POS = {
  x: 256,
  y: 204,
};

/** Sleek Black Cat sitting right beside Ayoub on the Starry City Terrace */
export const CAT_POS = {
  x: 292,
  y: 206,
};

/** Where the white bunny hops to sit on Meriem's left on the picnic blanket */
export const BUNNY_CUTSCENE_POS = {
  x: 190,
  y: 206,
};

/** Cottage fireplace center (back-right wall) for fireplace-reactive radial glow */
export const FIREPLACE_LIGHT_CENTER = {
  x: 320,
  y: 96,
};

/** South-center Cottage front doorway threshold -> exits into Cherry Blossom Courtyard */
export const COTTAGE_EXIT_ZONE: Rect = {
  x: 204,
  y: 268,
  w: 72,
  h: 20,
};

/** Arched Cottage front door in Courtyard -> enters Cozy Cottage Interior */
export const GARDEN_TO_COTTAGE_ZONE: Rect = {
  x: 180,
  y: 68,
  w: 36,
  h: 22,
};

/** Shrine / Torii-style Garden Archway at top-right of Courtyard -> Starry City Terrace */
export const OVERLOOK_GATE_RECT: Rect = {
  x: 344,
  y: 26,
  w: 76,
  h: 34,
};

export const GARDEN_TO_OVERLOOK_ZONE: Rect = {
  x: 350,
  y: 22,
  w: 64,
  h: 28,
};

export function getZoneTitle(zone: ZoneId): string {
  switch (zone) {
    case 'cottage':
      return 'Cozy Cottage';
    case 'garden':
      return 'Cherry Blossom Courtyard';
    case 'overlook':
      return 'Starry City Terrace';
  }
}

/**
 * Clean, forgiving collision rectangles matching all three art-board scenes.
 */
export function getZoneCollisions(zone: ZoneId, gateUnlocked: boolean): Rect[] {
  if (zone === 'cottage') {
    return [
      // Back wall (bookshelf, windows, stone chimney, stone fireplace)
      { x: 0, y: 0, w: VIEWPORT_WIDTH, h: 102 },
      // West & East walls
      { x: 0, y: 0, w: 28, h: VIEWPORT_HEIGHT },
      { x: VIEWPORT_WIDTH - 28, y: 0, w: 28, h: VIEWPORT_HEIGHT },
      // South wall leaving wide open 72px garden exit doorway at x: 204..276
      { x: 0, y: VIEWPORT_HEIGHT - 16, w: 204, h: 16 },
      { x: 276, y: VIEWPORT_HEIGHT - 16, w: 204, h: 16 },

      // Top-Left Bookshelf footprint (Clue 1)
      { x: 42, y: 96, w: 86, h: 20 },
      // Stone Fireplace hearth (back wall right of chimney)
      { x: 282, y: 96, w: 76, h: 18 },
      // Cozy Pink Bed on the right wall
      { x: 376, y: 106, w: 72, h: 98 },
      // Small Wooden Tea Table (bottom-left)
      { x: 36, y: 212, w: 62, h: 36 },
      // Decoy Potted Plant on left wall
      { x: 34, y: 132, w: 24, h: 22 },
      // Rose nightstand & floor lamp (bottom-right)
      { x: 364, y: 226, w: 78, h: 38 },
    ];
  }

  if (zone === 'garden') {
    const rects: Rect[] = [
      // Top-left waterfall & stream bank above the arched wooden bridge
      { x: 0, y: 0, w: 122, h: 142 },
      // Stream channel below the arched wooden bridge (leaves x: 0..122, y: 142..182 bridge & x: 12..64 left island walkable!)
      { x: 64, y: 182, w: 58, h: 106 },
      // Far-west edge behind the Locked Chest bank
      { x: 0, y: 142, w: 12, h: 146 },
      // South edge of courtyard
      { x: 0, y: VIEWPORT_HEIGHT - 14, w: VIEWPORT_WIDTH, h: 14 },
      // East border
      { x: VIEWPORT_WIDTH - 14, y: 0, w: 14, h: VIEWPORT_HEIGHT },

      // Cottage facade at top-left/center (leaves front door open at x: 180..216!)
      { x: 122, y: 0, w: 58, h: 86 },
      { x: 216, y: 0, w: 48, h: 86 },
      // White picket fence left of cottage
      { x: 122, y: 86, w: 46, h: 14 },

      // Stone terrace retaining wall & garden border north-right (leaves Shrine Archway open at x: 344..420!)
      { x: 264, y: 0, w: 80, h: 72 },
      { x: 420, y: 0, w: 60, h: 90 },

      // Cozy Wooden Wishing Bench beneath the central blooming Cherry Blossom Tree (Clue 2)
      { x: 258, y: 92, w: 60, h: 30 },

      // Ornate Stone Water Fountain on the right
      { x: 326, y: 144, w: 64, h: 48 },

      // Locked Wooden Chest across the arched wooden bridge on the left riverbank island (Clue 3)
      { x: 18, y: 198, w: 36, h: 24 },

      // Decorative cherry tree trunk on far east
      { x: 432, y: 112, w: 26, h: 26 },
    ];

    if (!gateUnlocked) {
      rects.push({
        x: OVERLOOK_GATE_RECT.x,
        y: OVERLOOK_GATE_RECT.y,
        w: OVERLOOK_GATE_RECT.w,
        h: OVERLOOK_GATE_RECT.h,
      });
    }
    return rects;
  }

  // Zone 3: Starry City Terrace Finale (Middle-Right Panel)
  return [
    { x: 0, y: 0, w: VIEWPORT_WIDTH, h: 152 }, // Sky, city skyline & terrace balustrade
    { x: 0, y: 0, w: 52, h: VIEWPORT_HEIGHT }, // West terrace planters & edge
    { x: VIEWPORT_WIDTH - 52, y: 0, w: 52, h: VIEWPORT_HEIGHT }, // East terrace railing
    { x: 0, y: VIEWPORT_HEIGHT - 14, w: VIEWPORT_WIDTH, h: 14 }, // South terrace floor edge
    // Astronomical Telescope on right
    { x: 380, y: 162, w: 38, h: 36 },
  ];
}

export function getZoneInteractables(zone: ZoneId): InteractableObject[] {
  if (zone === 'cottage') {
    return [
      {
        id: 'bookshelf',
        label: 'Bookshelf',
        x: 38,
        y: 92,
        w: 96,
        h: 40,
        promptX: 84,
        promptY: 50,
        isKeyClue: true,
      },
      {
        id: 'fireplace',
        label: 'Stone Fireplace',
        x: 276,
        y: 92,
        w: 88,
        h: 38,
        promptX: 320,
        promptY: 50,
        isKeyClue: false,
      },
      {
        id: 'decoy_plant',
        label: 'Potted Plant',
        x: 30,
        y: 128,
        w: 38,
        h: 34,
        promptX: 52,
        promptY: 118,
        isKeyClue: false,
      },
      {
        id: 'bed',
        label: 'Cozy Bed',
        x: 364,
        y: 108,
        w: 82,
        h: 96,
        promptX: 408,
        promptY: 96,
        isKeyClue: false,
      },
    ];
  }

  if (zone === 'garden') {
    return [
      {
        id: 'wishing_bench',
        label: 'Wishing Bench',
        x: 248,
        y: 86,
        w: 82,
        h: 48,
        promptX: 288,
        promptY: 74,
        isKeyClue: true,
      },
      {
        id: 'chest',
        label: 'Locked Chest',
        x: 12,
        y: 186,
        w: 50,
        h: 46,
        promptX: 36,
        promptY: 176,
        isKeyClue: true,
      },
      {
        id: 'overlook_gate',
        label: 'Shrine Archway',
        x: 340,
        y: 34,
        w: 84,
        h: 46,
        promptX: 382,
        promptY: 18,
        isKeyClue: true,
      },
      {
        id: 'fountain',
        label: 'Stone Fountain',
        x: 318,
        y: 136,
        w: 80,
        h: 64,
        promptX: 358,
        promptY: 122,
        isKeyClue: false,
      },
    ];
  }

  // Zone 3: Starry City Terrace
  return [
    {
      id: 'telescope',
      label: 'Telescope',
      x: 368,
      y: 154,
      w: 56,
      h: 52,
      promptX: 398,
      promptY: 142,
      isKeyClue: false,
    },
  ];
}

export const STORY_TEXT = {
  bookshelf:
    "It's a heavily thumbed-through storybook. A bookmark slipped between the pages has messy handwriting: 'I was going to hide a key here... but wait, I forgot where I actually put it. Go outside and check the wooden bench under the cherry blossom tree! Oh, and you look kute today, Meriem.'",
  wishingBenchFirst:
    "Soft cherry blossom petals drift across the wooden wishing bench beside a Brass Key and a scribbled note: 'tqke this key, cross the wooden bridge over the river, and unlock the chest on the other side! Something special is waiting inside for you. ❤️'",
  wishingBenchRepeat:
    "Soft cherry blossom petals drift across the wooden wishing bench beside the scribbled note: 'tqke this key, cross the wooden bridge over the river, and unlock the chest on the other side! Something special is waiting inside for you. ❤️'",
  chestLocked: '[Locked Chest]',
  chestUnlocked:
    "A note inside says: 'You found it! I hope you're ready to find me. The final passcode to the gate is 1002 (the day we became together). I can't wait to see you—I love everything about you! Head up the stone steps to the Starry Overlook!'",
  overlookGateUnlockedHint:
    'The shrine archway lantern glows warmly! Walk up the stone steps to the Starry City Terrace.',
  fireplaceFlavor:
    'Golden embers crackle softly inside the stone hearth, filling the cottage with cozy amber warmth.',
  fountainFlavor:
    'Clear twilight water cascades down the stone fountain tiers, sparkling beneath the cherry blossoms.',
  bedFlavor:
    'A plush pink quilt and soft pillows—too cozy to nap right now while there is a surprise waiting outside!',
  telescopeFlavor:
    'Through the brass telescope, the crescent moon glows bright above the shimmering twilight city lights.',
  decoyPlant:
    "You peek under the potted plant and find a folded sticky note: 'hehehehe , i forgot to put anything here'",
  petBunny: 'You pet the fluffy white bunny. It happily hops in a circle!',
  petCat: 'You pet the black cat. It purrs softly and leans into your hand!',
  endingLoveMessage: 'n7abk bzaf meriem , u r litaraly my evrything , mwah <3',
} as const;
