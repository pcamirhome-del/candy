import React, { useMemo, useState } from 'react';
import {
  Banknote,
  ClipboardCheck,
  Copy,
  Gem,
  Heart,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { generateGiftCode } from '../game/giftCodes';
import { sound } from '../game/sound';

interface AdminGiftModalProps {
  onClose: () => void;
}

export const AdminGiftModal: React.FC<AdminGiftModalProps> = ({ onClose }) => {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [passError, setPassError] = useState('');

  // Partial or full reward inputs (blank/0 allowed)
  const [cashStr, setCashStr] = useState('');
  const [keysStr, setKeysStr] = useState('');
  const [gemsStr, setGemsStr] = useState('');
  const [heartsStr, setHeartsStr] = useState('');
  const [nonce, setNonce] = useState(() => Math.floor(Math.random() * 65536));
  const [copied, setCopied] = useState(false);

  const parseNum = (s: string) => {
    const n = parseInt(s.replace(/[^0-9]/g, ''), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const payload = useMemo(
    () => ({
      cash: parseNum(cashStr),
      keys: parseNum(keysStr),
      gems: parseNum(gemsStr),
      hearts: parseNum(heartsStr),
    }),
    [cashStr, keysStr, gemsStr, heartsStr]
  );

  const generatedCode = useMemo(() => {
    return generateGiftCode(payload, nonce);
  }, [payload, nonce]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playButton();
    if (password.trim().toLowerCase() === 'admin') {
      setUnlocked(true);
      setPassError('');
    } else {
      sound.playInvalidSwap();
      setPassError('Incorrect admin password.');
    }
  };

  const handleCopy = async () => {
    if (!generatedCode) return;
    sound.playButton();
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const sanitizeNumericInput = (val: string) => val.replace(/[^0-9]/g, '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-[400px] max-h-[90dvh] overflow-y-auto no-scrollbar rounded-3xl bg-[#1C1036]/95 border border-white/20 p-5 shadow-2xl text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-extrabold leading-tight">
                Admin Panel
              </h2>
              <p className="text-[11px] text-purple-200/75">
                {unlocked ? 'Instant Gift Code Generator' : 'Protected Access'}
              </p>
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

        {!unlocked ? (
          <form onSubmit={handleUnlock} className="mt-5">
            <label className="block text-xs font-bold text-purple-100/90 mb-1.5">
              Enter Admin Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-purple-300/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passError) setPassError('');
                }}
                placeholder="Password..."
                autoFocus
                className="w-full min-h-[48px] rounded-2xl bg-black/40 border border-white/20 pl-10 pr-4 py-2.5 text-base text-white placeholder:text-purple-200/45 focus:outline-none focus:border-amber-400"
              />
            </div>
            {passError && (
              <p className="mt-2 text-xs font-bold text-rose-300">{passError}</p>
            )}
            <button
              type="submit"
              className="mt-4 w-full min-h-[48px] rounded-2xl bg-gradient-to-b from-amber-400 to-orange-500 py-2.5 font-display text-base font-extrabold text-slate-950 shadow-lg active:scale-[0.98]"
            >
              Unlock Admin Generator
            </button>
          </form>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {/* Cash / Money Prize (المبلغ) */}
            <div>
              <label className="flex items-center justify-between text-xs font-bold text-emerald-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <Banknote className="w-4 h-4" /> Cash / Money Prize
                </span>
                <span>المبلغ</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={cashStr}
                onChange={(e) => setCashStr(sanitizeNumericInput(e.target.value))}
                placeholder="0 (optional)"
                className="w-full min-h-[46px] rounded-2xl bg-black/40 border border-white/15 px-3.5 py-2 text-base font-bold text-white tabular-nums placeholder:text-purple-200/40 focus:outline-none focus:border-emerald-400"
              />
            </div>

            {/* Live Generated Gift Code Box directly below Cash input */}
            <div className="rounded-2xl bg-gradient-to-br from-amber-500/15 to-pink-500/15 border border-amber-300/40 p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-amber-200 uppercase tracking-wide">
                  Generated Gift Code
                </span>
                <button
                  type="button"
                  onClick={() => {
                    sound.playButton();
                    setNonce(Math.floor(Math.random() * 65536));
                  }}
                  className="text-xs font-bold text-purple-200 hover:text-white flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> New ID
                </button>
              </div>

              <div className="rounded-xl bg-black/50 border border-white/15 px-3 py-2.5 text-center">
                <p className="font-mono text-sm font-extrabold tracking-wider text-amber-300 break-all select-all">
                  {generatedCode || 'Enter any reward amount > 0'}
                </p>
              </div>

              <button
                type="button"
                disabled={!generatedCode}
                onClick={handleCopy}
                className="mt-2.5 w-full min-h-[44px] rounded-xl bg-gradient-to-b from-amber-400 to-orange-500 py-2 flex items-center justify-center gap-2 text-sm font-extrabold text-slate-950 disabled:opacity-40 active:scale-[0.98]"
              >
                {copied ? (
                  <>
                    <ClipboardCheck className="w-4 h-4" />
                    <span>Code Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            {/* Keys, Gems, Hearts Optional Numeric Inputs */}
            <div className="grid grid-cols-1 gap-2.5">
              <div>
                <label className="flex items-center justify-between text-xs font-bold text-amber-300 mb-1">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4" /> Keys (Optional)
                  </span>
                  <span>المفاتيح</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={keysStr}
                  onChange={(e) => setKeysStr(sanitizeNumericInput(e.target.value))}
                  placeholder="0 (optional)"
                  className="w-full min-h-[46px] rounded-2xl bg-black/40 border border-white/15 px-3.5 py-2 text-base font-bold text-white tabular-nums placeholder:text-purple-200/40 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="flex items-center justify-between text-xs font-bold text-cyan-300 mb-1">
                    <span className="flex items-center gap-1">
                      <Gem className="w-3.5 h-3.5" /> Gems
                    </span>
                    <span>الجواهر</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={gemsStr}
                    onChange={(e) => setGemsStr(sanitizeNumericInput(e.target.value))}
                    placeholder="0"
                    className="w-full min-h-[46px] rounded-2xl bg-black/40 border border-white/15 px-3 py-2 text-base font-bold text-white tabular-nums placeholder:text-purple-200/40 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="flex items-center justify-between text-xs font-bold text-rose-300 mb-1">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5" /> Hearts
                    </span>
                    <span>القلوب</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={heartsStr}
                    onChange={(e) => setHeartsStr(sanitizeNumericInput(e.target.value))}
                    placeholder="0"
                    className="w-full min-h-[46px] rounded-2xl bg-black/40 border border-white/15 px-3 py-2 text-base font-bold text-white tabular-nums placeholder:text-purple-200/40 focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
