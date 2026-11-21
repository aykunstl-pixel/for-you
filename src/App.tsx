import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Gamepad2,
  Heart,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CoupleMenuModal } from './components/CoupleMenuModal';
import { DialogueBox } from './components/DialogueBox';
import { KeypadModal } from './components/KeypadModal';
import { PixelPortrait } from './components/PixelPortrait';
import { TouchControls } from './components/TouchControls';
import { soundEngine } from './game/audio';
import { renderGameWorld } from './game/renderer';
import { preloadRomanceSheet } from './game/romanceSheet';
import { preloadSpriteSheet } from './game/spriteSheet';
import {
  BunnyState,
  CameraState,
  CatState,
  CoupleActionKind,
  CoupleAnimState,
  CutsceneState,
  DialoguePayload,
  Direction,
  FloatingParticle,
  GamePhase,
  GameProgress,
  InputState,
  InteractableObject,
  PlayerState,
  Rect,
  ShootingStar,
  TargetNpcState,
  ZoneId,
} from './game/types';
import {
  BUNNY_CUTSCENE_POS,
  CAT_POS,
  COTTAGE_EXIT_ZONE,
  GARDEN_TO_COTTAGE_ZONE,
  GARDEN_TO_OVERLOOK_ZONE,
  getZoneCollisions,
  getZoneInteractables,
  getZoneTitle,
  INITIAL_BUNNY_POS,
  INITIAL_PLAYER_POS,
  INITIAL_ZONE,
  RENDER_SCALE,
  STORY_TEXT,
  TARGET_NPC_POS,
  VIEWPORT_HEIGHT,
  VIEWPORT_WIDTH,
  ZONE_SPAWNS,
} from './game/worldMap';

const PLAYER_SPEED = 112;
const CUTSCENE_WALK_SPEED = 64;

const GARDEN_FIREFLY_ANCHORS = [
  { x: 196, y: 122 },
  { x: 96, y: 158 },
  { x: 288, y: 124 },
  { x: 358, y: 162 },
  { x: 382, y: 74 },
  { x: 184, y: 222 },
  { x: 422, y: 210 },
];

const OVERLOOK_FIREFLY_ANCHORS = [
  { x: 112, y: 184 },
  { x: 368, y: 186 },
  { x: 196, y: 164 },
  { x: 288, y: 164 },
];

function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function getPlayerFeetBox(x: number, y: number): Rect {
  return {
    x: x - 6,
    y: y - 5,
    w: 12,
    h: 9,
  };
}

function findNearestInteractable(
  zone: ZoneId,
  player: PlayerState,
  gateUnlocked: boolean,
  bunny: BunnyState,
  cat: CatState
): InteractableObject | null {
  const reachOffset =
    player.dir === 'up'
      ? { dx: 0, dy: -14 }
      : player.dir === 'down'
        ? { dx: 0, dy: 12 }
        : player.dir === 'left'
          ? { dx: -14, dy: 0 }
          : { dx: 14, dy: 0 };

  const reachBox: Rect = {
    x: player.x + reachOffset.dx - 15,
    y: player.y + reachOffset.dy - 14,
    w: 30,
    h: 28,
  };

  let best: InteractableObject | null = null;
  let bestScore = Infinity;

  const candidates: InteractableObject[] = [...getZoneInteractables(zone)];

  if (zone === 'cottage' || bunny.following || zone === 'overlook') {
    candidates.push({
      id: 'bunny',
      label: 'Pet Bunny',
      x: bunny.x - 14,
      y: bunny.y - 16,
      w: 28,
      h: 26,
      promptX: bunny.x,
      promptY: bunny.y - 22,
      isKeyClue: false,
    });
  }

  if (zone === 'overlook') {
    candidates.push({
      id: 'cat',
      label: 'Pet Cat',
      x: cat.x - 16,
      y: cat.y - 18,
      w: 32,
      h: 28,
      promptX: cat.x,
      promptY: cat.y - 24,
      isKeyClue: false,
    });
    candidates.push({
      id: 'him_npc',
      label: 'Ayoub',
      x: TARGET_NPC_POS.x - 18,
      y: TARGET_NPC_POS.y - 26,
      w: 36,
      h: 36,
      promptX: TARGET_NPC_POS.x,
      promptY: TARGET_NPC_POS.y - 40,
      isKeyClue: false,
    });
  }

  for (const obj of candidates) {
    if (obj.id === 'overlook_gate' && gateUnlocked && player.y < 70) {
      continue;
    }
    const objBox: Rect = { x: obj.x, y: obj.y, w: obj.w, h: obj.h };
    const cx = obj.x + obj.w / 2;
    const cy = obj.y + obj.h / 2;
    const dist = Math.hypot(player.x - cx, player.y - cy);
    const isPet = obj.id === 'bunny' || obj.id === 'cat';
    const isChar = obj.id === 'him_npc';
    const inRange =
      isPet || isChar
        ? dist <= 36 || rectsOverlap(reachBox, objBox)
        : rectsOverlap(reachBox, objBox);

    if (!inRange) continue;

    // Keep puzzle clues highest priority so the following bunny never blocks clue interactions
    const score = obj.isKeyClue ? dist - 26 : isPet ? dist + 3 : dist;
    if (score < bestScore) {
      bestScore = score;
      best = obj;
    }
  }

  return best;
}

interface BunnyHintState {
  active: boolean;
  phase: 'hopping_out' | 'wiggling' | 'returning';
  timer: number;
  targetX: number;
  targetY: number;
  originX: number;
  originY: number;
  objectiveX: number;
  objectiveY: number;
  cooldown: number;
}

function getActionBadgeMeta(
  obj: InteractableObject,
  progress: GameProgress
): { actionText: string; isHeart: boolean } {
  switch (obj.id) {
    case 'bookshelf':
      return { actionText: 'Inspect Bookshelf', isHeart: false };
    case 'wishing_bench':
      return { actionText: 'Check Bench', isHeart: false };
    case 'chest':
      return {
        actionText: progress.openedChest
          ? 'Read Chest Note'
          : progress.hasBrassKey
            ? 'Open Chest'
            : 'Check Chest',
        isHeart: false,
      };
    case 'overlook_gate':
      return {
        actionText: progress.gateUnlocked ? 'Ascend Steps' : 'Unlock 1002 Gate',
        isHeart: false,
      };
    case 'bunny':
      return { actionText: 'Pet Bunny', isHeart: true };
    case 'cat':
      return { actionText: 'Pet Cat', isHeart: true };
    case 'him_npc':
      return { actionText: 'Talk', isHeart: true };
    case 'fireplace':
      return { actionText: 'Warm Up', isHeart: false };
    case 'fountain':
      return { actionText: 'Admire Fountain', isHeart: false };
    case 'bed':
      return { actionText: 'Check Bed', isHeart: false };
    case 'telescope':
      return { actionText: 'Use Telescope', isHeart: false };
    case 'decoy_plant':
      return { actionText: 'Check Plant', isHeart: false };
    default:
      return { actionText: obj.label, isHeart: false };
  }
}

function getNextZoneObjective(
  zone: ZoneId,
  progress: GameProgress,
  player: PlayerState
): { x: number; y: number } | null {
  if (zone === 'cottage') {
    return !progress.readBookshelf
      ? { x: 86, y: 122 } // Clue 1: Code Geass Bookshelf
      : { x: 240, y: 248 }; // Cottage front door -> Courtyard
  }
  if (zone === 'garden') {
    if (!progress.hasBrassKey) {
      return { x: 288, y: 128 }; // Clue 2: Cherry Blossom Wishing Bench
    }
    if (!progress.openedChest) {
      // Point toward the wooden bridge entrance first if still on east side, then toward the chest
      return player.x > 118 ? { x: 112, y: 162 } : { x: 40, y: 196 };
    }
    if (!progress.gateUnlocked) {
      return { x: 382, y: 88 }; // 1002 Shrine Gate
    }
    return { x: 382, y: 66 }; // Ascend steps to Starry Overlook
  }
  // Zone 3: Starry Overlook — gently point toward Ayoub
  return { x: TARGET_NPC_POS.x - 18, y: TARGET_NPC_POS.y };
}

function getBadgeScreenPercent(
  obj: InteractableObject,
  cam: CameraState
): { leftPct: number; topPct: number } {
  const screenX = (obj.promptX - cam.x) * cam.zoom;
  const screenY = (obj.promptY - 10 - cam.y) * cam.zoom;
  const leftPct = Math.max(12, Math.min(88, (screenX / VIEWPORT_WIDTH) * 100));
  const topPct = Math.max(11, Math.min(84, (screenY / VIEWPORT_HEIGHT) * 100));
  return { leftPct, topPct };
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageWrapperRef = useRef<HTMLDivElement | null>(null);

  // Strict integer scale on desktop/tablet; responsive fit if mobile screen < 480px
  const [stageSize, setStageSize] = useState<{ w: number; h: number }>({
    w: VIEWPORT_WIDTH * 2,
    h: VIEWPORT_HEIGHT * 2,
  });

  const [phase, setPhase] = useState<GamePhase>('TITLE_MENU');
  const [currentZone, setCurrentZone] = useState<ZoneId>(INITIAL_ZONE);
  const [transitionFade, setTransitionFade] = useState<boolean>(false);
  const [progress, setProgress] = useState<GameProgress>({
    readBookshelf: false,
    hasBrassKey: false,
    openedChest: false,
    gateUnlocked: false,
  });
  const [activeDialogue, setActiveDialogue] = useState<DialoguePayload | null>(null);
  const [nearestInteractable, setNearestInteractable] =
    useState<InteractableObject | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showTouchPad, setShowTouchPad] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768
    );
  });
  const [lingeringOnOverlook, setLingeringOnOverlook] = useState(false);
  const [activePersistentPose, setActivePersistentPose] = useState<
    'sit_cuddle' | 'watch_stars' | null
  >(null);

  // Simulation refs
  const phaseRef = useRef<GamePhase>('TITLE_MENU');
  const zoneRef = useRef<ZoneId>(INITIAL_ZONE);
  const isTransitioningRef = useRef<boolean>(false);
  const progressRef = useRef<GameProgress>(progress);
  const playerRef = useRef<PlayerState>({
    x: INITIAL_PLAYER_POS.x,
    y: INITIAL_PLAYER_POS.y,
    dir: 'down',
    animTime: 0,
    isMoving: false,
  });
  const npcRef = useRef<TargetNpcState>({
    x: TARGET_NPC_POS.x,
    y: TARGET_NPC_POS.y,
    dir: 'down',
    waving: false,
    animTime: 0,
  });
  const bunnyRef = useRef<BunnyState>({
    x: INITIAL_BUNNY_POS.x,
    y: INITIAL_BUNNY_POS.y,
    dir: 'right',
    following: false,
    isMoving: false,
    animTime: 0,
    petTimer: 0,
  });
  const catRef = useRef<CatState>({
    x: CAT_POS.x,
    y: CAT_POS.y,
    petTimer: 0,
  });
  const playerTrailRef = useRef<Array<{ x: number; y: number }>>([
    { x: INITIAL_PLAYER_POS.x, y: INITIAL_PLAYER_POS.y },
  ]);
  const lingeringRef = useRef<boolean>(false);
  const returnToLingeringRef = useRef<boolean>(false);
  const inputRef = useRef<InputState>({
    up: false,
    down: false,
    left: false,
    right: false,
  });
  const touchDirRef = useRef<Direction | null>(null);
  const gateOpenAmountRef = useRef<number>(0);
  const particlesRef = useRef<FloatingParticle[]>([]);
  const shootingStarsRef = useRef<ShootingStar[]>([]);
  const nextParticleId = useRef<number>(1);
  const footstepTimerRef = useRef<number>(0);
  const emberTimerRef = useRef<number>(0);
  const fireflyTimerRef = useRef<number>(0.25);
  const petalTimerRef = useRef<number>(0.3);
  const dustTimerRef = useRef<number>(0.25);
  const starTimerRef = useRef<number>(2.4);
  const heartTimerRef = useRef<number>(0);
  const cutsceneRef = useRef<CutsceneState | null>(null);
  const coupleAnimRef = useRef<CoupleAnimState | null>(null);
  const pendingAnimDialogueRef = useRef<{
    timer: number;
    payload: DialoguePayload;
  } | null>(null);
  const cameraRef = useRef<CameraState>({ zoom: 1, x: 0, y: 0 });
  const cameraFocusRef = useRef<{
    x: number;
    y: number;
    zoom: number;
    screenY: number;
  } | null>(null);
  const nearestRef = useRef<InteractableObject | null>(null);
  const actionBadgeRef = useRef<HTMLButtonElement | null>(null);
  const idleTimerRef = useRef<number>(0);
  const bunnyHintRef = useRef<BunnyHintState>({
    active: false,
    phase: 'hopping_out',
    timer: 0,
    targetX: INITIAL_BUNNY_POS.x,
    targetY: INITIAL_BUNNY_POS.y,
    originX: INITIAL_BUNNY_POS.x,
    originY: INITIAL_BUNNY_POS.y,
    objectiveX: 86,
    objectiveY: 122,
    cooldown: 0,
  });

  useEffect(() => {
    preloadSpriteSheet();
    preloadRomanceSheet();
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    lingeringRef.current = lingeringOnOverlook;
  }, [lingeringOnOverlook]);

  // Compute strict integer scale whenever room fits (1x, 2x, 3x), or crisp aspect fit on narrow phones
  useEffect(() => {
    const el = stageWrapperRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      const availW = Math.max(240, rect.width - 8);
      const availH = Math.max(160, rect.height - 8);
      const intScale = Math.floor(
        Math.min(availW / VIEWPORT_WIDTH, availH / VIEWPORT_HEIGHT)
      );
      if (intScale >= 1) {
        setStageSize({
          w: VIEWPORT_WIDTH * intScale,
          h: VIEWPORT_HEIGHT * intScale,
        });
      } else {
        const fitScale = Math.min(availW / VIEWPORT_WIDTH, availH / VIEWPORT_HEIGHT);
        setStageSize({
          w: Math.floor(VIEWPORT_WIDTH * fitScale),
          h: Math.floor(VIEWPORT_HEIGHT * fitScale),
        });
      }
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    window.addEventListener('resize', updateSize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [showTouchPad, phase]);

  const seedZoneParticles = useCallback((zone: ZoneId) => {
    particlesRef.current = [];
    if (zone === 'cottage') {
      for (let i = 0; i < 8; i++) {
        particlesRef.current.push({
          id: nextParticleId.current++,
          kind: 'dust_mote',
          x: 50 + Math.random() * 380,
          y: 96 + Math.random() * 155,
          vx: (Math.random() - 0.5) * 3.5,
          vy: -(3.5 + Math.random() * 4),
          life: Math.random() * 2.5,
          maxLife: 4.5 + Math.random() * 2.5,
          size: Math.random() > 0.5 ? 2 : 1,
          color: '#ffeec2',
          phase: Math.random() * Math.PI * 2,
        });
      }
      // Subtle fireflies peeking right outside the open cottage doorway
      for (let i = 0; i < 3; i++) {
        particlesRef.current.push({
          id: nextParticleId.current++,
          kind: 'firefly',
          x: 215 + Math.random() * 50,
          y: 22 + Math.random() * 44,
          vx: (Math.random() - 0.5) * 5,
          vy: -(2 + Math.random() * 3),
          life: Math.random() * 2,
          maxLife: 4.0 + Math.random() * 2,
          size: 2,
          color: '#fff6be',
          phase: Math.random() * Math.PI * 2,
        });
      }
    } else if (zone === 'garden') {
      for (const pt of GARDEN_FIREFLY_ANCHORS) {
        particlesRef.current.push({
          id: nextParticleId.current++,
          kind: 'firefly',
          x: pt.x + (Math.random() - 0.5) * 26,
          y: pt.y + (Math.random() - 0.5) * 18,
          vx: (Math.random() - 0.5) * 5,
          vy: -(2.5 + Math.random() * 3.5),
          life: Math.random() * 2.5,
          maxLife: 4.2 + Math.random() * 2.4,
          size: 2,
          color: '#fff6be',
          phase: Math.random() * Math.PI * 2,
        });
      }
      // Drifting pastel cherry blossom petals across the courtyard
      for (let i = 0; i < 12; i++) {
        particlesRef.current.push({
          id: nextParticleId.current++,
          kind: 'petal',
          x: 24 + Math.random() * (VIEWPORT_WIDTH - 48),
          y: 12 + Math.random() * (VIEWPORT_HEIGHT - 40),
          vx: 8 + Math.random() * 9,
          vy: 10 + Math.random() * 8,
          life: Math.random() * 3.5,
          maxLife: 5.5 + Math.random() * 2.5,
          size: 2,
          color: Math.random() > 0.4 ? '#f7b2cc' : '#ffd4e6',
          phase: Math.random() * Math.PI * 2,
        });
      }
    } else {
      for (const pt of OVERLOOK_FIREFLY_ANCHORS) {
        particlesRef.current.push({
          id: nextParticleId.current++,
          kind: 'firefly',
          x: pt.x + (Math.random() - 0.5) * 30,
          y: pt.y + (Math.random() - 0.5) * 24,
          vx: (Math.random() - 0.5) * 5,
          vy: -(2.5 + Math.random() * 3.5),
          life: Math.random() * 2,
          maxLife: 4.4 + Math.random() * 2.4,
          size: 2,
          color: '#fff6be',
          phase: Math.random() * Math.PI * 2,
        });
      }
      for (let i = 0; i < 6; i++) {
        particlesRef.current.push({
          id: nextParticleId.current++,
          kind: 'petal',
          x: 40 + Math.random() * (VIEWPORT_WIDTH - 80),
          y: 20 + Math.random() * 140,
          vx: 7 + Math.random() * 7,
          vy: 8 + Math.random() * 6,
          life: Math.random() * 3,
          maxLife: 5.2 + Math.random() * 2,
          size: 2,
          color: '#f7b8d2',
          phase: Math.random() * Math.PI * 2,
        });
      }
    }
  }, []);

  const spawnSparkles = useCallback(
    (x: number, y: number, count: number, color = '#ffebad') => {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const speed = 15 + Math.random() * 24;
        particlesRef.current.push({
          id: nextParticleId.current++,
          kind: 'sparkle',
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 7,
          life: 0,
          maxLife: 0.72 + Math.random() * 0.42,
          size: Math.random() > 0.4 ? 2 : 1,
          color,
          phase: Math.random() * Math.PI * 2,
        });
      }
    },
    []
  );

  const spawnHeart = useCallback((x: number, y: number) => {
    const colors = ['#f57aa0', '#f79ab8', '#eb638d', '#ffb8cf'];
    particlesRef.current.push({
      id: nextParticleId.current++,
      kind: 'heart',
      x: x + (Math.random() - 0.5) * 32,
      y: y + (Math.random() - 0.5) * 8,
      vx: (Math.random() - 0.5) * 5,
      vy: -(17 + Math.random() * 12),
      life: 0,
      maxLife: 2.4 + Math.random() * 0.85,
      size: Math.random() > 0.35 ? 2 : 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      phase: Math.random() * Math.PI * 2,
    });
  }, []);

  const spawnKeyPopup = useCallback((x: number, y: number) => {
    particlesRef.current.push({
      id: nextParticleId.current++,
      kind: 'key_popup',
      x,
      y: y - 34,
      vx: 0,
      vy: -14,
      life: 0,
      maxLife: 1.55,
      size: 1,
      color: '#ffe99e',
      phase: 0,
    });
  }, []);

  const openDialogue = useCallback((payload: DialoguePayload) => {
    inputRef.current = { up: false, down: false, left: false, right: false };
    touchDirRef.current = null;
    if (!payload.isEnding && phaseRef.current === 'ENDING' && lingeringRef.current) {
      returnToLingeringRef.current = true;
    } else {
      returnToLingeringRef.current = false;
    }
    setActiveDialogue(payload);
    setPhase(payload.isEnding ? 'ENDING' : 'DIALOGUE');
  }, []);

  const closeDialogue = useCallback(() => {
    setActiveDialogue(null);
    const activePose = coupleAnimRef.current;
    if (
      activePose &&
      activePose.persistent &&
      (activePose.kind === 'sit_cuddle' || activePose.kind === 'watch_stars')
    ) {
      // Stay in the cozy sitting/stargazing pose until Meriem moves or clicks "Stand Up"
      setActivePersistentPose(activePose.kind);
    } else {
      coupleAnimRef.current = null;
      cameraFocusRef.current = null;
      setActivePersistentPose(null);
    }
    if (phaseRef.current === 'DIALOGUE') {
      if (returnToLingeringRef.current) {
        returnToLingeringRef.current = false;
        setLingeringOnOverlook(true);
        setPhase('ENDING');
      } else {
        setPhase('PLAYING');
      }
    }
  }, []);

  const transitionToZone = useCallback(
    (
      nextZone: ZoneId,
      spawn: { x: number; y: number },
      facing: Direction,
      startOverlookCutscene = false
    ) => {
      if (isTransitioningRef.current) return;
      isTransitioningRef.current = true;
      setTransitionFade(true);
      setNearestInteractable(null);
      nearestRef.current = null;

      window.setTimeout(() => {
        zoneRef.current = nextZone;
        setCurrentZone(nextZone);
        playerRef.current = {
          x: spawn.x,
          y: spawn.y,
          dir: facing,
          animTime: 0,
          isMoving: false,
          seated: false,
        };

        // Keep the fluffy white bunny seamlessly hopping right behind Meriem across all 3 zones!
        const bunnyOffsetY = facing === 'up' ? 14 : facing === 'down' ? -12 : 0;
        const bunnyOffsetX = facing === 'left' ? 14 : facing === 'right' ? -14 : -14;
        bunnyRef.current = {
          ...bunnyRef.current,
          x: Math.max(40, Math.min(VIEWPORT_WIDTH - 40, spawn.x + bunnyOffsetX)),
          y: Math.max(96, Math.min(VIEWPORT_HEIGHT - 22, spawn.y + bunnyOffsetY)),
          following: true,
          isMoving: false,
          animTime: 0,
          hintWiggleTimer: 0,
        };
        idleTimerRef.current = 0;
        bunnyHintRef.current = {
          ...bunnyHintRef.current,
          active: false,
          cooldown: 0,
        };
        playerTrailRef.current = [{ x: spawn.x, y: spawn.y }];
        coupleAnimRef.current = null;
        pendingAnimDialogueRef.current = null;
        cameraFocusRef.current = null;
        cameraRef.current = { zoom: 1, x: 0, y: 0 };
        setActivePersistentPose(null);
        seedZoneParticles(nextZone);

        if (nextZone === 'overlook') {
          // Stay completely playable on the Starry Overlook terrace!
          npcRef.current.x = TARGET_NPC_POS.x;
          npcRef.current.y = TARGET_NPC_POS.y;
          npcRef.current.dir = 'left';
          npcRef.current.waving = true;
          npcRef.current.seated = false;
          soundEngine.setMusicMode('balcony');
          if (startOverlookCutscene) {
            inputRef.current = { up: false, down: false, left: false, right: false };
            touchDirRef.current = null;
            cutsceneRef.current = {
              stage: 'walking',
              timer: 0,
              waypoints: [
                { x: 224, y: 232 },
                { x: 224, y: 204 },
              ],
              waypointIndex: 0,
            };
            phaseRef.current = 'CUTSCENE';
            setPhase('CUTSCENE');
          }
        }

        window.setTimeout(() => {
          setTransitionFade(false);
          isTransitioningRef.current = false;
        }, 60);
      }, 160);
    },
    [seedZoneParticles]
  );

  const handleInteract = useCallback(() => {
    const canInteractNow =
      phaseRef.current === 'PLAYING' ||
      (phaseRef.current === 'ENDING' && lingeringRef.current);
    if (!canInteractNow || isTransitioningRef.current) return;
    const target = nearestRef.current;
    if (!target) return;

    // Reset idle hint timer whenever Meriem interacts
    idleTimerRef.current = 0;
    bunnyHintRef.current.active = false;
    bunnyRef.current.hintWiggleTimer = 0;

    const prog = progressRef.current;

    switch (target.id) {
      case 'bookshelf': {
        soundEngine.playInteract();
        if (!prog.readBookshelf) {
          setProgress((p) => ({ ...p, readBookshelf: true }));
          spawnSparkles(84, 62, 10, '#fff0b8');
        }
        openDialogue({
          speaker: 'Bookshelf · Favorite Book',
          text: STORY_TEXT.bookshelf,
          portrait: 'her',
          herExpression: 'shy',
        });
        break;
      }

      case 'decoy_plant': {
        soundEngine.playInteract();
        spawnSparkles(46, 134, 8, '#f5a9bc');
        openDialogue({
          speaker: 'Potted Plant · Decoy Note',
          text: STORY_TEXT.decoyPlant,
          portrait: 'her',
          herExpression: 'annoyed',
        });
        break;
      }

      case 'wishing_bench': {
        if (!prog.hasBrassKey) {
          soundEngine.playKeyFound();
          setProgress((p) => ({ ...p, hasBrassKey: true }));
          spawnKeyPopup(playerRef.current.x, playerRef.current.y);
          spawnSparkles(288, 114, 16, '#ffe794');
          openDialogue({
            speaker: 'Cherry Blossom Wishing Bench',
            text: STORY_TEXT.wishingBenchFirst,
            portrait: 'her',
            herExpression: 'surprised',
            itemIcon: 'brass_key',
          });
        } else {
          soundEngine.playInteract();
          openDialogue({
            speaker: 'Cherry Blossom Wishing Bench',
            text: STORY_TEXT.wishingBenchRepeat,
            portrait: 'her',
            herExpression: 'happy',
          });
        }
        break;
      }

      case 'chest': {
        if (!prog.hasBrassKey) {
          soundEngine.playLocked();
          openDialogue({
            speaker: 'Bridge Bank · Chest',
            text: STORY_TEXT.chestLocked,
            portrait: 'her',
            herExpression: 'surprised',
          });
        } else {
          if (!prog.openedChest) {
            soundEngine.playChestOpen();
            setProgress((p) => ({ ...p, openedChest: true }));
            spawnSparkles(34, 200, 18, '#ffebb0');
          } else {
            soundEngine.playInteract();
          }
          openDialogue({
            speaker: 'Unlocked Chest',
            text: STORY_TEXT.chestUnlocked,
            portrait: 'her',
            herExpression: 'happy',
          });
        }
        break;
      }

      case 'overlook_gate': {
        if (!prog.gateUnlocked) {
          soundEngine.playInteract();
          inputRef.current = { up: false, down: false, left: false, right: false };
          touchDirRef.current = null;
          setPhase('KEYPAD');
        } else {
          soundEngine.playInteract();
          openDialogue({
            speaker: 'Shrine Archway',
            text: STORY_TEXT.overlookGateUnlockedHint,
            portrait: 'her',
            herExpression: 'happy',
          });
        }
        break;
      }

      case 'fireplace': {
        soundEngine.playInteract();
        openDialogue({
          speaker: 'Stone Fireplace',
          text: STORY_TEXT.fireplaceFlavor,
          portrait: 'her',
          herExpression: 'sleepy',
        });
        break;
      }

      case 'fountain': {
        soundEngine.playInteract();
        openDialogue({
          speaker: 'Courtyard Fountain',
          text: STORY_TEXT.fountainFlavor,
          portrait: 'her',
          herExpression: 'happy',
        });
        break;
      }

      case 'bed': {
        soundEngine.playInteract();
        openDialogue({
          speaker: 'Cozy Bed',
          text: STORY_TEXT.bedFlavor,
          portrait: 'her',
          herExpression: 'sleepy',
        });
        break;
      }

      case 'telescope': {
        soundEngine.playInteract();
        spawnSparkles(398, 166, 10, '#fff3c4');
        openDialogue({
          speaker: 'Terrace Telescope',
          text: STORY_TEXT.telescopeFlavor,
          portrait: 'her',
          herExpression: 'laugh',
        });
        break;
      }

      case 'bunny': {
        const b = bunnyRef.current;
        const p = playerRef.current;
        inputRef.current = { up: false, down: false, left: false, right: false };
        touchDirRef.current = null;
        p.isMoving = false;
        p.dir = b.x >= p.x ? 'right' : 'left';
        b.following = true;
        b.petTimer = 1.95;
        soundEngine.playPetBunny();
        spawnHeart(b.x, b.y - 16);
        spawnHeart(b.x - 7, b.y - 22);
        spawnHeart(b.x + 8, b.y - 20);
        spawnSparkles(b.x, b.y - 10, 12, '#ffd6e5');

        // Hide all UI and smoothly frame Meriem + Fluffy White Bunny in the upper-middle
        setActiveDialogue(null);
        cameraFocusRef.current = {
          x: (p.x + b.x) / 2,
          y: Math.min(p.y, b.y) - 10,
          zoom: 1.22,
          screenY: 118,
        };
        pendingAnimDialogueRef.current = {
          timer: 1.55,
          payload: {
            speaker: 'Fluffy White Bunny',
            text: STORY_TEXT.petBunny,
            portrait: 'her',
            herExpression: 'laugh',
            compact: true,
          },
        };
        phaseRef.current = 'ANIMATING';
        setPhase('ANIMATING');
        break;
      }

      case 'cat': {
        const c = catRef.current;
        const p = playerRef.current;
        inputRef.current = { up: false, down: false, left: false, right: false };
        touchDirRef.current = null;
        p.isMoving = false;
        p.dir = c.x >= p.x ? 'right' : 'left';
        c.petTimer = 2.05;
        soundEngine.playPetCat();
        spawnHeart(c.x, c.y - 18);
        spawnHeart(c.x - 8, c.y - 24);
        spawnHeart(c.x + 7, c.y - 22);
        spawnSparkles(c.x, c.y - 12, 12, '#e8f5a2');

        // Hide all UI and smoothly frame Meriem + Sleek Black Cat in the upper-middle
        setActiveDialogue(null);
        cameraFocusRef.current = {
          x: (p.x + c.x) / 2,
          y: Math.min(p.y, c.y) - 10,
          zoom: 1.24,
          screenY: 118,
        };
        pendingAnimDialogueRef.current = {
          timer: 1.55,
          payload: {
            speaker: 'Sleek Black Cat',
            text: STORY_TEXT.petCat,
            portrait: 'her',
            herExpression: 'laugh',
            compact: true,
          },
        };
        phaseRef.current = 'ANIMATING';
        setPhase('ANIMATING');
        break;
      }

      case 'him_npc': {
        soundEngine.playInteract();
        inputRef.current = { up: false, down: false, left: false, right: false };
        touchDirRef.current = null;
        playerRef.current.isMoving = false;
        npcRef.current.waving = false;
        npcRef.current.dir = playerRef.current.x <= npcRef.current.x ? 'left' : 'right';
        // Smoothly lift camera slightly upward so Meriem & Ayoub sit cleanly above the choice menu
        cameraFocusRef.current = {
          x: (playerRef.current.x + npcRef.current.x) / 2,
          y: npcRef.current.y - 18,
          zoom: 1.24,
          screenY: 110,
        };
        setPhase('COUPLE_MENU');
        break;
      }
    }
  }, [openDialogue, spawnHeart, spawnKeyPopup, spawnSparkles]);

  const handleCoupleAction = useCallback(
    (action: CoupleActionKind) => {
      const player = playerRef.current;
      const npc = npcRef.current;
      const bunny = bunnyRef.current;
      const cat = catRef.current;

      inputRef.current = { up: false, down: false, left: false, right: false };
      touchDirRef.current = null;
      player.isMoving = false;
      player.seated = false;
      npc.waving = false;
      npc.seated = false;
      setActiveDialogue(null);
      setActivePersistentPose(null);

      // Keep Meriem positioned right beside him when standing back up afterward
      player.x = 220;
      player.y = 208;
      player.dir = 'right';
      npc.x = TARGET_NPC_POS.x;
      npc.y = TARGET_NPC_POS.y;
      npc.dir = 'left';

      if (action === 'hug') {
        coupleAnimRef.current = { kind: 'hug', timer: 12, duration: 12 };

        soundEngine.playHeartFloat();
        spawnHeart(240, 134);
        spawnHeart(218, 146);
        spawnHeart(262, 146);
        spawnSparkles(240, 166, 16, '#ffd6e6');

        // Hide all UI for 2.0 seconds and center the Hug illustration cleanly in upper-middle
        cameraFocusRef.current = { x: 240, y: 170, zoom: 1.24, screenY: 118 };
        pendingAnimDialogueRef.current = {
          timer: 2.0,
          payload: {
            speaker: 'Meriem & Ayoub',
            text: 'You give him the tightest hug after 400 km apart. He never wants to let go! 💖',
            portrait: 'both',
            herExpression: 'laugh',
            himExpression: 'warm',
            compact: true,
          },
        };
        phaseRef.current = 'ANIMATING';
        setPhase('ANIMATING');
        return;
      }

      if (action === 'kiss') {
        coupleAnimRef.current = { kind: 'kiss', timer: 12, duration: 12 };

        soundEngine.playHeartFloat();
        soundEngine.playPetBunny();
        spawnHeart(240, 132);
        spawnHeart(220, 144);
        spawnHeart(260, 144);
        spawnHeart(246, 122);
        spawnSparkles(240, 162, 18, '#ffebad');
        spawnSparkles(240, 174, 14, '#ffb8d6');

        cameraFocusRef.current = { x: 240, y: 170, zoom: 1.24, screenY: 118 };
        pendingAnimDialogueRef.current = {
          timer: 2.0,
          payload: {
            speaker: 'Meriem & Ayoub',
            text: 'Mwah! <3 He blushes and smiles like an idiot.',
            portrait: 'both',
            herExpression: 'shy',
            himExpression: 'warm',
            compact: true,
          },
        };
        phaseRef.current = 'ANIMATING';
        setPhase('ANIMATING');
        return;
      }

      if (action === 'pet_him') {
        coupleAnimRef.current = { kind: 'pet_him', timer: 12, duration: 12 };

        soundEngine.playPetCat();
        soundEngine.playPetBunny();
        spawnHeart(250, 136);
        spawnHeart(230, 146);
        spawnHeart(266, 148);
        spawnSparkles(250, 158, 16, '#ffe7a8');

        cameraFocusRef.current = { x: 240, y: 172, zoom: 1.24, screenY: 118 };
        pendingAnimDialogueRef.current = {
          timer: 2.0,
          payload: {
            speaker: 'Meriem & Ayoub',
            text: 'You pet his curly hair. He leans into your hand and purrs happily—officially your favorite pet too!',
            portrait: 'both',
            herExpression: 'laugh',
            himExpression: 'warm',
            compact: true,
          },
        };
        phaseRef.current = 'ANIMATING';
        setPhase('ANIMATING');
        return;
      }

      if (action === 'sit_cuddle') {
        // Middle Row, 3rd Panel: Sit Together & Cuddle (persists until movement or "Stand Up")
        coupleAnimRef.current = {
          kind: 'sit_cuddle',
          timer: 1,
          duration: 1,
          persistent: true,
        };

        soundEngine.playHeartFloat();
        spawnHeart(232, 144);
        spawnHeart(256, 140);
        spawnHeart(204, 186);
        spawnHeart(278, 186);
        spawnSparkles(240, 174, 16, '#ffd6e8');

        cameraFocusRef.current = { x: 240, y: 178, zoom: 1.24, screenY: 122 };
        pendingAnimDialogueRef.current = {
          timer: 2.0,
          payload: {
            speaker: 'Meriem & Ayoub',
            text: 'You lean your head on his shoulder while the white bunny and black cat curl up asleep beside you. Everything feels warm and peaceful. 💞',
            portrait: 'both',
            herExpression: 'laugh',
            himExpression: 'warm',
            compact: true,
          },
        };
        phaseRef.current = 'ANIMATING';
        setPhase('ANIMATING');
        return;
      }

      if (action === 'watch_stars') {
        // Middle Row, 2nd Panel: Watch the Stars Together (persists until movement or "Stand Up")
        coupleAnimRef.current = {
          kind: 'watch_stars',
          timer: 1,
          duration: 1,
          persistent: true,
        };

        soundEngine.playHeartFloat();
        spawnHeart(240, 134);
        spawnHeart(224, 146);
        spawnHeart(256, 146);
        spawnSparkles(240, 152, 16, '#ffefc0');

        cameraFocusRef.current = { x: 240, y: 170, zoom: 1.2, screenY: 122 };
        pendingAnimDialogueRef.current = {
          timer: 2.0,
          payload: {
            speaker: 'Meriem & Ayoub',
            text: 'Hand in hand under the crescent moon and starry skyline, with both little companions right beside you. 🌃✨',
            portrait: 'both',
            herExpression: 'happy',
            himExpression: 'warm',
            compact: true,
          },
        };
        phaseRef.current = 'ANIMATING';
        setPhase('ANIMATING');
        return;
      }

      // action === 'read_letter': Middle Row, 1st Panel (Meriem holding pink heart-sealed envelope!)
      coupleAnimRef.current = {
        kind: 'read_letter',
        timer: 1,
        duration: 1,
        persistent: true,
      };
      bunny.x = BUNNY_CUTSCENE_POS.x;
      bunny.y = BUNNY_CUTSCENE_POS.y;
      bunny.dir = 'right';
      bunny.isMoving = false;
      cat.x = CAT_POS.x;
      cat.y = CAT_POS.y;

      soundEngine.playHeartFloat();
      spawnHeart(236, 138);
      spawnHeart(262, 144);
      spawnSparkles(240, 168, 18, '#ffd9e8');

      setLingeringOnOverlook(false);
      // Display the envelope pose completely clear for 2.0s in the upper view before opening the letter modal
      cameraFocusRef.current = { x: 240, y: 172, zoom: 1.16, screenY: 84 };
      pendingAnimDialogueRef.current = {
        timer: 2.0,
        payload: {
          speaker: 'Ayoub · to Meriem',
          text: STORY_TEXT.endingLoveMessage,
          portrait: 'both',
          herExpression: 'laugh',
          himExpression: 'warm',
          isEnding: true,
        },
      };
      phaseRef.current = 'ANIMATING';
      setPhase('ANIMATING');
    },
    [spawnHeart, spawnSparkles]
  );

  const handleStandUp = useCallback(() => {
    soundEngine.playInteract();
    const player = playerRef.current;
    const npc = npcRef.current;
    player.seated = false;
    player.x = 216;
    player.y = 214;
    player.dir = 'right';
    player.isMoving = false;
    npc.seated = false;
    npc.dir = 'left';
    npc.waving = false;
    coupleAnimRef.current = null;
    pendingAnimDialogueRef.current = null;
    cameraFocusRef.current = null;
    bunnyRef.current.following = true;
    playerTrailRef.current = [{ x: player.x, y: player.y }];
    setActivePersistentPose(null);
    setActiveDialogue(null);
    setPhase('PLAYING');
  }, []);

  const handleKeepHangingOut = useCallback(() => {
    soundEngine.playInteract();
    const player = playerRef.current;
    const npc = npcRef.current;
    player.seated = false;
    player.x = 216;
    player.y = 216;
    player.dir = 'right';
    npc.seated = false;
    npc.dir = 'left';
    npc.waving = false;
    coupleAnimRef.current = null;
    pendingAnimDialogueRef.current = null;
    cameraFocusRef.current = null;
    bunnyRef.current.following = true;
    playerTrailRef.current = [{ x: player.x, y: player.y }];
    setActivePersistentPose(null);
    setActiveDialogue(null);
    setLingeringOnOverlook(false);
    setPhase('PLAYING');
  }, []);

  const handleKeypadSuccess = useCallback(() => {
    setProgress((p) => ({ ...p, gateUnlocked: true }));
    spawnSparkles(382, 48, 22, '#ffefc0');
    setPhase('PLAYING');
  }, [spawnSparkles]);

  const handleStartGame = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playInteract();
    soundEngine.setMusicMode('cozy');
    setPhase('PLAYING');
  }, []);

  const handleRestart = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playInteract();
    soundEngine.setMusicMode('cozy');

    zoneRef.current = INITIAL_ZONE;
    isTransitioningRef.current = false;
    playerRef.current = {
      x: INITIAL_PLAYER_POS.x,
      y: INITIAL_PLAYER_POS.y,
      dir: 'down',
      animTime: 0,
      isMoving: false,
      seated: false,
    };
    npcRef.current = {
      x: TARGET_NPC_POS.x,
      y: TARGET_NPC_POS.y,
      dir: 'left',
      waving: false,
      animTime: 0,
      seated: false,
    };
    bunnyRef.current = {
      x: INITIAL_BUNNY_POS.x,
      y: INITIAL_BUNNY_POS.y,
      dir: 'right',
      following: false,
      isMoving: false,
      animTime: 0,
      petTimer: 0,
      hintWiggleTimer: 0,
    };
    idleTimerRef.current = 0;
    bunnyHintRef.current = {
      active: false,
      phase: 'hopping_out',
      timer: 0,
      targetX: INITIAL_BUNNY_POS.x,
      targetY: INITIAL_BUNNY_POS.y,
      originX: INITIAL_BUNNY_POS.x,
      originY: INITIAL_BUNNY_POS.y,
      objectiveX: 86,
      objectiveY: 122,
      cooldown: 0,
    };
    catRef.current = {
      x: CAT_POS.x,
      y: CAT_POS.y,
      petTimer: 0,
    };
    playerTrailRef.current = [{ x: INITIAL_PLAYER_POS.x, y: INITIAL_PLAYER_POS.y }];
    returnToLingeringRef.current = false;
    inputRef.current = { up: false, down: false, left: false, right: false };
    touchDirRef.current = null;
    gateOpenAmountRef.current = 0;
    cutsceneRef.current = null;
    coupleAnimRef.current = null;
    pendingAnimDialogueRef.current = null;
    cameraFocusRef.current = null;
    cameraRef.current = { zoom: 1, x: 0, y: 0 };
    nearestRef.current = null;
    seedZoneParticles(INITIAL_ZONE);

    setCurrentZone(INITIAL_ZONE);
    setTransitionFade(false);
    setProgress({
      readBookshelf: false,
      hasBrassKey: false,
      openedChest: false,
      gateUnlocked: false,
    });
    setActiveDialogue(null);
    setActivePersistentPose(null);
    setNearestInteractable(null);
    setLingeringOnOverlook(false);
    setPhase('PLAYING');
  }, [seedZoneParticles]);

  const handleToggleMute = useCallback(() => {
    const nextMuted = soundEngine.toggleMute();
    setIsMuted(nextMuted);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phaseRef.current === 'TITLE_MENU') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleStartGame();
        }
        return;
      }

      const canControl =
        phaseRef.current === 'PLAYING' ||
        (phaseRef.current === 'ENDING' && lingeringRef.current);
      if (!canControl) return;

      const key = e.key.toLowerCase();
      if (key === 'w' || e.key === 'ArrowUp') {
        e.preventDefault();
        inputRef.current.up = true;
      } else if (key === 's' || e.key === 'ArrowDown') {
        e.preventDefault();
        inputRef.current.down = true;
      } else if (key === 'a' || e.key === 'ArrowLeft') {
        e.preventDefault();
        inputRef.current.left = true;
      } else if (key === 'd' || e.key === 'ArrowRight') {
        e.preventDefault();
        inputRef.current.right = true;
      } else if (e.key === ' ' || e.key === 'Enter' || key === 'e') {
        e.preventDefault();
        handleInteract();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || e.key === 'ArrowUp') inputRef.current.up = false;
      if (key === 's' || e.key === 'ArrowDown') inputRef.current.down = false;
      if (key === 'a' || e.key === 'ArrowLeft') inputRef.current.left = false;
      if (key === 'd' || e.key === 'ArrowRight') inputRef.current.right = false;
    };

    const onBlur = () => {
      inputRef.current = { up: false, down: false, left: false, right: false };
      touchDirRef.current = null;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [handleInteract, handleStartGame]);

  // Main 60fps Fixed-Camera Game Loop (ZERO camera scrolling!)
  useEffect(() => {
    seedZoneParticles(INITIAL_ZONE);

    let rafId = 0;
    let lastTime = performance.now();
    let elapsed = 0;

    const tick = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - lastTime) / 1000));
      lastTime = now;
      elapsed += dt;

      const curPhase = phaseRef.current;
      const curZone = zoneRef.current;
      const prog = progressRef.current;
      const player = playerRef.current;
      const npc = npcRef.current;
      const bunny = bunnyRef.current;
      const cat = catRef.current;

      if (bunny.petTimer > 0) {
        bunny.petTimer = Math.max(0, bunny.petTimer - dt);
      }
      if (cat.petTimer > 0) {
        cat.petTimer = Math.max(0, cat.petTimer - dt);
      }
      if (coupleAnimRef.current) {
        const anim = coupleAnimRef.current;
        if (!anim.persistent && curPhase !== 'DIALOGUE' && curPhase !== 'ENDING') {
          anim.timer = Math.max(0, anim.timer - dt);
        }
        heartTimerRef.current -= dt;
        if (heartTimerRef.current <= 0) {
          heartTimerRef.current = anim.persistent ? 0.52 : 0.3;
          const heartY = anim.kind === 'sit_cuddle' ? 148 : 134;
          spawnHeart(240 + (Math.random() - 0.5) * 34, heartY);
        }
        if (!anim.persistent && anim.timer <= 0) {
          coupleAnimRef.current = null;
        }
      }

      // Tick unobstructed 2-second animation phase before revealing the cozy follow-up dialogue
      if (curPhase === 'ANIMATING' && pendingAnimDialogueRef.current) {
        const pending = pendingAnimDialogueRef.current;
        pending.timer = Math.max(0, pending.timer - dt);
        if (!coupleAnimRef.current) {
          heartTimerRef.current -= dt;
          if (heartTimerRef.current <= 0) {
            heartTimerRef.current = 0.34;
            if (bunny.petTimer > 0) {
              spawnHeart(bunny.x, bunny.y - 18);
            } else if (cat.petTimer > 0) {
              spawnHeart(cat.x, cat.y - 20);
            }
          }
        }
        if (pending.timer <= 0) {
          const payloadToOpen = pending.payload;
          pendingAnimDialogueRef.current = null;
          openDialogue(payloadToOpen);
        }
      }

      // Smoothly interpolate camera framing (shifts characters upward into upper-middle during interactions)
      const cam = cameraRef.current;
      const focus = cameraFocusRef.current;
      let targetZoom = 1;
      let targetCamX = 0;
      let targetCamY = 0;
      if (focus) {
        targetZoom = focus.zoom;
        const viewW = VIEWPORT_WIDTH / targetZoom;
        const viewH = VIEWPORT_HEIGHT / targetZoom;
        targetCamX = Math.max(0, Math.min(VIEWPORT_WIDTH - viewW, focus.x - viewW / 2));
        targetCamY = Math.max(
          0,
          Math.min(VIEWPORT_HEIGHT + 112 - viewH, focus.y - focus.screenY / targetZoom)
        );
      }
      const camEase = 1 - Math.exp(-7.5 * dt);
      cam.zoom += (targetZoom - cam.zoom) * camEase;
      cam.x += (targetCamX - cam.x) * camEase;
      cam.y += (targetCamY - cam.y) * camEase;
      if (!focus && Math.abs(cam.zoom - 1) < 0.0015 && Math.abs(cam.x) < 0.25 && Math.abs(cam.y) < 0.25) {
        cam.zoom = 1;
        cam.x = 0;
        cam.y = 0;
      }

      if (prog.gateUnlocked && gateOpenAmountRef.current < 1) {
        gateOpenAmountRef.current = Math.min(1, gateOpenAmountRef.current + dt * 2.0);
      }

      // Zone-ambient particles
      if (curZone === 'cottage') {
        emberTimerRef.current -= dt;
        if (emberTimerRef.current <= 0) {
          emberTimerRef.current = 0.26 + Math.random() * 0.34;
          particlesRef.current.push({
            id: nextParticleId.current++,
            kind: 'ember',
            x: 308 + Math.random() * 24,
            y: 80,
            vx: (Math.random() - 0.5) * 7,
            vy: -(13 + Math.random() * 10),
            life: 0,
            maxLife: 0.9 + Math.random() * 0.55,
            size: Math.random() > 0.5 ? 2 : 1,
            color: Math.random() > 0.5 ? '#ffca78' : '#f28b5c',
            phase: 0,
          });
        }
        dustTimerRef.current -= dt;
        if (dustTimerRef.current <= 0) {
          dustTimerRef.current = 0.45 + Math.random() * 0.45;
          particlesRef.current.push({
            id: nextParticleId.current++,
            kind: 'dust_mote',
            x: 46 + Math.random() * 388,
            y: 108 + Math.random() * 150,
            vx: (Math.random() - 0.5) * 3.5,
            vy: -(3.5 + Math.random() * 4),
            life: 0,
            maxLife: 4.5 + Math.random() * 2.5,
            size: Math.random() > 0.5 ? 2 : 1,
            color: '#ffeec2',
            phase: Math.random() * Math.PI * 2,
          });
        }
      } else {
        // Guiding fireflies across Courtyard & Starry City Terrace
        fireflyTimerRef.current -= dt;
        if (fireflyTimerRef.current <= 0) {
          fireflyTimerRef.current = 0.45 + Math.random() * 0.45;
          const anchors =
            curZone === 'garden'
              ? GARDEN_FIREFLY_ANCHORS
              : OVERLOOK_FIREFLY_ANCHORS;
          const pt = anchors[Math.floor(Math.random() * anchors.length)];
          particlesRef.current.push({
            id: nextParticleId.current++,
            kind: 'firefly',
            x: pt.x + (Math.random() - 0.5) * 34,
            y: pt.y + (Math.random() - 0.5) * 24,
            vx: (Math.random() - 0.5) * 6,
            vy: -(2.5 + Math.random() * 3.5),
            life: 0,
            maxLife: 4.0 + Math.random() * 2.5,
            size: 2,
            color: '#fff6be',
            phase: Math.random() * Math.PI * 2,
          });
        }
        // Gently falling pastel cherry blossom petals
        petalTimerRef.current -= dt;
        if (petalTimerRef.current <= 0) {
          petalTimerRef.current = curZone === 'garden' ? 0.36 + Math.random() * 0.35 : 0.75 + Math.random() * 0.55;
          particlesRef.current.push({
            id: nextParticleId.current++,
            kind: 'petal',
            x: 16 + Math.random() * (VIEWPORT_WIDTH - 48),
            y: 6 + Math.random() * 34,
            vx: 8 + Math.random() * 9,
            vy: 10 + Math.random() * 7,
            life: 0,
            maxLife: 5.4 + Math.random() * 2.4,
            size: 2,
            color: Math.random() > 0.4 ? '#f7b2cc' : '#ffd8e9',
            phase: Math.random() * Math.PI * 2,
          });
        }
      }

      // Shooting stars on the Starry Overlook
      if (curZone === 'overlook') {
        starTimerRef.current -= dt;
        if (starTimerRef.current <= 0) {
          starTimerRef.current = 2.4 + Math.random() * 2.5;
          shootingStarsRef.current.push({
            x: 60 + Math.random() * 300,
            y: 10 + Math.random() * 28,
            vx: 82 + Math.random() * 50,
            vy: 22 + Math.random() * 16,
            life: 0,
            maxLife: 0.55 + Math.random() * 0.25,
            length: 0.16,
          });
        }
      }

      for (let i = shootingStarsRef.current.length - 1; i >= 0; i--) {
        const s = shootingStarsRef.current[i];
        s.life += dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.life >= s.maxLife) {
          shootingStarsRef.current.splice(i, 1);
        }
      }

      // Player Movement during PLAYING or while strolling on Starry Overlook ("Watch the Stars")
      const canStroll =
        (curPhase === 'PLAYING' ||
          (curPhase === 'ENDING' && lingeringRef.current)) &&
        !isTransitioningRef.current;

      if (canStroll) {
        let vx = 0;
        let vy = 0;

        if (inputRef.current.left || touchDirRef.current === 'left') vx -= 1;
        if (inputRef.current.right || touchDirRef.current === 'right') vx += 1;
        if (inputRef.current.up || touchDirRef.current === 'up') vy -= 1;
        if (inputRef.current.down || touchDirRef.current === 'down') vy += 1;

        if (vx !== 0 || vy !== 0) {
          const mag = Math.hypot(vx, vy);
          vx = (vx / mag) * PLAYER_SPEED;
          vy = (vy / mag) * PLAYER_SPEED;

          if (Math.abs(vx) > Math.abs(vy)) {
            player.dir = vx > 0 ? 'right' : 'left';
          } else {
            player.dir = vy > 0 ? 'down' : 'up';
          }

          const obstacles = getZoneCollisions(curZone, prog.gateUnlocked);

          const tryX = player.x + vx * dt;
          const boxX = getPlayerFeetBox(tryX, player.y);
          if (!obstacles.some((o) => rectsOverlap(boxX, o))) {
            player.x = tryX;
          }

          const tryY = player.y + vy * dt;
          const boxY = getPlayerFeetBox(player.x, tryY);
          if (!obstacles.some((o) => rectsOverlap(boxY, o))) {
            player.y = tryY;
          }

          player.seated = false;
          player.isMoving = true;
          player.animTime += dt;
          if (coupleAnimRef.current) {
            coupleAnimRef.current = null;
            cameraFocusRef.current = null;
            setActivePersistentPose(null);
          }

          // Record smooth breadcrumb trail for the Fluffy White Bunny
          const trail = playerTrailRef.current;
          const lastPt = trail[trail.length - 1];
          if (!lastPt || Math.hypot(player.x - lastPt.x, player.y - lastPt.y) >= 6) {
            trail.push({ x: player.x, y: player.y });
            if (trail.length > 36) {
              trail.shift();
            }
          }

          footstepTimerRef.current -= dt;
          if (footstepTimerRef.current <= 0) {
            footstepTimerRef.current = 0.31;
            soundEngine.playFootstep(curZone !== 'cottage');
          }

          // Check wide doorway zone transitions (during normal PLAYING)
          if (curPhase === 'PLAYING') {
            const feet = getPlayerFeetBox(player.x, player.y);
            if (curZone === 'cottage' && rectsOverlap(feet, COTTAGE_EXIT_ZONE)) {
              transitionToZone('garden', ZONE_SPAWNS.gardenFromCottage, 'down');
            } else if (
              curZone === 'garden' &&
              rectsOverlap(feet, GARDEN_TO_COTTAGE_ZONE)
            ) {
              transitionToZone('cottage', ZONE_SPAWNS.cottageFromGarden, 'up');
            } else if (
              curZone === 'garden' &&
              prog.gateUnlocked &&
              rectsOverlap(feet, GARDEN_TO_OVERLOOK_ZONE)
            ) {
              // Transition onto the Starry Overlook completely playable (no forced cutscene!)
              transitionToZone(
                'overlook',
                ZONE_SPAWNS.overlookFromGate,
                'up',
                false
              );
            }
          }
        } else {
          player.isMoving = false;
          player.animTime = 0;
        }

        // On Starry Overlook, Ayoub gently turns to face Meriem as she walks around him
        if (curZone === 'overlook' && !npc.seated && !coupleAnimRef.current) {
          npc.dir = player.x <= npc.x ? 'left' : 'right';
        }

        // Reset idle timer and cancel any bunny hint as soon as Meriem walks
        const hint = bunnyHintRef.current;
        if (hint.cooldown > 0) {
          hint.cooldown = Math.max(0, hint.cooldown - dt);
        }
        if (player.isMoving) {
          idleTimerRef.current = 0;
          if (hint.active) {
            hint.active = false;
            bunny.hintWiggleTimer = 0;
          }
        } else if (curPhase === 'PLAYING' && !coupleAnimRef.current && bunny.petTimer <= 0) {
          idleTimerRef.current += dt;
          // After 4s standing idle in a zone, white bunny hops gently toward the next active clue and wiggles its ears!
          if (!hint.active && hint.cooldown <= 0 && idleTimerRef.current >= 4.0) {
            const objPt = getNextZoneObjective(curZone, prog, player);
            if (objPt) {
              const distFromPlayer = Math.hypot(objPt.x - player.x, objPt.y - player.y);
              const dx = objPt.x - bunny.x;
              const dy = objPt.y - bunny.y;
              const distFromBunny = Math.hypot(dx, dy);
              if (distFromPlayer > 46 && distFromBunny > 26) {
                const hopDist = Math.min(40, distFromBunny * 0.45);
                const obstacles = getZoneCollisions(curZone, prog.gateUnlocked);
                // Step smoothly toward the objective without clipping into walls or water
                let bestX = bunny.x;
                let bestY = bunny.y;
                for (let stepFrac = 0.25; stepFrac <= 1.01; stepFrac += 0.25) {
                  const candX = Math.max(
                    22,
                    Math.min(VIEWPORT_WIDTH - 22, bunny.x + (dx / distFromBunny) * hopDist * stepFrac)
                  );
                  const candY = Math.max(
                    86,
                    Math.min(VIEWPORT_HEIGHT - 22, bunny.y + (dy / distFromBunny) * hopDist * stepFrac)
                  );
                  const bBox: Rect = { x: candX - 6, y: candY - 5, w: 12, h: 9 };
                  if (!obstacles.some((o) => rectsOverlap(bBox, o))) {
                    bestX = candX;
                    bestY = candY;
                  } else {
                    break;
                  }
                }
                hint.active = true;
                hint.phase = 'hopping_out';
                hint.timer = 0;
                hint.originX = bunny.x;
                hint.originY = bunny.y;
                hint.targetX = bestX;
                hint.targetY = bestY;
                hint.objectiveX = objPt.x;
                hint.objectiveY = objPt.y;
                bunny.following = true;
              }
            }
          }
        }

        // Fluffy White Bunny companion follow + gentle idle hint guide logic
        if (!bunny.following && curZone === 'cottage') {
          const dToBunny = Math.hypot(player.x - bunny.x, player.y - bunny.y);
          if (dToBunny <= 46) {
            bunny.following = true;
            spawnSparkles(bunny.x, bunny.y - 10, 6, '#ffe5f0');
          }
        }

        if (hint.active && bunny.petTimer <= 0 && !player.seated) {
          if (hint.phase === 'hopping_out') {
            const dx = hint.targetX - bunny.x;
            const dy = hint.targetY - bunny.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 2.2) {
              const step = Math.min(dist, 68 * dt);
              bunny.x += (dx / dist) * step;
              bunny.y += (dy / dist) * step;
              if (Math.abs(dx) > 0.5) {
                bunny.dir = dx >= 0 ? 'right' : 'left';
              }
              bunny.isMoving = true;
              bunny.animTime += dt;
            } else {
              bunny.x = hint.targetX;
              bunny.y = hint.targetY;
              bunny.isMoving = false;
              bunny.animTime = 0;
              bunny.dir = hint.objectiveX >= bunny.x ? 'right' : 'left';
              bunny.hintWiggleTimer = 1.6;
              hint.phase = 'wiggling';
              hint.timer = 1.6;
              spawnSparkles(
                bunny.x + (bunny.dir === 'right' ? 6 : -6),
                bunny.y - 14,
                5,
                '#ffeb9e'
              );
            }
          } else if (hint.phase === 'wiggling') {
            hint.timer = Math.max(0, hint.timer - dt);
            bunny.hintWiggleTimer = hint.timer;
            bunny.isMoving = false;
            bunny.dir = hint.objectiveX >= bunny.x ? 'right' : 'left';
            if (hint.timer <= 0) {
              hint.phase = 'returning';
              bunny.hintWiggleTimer = 0;
            }
          } else {
            const dx = hint.originX - bunny.x;
            const dy = hint.originY - bunny.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 2.5) {
              const step = Math.min(dist, 64 * dt);
              bunny.x += (dx / dist) * step;
              bunny.y += (dy / dist) * step;
              if (Math.abs(dx) > 0.5) {
                bunny.dir = dx >= 0 ? 'right' : 'left';
              }
              bunny.isMoving = true;
              bunny.animTime += dt;
            } else {
              bunny.x = hint.originX;
              bunny.y = hint.originY;
              bunny.isMoving = false;
              bunny.animTime = 0;
              hint.active = false;
              hint.cooldown = 10;
              idleTimerRef.current = 0;
            }
          }
        } else if (bunny.following && !player.seated) {
          bunny.hintWiggleTimer = 0;
          const trail = playerTrailRef.current;
          const targetIdx = Math.max(0, trail.length - 5);
          const target = trail[targetIdx] ?? { x: player.x, y: player.y };
          const distToPlayer = Math.hypot(player.x - bunny.x, player.y - bunny.y);
          const dx = target.x - bunny.x;
          const dy = target.y - bunny.y;
          const distToTarget = Math.hypot(dx, dy);

          if (distToPlayer > 25 && distToTarget > 3 && bunny.petTimer <= 0) {
            const bunnySpeed = Math.min(118, 72 + distToPlayer * 0.9);
            const step = Math.min(distToTarget, bunnySpeed * dt);
            bunny.x += (dx / distToTarget) * step;
            bunny.y += (dy / distToTarget) * step;
            if (Math.abs(dx) > 0.6) {
              bunny.dir = dx >= 0 ? 'right' : 'left';
            }
            bunny.isMoving = true;
            bunny.animTime += dt;
          } else {
            bunny.isMoving = false;
            bunny.animTime = 0;
          }
        } else {
          bunny.hintWiggleTimer = 0;
          bunny.isMoving = false;
          bunny.animTime = 0;
        }

        if (
          (phaseRef.current === 'PLAYING' ||
            (phaseRef.current === 'ENDING' && lingeringRef.current)) &&
          !isTransitioningRef.current
        ) {
          const found = findNearestInteractable(
            curZone,
            player,
            prog.gateUnlocked,
            bunny,
            cat
          );
          if (found?.id !== nearestRef.current?.id) {
            nearestRef.current = found;
            setNearestInteractable(found);
          } else if (found) {
            // Keep dynamic coordinates (e.g. moving white bunny) fresh every frame
            nearestRef.current = found;
          }
        }
      }

      // Fixed-Camera Starry Overlook Cutscene (Meriem walks to Ayoub; White Bunny hops to sit beside Black Cat!)
      if (curPhase === 'CUTSCENE' && cutsceneRef.current) {
        const cs = cutsceneRef.current;

        if (cs.stage === 'walking') {
          const wp = cs.waypoints[cs.waypointIndex];
          const dx = wp.x - player.x;
          const dy = wp.y - player.y;
          const dist = Math.hypot(dx, dy);

          // Move Fluffy White Bunny toward BUNNY_CUTSCENE_POS right beside the Sleek Black Cat
          const bdx = BUNNY_CUTSCENE_POS.x - bunny.x;
          const bdy = BUNNY_CUTSCENE_POS.y - bunny.y;
          const bDist = Math.hypot(bdx, bdy);
          if (bDist > 1.8) {
            const bStep = Math.min(bDist, (CUTSCENE_WALK_SPEED + 8) * dt);
            bunny.x += (bdx / bDist) * bStep;
            bunny.y += (bdy / bDist) * bStep;
            bunny.dir = bdx >= -0.4 ? 'right' : 'left';
            bunny.isMoving = true;
            bunny.animTime += dt;
          } else {
            bunny.x = BUNNY_CUTSCENE_POS.x;
            bunny.y = BUNNY_CUTSCENE_POS.y;
            bunny.dir = 'right';
            bunny.isMoving = false;
            bunny.animTime = 0;
          }

          if (dist <= 2.2) {
            player.x = wp.x;
            player.y = wp.y;
            cs.waypointIndex++;
            if (cs.waypointIndex >= cs.waypoints.length) {
              cs.stage = 'hearts';
              cs.timer = 0;
              player.isMoving = false;
              player.dir = 'up';
              player.seated = true;
              npc.waving = false;
              npc.dir = 'up';
              npc.seated = true;
              bunny.x = BUNNY_CUTSCENE_POS.x;
              bunny.y = BUNNY_CUTSCENE_POS.y;
              bunny.dir = 'right';
              bunny.isMoving = false;
              bunny.petTimer = 1.2;
              cat.petTimer = 1.2;
              soundEngine.playHeartFloat();
              // Floating hearts above ALL FOUR sitting together on the picnic blanket!
              spawnHeart(player.x, player.y - 36);
              spawnHeart(npc.x, npc.y - 36);
              spawnHeart(bunny.x, bunny.y - 16);
              spawnHeart(cat.x, cat.y - 18);
              spawnSparkles(240, 186, 16, '#ffd9e8');
            }
          } else {
            const step = Math.min(dist, CUTSCENE_WALK_SPEED * dt);
            player.x += (dx / dist) * step;
            player.y += (dy / dist) * step;
            player.isMoving = true;
            player.animTime += dt;
            if (Math.abs(dx) > Math.abs(dy)) {
              player.dir = dx > 0 ? 'right' : 'left';
            } else {
              player.dir = dy > 0 ? 'down' : 'up';
            }
            footstepTimerRef.current -= dt;
            if (footstepTimerRef.current <= 0) {
              footstepTimerRef.current = 0.35;
              soundEngine.playFootstep(true);
            }
          }
        } else if (cs.stage === 'hearts') {
          cs.timer += dt;
          heartTimerRef.current -= dt;
          if (heartTimerRef.current <= 0) {
            heartTimerRef.current = 0.28;
            const heartAnchors = [
              { x: player.x, y: player.y - 38 },
              { x: npc.x, y: npc.y - 38 },
              { x: bunny.x, y: bunny.y - 16 },
              { x: cat.x, y: cat.y - 18 },
            ];
            const pick =
              heartAnchors[Math.floor(Math.random() * heartAnchors.length)];
            spawnHeart(pick.x, pick.y);
          }
          if (cs.timer >= 1.55) {
            cs.stage = 'dialogue';
            openDialogue({
              speaker: 'Ayoub · to Meriem',
              text: STORY_TEXT.endingLoveMessage,
              portrait: 'both',
              herExpression: 'laugh',
              himExpression: 'warm',
              isEnding: true,
            });
          }
        }
      }

      if (curPhase === 'ENDING') {
        heartTimerRef.current -= dt;
        if (heartTimerRef.current <= 0) {
          heartTimerRef.current = 0.36;
          const heartAnchors = [
            { x: player.x, y: player.y - 34 },
            { x: npc.x, y: npc.y - 34 },
            { x: bunny.x, y: bunny.y - 16 },
            { x: cat.x, y: cat.y - 18 },
          ];
          const pick =
            heartAnchors[Math.floor(Math.random() * heartAnchors.length)];
          spawnHeart(pick.x, pick.y);
        }
      }

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.life >= p.maxLife) {
          particlesRef.current.splice(i, 1);
        }
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderGameWorld(ctx, {
            time: elapsed,
            zone: zoneRef.current,
            phase: phaseRef.current,
            player: playerRef.current,
            npc: npcRef.current,
            bunny: bunnyRef.current,
            cat: catRef.current,
            progress: progressRef.current,
            gateOpenAmount: gateOpenAmountRef.current,
            nearestInteractable: nearestRef.current,
            allowInteractBubble:
              phaseRef.current === 'ENDING' && lingeringRef.current,
            coupleAnim: coupleAnimRef.current,
            camera: cameraRef.current,
            particles: particlesRef.current,
            shootingStars: shootingStarsRef.current,
          });
        }
      }

      // Sync clickable floating proximity badge coordinates at 60fps with camera + moving targets
      const badgeEl = actionBadgeRef.current;
      const curTarget = nearestRef.current;
      if (badgeEl && curTarget) {
        const pos = getBadgeScreenPercent(curTarget, cameraRef.current);
        badgeEl.style.left = `${pos.leftPct.toFixed(2)}%`;
        badgeEl.style.top = `${pos.topPct.toFixed(2)}%`;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [openDialogue, seedZoneParticles, spawnHeart, spawnSparkles, transitionToZone]);

  const clueCount =
    (progress.readBookshelf ? 1 : 0) +
    (progress.hasBrassKey ? 1 : 0) +
    (progress.openedChest ? 1 : 0);

  return (
    <div className="h-dvh w-screen overflow-hidden bg-gradient-to-b from-[#161328] via-[#1f1a33] to-[#1a1529] text-[#faf0e4] flex flex-col">
      {/* Clean Single-Row Top HUD Bar */}
      <header className="shrink-0 h-12 sm:h-13 px-3.5 sm:px-6 border-b border-[#e8c6a8]/15 bg-[#201930]/90 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <h1 className="font-pixel text-sm sm:text-base font-bold tracking-wide text-[#f7dbb2] whitespace-nowrap shrink-0">
            My Love For You
          </h1>

          {phase !== 'TITLE_MENU' && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-[#d6c2bd] whitespace-nowrap">
              <span aria-hidden="true">·</span>
              <span className="text-[#f2d6d8] font-medium">
                {getZoneTitle(currentZone)}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">Clues {clueCount}/3</span>
              {progress.hasBrassKey && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 text-[#ffe7a8] font-medium">
                    <PixelPortrait kind="brass_key" size={14} alt="Brass Key" />
                    <span>Brass Key</span>
                  </span>
                </>
              )}
              {progress.gateUnlocked && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#9ee8c4]">Gate Open</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {phase !== 'TITLE_MENU' && progress.hasBrassKey && (
            <div className="sm:hidden flex items-center mr-1">
              <PixelPortrait kind="brass_key" size={16} alt="Brass Key" />
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowTouchPad((v) => !v)}
            aria-label={showTouchPad ? 'Hide touch controls' : 'Show touch controls'}
            title={showTouchPad ? 'Hide on-screen controls' : 'Show on-screen controls'}
            className={`h-8 px-2.5 inline-flex items-center gap-1.5 text-xs font-medium rounded-xl border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              showTouchPad
                ? 'bg-[#3d2d47] border-[#e6be94]/60 text-[#fae3bc]'
                : 'bg-[#2a213b] border-[#e8c6a8]/20 text-[#d6c2bd] hover:text-[#fff6eb]'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Touch Pad</span>
          </button>

          <button
            type="button"
            onClick={handleToggleMute}
            aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
            title={isMuted ? 'Unmute sound' : 'Mute sound'}
            className="h-8 w-8 inline-flex items-center justify-center rounded-xl border border-[#e8c6a8]/20 bg-[#2a213b] text-[#d6c2bd] hover:text-[#fff6eb] transition-colors cursor-pointer shrink-0"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#f7dbb2]" />
            )}
          </button>

          {phase !== 'TITLE_MENU' && (
            <button
              type="button"
              onClick={handleRestart}
              aria-label="Restart game"
              title="Restart game"
              className="h-8 px-2.5 inline-flex items-center gap-1.5 text-xs font-medium rounded-xl border border-[#e8c6a8]/20 bg-[#2a213b] text-[#d6c2bd] hover:text-[#fff6eb] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restart</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Centered Fixed-Camera Full Side-to-Side Diorama Stage */}
      <main className="relative flex-1 min-h-0 w-full flex flex-col items-center justify-center px-2 py-2 sm:px-4 sm:py-3 overflow-hidden">
        <div
          ref={stageWrapperRef}
          className="relative flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden"
        >
          <div
            style={{
              width: stageSize.w,
              height: stageSize.h,
            }}
            className="relative max-w-full max-h-full rounded-2xl border-[3px] border-[#795d8f]/85 bg-[#1b1633] shadow-[0_24px_64px_rgba(8,6,22,0.75)] overflow-hidden shrink-0"
            onClick={() => {
              if (
                (phase === 'PLAYING' || (phase === 'ENDING' && lingeringOnOverlook)) &&
                nearestInteractable
              ) {
                handleInteract();
              }
            }}
          >
            <canvas
              ref={canvasRef}
              width={VIEWPORT_WIDTH * RENDER_SCALE}
              height={VIEWPORT_HEIGHT * RENDER_SCALE}
              style={{
                width: stageSize.w,
                height: stageSize.h,
              }}
              className="pixelated block"
            />

            {/* Floating Clickable / Tappable Proximity Action Badge */}
            {nearestInteractable &&
              !activePersistentPose &&
              (phase === 'PLAYING' || (phase === 'ENDING' && lingeringOnOverlook)) &&
              (() => {
                const { actionText, isHeart } = getActionBadgeMeta(
                  nearestInteractable,
                  progress
                );
                const initPos = getBadgeScreenPercent(
                  nearestInteractable,
                  cameraRef.current
                );
                return (
                  <button
                    key={nearestInteractable.id}
                    ref={actionBadgeRef}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInteract();
                    }}
                    style={{
                      left: `${initPos.leftPct.toFixed(2)}%`,
                      top: `${initPos.topPct.toFixed(2)}%`,
                      transform: 'translate(-50%, -100%)',
                    }}
                    aria-label={`${actionText} (Press E or Tap)`}
                    className="absolute z-20 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe694]"
                  >
                    <span className="block animate-badge-enter">
                      <span className="relative inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl pixel-action-badge animate-soft-bob whitespace-nowrap">
                        <span
                          className={`font-pixel text-[11px] sm:text-xs font-extrabold tracking-tight ${
                            isHeart ? 'text-[#e05b8a]' : 'text-[#c97630]'
                          }`}
                        >
                          {isHeart ? '[ ♥ ]' : '[ ! ]'}
                        </span>
                        <span className="font-pixel text-xs sm:text-[13px] font-bold text-[#3f2848] leading-none">
                          {actionText}
                        </span>
                        <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-[#5d4270]/12 border border-[#5d4270]/25 font-pixel text-[10px] font-bold text-[#664878] leading-none">
                          {showTouchPad ? 'Tap' : 'E / Tap'}
                        </span>
                        {/* Cute speech-bubble downward pointer */}
                        <span
                          aria-hidden="true"
                          className="absolute left-1/2 -bottom-[6px] -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-[#f7e9ee] border-r-2 border-b-2 border-[#593e6b]"
                        />
                      </span>
                    </span>
                  </button>
                );
              })()}

            {/* Top-Left In-Stage HUD Heart Badge (hidden during clear-screen animations!) */}
            {phase !== 'TITLE_MENU' && phase !== 'ANIMATING' && (
              <div className="pointer-events-none absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-20 flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg hud-heart-badge">
                <div className="rounded overflow-hidden bg-[#4a3969]/80 border border-[#b69bc9]/60">
                  <PixelPortrait
                    kind="hud_avatar"
                    size={22}
                    alt="Meriem HUD icon"
                    className="sm:w-[24px] sm:h-[24px]"
                  />
                </div>
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <PixelPortrait
                      key={i}
                      kind={
                        i < clueCount || currentZone === 'overlook'
                          ? 'hud_heart_full'
                          : 'hud_heart_empty'
                      }
                      size={16}
                      alt={`Heart ${i + 1}`}
                      className="sm:w-[18px] sm:h-[18px]"
                    />
                  ))}
                </div>
                {progress.hasBrassKey && (
                  <div className="pl-1 border-l border-[#dfd0e8]/30 flex items-center">
                    <PixelPortrait kind="brass_key" size={16} alt="Brass Key" />
                  </div>
                )}
              </div>
            )}

            {/* Gentle Zone Cross-Fade Curtain */}
            <div
              className={`pointer-events-none absolute inset-0 z-10 bg-[#19142b] transition-opacity duration-150 ${
                transitionFade ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Cozy Twilight-Purple & Parchment Title Overlay */}
            {phase === 'TITLE_MENU' && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#18132c]/60 backdrop-blur-[1.5px] p-3">
                <div className="animate-dialogue-enter cozy-pixel-parchment w-full max-w-md rounded-2xl p-5 sm:p-6 text-center">
                  <div className="flex items-center justify-center gap-4 mb-3.5">
                    <div className="rounded-xl overflow-hidden border-[2.5px] border-[#664978] bg-gradient-to-b from-[#5a3d6e] to-[#422c54] shadow-sm">
                      <PixelPortrait
                        kind="her"
                        herExpression="happy"
                        size={84}
                        alt="Meriem pixel art portrait"
                      />
                    </div>
                    <Heart className="w-5 h-5 text-[#e879a4] fill-[#e879a4]" />
                    <div className="rounded-xl overflow-hidden border-[2.5px] border-[#664978] bg-gradient-to-b from-[#493463] to-[#302145] shadow-sm">
                      <PixelPortrait
                        kind="him"
                        himExpression="confident"
                        size={84}
                        alt="Ayoub pixel art portrait"
                      />
                    </div>
                  </div>

                  <h2 className="font-pixel text-xl sm:text-2xl font-bold text-[#4a2f54] tracking-wide mb-1.5">
                    My Love For You
                  </h2>
                  <p className="font-pixel text-xs sm:text-sm text-[#5e4366] leading-relaxed mb-4">
                    Begin inside the cozy cottage, step out into the cherry blossom
                    courtyard, cross the wooden bridge to unlock the chest, and ascend
                    the shrine archway to the Starry City Terrace.
                  </p>

                  <button
                    type="button"
                    onClick={handleStartGame}
                    className="w-full sm:w-auto px-7 py-2.5 text-sm sm:text-base font-bold text-[#fff9fb] bg-[#6c4678] hover:bg-[#593863] active:translate-y-[1px] rounded-xl shadow-[0_3px_0_#3f254a] transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#c77294]"
                  >
                    Start Game
                  </button>

                  <div className="mt-3 text-xs font-medium text-[#7d5885]">
                    WASD / Arrow Keys to walk · Space / Enter to inspect & pet
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Couple Choice Menu (Hug, Kiss, Pet Him, Sit Together, Watch Stars, Read Letter) */}
            {phase === 'COUPLE_MENU' && (
              <div className="absolute inset-x-0 bottom-3 sm:bottom-5 z-30 pointer-events-none">
                <CoupleMenuModal
                  onSelect={handleCoupleAction}
                  onClose={() => {
                    if (!coupleAnimRef.current?.persistent) {
                      cameraFocusRef.current = null;
                    }
                    setPhase('PLAYING');
                  }}
                />
              </div>
            )}

            {/* Floating "Stand Up" & "Actions" controls during persistent Sit Together / Watch the Stars pose */}
            {phase === 'PLAYING' && activePersistentPose && (
              <div
                className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-30 flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playInteract();
                    setPhase('COUPLE_MENU');
                  }}
                  className="px-3 py-1.5 font-pixel text-xs sm:text-sm font-bold text-[#4a2f54] bg-[#fff5fa]/90 hover:bg-[#fce6f0] border-2 border-[#8c5280] rounded-xl shadow-[0_2px_0_#59345a] backdrop-blur-[2px] transition-colors cursor-pointer whitespace-nowrap"
                >
                  Actions
                </button>
                <button
                  type="button"
                  onClick={handleStandUp}
                  className="px-3.5 py-1.5 font-pixel text-xs sm:text-sm font-bold text-[#fff9fb] bg-[#6c4678]/95 hover:bg-[#593863] border-2 border-[#b584a8] rounded-xl shadow-[0_2px_0_#3f254a] backdrop-blur-[2px] transition-colors cursor-pointer whitespace-nowrap"
                >
                  Stand Up
                </button>
              </div>
            )}

            {/* Rounded Pixel-Framed Dialogue Box Overlay */}
            {(phase === 'DIALOGUE' ||
              (phase === 'ENDING' && !lingeringOnOverlook)) &&
              activeDialogue && (
                <div className="absolute inset-x-0 bottom-2.5 sm:bottom-4 z-30 pointer-events-none">
                  <DialogueBox
                    dialogue={activeDialogue}
                    onClose={closeDialogue}
                    onPlayAgain={handleRestart}
                    onStayOnOverlook={handleKeepHangingOut}
                  />
                </div>
              )}
          </div>
        </div>

        {/* Desktop Subtle Controls Strip */}
        {!showTouchPad &&
          (phase === 'PLAYING' || (phase === 'ENDING' && lingeringOnOverlook)) && (
            <div className="mt-2 shrink-0 text-xs text-[#cbb8bc] flex items-center gap-2 whitespace-nowrap">
              <span>{getZoneTitle(currentZone)}</span>
              <span aria-hidden="true">·</span>
              <span>WASD / Arrows to walk</span>
              <span aria-hidden="true">·</span>
              <span>Space / Enter to interact & pet</span>
              {nearestInteractable && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#f7dbb2] font-semibold">
                    {nearestInteractable.id === 'bunny' ||
                    nearestInteractable.id === 'cat'
                      ? nearestInteractable.label
                      : `Near ${nearestInteractable.label}`}
                  </span>
                </>
              )}
            </div>
          )}

        {/* Mobile / On-Screen Cozy Touch Controls */}
        {showTouchPad &&
          (phase === 'PLAYING' || (phase === 'ENDING' && lingeringOnOverlook)) && (
            <div className="w-full max-w-[540px] shrink-0">
              <TouchControls
                onDirectionChange={(dir) => {
                  touchDirRef.current = dir;
                }}
                onInteract={handleInteract}
                canInteract={Boolean(nearestInteractable)}
                interactLabel={nearestInteractable?.label}
              />
            </div>
          )}
      </main>

      {/* Starry Overlook Gate 4-Digit Keypad Modal */}
      {phase === 'KEYPAD' && (
        <KeypadModal
          onSuccess={handleKeypadSuccess}
          onClose={() => setPhase('PLAYING')}
        />
      )}
    </div>
  );
}
