import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Settings } from 'lucide-react';
import { sound } from '../game/sound';
import { CandyPiece } from './CandyPiece';
import { CandyPrincess } from './CandyPrincess';
import { PWAInstallButton } from './PWAInstallButton';

interface SplashScreenProps {
  unlockedLevel: number;
  skipLoading?: boolean;
  onPlay: () => void;
  onOpenSettings: () => void;
}

interface TouchSparkleBurst {
  id: number;
  x: number;
  y: number;
  particles: Array<{
    tx: string;
    ty: string;
    color: string;
    size: number;
    isStar: boolean;
  }>;
}

const BURST_COLORS = ['#FDE047', '#FB7185', '#38BDF8', '#4ADE80', '#F472B6', '#FFFFFF'];

export const SplashScreen: React.FC<SplashScreenProps> = ({
  unlockedLevel,
  skipLoading = false,
  onPlay,
  onOpenSettings,
}) => {
  const [progressPct, setProgressPct] = useState(skipLoading ? 100 : 0);
  const [spinBoosted, setSpinBoosted] = useState(false);
  const [bounceKey, setBounceKey] = useState(0);
  const [sparkleBursts, setSparkleBursts] = useState<TouchSparkleBurst[]>([]);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const spinTimerRef = useRef<number | null>(null);
  const burstIdRef = useRef(1);
  const lastSwipeBurstAtRef = useRef(0);
  const isPointerDownRef = useRef(false);

  const ready = progressPct >= 100;

  useEffect(() => {
    if (skipLoading) {
      setProgressPct(100);
      return;
    }
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
  }, [skipLoading]);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) window.clearTimeout(spinTimerRef.current);
    };
  }, []);

  const triggerSkyInteraction = useCallback((clientX: number, clientY: number, withBounce: boolean) => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Spin & Bounce Lollipops
    setSpinBoosted(true);
    if (withBounce) {
      setBounceKey((k) => k + 1);
    }
    if (spinTimerRef.current) window.clearTimeout(spinTimerRef.current);
    spinTimerRef.current = window.setTimeout(() => {
      setSpinBoosted(false);
    }, 1150);

    // Spawn Candy Sparkle Burst at exact touch point
    const id = burstIdRef.current++;
    const count = withBounce ? 11 : 7;
    const particles = Array.from({ length: count }, (_, idx) => {
      const angle = (idx / count) * Math.PI * 2 + Math.random() * 0.4;
      const dist = (withBounce ? 34 : 24) + Math.random() * 38;
      return {
        tx: `${Math.round(Math.cos(angle) * dist)}px`,
        ty: `${Math.round(Math.sin(angle) * dist)}px`,
        color: BURST_COLORS[(id + idx) % BURST_COLORS.length],
        size: 6 + (idx % 4) * 2,
        isStar: idx % 2 === 0,
      };
    });

    setSparkleBursts((prev) => [...prev.slice(-10), { id, x, y, particles }]);
    window.setTimeout(() => {
      setSparkleBursts((prev) => prev.filter((b) => b.id !== id));
    }, 520);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Skip burst if tapping interactive controls
    if ((e.target as HTMLElement).closest('button')) return;
    isPointerDownRef.current = true;
    lastSwipeBurstAtRef.current = performance.now();
    sound.unlock();
    sound.playSwap();
    triggerSkyInteraction(e.clientX, e.clientY, true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    const now = performance.now();
    if (now - lastSwipeBurstAtRef.current < 90) return;
    lastSwipeBurstAtRef.current = now;
    triggerSkyInteraction(e.clientX, e.clientY, false);
  };

  const handlePointerUp = () => {
    isPointerDownRef.current = false;
  };

  const twinkleStars = useMemo(
    () => [
      { cx: 52, cy: 68, r: 5.5, dur: '2.4s', delay: '0s' },
      { cx: 148, cy: 48, r: 4.5, dur: '3.1s', delay: '0.6s' },
      { cx: 245, cy: 76, r: 6, dur: '2.7s', delay: '1.1s' },
      { cx: 345, cy: 62, r: 5, dur: '2.2s', delay: '0.3s' },
      { cx: 92, cy: 175, r: 4, dur: '2.9s', delay: '0.9s' },
      { cx: 308, cy: 205, r: 4.5, dur: '2.5s', delay: '1.4s' },
    ],
    []
  );

  const sugarParticles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        left: `${6 + ((i * 7) % 88)}%`,
        top: `${22 + ((i * 13) % 58)}%`,
        size: 3 + (i % 3) * 2,
        dur: `${4.2 + (i % 5) * 0.7}s`,
        delay: `${(i % 6) * 0.6}s`,
        sx: `${(i % 2 === 0 ? 1 : -1) * (8 + (i % 4) * 5)}px`,
        color: i % 3 === 0 ? '#FEF08A' : i % 3 === 1 ? '#FBCFE8' : '#FFFFFF',
      })),
    []
  );

  const floatingCandies = [
    { id: 'fl_1', row: 0, col: 0, color: 'red' as const, special: 'none' as const },
    { id: 'fl_2', row: 0, col: 1, color: 'orange' as const, special: 'none' as const },
    { id: 'fl_3', row: 0, col: 2, color: 'yellow' as const, special: 'none' as const },
    { id: 'fl_4', row: 0, col: 3, color: 'green' as const, special: 'none' as const },
    { id: 'fl_5', row: 0, col: 4, color: 'blue' as const, special: 'none' as const },
    { id: 'fl_6', row: 0, col: 5, color: 'purple' as const, special: 'none' as const },
  ];

  return (
    <div
      ref={rootRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative flex-1 w-full h-full overflow-hidden flex flex-col justify-between"
    >
      {/* Interactive Illustrated Candy Kingdom SVG Landscape */}
      <svg
        viewBox="0 0 400 720"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#67C8FF" />
            <stop offset="46%" stopColor="#FBCFE8" />
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

        {/* Twinkling Golden Sparkle Stars */}
        {twinkleStars.map((st, i) => (
          <g
            key={i}
            className="animate-twinkle-star"
            style={
              {
                transformBox: 'view-box',
                transformOrigin: `${st.cx}px ${st.cy}px`,
                animationDelay: st.delay,
                '--twinkle-dur': st.dur,
              } as React.CSSProperties
            }
          >
            <path
              d={`M${st.cx} ${st.cy - st.r * 1.7} L${st.cx + st.r * 0.45} ${st.cy - st.r * 0.45} L${st.cx + st.r * 1.7} ${st.cy} L${st.cx + st.r * 0.45} ${st.cy + st.r * 0.45} L${st.cx} ${st.cy + st.r * 1.7} L${st.cx - st.r * 0.45} ${st.cy + st.r * 0.45} L${st.cx - st.r * 1.7} ${st.cy} L${st.cx - st.r * 0.45} ${st.cy - st.r * 0.45} Z`}
              fill="#FEF08A"
            />
          </g>
        ))}

        {/* Drifting Fluffy Cotton-Candy Clouds */}
        <g fill="#FFFFFF" opacity="0.9" className="animate-cloud-drift">
          <circle cx="65" cy="112" r="28" />
          <circle cx="95" cy="105" r="34" />
          <circle cx="128" cy="115" r="24" />
          <ellipse cx="95" cy="124" rx="48" ry="16" />
        </g>

        <g fill="#FFFFFF" opacity="0.86" className="animate-cloud-drift-slow">
          <circle cx="290" cy="145" r="26" />
          <circle cx="322" cy="137" r="32" />
          <circle cx="352" cy="149" r="22" />
          <ellipse cx="322" cy="156" rx="46" ry="15" />
        </g>

        {/* Distant Pink Candy Hills */}
        <path d="M-20 510 Q100 410 230 500 T420 480 L420 720 L-20 720 Z" fill="url(#hillBack)" />

        {/* Interactive Swaying & Spinning Lollipop Trees */}
        {/* Left Giant Red Swirl Lollipop */}
        <g
          className="animate-lollipop-sway"
          style={{ transformBox: 'view-box', transformOrigin: '56px 525px' }}
        >
          <g
            key={`bounce-l1-${bounceKey}`}
            className={bounceKey > 0 ? 'animate-lollipop-bounce' : ''}
            style={{ transformBox: 'view-box', transformOrigin: '56px 510px' }}
          >
            <rect x="52" y="420" width="8" height="105" rx="4" fill="#FFFBEB" />
            <g
              className={spinBoosted ? 'animate-lollipop-spin-fast' : 'animate-lollipop-spin-slow'}
              style={{ transformBox: 'view-box', transformOrigin: '56px 408px' }}
            >
              <circle cx="56" cy="408" r="30" fill="#EF4444" stroke="#FFFFFF" strokeWidth="3.2" />
              <path
                d="M56 408 m-3 0 a3 3 0 1 1 6 0 a8 8 0 1 1 -16 0 a14 14 0 1 1 28 0 a21 21 0 1 1 -42 0"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="3.6"
                strokeLinecap="round"
              />
            </g>
            <ellipse cx="46" cy="395" rx="7" ry="4" transform="rotate(-25 46 395)" fill="#FFFFFF" opacity="0.55" />
          </g>
        </g>

        {/* Left-Mid Emerald Peppermint Tree */}
        <g
          className="animate-lollipop-sway"
          style={{
            transformBox: 'view-box',
            transformOrigin: '118px 535px',
            animationDelay: '-1.6s',
          }}
        >
          <g
            key={`bounce-l2-${bounceKey}`}
            className={bounceKey > 0 ? 'animate-lollipop-bounce' : ''}
            style={{ transformBox: 'view-box', transformOrigin: '118px 525px' }}
          >
            <rect x="115" y="464" width="6" height="72" rx="3" fill="#FFFBEB" />
            <g
              className={spinBoosted ? 'animate-lollipop-spin-fast' : 'animate-lollipop-spin-slow'}
              style={{ transformBox: 'view-box', transformOrigin: '118px 456px' }}
            >
              <circle cx="118" cy="456" r="21" fill="#10B981" stroke="#FFFFFF" strokeWidth="2.8" />
              <path
                d="M118 456 m-2 0 a2 2 0 1 1 4 0 a6 6 0 1 1 -12 0 a11 11 0 1 1 22 0"
                fill="none"
                stroke="#D1FAE5"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            </g>
          </g>
        </g>

        {/* Right Giant Sapphire Swirl Lollipop */}
        <g
          className="animate-lollipop-sway"
          style={{
            transformBox: 'view-box',
            transformOrigin: '340px 515px',
            animationDelay: '-2.4s',
          }}
        >
          <g
            key={`bounce-l3-${bounceKey}`}
            className={bounceKey > 0 ? 'animate-lollipop-bounce' : ''}
            style={{ transformBox: 'view-box', transformOrigin: '340px 500px' }}
          >
            <rect x="336" y="402" width="8" height="114" rx="4" fill="#FFFBEB" />
            <g
              className={spinBoosted ? 'animate-lollipop-spin-fast' : 'animate-lollipop-spin-slow'}
              style={{ transformBox: 'view-box', transformOrigin: '340px 390px' }}
            >
              <circle cx="340" cy="390" r="32" fill="#0EA5E9" stroke="#FFFFFF" strokeWidth="3.2" />
              <path
                d="M340 390 m-3 0 a3 3 0 1 1 6 0 a9 9 0 1 1 -18 0 a16 16 0 1 1 32 0 a23 23 0 1 1 -46 0"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="3.6"
                strokeLinecap="round"
              />
            </g>
            <ellipse cx="329" cy="376" rx="8" ry="4.5" transform="rotate(-25 329 376)" fill="#FFFFFF" opacity="0.55" />
          </g>
        </g>

        {/* Foreground Rich Chocolate Hills with Swirled Frosting Caps */}
        <path d="M-20 560 Q110 490 220 560 T420 545 L420 720 L-20 720 Z" fill="url(#chocoHill)" />
        <path
          d="M-20 560 Q110 490 220 560 T420 545 L420 572 Q365 588 330 565 Q280 545 240 578 Q195 592 150 564 Q95 538 45 572 Q10 588 -20 574 Z"
          fill="url(#frostingCap)"
        />
      </svg>

      {/* Subtle Floating Sugar Particles Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-[5]">
        {sugarParticles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full animate-sugar-rise"
            style={
              {
                left: p.left,
                top: p.top,
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: p.color,
                boxShadow: `0 0 8px ${p.color}`,
                animationDelay: p.delay,
                '--sugar-dur': p.dur,
                '--sx': p.sx,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Interactive Touch/Swipe Candy Sparkle Bursts */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
        {sparkleBursts.map((burst) => (
          <div
            key={burst.id}
            className="absolute"
            style={{ left: `${burst.x}px`, top: `${burst.y}px` }}
          >
            {burst.particles.map((pt, i) => (
              <span
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2 animate-particle-burst"
                style={
                  {
                    width: `${pt.size}px`,
                    height: `${pt.size}px`,
                    backgroundColor: pt.isStar ? 'transparent' : pt.color,
                    borderRadius: pt.isStar ? '0' : '9999px',
                    color: pt.color,
                    boxShadow: pt.isStar ? 'none' : `0 0 8px ${pt.color}`,
                    '--tx': pt.tx,
                    '--ty': pt.ty,
                  } as React.CSSProperties
                }
              >
                {pt.isStar && (
                  <svg viewBox="0 0 20 20" className="w-full h-full">
                    <path
                      d="M10 0 L12.6 7.4 L20 10 L12.6 12.6 L10 20 L7.4 12.6 L0 10 L7.4 7.4 Z"
                      fill={pt.color}
                    />
                  </svg>
                )}
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* Animated Fairytale Candy Princess Character (Right Edge Loop) */}
      <CandyPrincess />

      {/* Top Corner Controls */}
      <div className="relative z-30 px-4 pt-4 flex items-center justify-end gap-2">
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

      {/* Center Candy-Cane Framed 3D Embossed Candy Amir Emblem (kept clear of right-side princess) */}
      <div className="relative z-20 px-5 mt-1 mb-auto pt-3 flex flex-col items-center text-center pointer-events-none">
        <div className="relative rounded-[28px] p-1.5 bg-[repeating-linear-gradient(45deg,#F43F5E,#F43F5E_10px,#FFFFFF_10px,#FFFFFF_20px)] shadow-[0_14px_34px_rgba(157,23,77,0.45)]">
          <div className="rounded-[22px] px-6 py-4 sm:px-7 sm:py-5 bg-gradient-to-b from-[#FF5D9E] via-[#E11D48] to-[#9D174D] border-2 border-amber-200 shadow-inner">
            <span className="absolute -top-2.5 -left-2 text-amber-200 text-xl animate-pulse">✦</span>
            <span className="absolute -bottom-2.5 -right-2 text-amber-200 text-xl animate-pulse">✦</span>

            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-amber-200">
              Sweet Kingdom
            </p>
            <h1 className="font-display text-[clamp(2.3rem,10vw,3.2rem)] font-extrabold leading-none tracking-tight text-white drop-shadow-[0_4px_0_#701A3C]">
              Candy Amir
            </h1>
            <p className="mt-1.5 text-xs font-bold text-pink-100/95">
              250 Unique Levels · Match-3 Adventure
            </p>
          </div>
        </div>

        {/* Floating Classic 6-Candy Showcase */}
        <div className="grid grid-cols-6 gap-1.5 w-full max-w-[275px] mt-4 bg-slate-950/35 backdrop-blur-md rounded-2xl p-2 border border-white/25 shadow-lg">
          {floatingCandies.map((t) => (
            <div key={t.id} className="aspect-square">
              <CandyPiece tile={t} isSelected={false} isHinted={false} />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Pink-and-Gold Candy Loading Bar -> Bouncy Green PLAY Button */}
      <div className="relative z-30 px-6 pb-7 flex flex-col items-center gap-3">
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

        <p className="text-xs font-bold text-white/90 drop-shadow text-center">
          Level {unlockedLevel} / 250 · Developed by Amir Lamay • Made In Egypt
        </p>
      </div>
    </div>
  );
};
