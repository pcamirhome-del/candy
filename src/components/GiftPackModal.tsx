import React, { useMemo, useState } from 'react';
import { Banknote, Gem, Gift, Heart, KeyRound, Sparkles, X } from 'lucide-react';
import { GiftRewardPayload, verifyAndDecodeGiftCode } from '../game/giftCodes';
import { sound } from '../game/sound';

interface GiftPackModalProps {
  redeemedCodes: string[];
  onRedeemSuccess: (normalizedCode: string, reward: GiftRewardPayload) => void;
  onClose: () => void;
}

const CONFETTI_COLORS = ['#FACC15', '#F43F5E', '#38BDF8', '#4ADE80', '#C084FC', '#FB923C'];

export const GiftPackModal: React.FC<GiftPackModalProps> = ({
  redeemedCodes,
  onRedeemSuccess,
  onClose,
}) => {
  const [codeInput, setCodeInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [claimedReward, setClaimedReward] = useState<GiftRewardPayload | null>(null);

  const confettiPieces = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => ({
        id: i,
        left: `${Math.round((i / 34) * 96 + 2)}%`,
        delay: `${(i % 7) * 90}ms`,
        dur: `${1.8 + (i % 5) * 0.28}s`,
        cx: `${((i % 2 === 0 ? 1 : -1) * (15 + (i * 11) % 45))}px`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 7 + (i % 5) * 2,
      })),
    []
  );

  const handleClaim = (e: React.FormEvent) => {
    e.preventDefault();
    sound.unlock();
    const res = verifyAndDecodeGiftCode(codeInput);
    if (!res.valid) {
      sound.playInvalidSwap();
      setErrorMsg(res.error);
      return;
    }

    if (redeemedCodes.includes(res.normalizedCode)) {
      sound.playInvalidSwap();
      setErrorMsg('This gift code has already been redeemed!');
      return;
    }

    setErrorMsg(null);
    sound.playGiftCelebration();
    setClaimedReward(res.reward);
    onRedeemSuccess(res.normalizedCode, res.reward);
  };

  // Full-Screen Surprise Celebration Overlay
  if (claimedReward) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0418]/88 backdrop-blur-md p-4 overflow-hidden">
        {/* Confetti & Coin/Gem Shower */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {confettiPieces.map((p) => (
            <div
              key={p.id}
              className="absolute top-0 rounded-sm animate-confetti-fall"
              style={
                {
                  left: p.left,
                  width: `${p.size}px`,
                  height: `${Math.round(p.size * 1.4)}px`,
                  backgroundColor: p.color,
                  animationDelay: p.delay,
                  '--dur': p.dur,
                  '--cx': p.cx,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        <div className="relative z-10 w-full max-w-[380px] rounded-3xl bg-gradient-to-b from-[#2B1554]/95 to-[#170A30]/95 border-2 border-amber-300/60 p-6 shadow-[0_0_50px_rgba(251,191,36,0.35)] text-center text-white">
          {/* Glowing Open Treasure Chest SVG */}
          <div className="mx-auto w-24 h-24 mb-2 flex items-center justify-center animate-star-pop">
            <svg viewBox="0 0 96 96" className="w-full h-full drop-shadow-[0_0_16px_rgba(250,204,21,0.7)]">
              <defs>
                <radialGradient id="chestGlow" cx="50%" cy="45%" r="50%">
                  <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="woodChest" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#B45309" />
                  <stop offset="100%" stopColor="#78350F" />
                </linearGradient>
              </defs>
              <circle cx="48" cy="42" r="42" fill="url(#chestGlow)" />
              {/* Open Lid */}
              <path d="M18 38 C20 18, 76 18, 78 38 Z" fill="url(#woodChest)" stroke="#FDE047" strokeWidth="3" />
              {/* Shining Gold Inside */}
              <ellipse cx="48" cy="42" rx="26" ry="7" fill="#FACC15" />
              {/* Chest Base */}
              <rect x="16" y="42" width="64" height="34" rx="6" fill="url(#woodChest)" stroke="#FDE047" strokeWidth="3" />
              <rect x="42" y="42" width="12" height="14" rx="2" fill="#FEF08A" />
              <circle cx="48" cy="49" r="3" fill="#78350F" />
            </svg>
          </div>

          <h2 className="font-display text-2xl font-extrabold text-amber-300">
            Surprise Gift Claimed!
          </h2>
          <p className="text-xs font-bold text-pink-200 mt-0.5">
            مبروك! تم إضافة الجوائز لحسابك
          </p>

          {/* Show ONLY the rewards included in the code */}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {claimedReward.cash > 0 && (
              <div className="rounded-2xl bg-emerald-500/20 border border-emerald-400/50 p-3 flex flex-col items-center">
                <Banknote className="w-6 h-6 text-emerald-300 mb-1" />
                <span className="font-display text-xl font-extrabold text-white tabular-nums">
                  +{claimedReward.cash.toLocaleString()}
                </span>
                <span className="text-[11px] font-bold text-emerald-200">Cash · المبلغ</span>
              </div>
            )}

            {claimedReward.gems > 0 && (
              <div className="rounded-2xl bg-cyan-500/20 border border-cyan-400/50 p-3 flex flex-col items-center">
                <Gem className="w-6 h-6 text-cyan-300 mb-1" />
                <span className="font-display text-xl font-extrabold text-white tabular-nums">
                  +{claimedReward.gems.toLocaleString()}
                </span>
                <span className="text-[11px] font-bold text-cyan-200">Gems · الجواهر</span>
              </div>
            )}

            {claimedReward.keys > 0 && (
              <div className="rounded-2xl bg-amber-500/20 border border-amber-400/50 p-3 flex flex-col items-center">
                <KeyRound className="w-6 h-6 text-amber-300 mb-1" />
                <span className="font-display text-xl font-extrabold text-white tabular-nums">
                  +{claimedReward.keys.toLocaleString()}
                </span>
                <span className="text-[11px] font-bold text-amber-200">Keys · المفاتيح</span>
              </div>
            )}

            {claimedReward.hearts > 0 && (
              <div className="rounded-2xl bg-rose-500/20 border border-rose-400/50 p-3 flex flex-col items-center">
                <Heart className="w-6 h-6 text-rose-400 fill-rose-400 mb-1" />
                <span className="font-display text-xl font-extrabold text-white tabular-nums">
                  +{claimedReward.hearts.toLocaleString()}
                </span>
                <span className="text-[11px] font-bold text-rose-200">Hearts · القلوب</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              sound.playButton();
              onClose();
            }}
            className="mt-5 w-full min-h-[50px] rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 py-3 font-display text-lg font-extrabold text-slate-950 shadow-lg active:scale-[0.98]"
          >
            Awesome!
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-[380px] rounded-3xl bg-[#1C1036]/95 border border-pink-400/40 p-5 shadow-2xl text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-500 to-amber-500 flex items-center justify-center text-white shadow-lg">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-extrabold">حزمة هدية</h2>
              <p className="text-xs text-purple-200/80">Gift Pack Redemption</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/10 active:scale-95"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleClaim} className="mt-4">
          <label className="block text-xs font-bold text-purple-100/90 mb-1.5">
            Paste or enter your Gift Code (AMIR-...)
          </label>
          <input
            type="text"
            value={codeInput}
            onChange={(e) => {
              setCodeInput(e.target.value.toUpperCase());
              if (errorMsg) setErrorMsg(null);
            }}
            placeholder="AMIR-XXXX-XXXX"
            autoFocus
            className="w-full min-h-[48px] rounded-2xl bg-black/40 border border-white/20 px-3.5 py-2.5 text-base font-mono font-bold tracking-wider text-amber-300 placeholder:text-purple-200/40 focus:outline-none focus:border-pink-400"
          />

          {errorMsg && (
            <p className="mt-2 text-xs font-bold text-rose-300">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={!codeInput.trim()}
            className="mt-4 w-full min-h-[50px] rounded-2xl bg-gradient-to-b from-pink-500 via-rose-500 to-amber-500 py-3 flex items-center justify-center gap-2 font-display text-lg font-extrabold text-white shadow-[0_6px_22px_rgba(244,63,94,0.45)] disabled:opacity-45 active:scale-[0.98]"
          >
            <Sparkles className="w-5 h-5" />
            <span>استلام الهدية</span>
          </button>
        </form>
      </div>
    </div>
  );
};
