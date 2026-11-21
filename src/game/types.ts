export type GamePhase =
  | 'TITLE_MENU'
  | 'PLAYING'
  | 'DIALOGUE'
  | 'COUPLE_MENU'
  | 'ANIMATING'
  | 'KEYPAD'
  | 'CUTSCENE'
  | 'ENDING';

export type RomancePoseKind =
  | 'hug'
  | 'kiss'
  | 'pet_him'
  | 'read_letter'
  | 'sit_cuddle'
  | 'watch_stars';

export type CoupleActionKind = RomancePoseKind;

export interface CoupleAnimState {
  kind: RomancePoseKind;
  timer: number;
  duration: number;
  persistent?: boolean;
}

export interface CameraState {
  zoom: number;
  x: number;
  y: number;
}

export type Direction = 'down' | 'up' | 'left' | 'right';

export type ZoneId = 'cottage' | 'garden' | 'overlook';

export type PortraitKind = 'her' | 'him' | 'both' | 'none';

export type HerExpression =
  | 'happy'
  | 'laugh'
  | 'shy'
  | 'surprised'
  | 'annoyed'
  | 'sleepy';

export type HimExpression =
  | 'confident'
  | 'warm'
  | 'nervous'
  | 'sideglance'
  | 'shocked';

export interface DialoguePayload {
  speaker: string;
  text: string;
  portrait: PortraitKind;
  herExpression?: HerExpression;
  himExpression?: HimExpression;
  itemIcon?: 'brass_key' | 'heart' | 'book' | 'chest';
  isEnding?: boolean;
  compact?: boolean;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type InteractableId =
  | 'bookshelf'
  | 'wishing_bench'
  | 'chest'
  | 'overlook_gate'
  | 'fireplace'
  | 'fountain'
  | 'bed'
  | 'telescope'
  | 'decoy_plant'
  | 'bunny'
  | 'cat'
  | 'him_npc';

export interface InteractableObject {
  id: InteractableId;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  promptX: number;
  promptY: number;
  isKeyClue: boolean;
}

export interface PlayerState {
  x: number;
  y: number;
  dir: Direction;
  animTime: number;
  isMoving: boolean;
  seated?: boolean;
}

export interface TargetNpcState {
  x: number;
  y: number;
  dir: Direction;
  waving: boolean;
  animTime: number;
  seated?: boolean;
}

export interface BunnyState {
  x: number;
  y: number;
  dir: 'left' | 'right';
  following: boolean;
  isMoving: boolean;
  animTime: number;
  petTimer: number;
  hintWiggleTimer?: number;
}

export interface CatState {
  x: number;
  y: number;
  petTimer: number;
}

export interface FloatingParticle {
  id: number;
  kind:
    | 'heart'
    | 'sparkle'
    | 'ember'
    | 'firefly'
    | 'dust_mote'
    | 'petal'
    | 'key_popup';
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  phase: number;
}

export interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  length: number;
}

export interface GameProgress {
  readBookshelf: boolean;
  hasBrassKey: boolean;
  openedChest: boolean;
  gateUnlocked: boolean;
}

export interface CutsceneState {
  stage: 'walking' | 'hearts' | 'dialogue';
  timer: number;
  waypoints: Array<{ x: number; y: number }>;
  waypointIndex: number;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}
