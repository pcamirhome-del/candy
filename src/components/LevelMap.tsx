import React, { useEffect, useRef } from 'react';
import { Compass, Crown, KeyRound, Lock, Star } from 'lucide-react';
import { KEY_GATES, LEVELS } from '../game/levels';
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

export const LevelMap: React.FC<LevelMapProps> = ({
  progress,
  onSelectLevel,
  onSelectGate,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const currentNodeRef = useRef<HTMLButtonElement | null>(null);

  const ascendingNodes: MapNode[] = [];
  LEVELS.forEach((lvl) => {
    ascendingNodes.push({
      kind: 'level',
      level: lvl,
      xPct: X_PATTERN[ascendingNodes.length % X_PATTERN.length],
    });
    const gate = KEY_GATES.find((g) => g.afterLevel === lvl.id);
    if (gate) {
      ascendingNodes.push({
        kind: 'gate',
        gate,
        xPct: 50,
      });
    }
  });

  const nodes = [...ascendingNodes].reverse();
  const rowHeight = 90;
  const totalHeight = nodes.length * rowHeight + 90;

  const scrollToCurrent = (smooth = true) => {
    if (currentNodeRef.current) {
      currentNodeRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'center',
      });
    }
  };

  useEffect(() => {
    scrollToCurrent(false);
  }, [progress.unlockedLevel]);

  const isGateUnlocked = (gate: GateRequirement) =>
    progress.unlockedGates.includes(gate.afterLevel);

  const isLevelPlayable = (levelId: number) => {
    if (levelId > progress.unlockedLevel) return false;
    for (const gate of KEY_GATES) {
      if (levelId > gate.afterLevel && !progress.unlockedGates.includes(gate.afterLevel)) {
        return false;
      }
    }
    return true;
  };

  const points = nodes.map((n, idx) => ({
    x: n.xPct,
    y: idx * rowHeight + 60,
  }));

  let pathD = '';
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midY = (prev.y + curr.y) / 2;
      pathD += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
    }
  }

  return (
    <div className="relative flex-1 w-full min-h-0 flex flex-col">
      {/* Sticky Map Subheader with Candy Amir Branding + Quick Jump */}
      <div className="shrink-0 px-3 py-2 flex items-center justify-between gap-2 bg-[#160A2E]/50 border-b border-white/5">
        <div className="min-w-0">
          <p className="font-display text-[clamp(1rem,3.8vw,1.2rem)] font-extrabold tracking-tight text-white truncate">
            Candy Amir
          </p>
          <p className="text-[11px] text-purple-200/75 tabular-nums">
            Level {progress.unlockedLevel} of {LEVELS.length} · Boss Keys
          </p>
        </div>
        <button
          type="button"
          onClick={() => scrollToCurrent(true)}
          className="min-h-[40px] rounded-xl bg-pink-500/20 border border-pink-400/40 px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold text-pink-200 active:scale-95 shrink-0"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Current</span>
        </button>
      </div>

      {/* Scrollable Vertical Winding Map */}
      <div
        ref={scrollContainerRef}
        className="relative flex-1 w-full overflow-y-auto overflow-x-hidden no-scrollbar px-3 py-2"
      >
        <div className="relative w-full mx-auto" style={{ height: `${totalHeight}px` }}>
          <svg
            viewBox={`0 0 100 ${totalHeight}`}
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            <path
              d={pathD}
              fill="none"
              stroke="rgba(255,255,255,0.13)"
              strokeWidth="3"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={pathD}
              fill="none"
              stroke="rgba(244,114,182,0.52)"
              strokeWidth="1.5"
              strokeDasharray="6 7"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {nodes.map((node, idx) => {
            const topPx = idx * rowHeight + 30;

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
            const playable = isLevelPlayable(lvl.id);
            const stars = progress.levelStars[lvl.id] ?? 0;
            const isFrontier = playable && lvl.id === progress.unlockedLevel;

            return (
              <div
                key={`lvl_${lvl.id}`}
                className="absolute -translate-x-1/2 z-10 flex flex-col items-center"
                style={{ left: `${node.xPct}%`, top: `${topPx}px` }}
              >
                <button
                  ref={isFrontier ? currentNodeRef : undefined}
                  type="button"
                  onClick={() => onSelectLevel(lvl)}
                  className={`relative w-13 h-13 rounded-2xl flex flex-col items-center justify-center border-2 transition-transform active:scale-95 shadow-[0_8px_18px_rgba(0,0,0,0.45)] ${
                    !playable
                      ? 'bg-slate-800/85 border-white/15 text-slate-400'
                      : isFrontier
                      ? 'bg-gradient-to-b from-pink-500 to-rose-600 border-amber-300 text-white ring-4 ring-pink-400/35'
                      : lvl.isBoss
                      ? 'bg-gradient-to-b from-amber-400 to-orange-600 border-amber-200 text-slate-950'
                      : 'bg-gradient-to-b from-violet-500 to-purple-700 border-purple-200/60 text-white'
                  }`}
                >
                  {lvl.isBoss && playable && (
                    <Crown className="w-3.5 h-3.5 -mt-0.5 mb-0.5 text-amber-200 drop-shadow" />
                  )}
                  {playable ? (
                    <span className="font-display text-base font-extrabold leading-none tabular-nums">
                      {lvl.id}
                    </span>
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                </button>

                {playable && (
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
                )}
                <span className="mt-0.5 text-[10px] font-semibold text-purple-100/80 whitespace-nowrap max-w-[112px] truncate">
                  {lvl.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
