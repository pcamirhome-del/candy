export type CandyColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';

export type SpecialType = 'none' | 'striped_h' | 'striped_v' | 'wrapped' | 'color_bomb';

export interface CandyTile {
  id: string;
  row: number;
  col: number;
  color: CandyColor | 'none';
  special: SpecialType;
  isIngredient?: boolean;
  ingredientKind?: 'cherry' | 'hazelnut';
  isNew?: boolean;
  /** Used for wrapped candy second-stage explosion */
  wrappedArmed?: boolean;
  /** Locked inside metal lattice bars (cannot swap/fall until matched or blasted) */
  locked?: boolean;
  /** Black spiral Licorice Swirl (drops with gravity, blocks striped beams) */
  isLicoriceSwirl?: boolean;
  /** Dark chocolate blocker (spreads if none destroyed on a move) */
  isChocolate?: boolean;
  /** Ticking candy bomb countdown in moves */
  bombTimer?: number;
}

export interface TeleporterLink {
  from: { row: number; col: number };
  to: { row: number; col: number };
  pairId: number;
}

export interface ConveyorCell {
  row: number;
  col: number;
}

export interface WorldChapter {
  id: number;
  name: string;
  subtitle: string;
  startLevel: number;
  endLevel: number;
  accent: string;
}

export interface CellMeta {
  /** Cutout void cell where candies cannot sit */
  void: boolean;
  /** 0 = none, 1 = single blue crystal jelly, 2 = double crystal jelly */
  jelly: 0 | 1 | 2;
  /** 0 = none, 1..5 layers of swirled frosting/icing */
  frosting: 0 | 1 | 2 | 3 | 4 | 5;
  /** Glowing green bottom exit chute for ingredients */
  exitChute: boolean;
  /** Portal entry pairId (top of receiving cell) */
  teleporterIn?: number;
  /** Portal exit pairId (bottom of sending cell) */
  teleporterOut?: number;
  /** Moving conveyor belt direction for this cell */
  conveyorDir?: 'up' | 'down' | 'left' | 'right';
}

export type LevelObjectiveType = 'score' | 'jelly' | 'ingredients' | 'blockers';

export interface LevelConfig {
  id: number;
  title: string;
  objectiveType: LevelObjectiveType;
  moves: number;
  targetScore: number;
  starThresholds: [number, number, number];
  ingredientCount?: number;
  /** 8 rows of 8 chars static blueprint */
  blueprint: string[];
  /** Signature string verified unique across all 750 levels */
  signature: string;
  isBoss?: boolean;
  keyReward?: number;
  gemReward: number;
  numColors: 5 | 6;
  worldId?: number;
  teleporters?: TeleporterLink[];
  conveyors?: ConveyorCell[][];
}

export type BoosterType = 'hammer' | 'freeSwitch' | 'colorBombStart';

export interface PlayerProgress {
  lives: number;
  lastLifeLostAt: number | null;
  cash: number;
  gems: number;
  keys: number;
  unlockedLevel: number;
  purchasedLevels: number[];
  unlockedGates: number[];
  levelStars: Record<number, number>;
  highScores: Record<number, number>;
  redeemedCodes: string[];
  boosters: {
    hammer: number;
    freeSwitch: number;
    colorBombStart: number;
  };
  soundMuted: boolean;
}

export interface FloatingPopup {
  id: string;
  row: number;
  col: number;
  text: string;
  subtext?: string;
  tone: 'normal' | 'combo' | 'special' | 'ingredient';
}

export interface BurstParticle {
  id: string;
  row: number;
  col: number;
  color: string;
  tx: string;
  ty: string;
  size: number;
}

export interface LineFlash {
  id: string;
  type: 'row' | 'col' | 'area';
  row: number;
  col: number;
  radius?: number;
  color?: string;
  mega?: boolean;
}

export interface LightningArc {
  id: string;
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  color: string;
}

export interface GateRequirement {
  afterLevel: number;
  keysRequired: number;
  gemSkipCost: number;
  title: string;
}
