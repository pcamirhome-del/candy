import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  Gem,
  Gift,
  Hammer,
  Heart,
  Home,
  KeyRound,
  Pause,
  Play,
  Settings,
  Shuffle,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AdminGiftModal } from './components/AdminGiftModal';
import { GameBoard } from './components/GameBoard';
import { GiftPackModal } from './components/GiftPackModal';
import { LevelMap } from './components/LevelMap';
import {
  GateModal,
  LevelStartModal,
  OutOfLivesModal,
  OutOfMovesModal,
  PauseMenuModal,
  SettingsShopModal,
  VictoryModal,
} from './components/Modals';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SplashScreen } from './components/SplashScreen';
import {
  countRemainingBlockers,
  countRemainingJelly,
  createInitialBoard,
} from './game/engine';
import { KEY_GATES, LEVELS } from './game/levels';
import { sound } from './game/sound';
import {
  formatCountdown,
  hasLocalStorageSave,
  loadFromIndexedDB,
  loadProgress,
  MAX_LIVES,
  pickRicherProgress,
  requestPersistentStorage,
  resetStoredProgress,
  saveProgress,
  syncLivesWithClock,
} from './game/storage';
import { BoosterType, GateRequirement, LevelConfig, PlayerProgress } from './game/types';

export default function App() {
  const [progress, setProgress] = useState<PlayerProgress>(() => {
    const initial = loadProgress();
    sound.setMuted(initial.soundMuted);
    return initial;
  });
  const [msUntilNextLife, setMsUntilNextLife] = useState<number>(() => {
    return syncLivesWithClock(loadProgress(), Date.now()).msUntilNextLife;
  });

  // Navigation & Modal states
  const [screen, setScreen] = useState<'splash' | 'map' | 'game'>('splash');
  const [hasEnteredKingdom, setHasEnteredKingdom] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<LevelConfig | null>(null);
  const [selectedGate, setSelectedGate] = useState<GateRequirement | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showGiftPack, setShowGiftPack] = useState(false);
  const [showOutOfLives, setShowOutOfLives] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Active Gameplay states
  const [activeLevel, setActiveLevel] = useState<LevelConfig>(LEVELS[0]);
  const [gameInstanceKey, setGameInstanceKey] = useState(1);
  const [useColorBombStart, setUseColorBombStart] = useState(false);
  const [startedWithColorBomb, setStartedWithColorBomb] = useState(false);
  const [movesLeft, setMovesLeft] = useState(LEVELS[0].moves);
  const [score, setScore] = useState(0);
  const [activeBooster, setActiveBooster] = useState<BoosterType | null>(null);
  const [jellyRemaining, setJellyRemaining] = useState(0);
  const [ingredientsCollected, setIngredientsCollected] = useState(0);
  const [blockersRemaining, setBlockersRemaining] = useState(0);
  const [initialBlockersCount, setInitialBlockersCount] = useState(0);

  const [victoryInfo, setVictoryInfo] = useState<{
    score: number;
    stars: number;
    gemsEarned: number;
    keyEarned: number;
  } | null>(null);
  const [failureReason, setFailureReason] = useState<'moves' | 'bomb' | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((curr) => (curr === msg ? null : curr));
    }, 2400);
  }, []);

  // Request permanent browser storage & recover from IndexedDB if localStorage was cleared
  useEffect(() => {
    void requestPersistentStorage();
    void (async () => {
      const idbSave = await loadFromIndexedDB();
      if (!idbSave) return;
      const hadLocal = hasLocalStorageSave();
      setProgress((curr) => {
        const chosen = hadLocal ? pickRicherProgress(curr, idbSave) : idbSave;
        if (chosen !== curr) {
          saveProgress(chosen);
          return chosen;
        }
        return curr;
      });
    })();
  }, []);

  // Persist progress immediately to both localStorage & IndexedDB on every change
  useEffect(() => {
    saveProgress(progress);
    sound.setMuted(progress.soundMuted);
  }, [progress]);

  // Real-time 1-second life regeneration tick
  useEffect(() => {
    const tick = () => {
      setProgress((prev) => {
        const { updated, msUntilNextLife: ms } = syncLivesWithClock(prev, Date.now());
        setMsUntilNextLife(ms);
        if (updated.lives !== prev.lives || updated.lastLifeLostAt !== prev.lastLifeLostAt) {
          return updated;
        }
        return prev;
      });
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const initialJellyCount = useMemo(() => {
    let count = 0;
    for (const row of activeLevel.blueprint) {
      for (const ch of row) {
        if (ch === '1' || ch === '2') count++;
      }
    }
    return count;
  }, [activeLevel]);

  const handleSelectLevelFromMap = (level: LevelConfig) => {
    sound.unlock();
    sound.playButton();

    const blockingGate = KEY_GATES.find(
      (g) => level.id > g.afterLevel && !progress.unlockedGates.includes(g.afterLevel)
    );
    if (blockingGate && level.id <= progress.unlockedLevel) {
      setSelectedGate(blockingGate);
      return;
    }

    if (level.id > progress.unlockedLevel) {
      if (blockingGate) {
        setSelectedGate(blockingGate);
      } else {
        showToast(`Complete Level ${progress.unlockedLevel} first!`);
      }
      return;
    }

    setUseColorBombStart(false);
    setSelectedLevel(level);
  };

  const startLevelPlay = (level: LevelConfig, withColorBomb: boolean) => {
    sound.unlock();
    if (progress.lives <= 0) {
      setSelectedLevel(null);
      setShowOutOfLives(true);
      return;
    }

    if (withColorBomb && progress.boosters.colorBombStart > 0) {
      setProgress((prev) => ({
        ...prev,
        boosters: {
          ...prev.boosters,
          colorBombStart: Math.max(0, prev.boosters.colorBombStart - 1),
        },
      }));
      setStartedWithColorBomb(true);
    } else {
      setStartedWithColorBomb(false);
    }

    const preview = createInitialBoard(level, false);
    const jCount = countRemainingJelly(preview.meta);
    const bCount = countRemainingBlockers(preview.board, preview.meta);

    setActiveLevel(level);
    setMovesLeft(level.moves);
    setScore(0);
    setActiveBooster(null);
    setVictoryInfo(null);
    setFailureReason(null);
    setJellyRemaining(jCount);
    setBlockersRemaining(bCount);
    setInitialBlockersCount(bCount);
    setIngredientsCollected(0);
    setGameInstanceKey((k) => k + 1);
    setSelectedLevel(null);
    setShowPauseMenu(false);
    setScreen('game');
  };

  const deductOneLife = useCallback(() => {
    setProgress((prev) => {
      const nextLives = Math.max(0, prev.lives - 1);
      const anchor = prev.lives >= MAX_LIVES ? Date.now() : prev.lastLifeLostAt ?? Date.now();
      return {
        ...prev,
        lives: nextLives,
        lastLifeLostAt: nextLives < MAX_LIVES ? anchor : null,
      };
    });
  }, []);

  const handleLevelComplete = useCallback(() => {
    sound.playWin();
    const moveBonus = Math.max(0, movesLeft) * 150;
    const finalScore = score + moveBonus;
    setScore(finalScore);

    const [t1, t2, t3] = activeLevel.starThresholds;
    const stars = finalScore >= t3 ? 3 : finalScore >= t2 ? 2 : finalScore >= t1 ? 1 : 1;

    const isFirstClear = (progress.levelStars[activeLevel.id] ?? 0) === 0;
    const gemsEarned = isFirstClear ? activeLevel.gemReward : 5;
    const keyEarned = isFirstClear && activeLevel.keyReward ? activeLevel.keyReward : 0;

    setProgress((prev) => ({
      ...prev,
      gems: prev.gems + gemsEarned,
      keys: prev.keys + keyEarned,
      unlockedLevel: Math.min(LEVELS.length, Math.max(prev.unlockedLevel, activeLevel.id + 1)),
      levelStars: {
        ...prev.levelStars,
        [activeLevel.id]: Math.max(prev.levelStars[activeLevel.id] ?? 0, stars),
      },
      highScores: {
        ...prev.highScores,
        [activeLevel.id]: Math.max(prev.highScores[activeLevel.id] ?? 0, finalScore),
      },
    }));

    setVictoryInfo({
      score: finalScore,
      stars,
      gemsEarned,
      keyEarned,
    });
  }, [activeLevel, movesLeft, progress.levelStars, score]);

  const handleOutOfMoves = useCallback(() => {
    sound.playLose();
    setFailureReason('moves');
  }, []);

  const handleBombExploded = useCallback(() => {
    sound.playLose();
    setFailureReason('bomb');
  }, []);

  const handleBuyExtraMoves = () => {
    if (progress.gems < 20) return;
    sound.playButton();
    setProgress((prev) => ({ ...prev, gems: prev.gems - 20 }));
    setMovesLeft((m) => m + 5);
    setFailureReason(null);
  };

  const handleGiveUpLevel = () => {
    sound.playButton();
    deductOneLife();
    setFailureReason(null);
    setScreen('map');
  };

  const handleExitLevelTo = (target: 'map' | 'splash') => {
    sound.playButton();
    if (!victoryInfo && movesLeft < activeLevel.moves) {
      deductOneLife();
    }
    setShowPauseMenu(false);
    setFailureReason(null);
    setVictoryInfo(null);
    setScreen(target);
  };

  const handleConsumeBooster = useCallback((type: BoosterType) => {
    setProgress((prev) => ({
      ...prev,
      boosters: {
        ...prev.boosters,
        [type]: Math.max(0, prev.boosters[type] - 1),
      },
    }));
  }, []);

  const handleRefillLives = () => {
    if (progress.gems < 30) return;
    sound.playSpecialCreate();
    setProgress((prev) => ({
      ...prev,
      gems: prev.gems - 30,
      lives: MAX_LIVES,
      lastLifeLostAt: null,
    }));
    setMsUntilNextLife(0);
    setShowOutOfLives(false);
    showToast('Lives refilled to 5!');
  };

  const handleBuyBooster = (type: BoosterType, cost: number) => {
    if (progress.gems < cost) return;
    sound.playButton();
    setProgress((prev) => ({
      ...prev,
      gems: prev.gems - cost,
      boosters: {
        ...prev.boosters,
        [type]: prev.boosters[type] + 1,
      },
    }));
  };

  const handleUnlockGateWithKeys = () => {
    if (!selectedGate || progress.keys < selectedGate.keysRequired) return;
    sound.playSpecialCreate();
    setProgress((prev) => ({
      ...prev,
      unlockedGates: [...prev.unlockedGates, selectedGate.afterLevel],
    }));
    setSelectedGate(null);
    showToast(`${selectedGate.title} Unlocked!`);
  };

  const handleUnlockGateWithGems = () => {
    if (!selectedGate || progress.gems < selectedGate.gemSkipCost) return;
    sound.playSpecialCreate();
    setProgress((prev) => ({
      ...prev,
      gems: prev.gems - selectedGate.gemSkipCost,
      unlockedGates: [...prev.unlockedGates, selectedGate.afterLevel],
    }));
    setSelectedGate(null);
    showToast(`${selectedGate.title} Unlocked!`);
  };

  const handleNextLevel = () => {
    const nextLvl = LEVELS.find((l) => l.id === activeLevel.id + 1);
    if (!nextLvl) {
      setVictoryInfo(null);
      setScreen('map');
      return;
    }
    const blockingGate = KEY_GATES.find(
      (g) => nextLvl.id > g.afterLevel && !progress.unlockedGates.includes(g.afterLevel)
    );
    if (blockingGate) {
      setVictoryInfo(null);
      setScreen('map');
      setSelectedGate(blockingGate);
      return;
    }
    startLevelPlay(nextLvl, false);
  };

  const scorePct = Math.min(100, Math.round((score / activeLevel.targetScore) * 100));
  const objectivePct =
    activeLevel.objectiveType === 'score'
      ? scorePct
      : activeLevel.objectiveType === 'jelly'
      ? initialJellyCount > 0
        ? Math.round(((initialJellyCount - jellyRemaining) / initialJellyCount) * 100)
        : 100
      : activeLevel.objectiveType === 'blockers'
      ? initialBlockersCount > 0
        ? Math.round(((initialBlockersCount - blockersRemaining) / initialBlockersCount) * 100)
        : 100
      : Math.round(
          (ingredientsCollected / Math.max(1, activeLevel.ingredientCount ?? 1)) * 100
        );

  return (
    <div className="w-screen h-[100dvh] overflow-hidden bg-[#0B0418] flex items-center justify-center">
      {/* Centered Portrait Frame (100dvh, max-width 480px on desktop) */}
      <div className="relative w-full max-w-[480px] h-[100dvh] overflow-hidden flex flex-col bg-gradient-to-b from-[#231047] via-[#160A2D] to-[#0E061E] sm:border-x sm:border-white/10 sm:shadow-[0_0_70px_rgba(168,85,247,0.22)]">
        {/* SPLASH SCREEN */}
        {screen === 'splash' && (
          <SplashScreen
            unlockedLevel={progress.unlockedLevel}
            skipLoading={hasEnteredKingdom}
            onPlay={() => {
              setHasEnteredKingdom(true);
              setScreen('map');
            }}
            onOpenSettings={() => setShowSettings(true)}
          />
        )}

        {/* MAP VIEW */}
        {screen === 'map' && (
          <>
            <header className="shrink-0 z-20 px-2 pt-2.5 pb-2 bg-[#160A2E]/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between gap-1.5">
              {/* Top-Left Glossy Back-to-Home Button */}
              <button
                type="button"
                onClick={() => {
                  sound.playButton();
                  setScreen('splash');
                }}
                className="min-h-[40px] min-w-[40px] rounded-xl bg-gradient-to-b from-pink-500 via-rose-500 to-rose-700 border border-amber-200/75 shadow-[0_4px_12px_rgba(244,63,94,0.38)] flex items-center justify-center text-white active:scale-95 shrink-0"
                aria-label="Back to Main Home Screen"
                title="Main Home Screen"
              >
                <Home className="w-4 h-4 drop-shadow" />
              </button>

              {/* HUD Resource Counters (wrapped safely on tiny screens) */}
              <div className="flex-1 flex items-center gap-1 flex-wrap min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    sound.playButton();
                    if (progress.lives < MAX_LIVES) setShowOutOfLives(true);
                  }}
                  className="min-h-[36px] rounded-xl bg-white/8 border border-white/10 px-1.5 py-1 flex items-center gap-1 text-white active:scale-95 shrink-0"
                >
                  <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400 shrink-0" />
                  <span className="font-display text-[11px] font-extrabold tabular-nums">
                    {progress.lives}
                  </span>
                  {progress.lives < MAX_LIVES && (
                    <span className="text-[10px] font-semibold text-amber-300 tabular-nums">
                      {formatCountdown(msUntilNextLife)}
                    </span>
                  )}
                </button>

                <div className="min-h-[36px] rounded-xl bg-white/8 border border-white/10 px-1.5 py-1 flex items-center gap-1 text-emerald-300 shrink-0">
                  <Banknote className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-display text-[11px] font-extrabold tabular-nums">
                    {progress.cash.toLocaleString()}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    sound.playButton();
                    setShowSettings(true);
                  }}
                  className="min-h-[36px] rounded-xl bg-white/8 border border-white/10 px-1.5 py-1 flex items-center gap-1 text-white active:scale-95 shrink-0"
                >
                  <Gem className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                  <span className="font-display text-[11px] font-extrabold tabular-nums">
                    {progress.gems}
                  </span>
                </button>

                <div className="min-h-[36px] rounded-xl bg-white/8 border border-white/10 px-1.5 py-1 flex items-center gap-1 text-amber-300 shrink-0">
                  <KeyRound className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-display text-[11px] font-extrabold tabular-nums">
                    {progress.keys}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const nextMuted = !progress.soundMuted;
                    sound.setMuted(nextMuted);
                    if (!nextMuted) sound.playButton();
                    setProgress((p) => ({ ...p, soundMuted: nextMuted }));
                  }}
                  className="min-h-[40px] min-w-[40px] rounded-xl bg-white/8 border border-white/10 flex items-center justify-center text-white active:scale-95"
                  aria-label={progress.soundMuted ? 'Unmute audio' : 'Mute audio'}
                >
                  {progress.soundMuted ? (
                    <VolumeX className="w-4 h-4 text-rose-300" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-emerald-300" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sound.playButton();
                    setShowSettings(true);
                  }}
                  className="min-h-[40px] min-w-[40px] rounded-xl bg-white/8 border border-white/10 flex items-center justify-center text-white active:scale-95"
                  aria-label="Settings and shop"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </header>

            <LevelMap
              progress={progress}
              onSelectLevel={handleSelectLevelFromMap}
              onSelectGate={(gate) => {
                sound.playButton();
                setSelectedGate(gate);
              }}
            />

            {/* Bottom Kingdom Action Bar with Glowing "حزمة هدية" (Gift Pack) */}
            <footer className="shrink-0 z-20 px-3 py-2 bg-[#160A2E]/95 backdrop-blur-md border-t border-white/10 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  sound.unlock();
                  sound.playButton();
                  setShowGiftPack(true);
                }}
                className="flex-1 min-h-[48px] rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 px-3 py-2 flex items-center justify-center gap-2 font-display text-sm font-extrabold text-white shadow-[0_0_20px_rgba(244,63,94,0.45)] border border-amber-200/70 active:scale-[0.98] transition-transform"
              >
                <Gift className="w-5 h-5 text-amber-200 animate-pulse shrink-0" />
                <span>حزمة هدية · Gift Pack</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const target = LEVELS.find((l) => l.id === progress.unlockedLevel) ?? LEVELS[0];
                  handleSelectLevelFromMap(target);
                }}
                className="min-h-[48px] rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-4 py-2 flex items-center justify-center gap-1.5 font-display text-sm font-extrabold text-slate-950 shadow-lg shrink-0 active:scale-95"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Lv {progress.unlockedLevel}</span>
              </button>
            </footer>
          </>
        )}

        {/* GAMEPLAY VIEW */}
        {screen === 'game' && (
          <>
            <header className="shrink-0 z-20 px-3 pt-2.5 pb-2 bg-[#160A2E]/90 backdrop-blur-md border-b border-white/10">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sound.playButton();
                    setShowPauseMenu(true);
                  }}
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-gradient-to-b from-pink-500/80 to-rose-600/90 border border-amber-200/60 shadow-md flex items-center justify-center text-white active:scale-95"
                  aria-label="Pause and exit menu"
                >
                  <Pause className="w-5 h-5" />
                </button>

                <div className="flex-1 min-w-0 text-center">
                  <p className="text-[11px] font-semibold text-purple-200/80 truncate">
                    Candy Amir · Level {activeLevel.id}
                  </p>
                  <p className="font-display text-sm font-extrabold text-white tabular-nums">
                    {activeLevel.objectiveType === 'score' &&
                      `Score ${score.toLocaleString()} / ${activeLevel.targetScore.toLocaleString()}`}
                    {activeLevel.objectiveType === 'jelly' &&
                      `Jelly Left: ${jellyRemaining} · ${score.toLocaleString()} pts`}
                    {activeLevel.objectiveType === 'blockers' &&
                      `Blockers Left: ${blockersRemaining} · ${score.toLocaleString()} pts`}
                    {activeLevel.objectiveType === 'ingredients' &&
                      `Ingredients: ${ingredientsCollected}/${activeLevel.ingredientCount ?? 0} · ${score.toLocaleString()} pts`}
                  </p>
                </div>

                <div
                  className={`min-w-[58px] rounded-xl px-2.5 py-1 text-center border ${
                    movesLeft <= 5
                      ? 'bg-rose-500/25 border-rose-400/60 text-rose-200'
                      : 'bg-white/8 border-white/15 text-white'
                  }`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80 leading-none">
                    Moves
                  </p>
                  <p className="font-display text-xl font-extrabold leading-tight tabular-nums">
                    {movesLeft}
                  </p>
                </div>
              </div>

              <div className="mt-2 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink-500 via-amber-400 to-emerald-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(4, objectivePct))}%` }}
                />
              </div>
            </header>

            <main className="flex-1 min-h-0 flex items-center justify-center px-2.5 py-2">
              <GameBoard
                key={gameInstanceKey}
                level={activeLevel}
                startWithColorBomb={startedWithColorBomb}
                activeBooster={activeBooster}
                movesLeft={movesLeft}
                score={score}
                isModalOpen={
                  Boolean(victoryInfo) || Boolean(failureReason) || showSettings || showPauseMenu
                }
                onConsumeMove={() => setMovesLeft((m) => Math.max(0, m - 1))}
                onAddScore={(pts) => setScore((s) => s + pts)}
                onConsumeBooster={handleConsumeBooster}
                onClearActiveBooster={() => setActiveBooster(null)}
                onObjectiveProgress={({
                  jellyRemaining: jr,
                  ingredientsCollected: ic,
                  blockersRemaining: br,
                }) => {
                  setJellyRemaining(jr);
                  setIngredientsCollected(ic);
                  setBlockersRemaining(br);
                }}
                onLevelComplete={handleLevelComplete}
                onOutOfMoves={handleOutOfMoves}
                onBombExploded={handleBombExploded}
              />
            </main>

            <footer className="shrink-0 z-20 px-3 pb-3 pt-1.5 bg-[#160A2E]/90 backdrop-blur-md border-t border-white/10">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={progress.boosters.hammer <= 0 && activeBooster !== 'hammer'}
                  onClick={() => {
                    sound.playButton();
                    setActiveBooster((curr) => (curr === 'hammer' ? null : 'hammer'));
                  }}
                  className={`min-h-[50px] rounded-2xl px-2 py-1.5 flex items-center justify-center gap-1.5 border transition-transform active:scale-95 ${
                    activeBooster === 'hammer'
                      ? 'bg-amber-400 text-slate-950 border-amber-200 shadow-lg'
                      : 'bg-white/8 border-white/12 text-white disabled:opacity-40'
                  }`}
                >
                  <Hammer className="w-4 h-4 shrink-0" />
                  <div className="text-left leading-tight">
                    <span className="block text-xs font-bold whitespace-nowrap">Hammer</span>
                    <span className="block text-[10px] opacity-80 tabular-nums">
                      x{progress.boosters.hammer}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={progress.boosters.freeSwitch <= 0 && activeBooster !== 'freeSwitch'}
                  onClick={() => {
                    sound.playButton();
                    setActiveBooster((curr) => (curr === 'freeSwitch' ? null : 'freeSwitch'));
                  }}
                  className={`min-h-[50px] rounded-2xl px-2 py-1.5 flex items-center justify-center gap-1.5 border transition-transform active:scale-95 ${
                    activeBooster === 'freeSwitch'
                      ? 'bg-cyan-400 text-slate-950 border-cyan-200 shadow-lg'
                      : 'bg-white/8 border-white/12 text-white disabled:opacity-40'
                  }`}
                >
                  <Shuffle className="w-4 h-4 shrink-0" />
                  <div className="text-left leading-tight">
                    <span className="block text-xs font-bold whitespace-nowrap">Switch</span>
                    <span className="block text-[10px] opacity-80 tabular-nums">
                      x{progress.boosters.freeSwitch}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={progress.boosters.colorBombStart <= 0}
                  onClick={() => {
                    sound.playButton();
                    setActiveBooster('colorBombStart');
                  }}
                  className="min-h-[50px] rounded-2xl px-2 py-1.5 flex items-center justify-center gap-1.5 border bg-white/8 border-white/12 text-white disabled:opacity-40 active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-pink-300 shrink-0" />
                  <div className="text-left leading-tight">
                    <span className="block text-xs font-bold whitespace-nowrap">Bomb</span>
                    <span className="block text-[10px] opacity-80 tabular-nums">
                      x{progress.boosters.colorBombStart}
                    </span>
                  </div>
                </button>
              </div>
            </footer>
          </>
        )}

        {toastMsg && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-white/95 px-4 py-2 text-xs font-extrabold text-slate-950 shadow-xl pointer-events-none whitespace-nowrap">
            {toastMsg}
          </div>
        )}

        <OfflineIndicator />

        {selectedLevel && (
          <LevelStartModal
            level={selectedLevel}
            progress={progress}
            useColorBombStart={useColorBombStart}
            onToggleColorBombStart={() => {
              sound.playButton();
              setUseColorBombStart((v) => !v);
            }}
            onStart={() => startLevelPlay(selectedLevel, useColorBombStart)}
            onClose={() => setSelectedLevel(null)}
          />
        )}

        {victoryInfo && (
          <VictoryModal
            level={activeLevel}
            score={victoryInfo.score}
            stars={victoryInfo.stars}
            gemsEarned={victoryInfo.gemsEarned}
            keyEarned={victoryInfo.keyEarned}
            hasNextLevel={activeLevel.id < LEVELS.length}
            onNextLevel={handleNextLevel}
            onReplay={() => startLevelPlay(activeLevel, false)}
            onMap={() => {
              setVictoryInfo(null);
              setScreen('map');
            }}
          />
        )}

        {failureReason && (
          <OutOfMovesModal
            reason={failureReason}
            gems={progress.gems}
            lives={progress.lives}
            onBuyExtraMoves={handleBuyExtraMoves}
            onGiveUp={handleGiveUpLevel}
          />
        )}

        {showOutOfLives && (
          <OutOfLivesModal
            gems={progress.gems}
            msUntilNextLife={msUntilNextLife}
            onRefillLives={handleRefillLives}
            onClose={() => setShowOutOfLives(false)}
          />
        )}

        {selectedGate && (
          <GateModal
            gate={selectedGate}
            progress={progress}
            onUnlockWithKeys={handleUnlockGateWithKeys}
            onUnlockWithGems={handleUnlockGateWithGems}
            onClose={() => setSelectedGate(null)}
          />
        )}

        {showSettings && (
          <SettingsShopModal
            progress={progress}
            msUntilNextLife={msUntilNextLife}
            onToggleSound={() => {
              const nextMuted = !progress.soundMuted;
              sound.setMuted(nextMuted);
              if (!nextMuted) sound.playButton();
              setProgress((p) => ({ ...p, soundMuted: nextMuted }));
            }}
            onBuyBooster={handleBuyBooster}
            onRefillLives={handleRefillLives}
            onRestoreProgress={(restored) => {
              setProgress(restored);
              saveProgress(restored);
              showToast(`Restored to Level ${restored.unlockedLevel}!`);
            }}
            onOpenAdminPanel={() => {
              sound.playButton();
              setShowSettings(false);
              setShowAdminPanel(true);
            }}
            onResetProgress={() => {
              const fresh = resetStoredProgress();
              setProgress(fresh);
              setMsUntilNextLife(0);
              setShowSettings(false);
              setScreen('map');
              showToast('Progress reset');
            }}
            onClose={() => setShowSettings(false)}
          />
        )}

        {showAdminPanel && (
          <AdminGiftModal onClose={() => setShowAdminPanel(false)} />
        )}

        {showGiftPack && (
          <GiftPackModal
            redeemedCodes={progress.redeemedCodes}
            onRedeemSuccess={(normalizedCode, reward) => {
              setProgress((prev) => {
                const nextLives = prev.lives + reward.hearts;
                return {
                  ...prev,
                  cash: prev.cash + reward.cash,
                  keys: prev.keys + reward.keys,
                  gems: prev.gems + reward.gems,
                  lives: nextLives,
                  lastLifeLostAt: nextLives >= MAX_LIVES ? null : prev.lastLifeLostAt,
                  redeemedCodes: [...prev.redeemedCodes, normalizedCode],
                };
              });
            }}
            onClose={() => setShowGiftPack(false)}
          />
        )}
        {showPauseMenu && (
          <PauseMenuModal
            level={activeLevel}
            movesLeft={movesLeft}
            soundMuted={progress.soundMuted}
            isLevelInProgress={!victoryInfo && movesLeft < activeLevel.moves}
            onResume={() => {
              sound.playButton();
              setShowPauseMenu(false);
            }}
            onToggleSound={() => {
              const nextMuted = !progress.soundMuted;
              sound.setMuted(nextMuted);
              if (!nextMuted) sound.playButton();
              setProgress((p) => ({ ...p, soundMuted: nextMuted }));
            }}
            onExitToMap={() => handleExitLevelTo('map')}
            onExitToHome={() => handleExitLevelTo('splash')}
          />
        )}
      </div>
    </div>
  );
}
