import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyGravityAndRefill,
  canSwapProduceMatchOrSpecial,
  canSwapTiles,
  cloneBoard,
  cloneMeta,
  COLOR_HEX,
  countChocolate,
  countRemainingBlockers,
  countRemainingJelly,
  createInitialBoard,
  DestructionPlan,
  expandChainDestruction,
  findMatchClusters,
  findValidMove,
  getComboCallout,
  GRID_SIZE,
  isAdjacent,
  nextTileId,
  pickSugarCrushCandidates,
  shuffleBoard,
  spreadChocolate,
  stepConveyors,
  tickBombTimers,
} from '../game/engine';
import { sound } from '../game/sound';
import {
  BoosterType,
  BurstParticle,
  CandyTile,
  CellMeta,
  FloatingPopup,
  LevelConfig,
  LightningArc,
  LineFlash,
} from '../game/types';
import { CandyPiece } from './CandyPiece';

interface GameBoardProps {
  level: LevelConfig;
  startWithColorBomb: boolean;
  activeBooster: BoosterType | null;
  movesLeft: number;
  score: number;
  isModalOpen: boolean;
  onConsumeMove: () => void;
  onAddScore: (points: number) => void;
  onConsumeBooster: (type: BoosterType) => void;
  onClearActiveBooster: () => void;
  onObjectiveProgress: (info: {
    jellyRemaining: number;
    ingredientsCollected: number;
    blockersRemaining: number;
  }) => void;
  onLevelComplete: () => void;
  onOutOfMoves: () => void;
  onBombExploded: () => void;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const GameBoard: React.FC<GameBoardProps> = ({
  level,
  startWithColorBomb,
  activeBooster,
  movesLeft,
  score,
  isModalOpen,
  onConsumeMove,
  onAddScore,
  onConsumeBooster,
  onClearActiveBooster,
  onObjectiveProgress,
  onLevelComplete,
  onOutOfMoves,
  onBombExploded,
}) => {
  const initial = useRef(createInitialBoard(level, startWithColorBomb));
  const [board, setBoard] = useState<(CandyTile | null)[][]>(initial.current.board);
  const [meta, setMeta] = useState<CellMeta[][]>(initial.current.meta);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [hintMove, setHintMove] = useState<{
    a: { row: number; col: number };
    b: { row: number; col: number };
  } | null>(null);
  const [shuffling, setShuffling] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [popups, setPopups] = useState<FloatingPopup[]>([]);
  const [particles, setParticles] = useState<BurstParticle[]>([]);
  const [flashes, setFlashes] = useState<LineFlash[]>([]);
  const [lightningArcs, setLightningArcs] = useState<LightningArc[]>([]);
  const [showSugarCrush, setShowSugarCrush] = useState(false);

  const boardRef = useRef(board);
  const metaRef = useRef(meta);
  const toSpawnRef = useRef(initial.current.ingredientsRemainingToSpawn);
  const collectedRef = useRef(0);
  const movesRef = useRef(movesLeft);
  const scoreRef = useRef(score);
  const busyRef = useRef(false);
  const finishedRef = useRef(false);
  const sugarCrushTriggeredRef = useRef(false);
  const runIdRef = useRef(0);
  const chocolateClearedThisTurnRef = useRef(false);
  const pointerStartRef = useRef<{ row: number; col: number; x: number; y: number } | null>(null);
  const hintTimerRef = useRef<number | null>(null);

  useEffect(() => {
    movesRef.current = movesLeft;
  }, [movesLeft]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  const emitProgress = useCallback(
    (b: (CandyTile | null)[][], m: CellMeta[][]) => {
      onObjectiveProgress({
        jellyRemaining: countRemainingJelly(m),
        ingredientsCollected: collectedRef.current,
        blockersRemaining: countRemainingBlockers(b, m),
      });
    },
    [onObjectiveProgress]
  );

  useEffect(() => {
    runIdRef.current += 1;
    busyRef.current = false;
    finishedRef.current = false;
    sugarCrushTriggeredRef.current = false;
    setShowSugarCrush(false);
    setLightningArcs([]);
    const fresh = createInitialBoard(level, startWithColorBomb);
    boardRef.current = fresh.board;
    metaRef.current = fresh.meta;
    toSpawnRef.current = fresh.ingredientsRemainingToSpawn;
    collectedRef.current = 0;
    setBoard(fresh.board);
    setMeta(fresh.meta);
    setSelected(null);
    setHintMove(null);
    emitProgress(fresh.board, fresh.meta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level.id, startWithColorBomb]);

  const resetHintTimer = useCallback(() => {
    if (hintTimerRef.current) window.clearTimeout(hintTimerRef.current);
    setHintMove(null);
    if (finishedRef.current || isModalOpen) return;
    hintTimerRef.current = window.setTimeout(() => {
      if (!busyRef.current && !finishedRef.current) {
        const move = findValidMove(boardRef.current, metaRef.current);
        if (move) setHintMove(move);
      }
    }, 4500);
  }, [isModalOpen]);

  useEffect(() => {
    resetHintTimer();
    return () => {
      if (hintTimerRef.current) window.clearTimeout(hintTimerRef.current);
    };
  }, [resetHintTimer, movesLeft]);

  const triggerShake = useCallback(() => {
    setShaking(false);
    requestAnimationFrame(() => setShaking(true));
    window.setTimeout(() => setShaking(false), 340);
  }, []);

  const addPopup = useCallback(
    (row: number, col: number, text: string, tone: FloatingPopup['tone'] = 'normal', subtext?: string) => {
      const id = nextTileId();
      setPopups((prev) => [...prev.slice(-6), { id, row, col, text, subtext, tone }]);
      window.setTimeout(() => {
        setPopups((prev) => prev.filter((p) => p.id !== id));
      }, 960);
    },
    []
  );

  const spawnBurstParticles = useCallback((coords: Array<{ row: number; col: number; color: string }>) => {
    const created: BurstParticle[] = [];
    const limited = coords.slice(0, 20);
    for (const item of limited) {
      for (let i = 0; i < 4; i++) {
        const angle = (Math.PI * 2 * i) / 4 + Math.random() * 0.7;
        const dist = 22 + Math.random() * 28;
        created.push({
          id: nextTileId(),
          row: item.row,
          col: item.col,
          color: item.color,
          tx: `${Math.round(Math.cos(angle) * dist)}px`,
          ty: `${Math.round(Math.sin(angle) * dist)}px`,
          size: 5 + Math.floor(Math.random() * 4),
        });
      }
    }
    if (created.length === 0) return;
    setParticles((prev) => [...prev.slice(-48), ...created]);
    const ids = new Set(created.map((c) => c.id));
    window.setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !ids.has(p.id)));
    }, 500);
  }, []);

  const addFlashes = useCallback((newFlashes: LineFlash[]) => {
    if (newFlashes.length === 0) return;
    setFlashes((prev) => [...prev, ...newFlashes]);
    const ids = new Set(newFlashes.map((f) => f.id));
    window.setTimeout(() => {
      setFlashes((prev) => prev.filter((f) => !ids.has(f.id)));
    }, 450);
  }, []);

  const addLightningArcs = useCallback((arcs: LightningArc[]) => {
    if (arcs.length === 0) return;
    setLightningArcs((prev) => [...prev, ...arcs]);
    const ids = new Set(arcs.map((a) => a.id));
    window.setTimeout(() => {
      setLightningArcs((prev) => prev.filter((a) => !ids.has(a.id)));
    }, 340);
  }, []);

  const destroyCellsAndUpdate = useCallback(
    (
      currentBoard: (CandyTile | null)[][],
      currentMeta: CellMeta[][],
      plan: Pick<DestructionPlan, 'toDestroy' | 'toUnlock' | 'frostingHits' | 'armedWrapped'>,
      extraJellyHits: Array<{ row: number; col: number }> = [],
      comboStep: number = 1
    ) => {
      const nextB = cloneBoard(currentBoard);
      const nextM = cloneMeta(currentMeta);
      const burstList: Array<{ row: number; col: number; color: string }> = [];
      let clearedCount = 0;
      let jellyHit = false;
      let frostingHit = false;

      for (const key of plan.toDestroy) {
        const [rStr, cStr] = key.split(',');
        const r = Number(rStr);
        const c = Number(cStr);
        const tile = nextB[r]?.[c];
        if (tile && !tile.isIngredient) {
          if (tile.isChocolate) {
            chocolateClearedThisTurnRef.current = true;
            burstList.push({ row: r, col: c, color: '#8B5338' });
          } else if (tile.isLicoriceSwirl) {
            burstList.push({ row: r, col: c, color: '#64748B' });
          } else {
            const hex = tile.color === 'none' ? '#FDE047' : COLOR_HEX[tile.color];
            burstList.push({ row: r, col: c, color: hex });
          }
          clearedCount++;
          nextB[r][c] = null;
        }
        if (nextM[r]?.[c] && nextM[r][c].jelly > 0) {
          nextM[r][c].jelly = (nextM[r][c].jelly - 1) as 0 | 1 | 2;
          jellyHit = true;
        }
      }

      for (const key of plan.toUnlock) {
        const [rStr, cStr] = key.split(',');
        const r = Number(rStr);
        const c = Number(cStr);
        if (nextB[r]?.[c]) {
          nextB[r][c]!.locked = false;
          burstList.push({ row: r, col: c, color: '#E2E8F0' });
        }
      }

      for (const key of plan.frostingHits) {
        const [rStr, cStr] = key.split(',');
        const r = Number(rStr);
        const c = Number(cStr);
        if (nextM[r]?.[c] && nextM[r][c].frosting > 0) {
          nextM[r][c].frosting = (nextM[r][c].frosting - 1) as 0 | 1 | 2 | 3 | 4 | 5;
          clearedCount++;
          frostingHit = true;
          burstList.push({ row: r, col: c, color: '#E0F2FE' });
        }
      }

      for (const key of plan.armedWrapped) {
        const [rStr, cStr] = key.split(',');
        const r = Number(rStr);
        const c = Number(cStr);
        if (nextB[r]?.[c]) {
          nextB[r][c]!.wrappedArmed = true;
        }
        if (nextM[r]?.[c] && nextM[r][c].jelly > 0) {
          nextM[r][c].jelly = (nextM[r][c].jelly - 1) as 0 | 1 | 2;
          jellyHit = true;
        }
      }

      for (const cell of extraJellyHits) {
        if (nextM[cell.row]?.[cell.col] && nextM[cell.row][cell.col].jelly > 0) {
          nextM[cell.row][cell.col].jelly = (nextM[cell.row][cell.col].jelly - 1) as 0 | 1 | 2;
          jellyHit = true;
        }
      }

      if (frostingHit) sound.playFrostingCrack();
      if (jellyHit) sound.playJellyCrack();

      const gained = clearedCount * 25 * comboStep;
      if (gained > 0) {
        scoreRef.current += gained;
        onAddScore(gained);
      }

      spawnBurstParticles(burstList);

      return { nextB, nextM, clearedCount, gained };
    },
    [onAddScore, spawnBurstParticles]
  );

  const collectBottomIngredients = useCallback(
    (b: (CandyTile | null)[][], m: CellMeta[][]) => {
      let collected = 0;
      const next = cloneBoard(b);
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (m[r][c].exitChute && next[r][c]?.isIngredient) {
            collected++;
            next[r][c] = null;
            addPopup(r, c, '+1 Collected!', 'ingredient');
            spawnBurstParticles([{ row: r, col: c, color: '#FACC15' }]);
          }
        }
      }
      if (collected > 0) {
        collectedRef.current += collected;
        sound.playIngredient();
        const bonus = collected * 300;
        scoreRef.current += bonus;
        onAddScore(bonus);
        emitProgress(next, m);
      }
      return { next, collected };
    },
    [addPopup, emitProgress, onAddScore, spawnBurstParticles]
  );

  const resolveCascades = useCallback(
    async (runId: number, startCombo = 0, initialPrefer: Array<{ row: number; col: number }> = []) => {
      let comboStep = startCombo;
      let prefer = initialPrefer;

      while (runId === runIdRef.current) {
        const armedCoords: Array<{ row: number; col: number }> = [];
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            if (boardRef.current[r][c]?.wrappedArmed) {
              armedCoords.push({ row: r, col: c });
            }
          }
        }

        if (armedCoords.length > 0) {
          comboStep += 1;
          const plan = expandChainDestruction(boardRef.current, metaRef.current, armedCoords);
          addFlashes(plan.flashes);
          addLightningArcs(plan.lightningArcs);
          triggerShake();
          if (plan.hasLaser) sound.playLaserBeam();
          sound.playExplosion();
          const { nextB, nextM } = destroyCellsAndUpdate(
            boardRef.current,
            metaRef.current,
            plan,
            [],
            comboStep
          );
          boardRef.current = nextB;
          metaRef.current = nextM;
          setBoard(nextB);
          setMeta(nextM);
          emitProgress(nextB, nextM);
          await sleep(190);
          if (runId !== runIdRef.current) return;

          const grav = applyGravityAndRefill(
            boardRef.current,
            metaRef.current,
            level.numColors,
            toSpawnRef.current,
            level.teleporters
          );
          toSpawnRef.current = grav.ingredientsLeftToSpawn;
          if (grav.collectedIngredients > 0) {
            collectedRef.current += grav.collectedIngredients;
            sound.playIngredient();
            emitProgress(grav.nextBoard, metaRef.current);
          }
          boardRef.current = grav.nextBoard;
          setBoard(grav.nextBoard);
          await sleep(200);
          continue;
        }

        const ingRes = collectBottomIngredients(boardRef.current, metaRef.current);
        if (ingRes.collected > 0) {
          boardRef.current = ingRes.next;
          setBoard(ingRes.next);
          await sleep(150);
          if (runId !== runIdRef.current) return;
          const grav = applyGravityAndRefill(
            boardRef.current,
            metaRef.current,
            level.numColors,
            toSpawnRef.current,
            level.teleporters
          );
          toSpawnRef.current = grav.ingredientsLeftToSpawn;
          boardRef.current = grav.nextBoard;
          setBoard(grav.nextBoard);
          await sleep(200);
          continue;
        }

        const clusters = findMatchClusters(boardRef.current, prefer);
        prefer = [];
        if (clusters.length === 0) break;

        comboStep += 1;
        const matchedSeeds: Array<{ row: number; col: number }> = [];
        const exemptSpawns = new Set<string>();
        const spawnQueue: Array<{
          row: number;
          col: number;
          color: CandyTile['color'];
          special: CandyTile['special'];
        }> = [];
        const extraJellyHits: Array<{ row: number; col: number }> = [];

        for (const cl of clusters) {
          for (const cell of cl.cells) {
            matchedSeeds.push(cell);
          }
          if (cl.specialToCreate !== 'none') {
            const key = `${cl.spawnAt.row},${cl.spawnAt.col}`;
            exemptSpawns.add(key);
            extraJellyHits.push(cl.spawnAt);
            spawnQueue.push({
              row: cl.spawnAt.row,
              col: cl.spawnAt.col,
              color: cl.specialToCreate === 'color_bomb' ? 'none' : cl.color,
              special: cl.specialToCreate,
            });
          }
        }

        const plan = expandChainDestruction(
          boardRef.current,
          metaRef.current,
          matchedSeeds,
          exemptSpawns,
          matchedSeeds
        );
        for (const key of exemptSpawns) {
          plan.toDestroy.delete(key);
        }

        addFlashes(plan.flashes);
        addLightningArcs(plan.lightningArcs);
        if (plan.screenShake || comboStep >= 3) triggerShake();

        if (plan.specialSound === 'color_bomb') sound.playColorBomb();
        else if (plan.hasLaser) {
          sound.playLaserBeam();
          sound.playExplosion();
        } else if (plan.specialSound === 'explosion') sound.playExplosion();
        else sound.playMatch(comboStep);

        if (spawnQueue.length > 0) {
          sound.playSpecialCreate();
        }

        const { nextB, nextM, gained } = destroyCellsAndUpdate(
          boardRef.current,
          metaRef.current,
          plan,
          extraJellyHits,
          comboStep
        );

        for (const sp of spawnQueue) {
          nextB[sp.row][sp.col] = {
            id: nextTileId(),
            row: sp.row,
            col: sp.col,
            color: sp.color,
            special: sp.special,
          };
        }

        const firstCell = clusters[0].cells[0];
        const callout = getComboCallout(comboStep);
        if (callout) {
          addPopup(firstCell.row, firstCell.col, callout, 'combo', `+${gained}`);
        } else if (gained > 0) {
          addPopup(firstCell.row, firstCell.col, `+${gained}`, 'normal');
        }

        boardRef.current = nextB;
        metaRef.current = nextM;
        setBoard(nextB);
        setMeta(nextM);
        emitProgress(nextB, nextM);

        await sleep(170);
        if (runId !== runIdRef.current) return;

        const grav = applyGravityAndRefill(
          boardRef.current,
          metaRef.current,
          level.numColors,
          toSpawnRef.current,
          level.teleporters
        );
        toSpawnRef.current = grav.ingredientsLeftToSpawn;
        if (grav.collectedIngredients > 0) {
          collectedRef.current += grav.collectedIngredients;
          sound.playIngredient();
          emitProgress(grav.nextBoard, metaRef.current);
        }
        boardRef.current = grav.nextBoard;
        setBoard(grav.nextBoard);
        await sleep(200);
      }
    },
    [
      addFlashes,
      addLightningArcs,
      addPopup,
      collectBottomIngredients,
      destroyCellsAndUpdate,
      emitProgress,
      level.numColors,
      level.teleporters,
      triggerShake,
    ]
  );

  const checkWinOrDeadlock = useCallback(
    async (consumedPlayerMove: boolean) => {
      if (finishedRef.current) return;
      const myRunId = runIdRef.current;

      const isWonNow = () => {
        const jellyRemaining = countRemainingJelly(metaRef.current);
        const blockersRemaining = countRemainingBlockers(boardRef.current, metaRef.current);
        const ingredientsCollected = collectedRef.current;
        if (level.objectiveType === 'score') {
          return scoreRef.current >= level.targetScore;
        }
        if (level.objectiveType === 'jelly') return jellyRemaining === 0;
        if (level.objectiveType === 'ingredients') {
          return ingredientsCollected >= (level.ingredientCount ?? 0);
        }
        if (level.objectiveType === 'blockers') return blockersRemaining === 0;
        return false;
      };

      const runSugarCrushIfWon = async (): Promise<boolean> => {
        if (!isWonNow()) return false;
        if (!sugarCrushTriggeredRef.current && movesRef.current > 0) {
          sugarCrushTriggeredRef.current = true;
          setShowSugarCrush(true);
          sound.playSugarCrush();
          await sleep(520);

          while (movesRef.current > 0 && myRunId === runIdRef.current) {
            const batchSize = Math.min(movesRef.current, 6);
            const picks = pickSugarCrushCandidates(boardRef.current, metaRef.current, batchSize);
            if (picks.length === 0) break;

            const waveBoard = cloneBoard(boardRef.current);
            const seeds: Array<{ row: number; col: number }> = [];
            for (const p of picks) {
              if (movesRef.current <= 0) break;
              movesRef.current = Math.max(0, movesRef.current - 1);
              onConsumeMove();
              scoreRef.current += 150;
              onAddScore(150);

              const t = waveBoard[p.row][p.col];
              if (t) {
                const spRoll = Math.random();
                const special: CandyTile['special'] =
                  spRoll < 0.34 ? 'striped_h' : spRoll < 0.68 ? 'striped_v' : 'wrapped';
                waveBoard[p.row][p.col] = { ...t, special };
                seeds.push(p);
                boardRef.current = cloneBoard(waveBoard);
                setBoard(boardRef.current);
                sound.playSpecialCreate();
                addPopup(p.row, p.col, '+150', 'special');
                await sleep(75);
                if (myRunId !== runIdRef.current) return true;
              }
            }

            if (seeds.length > 0) {
              const plan = expandChainDestruction(boardRef.current, metaRef.current, seeds);
              addFlashes(plan.flashes);
              addLightningArcs(plan.lightningArcs);
              triggerShake();
              if (plan.hasLaser) sound.playLaserBeam();
              sound.playExplosion();
              const { nextB, nextM } = destroyCellsAndUpdate(
                boardRef.current,
                metaRef.current,
                plan,
                [],
                3
              );
              boardRef.current = nextB;
              metaRef.current = nextM;
              setBoard(nextB);
              setMeta(nextM);
              emitProgress(nextB, nextM);
              await sleep(220);
              if (myRunId !== runIdRef.current) return true;

              const grav = applyGravityAndRefill(
                boardRef.current,
                metaRef.current,
                level.numColors,
                toSpawnRef.current,
                level.teleporters
              );
              toSpawnRef.current = grav.ingredientsLeftToSpawn;
              boardRef.current = grav.nextBoard;
              setBoard(grav.nextBoard);
              await sleep(210);
              await resolveCascades(myRunId, 2, []);
            }
          }
          setShowSugarCrush(false);
        }

        if (myRunId !== runIdRef.current) return true;
        finishedRef.current = true;
        onLevelComplete();
        return true;
      };

      if (await runSugarCrushIfWon()) return;

      // On player's move end: tick bomb timers, spread chocolate, and advance conveyors
      if (consumedPlayerMove) {
        const bombRes = tickBombTimers(boardRef.current);
        if (bombRes.nextBoard !== boardRef.current) {
          boardRef.current = bombRes.nextBoard;
          setBoard(bombRes.nextBoard);
          if (bombRes.exploded) {
            sound.playExplosion();
            triggerShake();
            onBombExploded();
            return;
          }
        }

        if (!chocolateClearedThisTurnRef.current && countChocolate(boardRef.current) > 0) {
          const spreadRes = spreadChocolate(boardRef.current, metaRef.current);
          if (spreadRes.spreadTo) {
            boardRef.current = spreadRes.nextBoard;
            setBoard(spreadRes.nextBoard);
            emitProgress(spreadRes.nextBoard, metaRef.current);
            addPopup(spreadRes.spreadTo.row, spreadRes.spreadTo.col, 'Chocolate Spread!', 'normal');
          }
        }

        if (level.conveyors && level.conveyors.length > 0 && movesRef.current > 0) {
          const convRes = stepConveyors(boardRef.current, metaRef.current, level.conveyors);
          if (convRes.moved) {
            boardRef.current = convRes.nextBoard;
            setBoard(convRes.nextBoard);
            sound.playSwap();
            await sleep(210);
            if (myRunId !== runIdRef.current) return;
            if (findMatchClusters(boardRef.current).length > 0) {
              await resolveCascades(myRunId, 0, []);
              if (myRunId !== runIdRef.current) return;
              if (await runSugarCrushIfWon()) return;
            }
          }
        }
      }

      if (movesRef.current <= 0) {
        onOutOfMoves();
        return;
      }

      if (!findValidMove(boardRef.current, metaRef.current)) {
        setShuffling(true);
        await sleep(650);
        const shuffled = shuffleBoard(boardRef.current, metaRef.current, level.numColors);
        boardRef.current = shuffled;
        setBoard(shuffled);
        sound.playSwap();
        await sleep(220);
        setShuffling(false);
      }
    },
    [
      addFlashes,
      addLightningArcs,
      addPopup,
      destroyCellsAndUpdate,
      emitProgress,
      level,
      onAddScore,
      onBombExploded,
      onConsumeMove,
      onLevelComplete,
      onOutOfMoves,
      resolveCascades,
      triggerShake,
    ]
  );

  const attemptSwap = useCallback(
    async (a: { row: number; col: number }, b: { row: number; col: number }) => {
      if (busyRef.current || finishedRef.current || isModalOpen) return;
      if (!canSwapTiles(boardRef.current, metaRef.current, a, b)) {
        sound.playInvalidSwap();
        setSelected(null);
        return;
      }

      const tileA = boardRef.current[a.row][a.col]!;
      const tileB = boardRef.current[b.row][b.col]!;
      const isFreeSwitch = activeBooster === 'freeSwitch';
      const valid = canSwapProduceMatchOrSpecial(boardRef.current, metaRef.current, a, b);

      busyRef.current = true;
      chocolateClearedThisTurnRef.current = false;
      setSelected(null);
      setHintMove(null);
      const myRunId = runIdRef.current;

      const swapped = cloneBoard(boardRef.current);
      swapped[a.row][a.col] = { ...tileB, row: a.row, col: a.col };
      swapped[b.row][b.col] = { ...tileA, row: b.row, col: b.col };
      boardRef.current = swapped;
      setBoard(swapped);
      sound.playSwap();

      await sleep(180);
      if (myRunId !== runIdRef.current) return;

      if (!valid && !isFreeSwitch) {
        sound.playInvalidSwap();
        const reverted = cloneBoard(boardRef.current);
        reverted[a.row][a.col] = { ...tileA, row: a.row, col: a.col };
        reverted[b.row][b.col] = { ...tileB, row: b.row, col: b.col };
        boardRef.current = reverted;
        setBoard(reverted);
        await sleep(180);
        busyRef.current = false;
        resetHintTimer();
        return;
      }

      if (isFreeSwitch) {
        onConsumeBooster('freeSwitch');
        onClearActiveBooster();
      } else {
        onConsumeMove();
      }

      const nowA = boardRef.current[a.row][a.col]!;
      const nowB = boardRef.current[b.row][b.col]!;
      const bothSpecial = nowA.special !== 'none' && nowB.special !== 'none';
      const hasColorBomb =
        (nowA.special === 'color_bomb' && !nowB.isIngredient) ||
        (nowB.special === 'color_bomb' && !nowA.isIngredient);

      if (hasColorBomb || bothSpecial) {
        if (nowA.special === 'color_bomb' && nowB.special === 'color_bomb') {
          sound.playColorBomb();
          sound.playExplosion();
          triggerShake();
          addFlashes([
            {
              id: nextTileId(),
              type: 'area',
              row: 3.5,
              col: 3.5,
              radius: 4.5,
              color: '#F472B6',
              mega: true,
            },
          ]);
          addPopup(b.row, b.col, 'MEGA BLAST!', 'special', '+1600');
          const allCoords = new Set<string>();
          const allFrosting = new Set<string>();
          const allUnlock = new Set<string>();
          for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
              if (metaRef.current[r][c].void) continue;
              if (metaRef.current[r][c].frosting > 0) allFrosting.add(`${r},${c}`);
              else if (boardRef.current[r][c]?.locked) allUnlock.add(`${r},${c}`);
              else if (boardRef.current[r][c] && !boardRef.current[r][c]!.isIngredient) {
                allCoords.add(`${r},${c}`);
              }
            }
          }
          const { nextB, nextM } = destroyCellsAndUpdate(
            boardRef.current,
            metaRef.current,
            {
              toDestroy: allCoords,
              toUnlock: allUnlock,
              frostingHits: allFrosting,
              armedWrapped: new Set(),
            },
            [],
            2
          );
          boardRef.current = nextB;
          metaRef.current = nextM;
          setBoard(nextB);
          setMeta(nextM);
          emitProgress(nextB, nextM);
          await sleep(280);
        } else if (nowA.special === 'color_bomb' || nowB.special === 'color_bomb') {
          const bombPos = nowA.special === 'color_bomb' ? a : b;
          const partner = nowA.special === 'color_bomb' ? nowB : nowA;
          const targetColor = partner.color;

          sound.playColorBomb();
          triggerShake();

          if (
            targetColor !== 'none' &&
            (partner.special === 'striped_h' ||
              partner.special === 'striped_v' ||
              partner.special === 'wrapped')
          ) {
            const transformTo = partner.special;
            const converted = cloneBoard(boardRef.current);
            const seeds: Array<{ row: number; col: number }> = [bombPos];
            const arcs: LightningArc[] = [];
            const arcHex = COLOR_HEX[targetColor];
            for (let r = 0; r < GRID_SIZE; r++) {
              for (let c = 0; c < GRID_SIZE; c++) {
                const t = converted[r][c];
                if (t && t.color === targetColor && !t.isIngredient) {
                  const chosenSpecial =
                    transformTo === 'wrapped'
                      ? 'wrapped'
                      : Math.random() < 0.5
                      ? 'striped_h'
                      : 'striped_v';
                  converted[r][c] = { ...t, special: chosenSpecial };
                  seeds.push({ row: r, col: c });
                  arcs.push({
                    id: nextTileId(),
                    fromRow: bombPos.row,
                    fromCol: bombPos.col,
                    toRow: r,
                    toCol: c,
                    color: arcHex,
                  });
                }
              }
            }
            addLightningArcs(arcs);
            sound.playLightningZap(1);
            boardRef.current = converted;
            setBoard(converted);
            addPopup(b.row, b.col, 'Color Combo!', 'special');
            await sleep(260);
            if (myRunId !== runIdRef.current) return;

            const plan = expandChainDestruction(boardRef.current, metaRef.current, seeds);
            addFlashes(plan.flashes);
            addLightningArcs(plan.lightningArcs);
            if (plan.hasLaser) sound.playLaserBeam();
            sound.playExplosion();
            const { nextB, nextM } = destroyCellsAndUpdate(
              boardRef.current,
              metaRef.current,
              plan,
              [],
              2
            );
            boardRef.current = nextB;
            metaRef.current = nextM;
            setBoard(nextB);
            setMeta(nextM);
          } else {
            const seeds: Array<{ row: number; col: number }> = [bombPos];
            const arcs: LightningArc[] = [];
            if (targetColor !== 'none') {
              const arcHex = COLOR_HEX[targetColor];
              for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                  const t = boardRef.current[r][c];
                  if (t && t.color === targetColor && !t.isIngredient) {
                    seeds.push({ row: r, col: c });
                    arcs.push({
                      id: nextTileId(),
                      fromRow: bombPos.row,
                      fromCol: bombPos.col,
                      toRow: r,
                      toCol: c,
                      color: arcHex,
                    });
                  }
                }
              }
            }
            addLightningArcs(arcs);
            sound.playLightningZap(2);
            await sleep(210);
            if (myRunId !== runIdRef.current) return;

            const exempt = new Set([`${bombPos.row},${bombPos.col}`]);
            const plan = expandChainDestruction(boardRef.current, metaRef.current, seeds, exempt);
            plan.toDestroy.add(`${bombPos.row},${bombPos.col}`);
            addFlashes(plan.flashes);
            addLightningArcs(plan.lightningArcs);
            if (plan.hasLaser) sound.playLaserBeam();
            addPopup(b.row, b.col, 'Color Bomb!', 'special');
            const { nextB, nextM } = destroyCellsAndUpdate(
              boardRef.current,
              metaRef.current,
              plan,
              [],
              2
            );
            boardRef.current = nextB;
            metaRef.current = nextM;
            setBoard(nextB);
            setMeta(nextM);
          }
          emitProgress(boardRef.current, metaRef.current);
          await sleep(210);
        } else {
          const isAStriped = nowA.special === 'striped_h' || nowA.special === 'striped_v';
          const isBStriped = nowB.special === 'striped_h' || nowB.special === 'striped_v';
          const isAWrapped = nowA.special === 'wrapped';
          const isBWrapped = nowB.special === 'wrapped';

          const seeds: Array<{ row: number; col: number }> = [];
          const customFlashes: LineFlash[] = [];
          const exempt = new Set<string>([`${a.row},${a.col}`, `${b.row},${b.col}`]);
          const comboHex =
            nowB.color !== 'none'
              ? COLOR_HEX[nowB.color]
              : nowA.color !== 'none'
              ? COLOR_HEX[nowA.color]
              : '#F472B6';

          if (isAStriped && isBStriped) {
            addPopup(b.row, b.col, 'Cross Blast!', 'special');
            sound.playLaserBeam();
            customFlashes.push({ id: nextTileId(), type: 'row', row: b.row, col: b.col, color: comboHex });
            customFlashes.push({ id: nextTileId(), type: 'col', row: b.row, col: b.col, color: comboHex });
            for (let i = 0; i < GRID_SIZE; i++) {
              seeds.push({ row: b.row, col: i });
              seeds.push({ row: i, col: b.col });
            }
          } else if ((isAStriped && isBWrapped) || (isBStriped && isAWrapped)) {
            addPopup(b.row, b.col, 'Giant Blast!', 'special');
            sound.playLaserBeam();
            for (let dr = -1; dr <= 1; dr++) {
              const rr = b.row + dr;
              if (rr >= 0 && rr < GRID_SIZE) {
                customFlashes.push({
                  id: nextTileId(),
                  type: 'row',
                  row: rr,
                  col: b.col,
                  color: comboHex,
                  mega: true,
                });
                for (let c = 0; c < GRID_SIZE; c++) seeds.push({ row: rr, col: c });
              }
            }
            for (let dc = -1; dc <= 1; dc++) {
              const cc = b.col + dc;
              if (cc >= 0 && cc < GRID_SIZE) {
                customFlashes.push({
                  id: nextTileId(),
                  type: 'col',
                  row: b.row,
                  col: cc,
                  color: comboHex,
                  mega: true,
                });
                for (let r = 0; r < GRID_SIZE; r++) seeds.push({ row: r, col: cc });
              }
            }
          } else if (isAWrapped && isBWrapped) {
            addPopup(b.row, b.col, 'Super Nova!', 'special');
            customFlashes.push({
              id: nextTileId(),
              type: 'area',
              row: b.row,
              col: b.col,
              radius: 2,
              color: comboHex,
              mega: true,
            });
            for (let dr = -2; dr <= 2; dr++) {
              for (let dc = -2; dc <= 2; dc++) {
                const rr = b.row + dr;
                const cc = b.col + dc;
                if (rr >= 0 && rr < GRID_SIZE && cc >= 0 && cc < GRID_SIZE) {
                  seeds.push({ row: rr, col: cc });
                }
              }
            }
          }

          sound.playExplosion();
          triggerShake();
          const plan = expandChainDestruction(boardRef.current, metaRef.current, seeds, exempt);
          plan.toDestroy.add(`${a.row},${a.col}`);
          plan.toDestroy.add(`${b.row},${b.col}`);
          addFlashes([...customFlashes, ...plan.flashes]);
          addLightningArcs(plan.lightningArcs);

          const { nextB, nextM } = destroyCellsAndUpdate(
            boardRef.current,
            metaRef.current,
            plan,
            [],
            2
          );
          if (isAWrapped && isBWrapped && !metaRef.current[b.row][b.col].void) {
            nextB[b.row][b.col] = {
              id: nextTileId(),
              row: b.row,
              col: b.col,
              color: nowB.color,
              special: 'wrapped',
              wrappedArmed: true,
            };
          }
          boardRef.current = nextB;
          metaRef.current = nextM;
          setBoard(nextB);
          setMeta(nextM);
          emitProgress(nextB, nextM);
          await sleep(220);
        }

        if (myRunId !== runIdRef.current) return;
        const grav = applyGravityAndRefill(
          boardRef.current,
          metaRef.current,
          level.numColors,
          toSpawnRef.current,
          level.teleporters
        );
        toSpawnRef.current = grav.ingredientsLeftToSpawn;
        if (grav.collectedIngredients > 0) {
          collectedRef.current += grav.collectedIngredients;
          sound.playIngredient();
          emitProgress(grav.nextBoard, metaRef.current);
        }
        boardRef.current = grav.nextBoard;
        setBoard(grav.nextBoard);
        await sleep(210);

        await resolveCascades(myRunId, 1, []);
      } else {
        await resolveCascades(myRunId, 0, [b, a]);
      }

      if (myRunId !== runIdRef.current) return;
      await checkWinOrDeadlock(!isFreeSwitch);
      busyRef.current = false;
      resetHintTimer();
    },
    [
      activeBooster,
      addFlashes,
      addLightningArcs,
      addPopup,
      checkWinOrDeadlock,
      destroyCellsAndUpdate,
      emitProgress,
      isModalOpen,
      level.numColors,
      level.teleporters,
      onClearActiveBooster,
      onConsumeBooster,
      onConsumeMove,
      resetHintTimer,
      resolveCascades,
      triggerShake,
    ]
  );

  const handleHammerTap = useCallback(
    async (pos: { row: number; col: number }) => {
      if (busyRef.current || finishedRef.current || isModalOpen) return;
      if (metaRef.current[pos.row][pos.col].void) return;
      const tile = boardRef.current[pos.row][pos.col];
      const hasFrosting = metaRef.current[pos.row][pos.col].frosting > 0;
      if (!hasFrosting && (!tile || tile.isIngredient)) return;

      busyRef.current = true;
      chocolateClearedThisTurnRef.current = false;
      const myRunId = runIdRef.current;
      onConsumeBooster('hammer');
      onClearActiveBooster();
      setSelected(null);

      const plan = expandChainDestruction(boardRef.current, metaRef.current, [pos]);
      addFlashes(plan.flashes);
      addLightningArcs(plan.lightningArcs);
      if (plan.hasLaser) sound.playLaserBeam();
      sound.playExplosion();
      triggerShake();
      addPopup(pos.row, pos.col, 'Smash!', 'special');

      const { nextB, nextM } = destroyCellsAndUpdate(
        boardRef.current,
        metaRef.current,
        plan,
        [],
        1
      );
      boardRef.current = nextB;
      metaRef.current = nextM;
      setBoard(nextB);
      setMeta(nextM);
      emitProgress(nextB, nextM);

      await sleep(190);
      if (myRunId !== runIdRef.current) return;

      const grav = applyGravityAndRefill(
        boardRef.current,
        metaRef.current,
        level.numColors,
        toSpawnRef.current,
        level.teleporters
      );
      toSpawnRef.current = grav.ingredientsLeftToSpawn;
      boardRef.current = grav.nextBoard;
      setBoard(grav.nextBoard);
      await sleep(200);

      await resolveCascades(myRunId, 0, []);
      if (myRunId !== runIdRef.current) return;
      await checkWinOrDeadlock(false);
      busyRef.current = false;
      resetHintTimer();
    },
    [
      addFlashes,
      addLightningArcs,
      addPopup,
      checkWinOrDeadlock,
      destroyCellsAndUpdate,
      emitProgress,
      isModalOpen,
      level.numColors,
      level.teleporters,
      onClearActiveBooster,
      onConsumeBooster,
      resetHintTimer,
      resolveCascades,
      triggerShake,
    ]
  );

  useEffect(() => {
    if (activeBooster !== 'colorBombStart' || busyRef.current || finishedRef.current) return;
    const candidates: Array<{ row: number; col: number }> = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const t = boardRef.current[r][c];
        if (
          !metaRef.current[r][c].void &&
          metaRef.current[r][c].frosting === 0 &&
          t &&
          t.special === 'none' &&
          !t.isIngredient &&
          !t.isChocolate &&
          !t.locked
        ) {
          candidates.push({ row: r, col: c });
        }
      }
    }
    if (candidates.length > 0) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      const next = cloneBoard(boardRef.current);
      next[pick.row][pick.col] = {
        id: nextTileId(),
        row: pick.row,
        col: pick.col,
        color: 'none',
        special: 'color_bomb',
      };
      boardRef.current = next;
      setBoard(next);
      sound.playSpecialCreate();
      addPopup(pick.row, pick.col, 'Color Bomb!', 'special');
      onConsumeBooster('colorBombStart');
    }
    onClearActiveBooster();
  }, [activeBooster, addPopup, onClearActiveBooster, onConsumeBooster]);

  const handleTileTap = useCallback(
    (row: number, col: number) => {
      sound.unlock();
      if (busyRef.current || finishedRef.current || isModalOpen) return;

      if (activeBooster === 'hammer') {
        handleHammerTap({ row, col });
        return;
      }

      if (metaRef.current[row][col].void || metaRef.current[row][col].frosting > 0) return;
      const tappedTile = boardRef.current[row][col];
      if (!tappedTile || tappedTile.locked || tappedTile.isChocolate) {
        if (tappedTile?.locked || tappedTile?.isChocolate) sound.playInvalidSwap();
        return;
      }

      if (!selected) {
        setSelected({ row, col });
        sound.playButton();
        return;
      }

      if (selected.row === row && selected.col === col) {
        setSelected(null);
        return;
      }

      if (isAdjacent(selected, { row, col })) {
        attemptSwap(selected, { row, col });
      } else {
        setSelected({ row, col });
        sound.playButton();
      }
    },
    [activeBooster, attemptSwap, handleHammerTap, isModalOpen, selected]
  );

  const getCellFromPointer = (clientX: number, clientY: number, rect: DOMRect) => {
    const col = Math.floor(((clientX - rect.left) / rect.width) * GRID_SIZE);
    const row = Math.floor(((clientY - rect.top) / rect.height) * GRID_SIZE);
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
    return { row, col };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    sound.unlock();
    if (busyRef.current || finishedRef.current || isModalOpen) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cell = getCellFromPointer(e.clientX, e.clientY, rect);
    if (!cell) return;
    pointerStartRef.current = { ...cell, x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current || busyRef.current || activeBooster === 'hammer') return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    const threshold = 18;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    const target = { row: start.row, col: start.col };
    if (Math.abs(dx) > Math.abs(dy)) {
      target.col += dx > 0 ? 1 : -1;
    } else {
      target.row += dy > 0 ? 1 : -1;
    }
    if (target.row >= 0 && target.row < GRID_SIZE && target.col >= 0 && target.col < GRID_SIZE) {
      attemptSwap({ row: start.row, col: start.col }, target);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current) return;
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    const rect = e.currentTarget.getBoundingClientRect();
    const cell = getCellFromPointer(e.clientX, e.clientY, rect);
    if (cell && cell.row === start.row && cell.col === start.col) {
      handleTileTap(cell.row, cell.col);
    }
  };

  const tiles: CandyTile[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const t = board[r][c];
      if (t) tiles.push(t);
    }
  }

  return (
    <div
      className={`relative w-full aspect-square max-w-[min(94vw,calc(100dvh-235px))] mx-auto rounded-3xl p-1.5 bg-gradient-to-b from-[#3B1E6E]/90 to-[#1B0D38]/95 border border-white/15 shadow-[0_14px_40px_rgba(0,0,0,0.55)] ${
        shaking ? 'animate-board-shake' : ''
      }`}
    >
      {activeBooster === 'hammer' && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 rounded-xl bg-amber-400 px-3 py-1 text-xs font-extrabold text-slate-950 shadow-lg whitespace-nowrap pointer-events-none">
          Tap any candy or blocker to smash!
        </div>
      )}
      {activeBooster === 'freeSwitch' && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 rounded-xl bg-cyan-400 px-3 py-1 text-xs font-extrabold text-slate-950 shadow-lg whitespace-nowrap pointer-events-none">
          Free Switch Ready — Swap any 2!
        </div>
      )}

      <div
        className="relative w-full h-full rounded-2xl overflow-hidden bg-[#120726]/80 board-touch-lock"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          pointerStartRef.current = null;
        }}
      >
        <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
          {meta.map((rowMeta, r) =>
            rowMeta.map((cell, c) => {
              if (cell.void) {
                return (
                  <div
                    key={`cell_${r}_${c}`}
                    className="w-full h-full bg-transparent pointer-events-none"
                  />
                );
              }
              const isDark = (r + c) % 2 === 1;
              const isSel = selected?.row === r && selected?.col === c;
              const isHint =
                (hintMove?.a.row === r && hintMove?.a.col === c) ||
                (hintMove?.b.row === r && hintMove?.b.col === c);

              return (
                <div
                  key={`cell_${r}_${c}`}
                  className={`relative w-full h-full border-[0.5px] border-white/[0.05] ${
                    isDark ? 'bg-[#211142]/88' : 'bg-[#2A1652]/75'
                  }`}
                >
                  {/* Single & Double Blue Crystal Jelly */}
                  {cell.jelly === 1 && (
                    <div className="absolute inset-[2px] rounded-lg bg-sky-400/32 border border-sky-200/70 shadow-[inset_0_0_10px_rgba(56,189,248,0.65)] pointer-events-none">
                      <div className="w-1/2 h-1 rounded-full bg-white/55 m-1" />
                    </div>
                  )}
                  {cell.jelly === 2 && (
                    <div className="absolute inset-[1.5px] rounded-lg bg-gradient-to-br from-cyan-300/55 via-sky-400/50 to-blue-600/55 border-2 border-cyan-100/90 shadow-[inset_0_0_12px_rgba(14,165,233,0.8)] pointer-events-none">
                      <div className="w-2/3 h-1.5 rounded-full bg-white/75 m-1" />
                    </div>
                  )}

                  {/* Multi-Layer Whipped Cream Frosting / Icing (1 to 5 Layers) */}
                  {cell.frosting > 0 && (
                    <div
                      className={`absolute inset-[2px] rounded-xl flex flex-col items-center justify-center pointer-events-none border-2 shadow-inner ${
                        cell.frosting === 1
                          ? 'bg-gradient-to-br from-white via-pink-50 to-pink-100 border-pink-200 text-rose-900'
                          : cell.frosting === 2
                          ? 'bg-gradient-to-br from-white via-pink-100 to-rose-200 border-white text-rose-950'
                          : cell.frosting === 3
                          ? 'bg-gradient-to-br from-pink-100 via-white to-pink-300 border-pink-100 text-purple-950'
                          : cell.frosting === 4
                          ? 'bg-gradient-to-br from-rose-200 via-white to-fuchsia-200 border-amber-200 text-purple-950'
                          : 'bg-gradient-to-br from-amber-100 via-pink-200 to-rose-300 border-amber-300 text-rose-950'
                      }`}
                    >
                      <div className="w-3/4 h-1.5 rounded-full bg-white/80 mb-0.5" />
                      {cell.frosting > 1 && (
                        <span className="font-display text-[11px] font-extrabold leading-none tabular-nums">
                          ×{cell.frosting}
                        </span>
                      )}
                    </div>
                  )}

                  {isSel && (
                    <div className="absolute inset-[2px] rounded-xl border-2 border-white bg-white/15 pointer-events-none" />
                  )}
                  {!isSel && isHint && (
                    <div className="absolute inset-[3px] rounded-xl border-2 border-amber-300/80 bg-amber-300/10 animate-pulse pointer-events-none" />
                  )}

                  {cell.exitChute && (
                    <div className="absolute bottom-0 inset-x-0 flex justify-center pointer-events-none">
                      <span className="text-[11px] leading-none font-extrabold text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.95)] animate-pulse">
                        ▼
                      </span>
                    </div>
                  )}

                  {/* Conveyor Belt Track & Animated Chevron */}
                  {cell.conveyorDir && (
                    <div className="absolute inset-[1px] rounded-lg border border-amber-300/35 bg-amber-400/10 flex items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-extrabold text-amber-300/65 animate-pulse leading-none">
                        {cell.conveyorDir === 'right'
                          ? '▶'
                          : cell.conveyorDir === 'left'
                          ? '◀'
                          : cell.conveyorDir === 'down'
                          ? '▼'
                          : '▲'}
                      </span>
                    </div>
                  )}

                  {/* Teleporter Portals (Exit Bottom / Entry Top) */}
                  {cell.teleporterOut && (
                    <div
                      className={`absolute bottom-0 inset-x-0.5 h-1.5 rounded-full pointer-events-none shadow-[0_0_8px_currentColor] ${
                        cell.teleporterOut === 1
                          ? 'bg-cyan-400 text-cyan-300'
                          : 'bg-orange-400 text-orange-300'
                      }`}
                    />
                  )}
                  {cell.teleporterIn && (
                    <div
                      className={`absolute top-0 inset-x-0.5 h-1.5 rounded-full pointer-events-none shadow-[0_0_8px_currentColor] ${
                        cell.teleporterIn === 1
                          ? 'bg-cyan-400 text-cyan-300'
                          : 'bg-orange-400 text-orange-300'
                      }`}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Candy Sprites Layer */}
        <div className="absolute inset-0 pointer-events-none">
          {tiles.map((tile) => {
            const isSel = selected?.row === tile.row && selected?.col === tile.col;
            const isHint =
              (hintMove?.a.row === tile.row && hintMove?.a.col === tile.col) ||
              (hintMove?.b.row === tile.row && hintMove?.b.col === tile.col);

            return (
              <div
                key={tile.id}
                className={`absolute top-0 left-0 w-[12.5%] h-[12.5%] transition-transform duration-180 ease-out will-change-transform ${
                  tile.wrappedArmed ? 'scale-115 drop-shadow-[0_0_12px_rgba(253,224,71,0.95)]' : ''
                }`}
                style={{
                  transform: `translate3d(${tile.col * 100}%, ${tile.row * 100}%, 0)`,
                }}
              >
                <CandyPiece tile={tile} isSelected={isSel} isHinted={isHint} />
              </div>
            );
          })}
        </div>

        {/* Electric Lightning Arcs Layer (Color Bomb Zaps) */}
        {lightningArcs.length > 0 && (
          <svg
            viewBox="0 0 800 800"
            className="absolute inset-0 w-full h-full pointer-events-none z-20 animate-lightning-flash"
          >
            {lightningArcs.map((arc, idx) => {
              const x1 = (arc.fromCol + 0.5) * 100;
              const y1 = (arc.fromRow + 0.5) * 100;
              const x2 = (arc.toCol + 0.5) * 100;
              const y2 = (arc.toRow + 0.5) * 100;
              const mx1 = x1 + (x2 - x1) * 0.33 + ((idx % 2 === 0 ? 1 : -1) * 18);
              const my1 = y1 + (y2 - y1) * 0.33 + ((idx % 3 === 0 ? -1 : 1) * 16);
              const mx2 = x1 + (x2 - x1) * 0.66 + ((idx % 2 === 0 ? -1 : 1) * 18);
              const my2 = y1 + (y2 - y1) * 0.66 + ((idx % 3 === 0 ? 1 : -1) * 16);
              const pts = `${x1},${y1} ${mx1},${my1} ${mx2},${my2} ${x2},${y2}`;
              return (
                <g key={arc.id}>
                  <polyline
                    points={pts}
                    fill="none"
                    stroke={arc.color}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.7"
                  />
                  <polyline
                    points={pts}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}
          </svg>
        )}

        {/* Special Laser Beam & Shockwave Ring Flashes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
          {flashes.map((f) => {
            const beamColor = f.color ?? '#F472B6';
            if (f.type === 'row') {
              return (
                <div
                  key={f.id}
                  className="absolute left-0 right-0 h-[12.5%] flex items-center animate-laser-h"
                  style={{
                    top: `${f.row * 12.5}%`,
                    background: `linear-gradient(90deg, transparent, ${beamColor}B0, #FFFFFF, ${beamColor}B0, transparent)`,
                    boxShadow: `0 0 18px ${beamColor}`,
                  }}
                >
                  <div className="w-full h-[36%] bg-gradient-to-r from-transparent via-white to-transparent" />
                </div>
              );
            }
            if (f.type === 'col') {
              return (
                <div
                  key={f.id}
                  className="absolute top-0 bottom-0 w-[12.5%] flex justify-center animate-laser-v"
                  style={{
                    left: `${f.col * 12.5}%`,
                    background: `linear-gradient(180deg, transparent, ${beamColor}B0, #FFFFFF, ${beamColor}B0, transparent)`,
                    boxShadow: `0 0 18px ${beamColor}`,
                  }}
                >
                  <div className="h-full w-[36%] bg-gradient-to-b from-transparent via-white to-transparent" />
                </div>
              );
            }
            const span = ((f.radius ?? 1) * 2 + 1) * 12.5;
            return (
              <div
                key={f.id}
                className="absolute rounded-full animate-shockwave-ring"
                style={{
                  width: `${span}%`,
                  height: `${span}%`,
                  left: `${(f.col - (f.radius ?? 1)) * 12.5}%`,
                  top: `${(f.row - (f.radius ?? 1)) * 12.5}%`,
                  border: f.mega ? '4px solid #FFFFFF' : `3px solid ${beamColor}`,
                  background: f.mega
                    ? 'radial-gradient(circle, rgba(255,255,255,0.72), rgba(244,114,182,0.45), rgba(56,189,248,0.3), transparent 72%)'
                    : `radial-gradient(circle, rgba(255,255,255,0.6), ${beamColor}55, transparent 70%)`,
                  boxShadow: `0 0 24px ${beamColor}`,
                }}
              />
            );
          })}
        </div>

        {/* Sugar Crush Celebration Banner */}
        {showSugarCrush && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
            <div className="rounded-3xl bg-gradient-to-b from-pink-500 via-rose-500 to-amber-500 border-[3px] border-amber-200 px-6 py-3 shadow-[0_12px_36px_rgba(244,63,94,0.75)] animate-sugar-crush text-center">
              <p className="font-display text-2xl sm:text-3xl font-extrabold text-white drop-shadow-[0_3px_0_#881337]">
                Sugar Crush!
              </p>
              <p className="text-xs font-extrabold text-amber-100 uppercase tracking-widest">
                Bonus Cascade Party
              </p>
            </div>
          </div>
        )}

        {/* Burst Particles Layer */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full animate-particle-burst"
              style={
                {
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  backgroundColor: p.color,
                  boxShadow: `0 0 8px ${p.color}`,
                  left: `${(p.col + 0.5) * 12.5}%`,
                  top: `${(p.row + 0.5) * 12.5}%`,
                  '--tx': p.tx,
                  '--ty': p.ty,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        {/* Floating Score & Combo Callout Layer */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {popups.map((pop) => (
            <div
              key={pop.id}
              className="absolute z-20 flex flex-col items-center animate-float-callout"
              style={{
                left: `${Math.min(82, Math.max(18, (pop.col + 0.5) * 12.5))}%`,
                top: `${Math.min(85, Math.max(12, (pop.row + 0.3) * 12.5))}%`,
              }}
            >
              <span
                className={`font-display font-extrabold whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] ${
                  pop.tone === 'combo'
                    ? 'text-lg sm:text-xl text-amber-300'
                    : pop.tone === 'special'
                    ? 'text-base sm:text-lg text-cyan-300'
                    : pop.tone === 'ingredient'
                    ? 'text-sm text-emerald-300'
                    : 'text-sm text-white'
                }`}
              >
                {pop.text}
              </span>
              {pop.subtext && (
                <span className="text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  {pop.subtext}
                </span>
              )}
            </div>
          ))}
        </div>

        {shuffling && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#140928]/80 backdrop-blur-sm">
            <div className="rounded-2xl bg-white/10 border border-white/20 px-5 py-3 text-center shadow-xl">
              <p className="font-display text-base font-bold text-amber-300">No Valid Moves!</p>
              <p className="text-xs text-purple-100 mt-0.5">Shuffling Board...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
