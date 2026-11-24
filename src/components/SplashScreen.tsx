import React, { useEffect, useState } from 'react';
import { Play, Settings } from 'lucide-react';
import { sound } from '../game/sound';
import { CandyPiece } from './CandyPiece';
import { PWAInstallButton } from './PWAInstallButton';

interface SplashScreenProps {
  unlockedLevel: number;
  onPlay: () => void;
  onOpenSettings: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  unlockedLevel,
  onPlay,
  onOpenSettings,
}) => {
  const [progressPct, setProgressPct] = useState(0);
  const ready = progressPct >= 100;

  useEffect(() => {
    const start = performance.now();
    const duration = 1850;
    let raf = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgressPct(pct);
      if (pct < 100) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const floatingCandies = [
    { id: 'fl_1', row: 0, col: 0, color: 'red' as const, special: 'none' as const },
    { id: 'fl_2', row: 0, col: 1, color: 'orange' as const, special: 'none' as const },
    { id: 'fl_3', row: 0, col: 2, color: 'yellow' as const, special: 'none' as const },
    { id: 'fl_4', row: 0, col: 3, color: 'green' as const, special: 'none' as const },
    { id: 'fl_5', row: 0, col: 4, color: 'blue' as const, special: 'none' as const },
    { id: 'fl_6', row: 0, col: 5, color: 'purple' as const, special: 'none' as const },
  ];

  return (
    <div className="relative flex-1 w-full h-full overflow-hidden flex flex-col justify-between">
      {/* Illustrated Candy Kingdom SVG Landscape */}
      <svg
        viewBox="0 0 400 720"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7DD3FC" />
            <stop offset="48%" stopColor="#FBCFE8" />
            <stop offset="100%" stopColor="#FDE68A" />
          </linearGradient>
          <linearGradient id="hillBack" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F472B6" />
            <stop offset="100%" stopColor="#BE185D" />
          </linearGradient>
          <linearGradient id="chocoHill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7C3F28" />
            <stop offset="100%" stopColor="#3E1B0E" />
          </linearGradient>
          <linearGradient id="frostingCap" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#FCE7F3" />
          </linearGradient>
        </defs>

        {/* Pastel Pink & Sky-Blue Sky */}
        <rect width="400" height="720" fill="url(#skyGrad)" />

        {/* Cotton Candy Clouds */}
        <g fill="#FFFFFF" opacity="0.88">
          <circle cx="65" cy="115" r="28" />
          <circle cx="95" cy="108" r="34" />
          <circle cx="128" cy="118" r="24" />
          <circle cx="290" cy="150" r="26" />
          <circle cx="322" cy="142" r="32" />
          <circle cx="352" cy="154" r="22" />
        </g>

        {/* Distant Pink Candy Hills */}
        <path d="M-20 510 Q100 410 230 500 T420 480 L420 720 L-20 720 Z" fill="url(#hillBack)" />

        {/* Lollipop Trees */}
        <g>
          <rect x="52" y="420" width="8" height="95" rx="4" fill="#FFFBEB" />
          <circle cx="56" cy="410" r="28" fill="#EF4444" stroke="#FFFFFF" strokeWidth="3" />
          <path d="M56 410 m-3 0 a3 3 0 1 1 6 0 a8 8 0 1 1 -16 0 a14 14 0 1 1 28 0" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />

          <rect x="336" y="405" width="8" height="105" rx="4" fill="#FFFBEB" />
          <circle cx="340" cy="395" r="30" fill="#0EA5E9" stroke="#FFFFFF" strokeWidth="3" />
          <path d="M340 395 m-3 0 a3 3 0 1 1 6 0 a9 9 0 1 1 -18 0 a16 16 0 1 1 32 0" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />

          <rect x="115" y="465" width="6" height="65" rx="3" fill="#FFFBEB" />
          <circle cx="118" cy="456" r="20" fill="#10B981" stroke="#FFFFFF" strokeWidth="2.5" />
        </g>

        {/* Foreground Rich Chocolate Hills with Swirled Frosting Caps */}
        <path d="M-20 560 Q110 490 220 560 T420 545 L420 720 L-20 720 Z" fill="url(#chocoHill)" />
        <path
          d="M-20 560 Q110 490 220 560 T420 545 L420 572 Q365 588 330 565 Q280 545 240 578 Q195 592 150 564 Q95 538 45 572 Q10 588 -20 574 Z"
          fill="url(#frostingCap)"
        />
      </svg>

      {/* Top Corner Controls */}
      <div className="relative z-10 px-4 pt-4 flex items-center justify-end gap-2">
        <PWAInstallButton compact />
        <button
          type="button"
          onClick={() => {
            sound.unlock();
            sound.playButton();
            onOpenSettings();
          }}
          className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-950/45 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-lg active:scale-95"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Center Candy-Cane Framed 3D Embossed Candy Amir Emblem */}
      <div className="relative z-10 px-5 flex flex-col items-center text-center">
        <div className="relative rounded-[28px] p-1.5 bg-[repeating-linear-gradient(45deg,#F43F5E,#F43F5E_10px,#FFFFFF_10px,#FFFFFF_20px)] shadow-[0_14px_34px_rgba(157,23,77,0.45)]">
          <div className="rounded-[22px] px-7 py-5 bg-gradient-to-b from-[#FF5D9E] via-[#E11D48] to-[#9D174D] border-2 border-amber-200 shadow-inner">
            {/* Sparkle accents */}
            <span className="absolute -top-2.5 -left-2 text-amber-200 text-xl animate-pulse">✦</span>
            <span className="absolute -bottom-2.5 -right-2 text-amber-200 text-xl animate-pulse">✦</span>

            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-amber-200">
              Sweet Kingdom
            </p>
            <h1 className="font-display text-[clamp(2.4rem,10.5vw,3.3rem)] font-extrabold leading-none tracking-tight text-white drop-shadow-[0_4px_0_#701A3C]">
              Candy Amir
            </h1>
            <p className="mt-1.5 text-xs font-bold text-pink-100/95">
              250 Unique Levels · Match-3 Adventure
            </p>
          </div>
        </div>

        {/* Floating Classic 6-Candy Showcase */}
        <div className="grid grid-cols-6 gap-1.5 w-full max-w-[300px] mt-5 bg-slate-950/35 backdrop-blur-md rounded-2xl p-2 border border-white/25 shadow-lg">
          {floatingCandies.map((t) => (
            <div key={t.id} className="aspect-square">
              <CandyPiece tile={t} isSelected={false} isHinted={false} />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Pink-and-Gold Candy Loading Bar -> Bouncy Green PLAY Button */}
      <div className="relative z-10 px-6 pb-8 flex flex-col items-center gap-3">
        {!ready ? (
          <div className="w-full max-w-[300px]">
            <div className="flex items-center justify-between text-xs font-extrabold text-white drop-shadow mb-1.5 px-1">
              <span>Loading Kingdom...</span>
              <span className="tabular-nums">{progressPct}%</span>
            </div>
            <div className="h-5 w-full rounded-full bg-slate-950/60 border-2 border-amber-300/80 p-0.5 shadow-lg overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-400 via-amber-300 to-pink-500 transition-all duration-75"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              sound.unlock();
              sound.playButton();
              onPlay();
            }}
            className="w-full max-w-[280px] min-h-[58px] rounded-full bg-gradient-to-b from-emerald-300 via-emerald-500 to-emerald-700 border-2 border-white py-3.5 flex items-center justify-center gap-2.5 font-display text-2xl font-extrabold text-white shadow-[0_10px_28px_rgba(5,150,105,0.55)] animate-bounce active:scale-95 transition-transform"
          >
            <Play className="w-6 h-6 fill-white" />
            <span>PLAY</span>
          </button>
        )}

        <p className="text-xs font-bold text-white/90 drop-shadow">
          Level {unlockedLevel} / 250 · Developed by Amir Lamay • Made In Egypt
        </p>
      </div>
    </div>
  );
};
