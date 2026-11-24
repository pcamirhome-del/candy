import {
  CandyColor,
  CandyTile,
  CellMeta,
  LevelConfig,
  LineFlash,
  SpecialType,
} from './types';

export const GRID_SIZE = 8;
export const ALL_COLORS: CandyColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

export const COLOR_HEX: Record<CandyColor, string> = {
  red: '#FF2E54',
  orange: '#FF7A00',
  yellow: '#FFD600',
  green: '#00D26A',
  blue: '#00A8FF',
  purple: '#A855F7',
};

let tileSeq = 1;
export function nextTileId(): string {
  tileSeq += 1;
  return `candy_${Date.now().toString(36)}_${tileSeq}`;
}

export function getActiveColors(numColors: 5 | 6): CandyColor[] {
  return ALL_COLORS.slice(0, numColors);
}

export function randomColor(colors: CandyColor[]): CandyColor {
  return colors[Math.floor(Math.random() * colors.length)];
}

export function cloneBoard(board: (CandyTile | null)[][]): (CandyTile | null)[][] {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export function cloneMeta(meta: CellMeta[][]): CellMeta[][] {
  return meta.map((row) => row.map((m) => ({ ...m })));
}

export function getColumnBottomRow(meta: CellMeta[][], col: number): number {
  for (let r = GRID_SIZE - 1; r >= 0; r--) {
    if (!meta[r][col].void) return r;
  }
  return GRID_SIZE - 1;
}

export function getColumnTopRow(meta: CellMeta[][], col: number): number {
  for (let r = 0; r < GRID_SIZE; r++) {
    if (!meta[r][col].void) return r;
  }
  return 0;
}

export interface MatchCluster {
  cells: Array<{ row: number; col: number }>;
  color: CandyColor;
  specialToCreate: SpecialType;
  spawnAt: { row: number; col: number };
}

export function findMatchClusters(
  board: (CandyTile | null)[][],
  preferPositions: Array<{ row: number; col: number }> = []
): MatchCluster[] {
  type Run = {
    color: CandyColor;
    cells: Array<{ row: number; col: number }>;
    orientation: 'h' | 'v';
  };

  const isMatchable = (t: CandyTile | null): t is CandyTile & { color: CandyColor } =>
    Boolean(
      t &&
        t.color !== 'none' &&
        !t.isIngredient &&
        !t.isChocolate &&
        !t.isLicoriceSwirl
    );

  const runs: Run[] = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    let c = 0;
    while (c < GRID_SIZE) {
      const tile = board[r][c];
      if (!isMatchable(tile)) {
        c++;
        continue;
      }
      const color = tile.color;
      let end = c + 1;
      while (end < GRID_SIZE) {
        const nextTile = board[r][end];
        if (isMatchable(nextTile) && nextTile.color === color) end++;
        else break;
      }
      if (end - c >= 3) {
        const cells = [];
        for (let k = c; k < end; k++) cells.push({ row: r, col: k });
        runs.push({ color, cells, orientation: 'h' });
      }
      c = end;
    }
  }

  for (let c = 0; c < GRID_SIZE; c++) {
    let r = 0;
    while (r < GRID_SIZE) {
      const tile = board[r][c];
      if (!isMatchable(tile)) {
        r++;
        continue;
      }
      const color = tile.color;
      let end = r + 1;
      while (end < GRID_SIZE) {
        const nextTile = board[end][c];
        if (isMatchable(nextTile) && nextTile.color === color) end++;
        else break;
      }
      if (end - r >= 3) {
        const cells = [];
        for (let k = r; k < end; k++) cells.push({ row: k, col: c });
        runs.push({ color, cells, orientation: 'v' });
      }
      r = end;
    }
  }

  if (runs.length === 0) return [];

  const visited = new Array(runs.length).fill(false);
  const clusters: MatchCluster[] = [];

  const runsShareCell = (a: Run, b: Run) =>
    a.color === b.color &&
    a.cells.some((ca) => b.cells.some((cb) => ca.row === cb.row && ca.col === cb.col));

  for (let i = 0; i < runs.length; i++) {
    if (visited[i]) continue;
    visited[i] = true;
    const queue = [runs[i]];
    const groupRuns: Run[] = [runs[i]];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (let j = 0; j < runs.length; j++) {
        if (!visited[j] && runsShareCell(curr, runs[j])) {
          visited[j] = true;
          queue.push(runs[j]);
          groupRuns.push(runs[j]);
        }
      }
    }

    const cellMap = new Map<string, { row: number; col: number }>();
    let maxH = 0;
    let maxV = 0;
    for (const run of groupRuns) {
      if (run.orientation === 'h') maxH = Math.max(maxH, run.cells.length);
      if (run.orientation === 'v') maxV = Math.max(maxV, run.cells.length);
      for (const cell of run.cells) {
        cellMap.set(`${cell.row},${cell.col}`, cell);
      }
    }

    const cells = Array.from(cellMap.values());
    let specialToCreate: SpecialType = 'none';
    if (maxH >= 5 || maxV >= 5) {
      specialToCreate = 'color_bomb';
    } else if (maxH >= 3 && maxV >= 3) {
      specialToCreate = 'wrapped';
    } else if (maxH === 4) {
      specialToCreate = 'striped_v';
    } else if (maxV === 4) {
      specialToCreate = 'striped_h';
    }

    let spawnAt = cells[Math.floor(cells.length / 2)];
    for (const pref of preferPositions) {
      const found = cells.find((c) => c.row === pref.row && c.col === pref.col);
      if (found && !board[found.row][found.col]?.locked) {
        spawnAt = found;
        break;
      }
    }

    clusters.push({
      cells,
      color: groupRuns[0].color,
      specialToCreate,
      spawnAt,
    });
  }

  return clusters;
}

export function isAdjacent(a: { row: number; col: number }, b: { row: number; col: number }): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

export function canSwapTiles(
  board: (CandyTile | null)[][],
  meta: CellMeta[][],
  a: { row: number; col: number },
  b: { row: number; col: number }
): boolean {
  if (!isAdjacent(a, b)) return false;
  if (meta[a.row]?.[a.col]?.void || meta[b.row]?.[b.col]?.void) return false;
  if (meta[a.row][a.col].frosting > 0 || meta[b.row][b.col].frosting > 0) return false;
  const tileA = board[a.row][a.col];
  const tileB = board[b.row][b.col];
  if (!tileA || !tileB) return false;
  if (tileA.locked || tileB.locked || tileA.isChocolate || tileB.isChocolate) return false;
  return true;
}

export function canSwapProduceMatchOrSpecial(
  board: (CandyTile | null)[][],
  meta: CellMeta[][],
  a: { row: number; col: number },
  b: { row: number; col: number }
): boolean {
  if (!canSwapTiles(board, meta, a, b)) return false;
  const tileA = board[a.row][a.col]!;
  const tileB = board[b.row][b.col]!;

  if (
    (tileA.special === 'color_bomb' && !tileB.isIngredient && !tileB.isLicoriceSwirl) ||
    (tileB.special === 'color_bomb' && !tileA.isIngredient && !tileA.isLicoriceSwirl)
  ) {
    return true;
  }

  if (tileA.special !== 'none' && tileB.special !== 'none') {
    return true;
  }

  const testBoard = cloneBoard(board);
  testBoard[a.row][a.col] = { ...tileB, row: a.row, col: a.col };
  testBoard[b.row][b.col] = { ...tileA, row: b.row, col: b.col };
  return findMatchClusters(testBoard).length > 0;
}

export function findValidMove(
  board: (CandyTile | null)[][],
  meta: CellMeta[][]
): { a: { row: number; col: number }; b: { row: number; col: number } } | null {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (
        c + 1 < GRID_SIZE &&
        canSwapProduceMatchOrSpecial(board, meta, { row: r, col: c }, { row: r, col: c + 1 })
      ) {
        return { a: { row: r, col: c }, b: { row: r, col: c + 1 } };
      }
      if (
        r + 1 < GRID_SIZE &&
        canSwapProduceMatchOrSpecial(board, meta, { row: r, col: c }, { row: r + 1, col: c })
      ) {
        return { a: { row: r, col: c }, b: { row: r + 1, col: c } };
      }
    }
  }
  return null;
}

const parseFrostingChar = (ch: string): 0 | 1 | 2 | 3 | 4 | 5 => {
  if (ch === 'F') return 1;
  if (ch === 'G') return 2;
  if (ch === 'H') return 3;
  if (ch === 'I') return 4;
  if (ch === 'J') return 5;
  return 0;
};

export function createInitialBoard(
  level: LevelConfig,
  withColorBombStart: boolean
): {
  board: (CandyTile | null)[][];
  meta: CellMeta[][];
  ingredientsRemainingToSpawn: number;
} {
  const colors = getActiveColors(level.numColors);
  const bp = level.blueprint;

  const meta: CellMeta[][] = Array.from({ length: GRID_SIZE }, (_, r) =>
    Array.from({ length: GRID_SIZE }, (__, c) => {
      const ch = bp[r]?.[c] ?? '.';
      return {
        void: ch === '#',
        jelly: ch === '1' ? 1 : ch === '2' ? 2 : 0,
        frosting: parseFrostingChar(ch),
        exitChute: false,
      };
    })
  );

  if (level.objectiveType === 'ingredients') {
    for (let c = 0; c < GRID_SIZE; c++) {
      const bottomR = getColumnBottomRow(meta, c);
      if (!meta[bottomR][c].void) {
        meta[bottomR][c].exitChute = true;
      }
    }
  }

  let board: (CandyTile | null)[][] = [];
  let attempts = 0;
  const baseBombTimer = Math.max(7, 14 - Math.floor(level.id / 35));

  do {
    attempts++;
    board = Array.from({ length: GRID_SIZE }, (_, r) =>
      Array.from({ length: GRID_SIZE }, (__, c) => {
        const ch = bp[r]?.[c] ?? '.';
        if (meta[r][c].void || meta[r][c].frosting > 0) {
          return null;
        }
        if (ch === 'C') {
          return {
            id: nextTileId(),
            row: r,
            col: c,
            color: 'none',
            special: 'none',
            isChocolate: true,
          };
        }
        if (ch === 'S') {
          return {
            id: nextTileId(),
            row: r,
            col: c,
            color: 'none',
            special: 'none',
            isLicoriceSwirl: true,
          };
        }
        let candidate = randomColor(colors);
        let guard = 0;
        while (
          guard < 16 &&
          ((c >= 2 &&
            board[r]?.[c - 1]?.color === candidate &&
            board[r]?.[c - 2]?.color === candidate) ||
            (r >= 2 &&
              board[r - 1]?.[c]?.color === candidate &&
              board[r - 2]?.[c]?.color === candidate))
        ) {
          candidate = randomColor(colors);
          guard++;
        }
        return {
          id: nextTileId(),
          row: r,
          col: c,
          color: candidate,
          special: 'none',
          ...(ch === 'L' ? { locked: true } : {}),
          ...(ch === 'B' ? { bombTimer: baseBombTimer } : {}),
        };
      })
    );
  } while (!findValidMove(board, meta) && attempts < 25);

  let ingredientsRemainingToSpawn = level.ingredientCount ?? 0;
  if (level.objectiveType === 'ingredients' && ingredientsRemainingToSpawn > 0) {
    const initialOnBoard = Math.min(2, ingredientsRemainingToSpawn);
    const preferredCols = [2, 5, 3, 4, 1, 6];
    let placed = 0;
    for (const col of preferredCols) {
      if (placed >= initialOnBoard) break;
      const topR = getColumnTopRow(meta, col);
      const t = board[topR][col];
      if (
        !meta[topR][col].void &&
        meta[topR][col].frosting === 0 &&
        t &&
        !t.locked &&
        !t.isChocolate &&
        !t.isLicoriceSwirl
      ) {
        board[topR][col] = {
          id: nextTileId(),
          row: topR,
          col,
          color: 'none',
          special: 'none',
          isIngredient: true,
          ingredientKind: placed % 2 === 0 ? 'cherry' : 'hazelnut',
        };
        ingredientsRemainingToSpawn -= 1;
        placed++;
      }
    }
  }

  if (withColorBombStart) {
    const candidates = [
      [3, 3],
      [3, 4],
      [4, 3],
      [2, 3],
      [3, 2],
    ];
    for (const [r, c] of candidates) {
      const t = board[r]?.[c];
      if (t && !t.isIngredient && !t.isChocolate && !t.isLicoriceSwirl && !t.locked) {
        board[r][c] = {
          id: nextTileId(),
          row: r,
          col: c,
          color: 'none',
          special: 'color_bomb',
        };
        break;
      }
    }
  }

  return { board, meta, ingredientsRemainingToSpawn };
}

export function shuffleBoard(
  board: (CandyTile | null)[][],
  meta: CellMeta[][],
  numColors: 5 | 6
): (CandyTile | null)[][] {
  const colors = getActiveColors(numColors);
  const next = cloneBoard(board);

  const normalPositions: Array<{ row: number; col: number }> = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const t = next[r][c];
      if (
        !meta[r][c].void &&
        meta[r][c].frosting === 0 &&
        t &&
        t.special === 'none' &&
        !t.isIngredient &&
        !t.isChocolate &&
        !t.isLicoriceSwirl &&
        !t.locked &&
        t.color !== 'none'
      ) {
        normalPositions.push({ row: r, col: c });
      }
    }
  }

  for (let attempt = 0; attempt < 30; attempt++) {
    const pool = normalPositions.map((p) => next[p.row][p.col]!.color as CandyColor);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    normalPositions.forEach((p, idx) => {
      next[p.row][p.col]!.color = pool[idx];
    });
    if (findMatchClusters(next).length === 0 && findValidMove(next, meta)) {
      return next;
    }
  }

  for (const p of normalPositions) {
    let candidate = randomColor(colors);
    let safety = 0;
    while (safety < 14) {
      next[p.row][p.col]!.color = candidate;
      if (findMatchClusters(next).length === 0) break;
      candidate = randomColor(colors);
      safety++;
    }
  }
  return next;
}

export interface DestructionPlan {
  toDestroy: Set<string>;
  toUnlock: Set<string>;
  frostingHits: Set<string>;
  armedWrapped: Set<string>;
  flashes: LineFlash[];
  screenShake: boolean;
  specialSound: 'none' | 'explosion' | 'color_bomb';
}

function getMostAbundantColor(board: (CandyTile | null)[][]): CandyColor {
  const counts: Record<CandyColor, number> = {
    red: 0,
    orange: 0,
    yellow: 0,
    green: 0,
    blue: 0,
    purple: 0,
  };
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const t = board[r][c];
      if (t && t.color !== 'none' && !t.isIngredient && !t.isChocolate && !t.isLicoriceSwirl) {
        counts[t.color]++;
      }
    }
  }
  let best: CandyColor = 'red';
  let bestCount = -1;
  for (const col of ALL_COLORS) {
    if (counts[col] > bestCount) {
      bestCount = counts[col];
      best = col;
    }
  }
  return best;
}

export function expandChainDestruction(
  board: (CandyTile | null)[][],
  meta: CellMeta[][],
  seedCoords: Array<{ row: number; col: number }>,
  exemptSpecialCoords: Set<string> = new Set(),
  matchAdjacentDamageSeeds: Array<{ row: number; col: number }> = []
): DestructionPlan {
  const toDestroy = new Set<string>();
  const toUnlock = new Set<string>();
  const frostingHits = new Set<string>();
  const armedWrapped = new Set<string>();
  const triggeredSpecials = new Set<string>();
  const flashes: LineFlash[] = [];
  let screenShake = false;
  let specialSound: 'none' | 'explosion' | 'color_bomb' = 'none';

  const queue: Array<{ row: number; col: number }> = [];

  /** Returns true if a striped beam should STOP after hitting this cell (Licorice Swirl) */
  const hitCell = (r: number, c: number): boolean => {
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
    if (meta[r][c].void) return false;
    const key = `${r},${c}`;
    if (meta[r][c].frosting > 0) {
      frostingHits.add(key);
      return false;
    }
    const tile = board[r][c];
    if (!tile || tile.isIngredient) return false;
    if (tile.locked) {
      toUnlock.add(key);
      return false;
    }
    if (!toDestroy.has(key)) {
      toDestroy.add(key);
      queue.push({ row: r, col: c });
    }
    return Boolean(tile.isLicoriceSwirl);
  };

  for (const s of seedCoords) {
    hitCell(s.row, s.col);
  }

  // Orthogonal damage from direct match cells to adjacent frosting, chocolate, or licorice swirls
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (const m of matchAdjacentDamageSeeds) {
    for (const [dr, dc] of dirs) {
      const nr = m.row + dr;
      const nc = m.col + dc;
      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
      if (meta[nr][nc].void) continue;
      if (meta[nr][nc].frosting > 0) {
        frostingHits.add(`${nr},${nc}`);
      } else if (board[nr][nc]?.isChocolate || board[nr][nc]?.isLicoriceSwirl) {
        toDestroy.add(`${nr},${nc}`);
      }
    }
  }

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const key = `${curr.row},${curr.col}`;
    if (exemptSpecialCoords.has(key)) continue;

    const tile = board[curr.row][curr.col];
    if (
      !tile ||
      tile.isIngredient ||
      tile.isChocolate ||
      tile.isLicoriceSwirl ||
      tile.special === 'none'
    ) {
      continue;
    }
    if (triggeredSpecials.has(key)) continue;
    triggeredSpecials.add(key);

    if (tile.special === 'striped_h') {
      screenShake = true;
      if (specialSound === 'none') specialSound = 'explosion';
      flashes.push({ id: nextTileId(), type: 'row', row: curr.row, col: curr.col });
      // Scan left and right; Licorice Swirl absorbs and stops the striped beam
      for (let c = curr.col - 1; c >= 0; c--) {
        if (hitCell(curr.row, c)) break;
      }
      for (let c = curr.col + 1; c < GRID_SIZE; c++) {
        if (hitCell(curr.row, c)) break;
      }
    } else if (tile.special === 'striped_v') {
      screenShake = true;
      if (specialSound === 'none') specialSound = 'explosion';
      flashes.push({ id: nextTileId(), type: 'col', row: curr.row, col: curr.col });
      // Scan up and down; Licorice Swirl absorbs and stops the striped beam
      for (let r = curr.row - 1; r >= 0; r--) {
        if (hitCell(r, curr.col)) break;
      }
      for (let r = curr.row + 1; r < GRID_SIZE; r++) {
        if (hitCell(r, curr.col)) break;
      }
    } else if (tile.special === 'wrapped') {
      screenShake = true;
      if (specialSound === 'none') specialSound = 'explosion';
      flashes.push({ id: nextTileId(), type: 'area', row: curr.row, col: curr.col, radius: 1 });
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          hitCell(curr.row + dr, curr.col + dc);
        }
      }
      if (!tile.wrappedArmed) {
        toDestroy.delete(key);
        armedWrapped.add(key);
      }
    } else if (tile.special === 'color_bomb') {
      screenShake = true;
      specialSound = 'color_bomb';
      const targetColor = getMostAbundantColor(board);
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const target = board[r][c];
          if (target && target.color === targetColor && !target.isIngredient) {
            hitCell(r, c);
          }
        }
      }
    }
  }

  return { toDestroy, toUnlock, frostingHits, armedWrapped, flashes, screenShake, specialSound };
}

export function applyGravityAndRefill(
  board: (CandyTile | null)[][],
  meta: CellMeta[][],
  numColors: 5 | 6,
  ingredientsRemainingToSpawn: number
): {
  nextBoard: (CandyTile | null)[][];
  collectedIngredients: number;
  ingredientsLeftToSpawn: number;
} {
  const colors = getActiveColors(numColors);
  const nextBoard = cloneBoard(board);
  let collectedIngredients = 0;
  let toSpawn = ingredientsRemainingToSpawn;

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (meta[r][c].exitChute && nextBoard[r][c]?.isIngredient) {
        collectedIngredients += 1;
        nextBoard[r][c] = null;
      }
    }
  }

  const isPlayableEmpty = (r: number, c: number) =>
    r >= 0 &&
    r < GRID_SIZE &&
    c >= 0 &&
    c < GRID_SIZE &&
    !meta[r][c].void &&
    meta[r][c].frosting === 0 &&
    nextBoard[r][c] === null;

  const isMovableTile = (t: CandyTile | null) =>
    Boolean(t && !t.isChocolate && !t.locked);

  let changed = true;
  let guard = 0;
  while (changed && guard < 24) {
    changed = false;
    guard++;

    for (let c = 0; c < GRID_SIZE; c++) {
      for (let r = GRID_SIZE - 1; r >= 0; r--) {
        if (!isPlayableEmpty(r, c)) continue;
        for (let up = r - 1; up >= 0; up--) {
          if (meta[up][c].void) continue;
          if (meta[up][c].frosting > 0) break;
          const t = nextBoard[up][c];
          if (t) {
            if (!isMovableTile(t)) break;
            nextBoard[r][c] = { ...t, row: r, col: c, isNew: false };
            nextBoard[up][c] = null;
            changed = true;
            break;
          }
        }
      }
    }

    for (let r = GRID_SIZE - 1; r >= 1; r--) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!isPlayableEmpty(r, c)) continue;
        const leftCand = c > 0 ? nextBoard[r - 1][c - 1] : null;
        const rightCand = c < GRID_SIZE - 1 ? nextBoard[r - 1][c + 1] : null;
        if (isMovableTile(leftCand)) {
          nextBoard[r][c] = { ...leftCand!, row: r, col: c, isNew: false };
          nextBoard[r - 1][c - 1] = null;
          changed = true;
        } else if (isMovableTile(rightCand)) {
          nextBoard[r][c] = { ...rightCand!, row: r, col: c, isNew: false };
          nextBoard[r - 1][c + 1] = null;
          changed = true;
        }
      }
    }

    for (let c = 0; c < GRID_SIZE; c++) {
      const topR = getColumnTopRow(meta, c);
      if (isPlayableEmpty(topR, c)) {
        const activeIngredients = countIngredients(nextBoard);
        if (
          toSpawn > 0 &&
          activeIngredients < 2 &&
          c >= 1 &&
          c <= 6 &&
          Math.random() < 0.45
        ) {
          nextBoard[topR][c] = {
            id: nextTileId(),
            row: topR,
            col: c,
            color: 'none',
            special: 'none',
            isIngredient: true,
            ingredientKind: toSpawn % 2 === 0 ? 'cherry' : 'hazelnut',
            isNew: true,
          };
          toSpawn--;
        } else {
          nextBoard[topR][c] = {
            id: nextTileId(),
            row: topR,
            col: c,
            color: randomColor(colors),
            special: 'none',
            isNew: true,
          };
        }
        changed = true;
      }
    }
  }

  return {
    nextBoard,
    collectedIngredients,
    ingredientsLeftToSpawn: toSpawn,
  };
}

export function spreadChocolate(
  board: (CandyTile | null)[][],
  meta: CellMeta[][]
): { nextBoard: (CandyTile | null)[][]; spreadTo: { row: number; col: number } | null } {
  const candidates: Array<{ row: number; col: number }> = [];
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!board[r][c]?.isChocolate) continue;
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
        if (meta[nr][nc].void || meta[nr][nc].frosting > 0) continue;
        const t = board[nr][nc];
        if (
          t &&
          !t.isChocolate &&
          !t.isLicoriceSwirl &&
          !t.isIngredient &&
          !t.locked &&
          t.special === 'none' &&
          !t.bombTimer
        ) {
          candidates.push({ row: nr, col: nc });
        }
      }
    }
  }

  if (candidates.length === 0) {
    return { nextBoard: board, spreadTo: null };
  }

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  const nextBoard = cloneBoard(board);
  nextBoard[pick.row][pick.col] = {
    id: nextTileId(),
    row: pick.row,
    col: pick.col,
    color: 'none',
    special: 'none',
    isChocolate: true,
  };
  return { nextBoard, spreadTo: pick };
}

export function tickBombTimers(
  board: (CandyTile | null)[][]
): { nextBoard: (CandyTile | null)[][]; exploded: boolean } {
  let exploded = false;
  let anyChanged = false;
  const nextBoard = cloneBoard(board);
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const t = nextBoard[r][c];
      if (t && typeof t.bombTimer === 'number') {
        anyChanged = true;
        t.bombTimer -= 1;
        if (t.bombTimer <= 0) {
          t.bombTimer = 0;
          exploded = true;
        }
      }
    }
  }
  return { nextBoard: anyChanged ? nextBoard : board, exploded };
}

export function countIngredients(board: (CandyTile | null)[][]): number {
  let count = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c]?.isIngredient) count++;
    }
  }
  return count;
}

export function countChocolate(board: (CandyTile | null)[][]): number {
  let count = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c]?.isChocolate) count++;
    }
  }
  return count;
}

export function countLicoriceSwirls(board: (CandyTile | null)[][]): number {
  let count = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c]?.isLicoriceSwirl) count++;
    }
  }
  return count;
}

export function countRemainingFrosting(meta: CellMeta[][]): number {
  let total = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!meta[r][c].void && meta[r][c].frosting > 0) total++;
    }
  }
  return total;
}

export function countRemainingBlockers(board: (CandyTile | null)[][], meta: CellMeta[][]): number {
  return countRemainingFrosting(meta) + countChocolate(board) + countLicoriceSwirls(board);
}

export function countRemainingJelly(meta: CellMeta[][]): number {
  let total = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!meta[r][c].void && meta[r][c].jelly > 0) total++;
    }
  }
  return total;
}

export function getComboCallout(comboStep: number): string | null {
  if (comboStep === 2) return 'Sweet!';
  if (comboStep === 3) return 'Tasty!';
  if (comboStep === 4) return 'Delicious!';
  if (comboStep === 5) return 'Divine!';
  if (comboStep >= 6) return 'Candy Amir!';
  return null;
}
