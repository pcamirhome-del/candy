import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Compass, Crown, Gem, Globe2, KeyRound, Lock, Star, X } from 'lucide-react';
import { KEY_GATES, LEVELS, WORLD_CHAPTERS } from '../game/levels';
import { sound } from '../game/sound';
import { GateRequirement, LevelConfig, PlayerProgress } from '../game/types';

interface LevelMapProps {
  progress: PlayerProgress;
  onSelectLevel: (level: LevelConfig) => void;
  onSelectGate: (gate: GateRequirement) => void;
}

type MapNode =
  | { kind: 'level'; level: LevelConfig; xPct: number }
  | { kind: 'gate'; gate: GateRequirement; xPct: number };

const X_PATTERN = [50, 74, 80, 62, 32, 20, 34, 64, 78, 56, 26, 20, 42, 72, 76, 50, 30, 50, 50];
const ROW_HEIGHT = 90;
const OVERSCAN = 6;

export const LevelMap: React.FC<LevelMapProps> = ({
  progress,
  onSelectLevel,
  onSelectGate,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(640);
  const [showWorldDrawer, setShowWorldDrawer] = useState(false);

  const { nodes, levelIndexMap } = useMemo(() => {
    const gateByLevel = new Map<number, GateRequirement>();
    for (const g of KEY_GATES) gateByLevel.set(g.afterLevel, g);

    const asc: MapNode[] = [];
    for (const lvl of LEVELS) {
      asc.push({
        kind: 'level',
        level: lvl,
        xPct: X_PATTERN[asc.length % X_PATTERN.length],
      });
      const gate = gateByLevel.get(lvl.id);
      if (gate) {
        asc.push({
          kind: 'gate',
          gate,
          xPct: 50,
        });
      }
    }
    const reversed = asc.reverse();
    const idxMap = new Map<number, number>();
    reversed.forEach((n, idx) => {
      if (n.kind === 'level') idxMap.set(n.level.id, idx);
    });
    return { nodes: reversed, levelIndexMap: idxMap };
  }, []);

  const totalHeight = nodes.length * ROW_HEIGHT + 110;

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const updateSize = () => setViewportH(el.clientHeight || 640);
    updateSize();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateSize);
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, []);

  const scrollToLevelId = useCallback(
    (levelId: number, smooth = true) => {
      const el = scrollContainerRef.current;
      const idx = levelIndexMap.get(levelId);
      if (!el || idx === undefined) return;
      const targetY = Math.max(0, idx * ROW_HEIGHT + 30 - el.clientHeight / 2 + 30);
      el.scrollTo({
        top: targetY,
        behavior: smooth ? 'smooth' : 'auto',
      });
    },
    [levelIndexMap]
  );

  useEffect(() => {
    scrollToLevelId(progress.unlockedLevel, false);
  }, [progress.unlockedLevel, scrollToLevelId]);

  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIdx = Math.min(
    nodes.length - 1,
    Math.ceil((scrollTop + viewportH) / ROW_HEIGHT) + OVERSCAN
  );

  // Determine which World is currently centered in the viewport
  const midIdx = Math.min(
    nodes.length - 1,
    Math.max(0, Math.floor((scrollTop + viewportH / 2) / ROW_HEIGHT))
  );
  const centerNode = nodes[midIdx];
  const centerLevelId =
    centerNode?.kind === 'level'
      ? centerNode.level.id
      : centerNode?.kind === 'gate'
      ? centerNode.gate.afterLevel
      : progress.unlockedLevel;
  const activeWorld =
    WORLD_CHAPTERS.find((w) => centerLevelId >= w.startLevel && centerLevelId <= w.endLevel) ??
    WORLD_CHAPTERS[0];

  const isGateUnlocked = (gate: GateRequirement) =>
    progress.unlockedGates.includes(gate.afterLevel);

  const isSequentiallyPlayable = (levelId: number) => {
    if (levelId > progress.unlockedLevel) return false;
    for (const gate of KEY_GATES) {
      if (levelId > gate.afterLevel && !progress.unlockedGates.includes(gate.afterLevel)) {
        return false;
      }
    }
    return true;
  };

  // Build local SVG path only for visible range
  const svgStart = Math.max(0, startIdx - 1);
  const svgEnd = Math.min(nodes.length - 1, endIdx + 1);
  const svgTopPx = svgStart * ROW_HEIGHT;
  const svgHeightPx = Math.max(ROW_HEIGHT, (svgEnd - svgStart + 1) * ROW_HEIGHT + 60);

  let localPathD = '';
  for (let i = svgStart; i <= svgEnd; i++) {
    const x = nodes[i].xPct;
    const y = (i - svgStart) * ROW_HEIGHT + 60;
    if (i === svgStart) {
      localPathD = `M ${x} ${y}`;
    } else {
      const prevX = nodes[i - 1].xPct;
      const prevY = (i - 1 - svgStart) * ROW_HEIGHT + 60;
      const midY = (prevY + y) / 2;
      localPathD += ` C ${prevX} ${midY}, ${x} ${midY}, ${x} ${y}`;
    }
  }

  return (
    <div className="relative flex-1 w-full min-h-0 flex flex-col">
      {/* Sticky Map Subheader with Fast World Selector + Jump to Current */}
      <div className="shrink-0 px-2.5 py-2 flex items-center justify-between gap-1.5 bg-[#160A2E]/70 border-b border-white/10">
        <button
          type="button"
          onClick={() => {
            sound.playButton();
            setShowWorldDrawer(true);
          }}
          className="min-h-[42px] flex-1 min-w-0 rounded-xl bg-white/8 border border-white/15 px-2.5 py-1 flex items-center justify-between gap-2 text-left active:scale-[0.98]"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-7 h-7 rounded-lg bg-gradient-to-br ${activeWorld.accent} flex items-center justify-center shrink-0 shadow`}
            >
              <Globe2 className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-xs sm:text-sm font-extrabold text-white truncate leading-tight">
                W{activeWorld.id} · {activeWorld.name}
              </p>
              <p className="text-[10px] text-purple-200/80 tabular-nums leading-tight">
                Levels {activeWorld.startLevel}–{activeWorld.endLevel} · {LEVELS.length} Total
              </p>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-pink-300 shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => {
            sound.playButton();
            scrollToLevelId(progress.unlockedLevel, true);
          }}
          className="min-h-[42px] rounded-xl bg-pink-500/20 border border-pink-400/45 px-2.5 py-1.5 flex items-center gap-1 text-xs font-bold text-pink-200 active:scale-95 shrink-0"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Lv {progress.unlockedLevel}</span>
        </button>
      </div>

      {/* Virtualized Scrollable Vertical Winding Map (750 Levels + 149 Gates) */}
      <div
        ref={scrollContainerRef}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        className="relative flex-1 w-full overflow-y-auto overflow-x-hidden no-scrollbar px-3 py-2"
      >
        <div className="relative w-full mx-auto" style={{ height: `${totalHeight}px` }}>
          <svg
            viewBox={`0 0 100 ${svgHeightPx}`}
            preserveAspectRatio="none"
            className="absolute left-0 right-0 w-full pointer-events-none"
            style={{ top: `${svgTopPx}px`, height: `${svgHeightPx}px` }}
          >
            <path
              d={localPathD}
              fill="none"
              stroke="rgba(255,255,255,0.14)"
              strokeWidth="3"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={localPathD}
              fill="none"
              stroke="rgba(244,114,182,0.52)"
              strokeWidth="1.5"
              strokeDasharray="6 7"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {nodes.slice(startIdx, endIdx + 1).map((node, localIdx) => {
            const idx = startIdx + localIdx;
            const topPx = idx * ROW_HEIGHT + 30;

            if (node.kind === 'gate') {
              const unlocked = isGateUnlocked(node.gate);
              return (
                <div
                  key={`gate_${node.gate.afterLevel}`}
                  className="absolute left-1/2 -translate-x-1/2 z-10 w-[86%]"
                  style={{ top: `${topPx - 4}px` }}
                >
                  <button
                    type="button"
                    onClick={() => onSelectGate(node.gate)}
                    className={`w-full min-h-[52px] rounded-2xl px-4 py-2 flex items-center justify-between gap-3 border transition-transform active:scale-[0.98] shadow-lg ${
                      unlocked
                        ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-100'
                        : 'bg-[#2A154D]/95 border-amber-400/50 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          unlocked
                            ? 'bg-emerald-500/30 text-emerald-300'
                            : 'bg-amber-400/20 text-amber-300'
                        }`}
                      >
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="font-display text-sm font-bold truncate">
                          {node.gate.title}
                        </p>
                        <p className="text-[11px] text-purple-200/80 tabular-nums">
                          {unlocked
                            ? 'Gate Open'
                            : `Requires ${node.gate.keysRequired} ${
                                node.gate.keysRequired === 1 ? 'Key' : 'Keys'
                              } or ${node.gate.gemSkipCost} Gems`}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-bold shrink-0 ${
                        unlocked ? 'text-emerald-300' : 'text-amber-300'
                      }`}
                    >
                      {unlocked ? 'Opened' : 'Unlock'}
                    </span>
                  </button>
                </div>
              );
            }

            const lvl = node.level;
            const seqPlayable = isSequentiallyPlayable(lvl.id);
            const purchased = progress.purchasedLevels.includes(lvl.id);
            const playable = seqPlayable || purchased;
            const stars = progress.levelStars[lvl.id] ?? 0;
            const isFrontier = seqPlayable && lvl.id === progress.unlockedLevel;

            return (
              <div
                key={`lvl_${lvl.id}`}
                className="absolute -translate-x-1/2 z-10 flex flex-col items-center"
                style={{ left: `${node.xPct}%`, top: `${topPx}px` }}
              >
                <button
                  type="button"
                  onClick={() => onSelectLevel(lvl)}
                  className={`relative w-13 h-13 rounded-2xl flex flex-col items-center justify-center border-2 transition-transform active:scale-95 shadow-[0_8px_18px_rgba(0,0,0,0.45)] ${
                    !playable
                      ? 'bg-[#1D1236]/92 border-cyan-300/35 text-purple-100 hover:border-cyan-300/75'
                      : isFrontier
                      ? 'bg-gradient-to-b from-pink-500 to-rose-600 border-amber-300 text-white ring-4 ring-pink-400/35'
                      : lvl.isBoss
                      ? 'bg-gradient-to-b from-amber-400 to-orange-600 border-amber-200 text-slate-950'
                      : purchased && !seqPlayable
                      ? 'bg-gradient-to-b from-cyan-500 to-blue-700 border-cyan-200 text-white'
                      : 'bg-gradient-to-b from-violet-500 to-purple-700 border-purple-200/60 text-white'
                  }`}
                >
                  {purchased && !seqPlayable && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-cyan-300 text-slate-950 flex items-center justify-center shadow">
                      <Gem className="w-2.5 h-2.5" />
                    </span>
                  )}
                  {lvl.isBoss && playable && (
                    <Crown className="w-3.5 h-3.5 -mt-0.5 mb-0.5 text-amber-200 drop-shadow" />
                  )}
                  {playable ? (
                    <span className="font-display text-base font-extrabold leading-none tabular-nums">
                      {lvl.id}
                    </span>
                  ) : (
                    <div className="flex flex-col items-center justify-center leading-none">
                      <Lock className="w-3.5 h-3.5 text-cyan-300 mb-0.5" />
                      <span className="font-display text-[11px] font-extrabold text-purple-100 tabular-nums">
                        {lvl.id}
                      </span>
                    </div>
                  )}
                </button>

                {playable ? (
                  <div className="flex items-center gap-0.5 mt-1">
                    {[1, 2, 3].map((s) => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${
                          s <= stars
                            ? 'fill-amber-400 text-amber-300'
                            : 'fill-white/10 text-white/25'
                        }`}
                      />
                    ))}
                  </div>
                ) : (
                  <span className="mt-1 text-[9px] font-bold text-cyan-300/90 uppercase tracking-wide">
                    Tap to Unlock
                  </span>
                )}
                <span className="mt-0.5 text-[10px] font-semibold text-purple-100/80 whitespace-nowrap max-w-[116px] truncate">
                  {lvl.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fast 30-World Chapter Selector Drawer */}
      {showWorldDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3">
          <div className="w-full max-w-[400px] max-h-[86dvh] flex flex-col rounded-3xl bg-[#1C1036]/95 border border-white/20 p-4 shadow-2xl text-white">
            <div className="shrink-0 flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h2 className="font-display text-lg font-extrabold">
                  30 Kingdom Worlds
                </h2>
                <p className="text-xs text-purple-200/75">
                  Jump straight to any World (Levels 1–{LEVELS.length})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWorldDrawer(false)}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-white/10 flex items-center justify-center active:scale-95"
                aria-label="Close World Selector"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 flex-1 overflow-y-auto no-scrollbar flex flex-col gap-2 pr-0.5">
              {WORLD_CHAPTERS.map((world) => {
                let worldStars = 0;
                let hasAnyPurchased = false;
                for (let id = world.startLevel; id <= world.endLevel; id++) {
                  worldStars += progress.levelStars[id] ?? 0;
                  if (progress.purchasedLevels.includes(id)) hasAnyPurchased = true;
                }
                const isFrontierWorld =
                  progress.unlockedLevel >= world.startLevel &&
                  progress.unlockedLevel <= world.endLevel;
                const isUnlockedWorld =
                  progress.unlockedLevel >= world.startLevel || hasAnyPurchased;

                return (
                  <button
                    key={world.id}
                    type="button"
                    onClick={() => {
                      sound.playButton();
                      setShowWorldDrawer(false);
                      const jumpTarget = isFrontierWorld
                        ? progress.unlockedLevel
                        : world.startLevel;
                      scrollToLevelId(jumpTarget, true);
                    }}
                    className={`w-full min-h-[60px] rounded-2xl p-2.5 border flex items-center justify-between gap-2.5 text-left transition-transform active:scale-[0.98] ${
                      isFrontierWorld
                        ? 'bg-pink-500/20 border-pink-400/60'
                        : 'bg-white/6 border-white/12'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${world.accent} flex items-center justify-center font-display text-sm font-extrabold text-white shrink-0 shadow`}
                      >
                        {world.id}
                      </div>
                      <div className="min-w-0">
                        <p className="font-display text-sm font-extrabold text-white truncate">
                          {world.name}
                        </p>
                        <p className="text-[11px] text-purple-200/80 truncate tabular-nums">
                          Levels {world.startLevel}–{world.endLevel} · {world.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="flex items-center justify-end gap-1 text-xs font-extrabold text-amber-300 tabular-nums">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-300" />
                        {worldStars}/75
                      </p>
                      <p className="text-[10px] font-bold text-cyan-300 mt-0.5">
                        {isFrontierWorld
                          ? 'Current'
                          : isUnlockedWorld
                          ? 'Jump'
                          : 'Gem Unlock'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
