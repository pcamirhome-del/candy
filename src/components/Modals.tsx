import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  ClipboardCheck,
  Copy,
  Crown,
  Gem,
  Hammer,
  Heart,
  Home,
  KeyRound,
  Map,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Star,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  exportBackupCode,
  formatCountdown,
  importBackupCode,
  MAX_LIVES,
} from '../game/storage';
import { GateRequirement, LevelConfig, PlayerProgress } from '../game/types';
import { PWAInstallButton } from './PWAInstallButton';

interface LevelStartModalProps {
  level: LevelConfig;
  progress: PlayerProgress;
  useColorBombStart: boolean;
  onToggleColorBombStart: () => void;
  onStart: () => void;
  onClose: () => void;
}

export const LevelStartModal: React.FC<LevelStartModalProps> = ({
  level,
  progress,
  useColorBombStart,
  onToggleColorBombStart,
  onStart,
  onClose,
}) => {
  const objectiveDesc =
    level.objectiveType === 'score'
      ? `Reach ${level.targetScore.toLocaleString()} points`
      : level.objectiveType === 'jelly'
      ? 'Clear all blue crystal jelly tiles'
      : level.objectiveType === 'blockers'
      ? 'Clear all frosting, chocolate & licorice blockers'
      : `Drop ${level.ingredientCount ?? 0} cherries & hazelnuts to the green arrows`;

  const bestScore = progress.highScores[level.id] ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-[380px] rounded-3xl bg-[#1C1036]/95 border border-white/15 p-5 shadow-2xl text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-pink-300">
              Level {level.id} {level.isBoss ? '· Boss Stage' : ''}
            </p>
            <h2 className="font-display text-2xl font-extrabold mt-0.5">{level.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/10 text-white active:scale-95"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-white/6 border border-white/10 p-3.5">
          <p className="text-xs font-semibold text-purple-200/80">Objective</p>
          <p className="font-display text-base font-bold text-white mt-0.5">{objectiveDesc}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-purple-200/80 tabular-nums">
            <span>{level.moves} Moves</span>
            <span aria-hidden="true">·</span>
            <span>Reward: +{level.gemReward} Gems</span>
            {level.keyReward && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-300 font-bold">+{level.keyReward} Key</span>
              </>
            )}
          </div>
          {bestScore > 0 && (
            <p className="mt-1.5 text-xs text-amber-300/90 tabular-nums">
              Best Score: {bestScore.toLocaleString()}
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={progress.boosters.colorBombStart <= 0}
          onClick={onToggleColorBombStart}
          className={`mt-3 w-full min-h-[52px] rounded-2xl px-3.5 py-2.5 flex items-center justify-between border transition-colors ${
            useColorBombStart
              ? 'bg-pink-500/25 border-pink-400 text-white'
              : 'bg-white/5 border-white/12 text-purple-100 disabled:opacity-45'
          }`}
        >
          <div className="flex items-center gap-2.5 text-left">
            <Sparkles className="w-5 h-5 text-amber-300 shrink-0" />
            <div>
              <p className="text-sm font-bold leading-tight">Color Bomb Start</p>
              <p className="text-[11px] text-purple-200/75 tabular-nums">
                Owned: {progress.boosters.colorBombStart}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold">
            {useColorBombStart ? 'Active' : progress.boosters.colorBombStart > 0 ? 'Use' : 'Empty'}
          </span>
        </button>

        <button
          type="button"
          onClick={onStart}
          className="mt-4 w-full min-h-[50px] rounded-2xl bg-gradient-to-b from-pink-500 to-rose-600 py-3 font-display text-lg font-extrabold text-white shadow-[0_6px_20px_rgba(244,63,94,0.45)] active:scale-[0.98] transition-transform"
        >
          Play Level
        </button>
      </div>
    </div>
  );
};

interface VictoryModalProps {
  level: LevelConfig;
  score: number;
  stars: number;
  gemsEarned: number;
  keyEarned: number;
  hasNextLevel: boolean;
  onNextLevel: () => void;
  onReplay: () => void;
  onMap: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  level,
  score,
  stars,
  gemsEarned,
  keyEarned,
  hasNextLevel,
  onNextLevel,
  onReplay,
  onMap,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-[380px] rounded-3xl bg-[#1C1036]/95 border border-white/20 p-6 shadow-2xl text-center text-white">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-300 mb-2">
          <Crown className="w-6 h-6" />
        </div>
        <h2 className="font-display text-2xl font-extrabold">Level {level.id} Complete!</h2>
        <p className="text-xs text-purple-200/80 mt-0.5">{level.title}</p>

        <div className="flex items-center justify-center gap-3 my-4">
          {[1, 2, 3].map((s) => (
            <Star
              key={s}
              style={{ animationDelay: `${(s - 1) * 140}ms` }}
              className={`w-11 h-11 ${
                s <= stars
                  ? 'fill-amber-400 text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)] animate-star-pop'
                  : 'fill-white/10 text-white/20'
              }`}
            />
          ))}
        </div>

        <div className="rounded-2xl bg-white/8 border border-white/10 p-3.5">
          <p className="text-xs text-purple-200/75">Final Score</p>
          <p className="font-display text-2xl font-extrabold tabular-nums text-white">
            {score.toLocaleString()}
          </p>
          <div className="mt-2 flex items-center justify-center gap-4 text-sm font-bold tabular-nums">
            <span className="flex items-center gap-1 text-cyan-300">
              <Gem className="w-4 h-4" /> +{gemsEarned} Gems
            </span>
            {keyEarned > 0 && (
              <span className="flex items-center gap-1 text-amber-300">
                <KeyRound className="w-4 h-4" /> +{keyEarned} Key
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          {hasNextLevel && (
            <button
              type="button"
              onClick={onNextLevel}
              className="w-full min-h-[50px] rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 py-3 font-display text-lg font-extrabold text-slate-950 shadow-lg active:scale-[0.98]"
            >
              Next Level
            </button>
          )}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onReplay}
              className="min-h-[46px] rounded-2xl bg-white/10 border border-white/15 py-2.5 text-sm font-bold text-white active:scale-[0.98]"
            >
              Replay
            </button>
            <button
              type="button"
              onClick={onMap}
              className="min-h-[46px] rounded-2xl bg-white/10 border border-white/15 py-2.5 text-sm font-bold text-white active:scale-[0.98]"
            >
              Level Map
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface OutOfMovesModalProps {
  reason: 'moves' | 'bomb';
  gems: number;
  lives: number;
  onBuyExtraMoves: () => void;
  onGiveUp: () => void;
}

export const OutOfMovesModal: React.FC<OutOfMovesModalProps> = ({
  reason,
  gems,
  lives,
  onBuyExtraMoves,
  onGiveUp,
}) => {
  const canAfford = gems >= 20;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-[380px] rounded-3xl bg-[#1C1036]/95 border border-white/20 p-6 shadow-2xl text-center text-white">
        <h2 className="font-display text-2xl font-extrabold text-rose-300">
          {reason === 'bomb' ? 'Candy Bomb Exploded!' : 'Out of Moves!'}
        </h2>
        <p className="text-sm text-purple-100/85 mt-1.5">
          {reason === 'bomb'
            ? 'A ticking candy bomb reached zero. Defuse & continue with +5 moves, or exit and lose 1 life.'
            : 'Keep your board and add 5 extra moves, or exit and lose 1 life.'}
        </p>

        <div className="mt-4 rounded-2xl bg-white/8 border border-white/10 p-3 flex items-center justify-center gap-4 text-sm tabular-nums">
          <span className="flex items-center gap-1.5 font-bold text-cyan-300">
            <Gem className="w-4 h-4" /> {gems} Gems
          </span>
          <span aria-hidden="true">·</span>
          <span className="flex items-center gap-1.5 font-bold text-rose-300">
            <Heart className="w-4 h-4 fill-rose-400" /> {lives} Lives
          </span>
        </div>

        {reason === 'moves' && (
          <button
            type="button"
            disabled={!canAfford}
            onClick={onBuyExtraMoves}
            className="mt-4 w-full min-h-[50px] rounded-2xl bg-gradient-to-b from-cyan-400 to-blue-600 py-3 font-display text-base font-extrabold text-slate-950 shadow-lg disabled:opacity-45 active:scale-[0.98]"
          >
            {canAfford ? '+5 Moves for 20 Gems' : 'Need 20 Gems for +5 Moves'}
          </button>
        )}

        <button
          type="button"
          onClick={onGiveUp}
          className="mt-2.5 w-full min-h-[46px] rounded-2xl bg-white/10 border border-white/15 py-2.5 text-sm font-bold text-white active:scale-[0.98]"
        >
          End Level (-1 Life)
        </button>
      </div>
    </div>
  );
};

interface OutOfLivesModalProps {
  gems: number;
  msUntilNextLife: number;
  onRefillLives: () => void;
  onClose: () => void;
}

export const OutOfLivesModal: React.FC<OutOfLivesModalProps> = ({
  gems,
  msUntilNextLife,
  onRefillLives,
  onClose,
}) => {
  const canAfford = gems >= 30;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-[380px] rounded-3xl bg-[#1C1036]/95 border border-white/20 p-6 shadow-2xl text-center text-white">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 mb-2">
          <Heart className="w-6 h-6 fill-rose-400" />
        </div>
        <h2 className="font-display text-2xl font-extrabold">Out of Lives!</h2>
        <p className="text-sm text-purple-100/85 mt-1">
          Next life regenerates automatically in:
        </p>
        <p className="font-display text-3xl font-extrabold text-amber-300 tabular-nums mt-2">
          {formatCountdown(msUntilNextLife)}
        </p>

        <button
          type="button"
          disabled={!canAfford}
          onClick={onRefillLives}
          className="mt-5 w-full min-h-[50px] rounded-2xl bg-gradient-to-b from-pink-500 to-rose-600 py-3 font-display text-base font-extrabold text-white shadow-lg disabled:opacity-45 active:scale-[0.98]"
        >
          {canAfford ? `Refill ${MAX_LIVES} Lives (30 Gems)` : 'Need 30 Gems to Refill'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-2.5 w-full min-h-[46px] rounded-2xl bg-white/10 border border-white/15 py-2.5 text-sm font-bold text-white active:scale-[0.98]"
        >
          Wait for Timer
        </button>
      </div>
    </div>
  );
};

interface GateModalProps {
  gate: GateRequirement;
  progress: PlayerProgress;
  onUnlockWithKeys: () => void;
  onUnlockWithGems: () => void;
  onClose: () => void;
}

export const GateModal: React.FC<GateModalProps> = ({
  gate,
  progress,
  onUnlockWithKeys,
  onUnlockWithGems,
  onClose,
}) => {
  const isOpen = progress.unlockedGates.includes(gate.afterLevel);
  const hasEnoughKeys = progress.keys >= gate.keysRequired;
  const canUseGems = progress.gems >= gate.gemSkipCost;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-[380px] rounded-3xl bg-[#1C1036]/95 border border-white/20 p-5 shadow-2xl text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-extrabold">{gate.title}</h2>
              <p className="text-xs text-purple-200/75">Unlocks after Level {gate.afterLevel}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-white/8 border border-white/10 p-3.5 text-sm">
          {isOpen ? (
            <p className="text-emerald-300 font-bold flex items-center gap-2">
              <Check className="w-4 h-4" /> This gate is already unlocked!
            </p>
          ) : (
            <p className="text-purple-100/90 leading-relaxed">
              Earn Keys by completing Boss Levels (every 5th level) or unlock early using Gems.
              <br />
              <span className="text-amber-300 font-bold tabular-nums">
                Your Keys: {progress.keys} / {gate.keysRequired} required
              </span>
            </p>
          )}
        </div>

        {!isOpen && (
          <div className="mt-4 flex flex-col gap-2.5">
            <button
              type="button"
              disabled={!hasEnoughKeys}
              onClick={onUnlockWithKeys}
              className="w-full min-h-[48px] rounded-2xl bg-gradient-to-b from-amber-400 to-orange-500 py-2.5 font-display text-base font-extrabold text-slate-950 disabled:opacity-40 active:scale-[0.98]"
            >
              {hasEnoughKeys
                ? `Open Gate (${gate.keysRequired} Keys)`
                : `Need ${gate.keysRequired} Keys`}
            </button>
            <button
              type="button"
              disabled={!canUseGems}
              onClick={onUnlockWithGems}
              className="w-full min-h-[46px] rounded-2xl bg-gradient-to-b from-cyan-400 to-blue-600 py-2.5 font-display text-sm font-extrabold text-slate-950 disabled:opacity-40 active:scale-[0.98]"
            >
              Unlock Now ({gate.gemSkipCost} Gems)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface SettingsShopModalProps {
  progress: PlayerProgress;
  msUntilNextLife: number;
  onToggleSound: () => void;
  onBuyBooster: (type: 'hammer' | 'freeSwitch' | 'colorBombStart', cost: number) => void;
  onRefillLives: () => void;
  onRestoreProgress: (restored: PlayerProgress) => void;
  onOpenAdminPanel: () => void;
  onResetProgress: () => void;
  onClose: () => void;
}

export const SettingsShopModal: React.FC<SettingsShopModalProps> = ({
  progress,
  msUntilNextLife,
  onToggleSound,
  onBuyBooster,
  onRefillLives,
  onRestoreProgress,
  onOpenAdminPanel,
  onResetProgress,
  onClose,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [exportedCode, setExportedCode] = useState<string | null>(null);
  const [pasteInput, setPasteInput] = useState('');
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);

  const handleCopyProgress = async () => {
    const code = exportBackupCode(progress);
    setExportedCode(code);
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 2200);
    } catch {
      setCopiedCode(false);
    }
  };

  const handleRestoreCode = () => {
    const restored = importBackupCode(pasteInput);
    if (!restored) {
      setRestoreStatus('Invalid backup code. Check and try again.');
      return;
    }
    onRestoreProgress(restored);
    setPasteInput('');
    setRestoreStatus('Progress restored!');
    window.setTimeout(() => setRestoreStatus(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-[400px] max-h-[88dvh] overflow-y-auto no-scrollbar rounded-3xl bg-[#1C1036]/95 border border-white/20 p-5 shadow-2xl text-white">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold">Candy Amir · Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audio & PWA Install */}
        <div className="mt-4 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onToggleSound}
            className="w-full min-h-[48px] rounded-2xl bg-white/8 border border-white/12 px-4 py-2.5 flex items-center justify-between active:scale-[0.98]"
          >
            <span className="flex items-center gap-2.5 text-sm font-bold">
              {progress.soundMuted ? (
                <VolumeX className="w-5 h-5 text-rose-300" />
              ) : (
                <Volume2 className="w-5 h-5 text-emerald-300" />
              )}
              Sound Effects
            </span>
            <span className="text-xs font-bold text-purple-200">
              {progress.soundMuted ? 'Muted' : 'On'}
            </span>
          </button>

          <PWAInstallButton />
        </div>

        {/* Gem Shop */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display text-base font-bold">Gem Shop</h3>
            <span className="flex items-center gap-1 text-sm font-bold text-cyan-300 tabular-nums">
              <Gem className="w-4 h-4" /> {progress.gems}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {progress.lives < MAX_LIVES && (
              <button
                type="button"
                disabled={progress.gems < 30}
                onClick={onRefillLives}
                className="w-full min-h-[50px] rounded-2xl bg-white/8 border border-white/12 px-3.5 py-2 flex items-center justify-between disabled:opacity-45 active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <Heart className="w-5 h-5 text-rose-400 fill-rose-400 shrink-0" />
                  <div>
                    <p className="text-sm font-bold leading-tight">Refill Full Lives</p>
                    <p className="text-[11px] text-purple-200/75 tabular-nums">
                      Next heart in {formatCountdown(msUntilNextLife)}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-cyan-300 tabular-nums">30 Gems</span>
              </button>
            )}

            <button
              type="button"
              disabled={progress.gems < 15}
              onClick={() => onBuyBooster('hammer', 15)}
              className="w-full min-h-[50px] rounded-2xl bg-white/8 border border-white/12 px-3.5 py-2 flex items-center justify-between disabled:opacity-45 active:scale-[0.98]"
            >
              <div className="flex items-center gap-2.5 text-left">
                <Hammer className="w-5 h-5 text-amber-300 shrink-0" />
                <div>
                  <p className="text-sm font-bold leading-tight">Lollipop Hammer (+1)</p>
                  <p className="text-[11px] text-purple-200/75 tabular-nums">
                    Owned: {progress.boosters.hammer}
                  </p>
                </div>
              </div>
              <span className="text-xs font-extrabold text-cyan-300 tabular-nums">15 Gems</span>
            </button>

            <button
              type="button"
              disabled={progress.gems < 15}
              onClick={() => onBuyBooster('freeSwitch', 15)}
              className="w-full min-h-[50px] rounded-2xl bg-white/8 border border-white/12 px-3.5 py-2 flex items-center justify-between disabled:opacity-45 active:scale-[0.98]"
            >
              <div className="flex items-center gap-2.5 text-left">
                <Shuffle className="w-5 h-5 text-cyan-300 shrink-0" />
                <div>
                  <p className="text-sm font-bold leading-tight">Free Switch (+1)</p>
                  <p className="text-[11px] text-purple-200/75 tabular-nums">
                    Owned: {progress.boosters.freeSwitch}
                  </p>
                </div>
              </div>
              <span className="text-xs font-extrabold text-cyan-300 tabular-nums">15 Gems</span>
            </button>

            <button
              type="button"
              disabled={progress.gems < 25}
              onClick={() => onBuyBooster('colorBombStart', 25)}
              className="w-full min-h-[50px] rounded-2xl bg-white/8 border border-white/12 px-3.5 py-2 flex items-center justify-between disabled:opacity-45 active:scale-[0.98]"
            >
              <div className="flex items-center gap-2.5 text-left">
                <Sparkles className="w-5 h-5 text-pink-300 shrink-0" />
                <div>
                  <p className="text-sm font-bold leading-tight">Color Bomb (+1)</p>
                  <p className="text-[11px] text-purple-200/75 tabular-nums">
                    Owned: {progress.boosters.colorBombStart}
                  </p>
                </div>
              </div>
              <span className="text-xs font-extrabold text-cyan-300 tabular-nums">25 Gems</span>
            </button>
          </div>
        </div>

        {/* Backup & Restore Save Code */}
        <div className="mt-5 pt-4 border-t border-white/10">
          <h3 className="font-display text-base font-bold mb-2">Backup & Restore</h3>
          <button
            type="button"
            onClick={handleCopyProgress}
            className="w-full min-h-[46px] rounded-2xl bg-white/8 border border-white/15 px-3.5 py-2 flex items-center justify-center gap-2 text-sm font-bold text-white active:scale-[0.98]"
          >
            {copiedCode ? (
              <>
                <ClipboardCheck className="w-4 h-4 text-emerald-300" />
                <span className="text-emerald-300">Progress Code Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-amber-300" />
                <span>Copy Progress Code</span>
              </>
            )}
          </button>

          {exportedCode && (
            <input
              type="text"
              readOnly
              value={exportedCode}
              onFocus={(e) => e.currentTarget.select()}
              className="mt-2 w-full rounded-xl bg-black/35 border border-white/15 px-3 py-2 text-base text-purple-100 tabular-nums focus:outline-none"
              aria-label="Exported backup code"
            />
          )}

          <div className="mt-2.5 flex items-center gap-2">
            <input
              type="text"
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              placeholder="Paste CA1: backup code..."
              className="flex-1 min-w-0 min-h-[44px] rounded-xl bg-black/35 border border-white/15 px-3 py-2 text-base text-white placeholder:text-purple-200/45 focus:outline-none focus:border-pink-400"
              aria-label="Paste backup code"
            />
            <button
              type="button"
              onClick={handleRestoreCode}
              className="min-h-[44px] rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 px-3.5 py-2 flex items-center gap-1.5 text-sm font-extrabold text-slate-950 shrink-0 active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>Restore</span>
            </button>
          </div>
          {restoreStatus && (
            <p className="mt-1.5 text-xs font-semibold text-amber-300">{restoreStatus}</p>
          )}
        </div>

          {/* Admin Panel Button */}
          <button
            type="button"
            onClick={onOpenAdminPanel}
            className="mt-3 w-full min-h-[46px] rounded-2xl bg-amber-400/15 border border-amber-400/40 px-4 py-2.5 flex items-center justify-between text-amber-200 active:scale-[0.98]"
          >
            <span className="flex items-center gap-2 text-sm font-bold">
              <ShieldCheck className="w-4 h-4 text-amber-300" />
              Admin Panel
            </span>
            <span className="text-xs font-semibold opacity-80">Gift Generator</span>
          </button>

          {/* Reset Progress */}
          <div className="mt-4 pt-4 border-t border-white/10">
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="w-full min-h-[44px] rounded-2xl bg-white/5 border border-white/10 py-2 text-xs font-bold text-rose-300 flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Game Progress
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onResetProgress();
                  setConfirmReset(false);
                }}
                className="flex-1 min-h-[44px] rounded-2xl bg-rose-600 text-xs font-extrabold text-white"
              >
                Confirm Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="flex-1 min-h-[44px] rounded-2xl bg-white/10 text-xs font-bold text-white"
              >
                Cancel
              </button>
            </div>
          )}

          <p className="mt-4 text-center text-xs font-medium text-purple-200/70">
            Developed by Amir Lamay • Made In Egypt
          </p>
        </div>
      </div>
    </div>
  );
};

interface PauseMenuModalProps {
  level: LevelConfig;
  movesLeft: number;
  soundMuted: boolean;
  isLevelInProgress: boolean;
  onResume: () => void;
  onToggleSound: () => void;
  onExitToMap: () => void;
  onExitToHome: () => void;
}

export const PauseMenuModal: React.FC<PauseMenuModalProps> = ({
  level,
  movesLeft,
  soundMuted,
  isLevelInProgress,
  onResume,
  onToggleSound,
  onExitToMap,
  onExitToHome,
}) => {
  const [confirmTarget, setConfirmTarget] = useState<'map' | 'home' | null>(null);

  const handleRequestExit = (target: 'map' | 'home') => {
    if (isLevelInProgress) {
      setConfirmTarget(target);
      return;
    }
    if (target === 'map') {
      onExitToMap();
    } else {
      onExitToHome();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-[380px] rounded-3xl bg-[#1C1036]/95 border border-white/20 p-5 shadow-2xl text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-pink-500/25 border border-pink-400/40 text-pink-300 flex items-center justify-center">
              <Pause className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-extrabold leading-tight">Game Paused</h2>
              <p className="text-xs text-purple-200/80">
                Level {level.id} · {level.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onResume}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/10 active:scale-95"
            aria-label="Resume game"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {confirmTarget ? (
          <div className="mt-4 rounded-2xl bg-rose-500/15 border border-rose-400/45 p-4 text-center">
            <div className="mx-auto w-11 h-11 rounded-2xl bg-rose-500/25 text-rose-300 flex items-center justify-center mb-2">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-display text-lg font-extrabold text-white">
              Leave Level in Progress?
            </h3>
            <p className="mt-1 text-xs text-purple-100/85 leading-relaxed">
              Returning to the{' '}
              <span className="font-bold text-amber-300">
                {confirmTarget === 'map' ? 'Level Map' : 'Main Home Screen'}
              </span>{' '}
              now will cost <span className="font-bold text-rose-300">1 Life</span>.
            </p>

            <div className="mt-4 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                className="w-full min-h-[48px] rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 py-2.5 font-display text-base font-extrabold text-slate-950 shadow-lg active:scale-[0.98]"
              >
                Keep Playing
              </button>
              <button
                type="button"
                onClick={confirmTarget === 'map' ? onExitToMap : onExitToHome}
                className="w-full min-h-[46px] rounded-2xl bg-rose-600/90 border border-rose-300/40 py-2.5 font-display text-sm font-extrabold text-white active:scale-[0.98]"
              >
                Exit & Lose 1 Life
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 rounded-2xl bg-white/8 border border-white/10 px-3.5 py-2.5 flex items-center justify-between text-xs">
              <span className="text-purple-200/80 font-semibold tabular-nums">
                Moves Remaining: <strong className="text-white">{movesLeft}</strong>
              </span>
              <span
                className={`font-bold ${
                  isLevelInProgress ? 'text-amber-300' : 'text-emerald-300'
                }`}
              >
                {isLevelInProgress ? 'In Progress (-1 Life on exit)' : 'Safe to Exit'}
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onResume}
                className="w-full min-h-[50px] rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 py-3 flex items-center justify-center gap-2 font-display text-lg font-extrabold text-slate-950 shadow-lg active:scale-[0.98]"
              >
                <Play className="w-5 h-5 fill-slate-950" />
                <span>Resume Level</span>
              </button>

              <button
                type="button"
                onClick={onToggleSound}
                className="w-full min-h-[46px] rounded-2xl bg-white/8 border border-white/15 px-4 py-2.5 flex items-center justify-between text-sm font-bold active:scale-[0.98]"
              >
                <span className="flex items-center gap-2">
                  {soundMuted ? (
                    <VolumeX className="w-4 h-4 text-rose-300" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-emerald-300" />
                  )}
                  Sound Effects
                </span>
                <span className="text-xs text-purple-200">
                  {soundMuted ? 'Muted' : 'On'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleRequestExit('map')}
                className="w-full min-h-[46px] rounded-2xl bg-white/10 border border-white/15 px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-bold text-white active:scale-[0.98]"
              >
                <Map className="w-4 h-4 text-pink-300" />
                <span>Back to Level Map</span>
              </button>

              <button
                type="button"
                onClick={() => handleRequestExit('home')}
                className="w-full min-h-[46px] rounded-2xl bg-gradient-to-r from-pink-500/20 to-amber-500/20 border border-amber-300/35 px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-bold text-amber-200 active:scale-[0.98]"
              >
                <Home className="w-4 h-4 text-amber-300" />
                <span>Main Home Screen</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
