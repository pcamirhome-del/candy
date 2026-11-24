import React, { useEffect, useRef, useState } from 'react';

interface KissHeart {
  id: number;
  size: number;
  hx: string;
  hy: string;
  hx2: string;
  hy2: string;
  color: string;
}

const CYCLE_MS = 10500; // 8.3s active choreography + 2.2s pause

const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const easeInCubic = (x: number) => x * x * x;

export const CandyPrincess: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bodyBobRef = useRef<SVGGElement | null>(null);
  const waveArmRef = useRef<SVGGElement | null>(null);
  const lollipopHandRef = useRef<SVGGElement | null>(null);

  const [mouthMode, setMouthMode] = useState<'smile' | 'kiss'>('smile');
  const [isWinking, setIsWinking] = useState(false);
  const [kissHearts, setKissHearts] = useState<KissHeart[]>([]);

  const mouthRef = useRef<'smile' | 'kiss'>('smile');
  const winkRef = useRef(false);
  const lastWaveFiredRef = useRef(-1);
  const heartIdRef = useRef(1);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    let prevCycle = -1;

    const spawnHearts = (count: number) => {
      const palette = ['#FB7185', '#F43F5E', '#EC4899', '#FDA4AF'];
      const created: KissHeart[] = Array.from({ length: count }, (_, idx) => {
        const id = heartIdRef.current++;
        const spreadX = -115 - Math.random() * 70 - idx * 14;
        const spreadY = -55 - Math.random() * 55;
        return {
          id,
          size: 16 + Math.round(Math.random() * 11),
          hx: `${Math.round(spreadX)}px`,
          hy: `${Math.round(spreadY)}px`,
          hx2: `${Math.round(spreadX - 75)}px`,
          hy2: `${Math.round(spreadY - 50)}px`,
          color: palette[(id + idx) % palette.length],
        };
      });
      setKissHearts((prev) => [...prev.slice(-10), ...created]);
      window.setTimeout(() => {
        const ids = new Set(created.map((h) => h.id));
        setKissHearts((prev) => prev.filter((h) => !ids.has(h.id)));
      }, 2250);
    };

    const animate = (now: number) => {
      const elapsed = now - start;
      const cycle = Math.floor(elapsed / CYCLE_MS);
      const t = elapsed % CYCLE_MS;

      if (cycle !== prevCycle) {
        prevCycle = cycle;
        lastWaveFiredRef.current = -1;
      }

      // 1. Horizontal Slide + Opacity choreography
      let txPct = 0;
      let opacity = 1;
      let bobY = Math.sin(elapsed / 320) * 2.2;

      if (t < 1100) {
        // Entrance from right edge
        const p = easeOutCubic(t / 1100);
        txPct = (1 - p) * 118;
        opacity = Math.min(1, p * 1.4);
        bobY = Math.sin(p * Math.PI * 2) * -4;
      } else if (t < 7100) {
        txPct = 0;
        opacity = 1;
      } else if (t < 8300) {
        // Exit back off right edge
        const p = easeInCubic((t - 7100) / 1200);
        txPct = p * 120;
        opacity = Math.max(0, 1 - p * 1.1);
      } else {
        // 2.2s pause off-screen
        txPct = 120;
        opacity = 0;
      }

      if (containerRef.current) {
        containerRef.current.style.transform = `translate3d(${txPct.toFixed(2)}%, 0, 0)`;
        containerRef.current.style.opacity = opacity.toFixed(3);
      }

      if (bodyBobRef.current) {
        bodyBobRef.current.setAttribute('transform', `translate(0, ${bobY.toFixed(2)})`);
      }

      // 2. Waving / Blow-Kiss Arm Choreography (shoulder pivot at 58, 126)
      let armAngle = 0;
      let armTx = 0;
      let armTy = 0;

      if (t >= 1100 && t < 3300) {
        // Warm Wave Hello
        armAngle = Math.sin(((t - 1100) / 2200) * Math.PI * 6) * 24 - 8;
      } else if (t >= 3300 && t < 5800) {
        // Bring hand up to lips, blow kiss, extend forward
        if (t < 3950) {
          const p = easeOutCubic((t - 3300) / 650);
          armAngle = p * 44;
          armTx = p * 8;
          armTy = p * 14;
        } else if (t < 4750) {
          const pulse = Math.sin(((t - 3950) / 800) * Math.PI);
          armAngle = 44 - pulse * 12;
          armTx = 8 - pulse * 9;
          armTy = 14 - pulse * 4;
        } else {
          const p = easeOutCubic((t - 4750) / 1050);
          armAngle = 44 * (1 - p) - 18 * p;
          armTx = 8 * (1 - p);
          armTy = 14 * (1 - p);
        }
      } else if (t >= 5800 && t < 8300) {
        // Wave Goodbye
        armAngle = Math.sin(((t - 5800) / 2500) * Math.PI * 6) * 25 - 10;
      }

      if (waveArmRef.current) {
        waveArmRef.current.setAttribute(
          'transform',
          `translate(${armTx.toFixed(2)}, ${armTy.toFixed(2)}) rotate(${armAngle.toFixed(2)} 62 126)`
        );
      }

      // Lollipop hand gentle sway (pivot at 112, 126)
      const lolliAngle = Math.sin(elapsed / 420) * 6;
      if (lollipopHandRef.current) {
        lollipopHandRef.current.setAttribute('transform', `rotate(${lolliAngle.toFixed(2)} 112 126)`);
      }

      // 3. Facial Expression & Kiss Heart Emitters
      const nextMouth: 'smile' | 'kiss' = t >= 3600 && t <= 5150 ? 'kiss' : 'smile';
      if (nextMouth !== mouthRef.current) {
        mouthRef.current = nextMouth;
        setMouthMode(nextMouth);
      }

      const nextWink = t >= 3950 && t <= 4750;
      if (nextWink !== winkRef.current) {
        winkRef.current = nextWink;
        setIsWinking(nextWink);
      }

      if (t >= 4000 && lastWaveFiredRef.current < 0) {
        lastWaveFiredRef.current = 0;
        spawnHearts(2);
      } else if (t >= 4350 && lastWaveFiredRef.current < 1) {
        lastWaveFiredRef.current = 1;
        spawnHearts(2);
      } else if (t >= 4700 && lastWaveFiredRef.current < 2) {
        lastWaveFiredRef.current = 2;
        spawnHearts(2);
      }

      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="pointer-events-none absolute right-0 z-20"
      style={{
        bottom: 'clamp(124px, 18.5dvh, 168px)',
        width: 'clamp(112px, 30vw, 150px)',
      }}
      aria-hidden="true"
    >
      {/* Floating Glowing Hearts Blown Toward Center */}
      <div className="absolute left-[44%] top-[38%] pointer-events-none z-30">
        {kissHearts.map((h) => (
          <svg
            key={h.id}
            viewBox="0 0 24 24"
            className="absolute animate-kiss-heart drop-shadow-[0_0_8px_rgba(244,63,94,0.85)]"
            style={
              {
                width: `${h.size}px`,
                height: `${h.size}px`,
                '--hx': h.hx,
                '--hy': h.hy,
                '--hx2': h.hx2,
                '--hy2': h.hy2,
              } as React.CSSProperties
            }
          >
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              fill={h.color}
              stroke="#FFE4E6"
              strokeWidth="1.2"
            />
          </svg>
        ))}
      </div>

      {/* Princess Character Wrapper */}
      <div
        ref={containerRef}
        className="w-full will-change-transform"
        style={{ transform: 'translate3d(118%, 0, 0)', opacity: 0 }}
      >
        <svg
          viewBox="0 0 170 225"
          className="w-full h-auto drop-shadow-[0_10px_18px_rgba(88,28,135,0.45)] overflow-visible"
        >
          <defs>
            <linearGradient id="princessHair" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9D4E2B" />
              <stop offset="55%" stopColor="#7C2D12" />
              <stop offset="100%" stopColor="#451A03" />
            </linearGradient>
            <linearGradient id="princessSkin" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFE5D4" />
              <stop offset="100%" stopColor="#FBCAB0" />
            </linearGradient>
            <linearGradient id="dressPink" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F9A8D4" />
              <stop offset="50%" stopColor="#EC4899" />
              <stop offset="100%" stopColor="#BE185D" />
            </linearGradient>
            <linearGradient id="goldTrim" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="55%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            <linearGradient id="rainbowLolli" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FB7185" />
              <stop offset="28%" stopColor="#FBBF24" />
              <stop offset="56%" stopColor="#34D399" />
              <stop offset="80%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#C084FC" />
            </linearGradient>
          </defs>

          <g ref={bodyBobRef}>
            {/* Back Hair Flowing Locks */}
            <path
              d="M52 58 C34 78, 34 114, 46 132 C56 126, 62 118, 66 105 Z"
              fill="url(#princessHair)"
            />
            <path
              d="M118 58 C138 78, 136 116, 124 134 C114 128, 108 118, 104 105 Z"
              fill="url(#princessHair)"
            />

            {/* Right Hand Holding Giant Rainbow Lollipop */}
            <g ref={lollipopHandRef}>
              {/* Stick */}
              <rect x="122" y="68" width="5" height="62" rx="2.5" fill="#FFFBEB" stroke="#E5E7EB" strokeWidth="1" />
              {/* Rainbow Swirl Lollipop Head */}
              <circle cx="124.5" cy="54" r="24" fill="url(#rainbowLolli)" stroke="#FFFFFF" strokeWidth="2.5" />
              <path
                d="M124.5 54 m-2 0 a2 2 0 1 1 4 0 a6 6 0 1 1 -12 0 a11 11 0 1 1 22 0 a16 16 0 1 1 -32 0"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2.8"
                strokeLinecap="round"
                opacity="0.92"
              />
              {/* Specular Candy Gloss */}
              <ellipse cx="116" cy="44" rx="6.5" ry="3.5" transform="rotate(-30 116 44)" fill="#FFFFFF" opacity="0.65" />

              {/* Arm & Hand holding stick */}
              <path
                d="M108 124 C118 128, 124 124, 125 112"
                fill="none"
                stroke="url(#princessSkin)"
                strokeWidth="9"
                strokeLinecap="round"
              />
              <circle cx="124.5" cy="111" r="6" fill="url(#princessSkin)" />
            </g>

            {/* Free Left Arm (Waving & Blowing Kiss) */}
            <g ref={waveArmRef}>
              <path
                d="M64 125 C46 118, 34 102, 29 82"
                fill="none"
                stroke="url(#princessSkin)"
                strokeWidth="9.5"
                strokeLinecap="round"
              />
              {/* Puffed Sleeve */}
              <circle cx="62" cy="123" r="10.5" fill="#F9A8D4" stroke="#FDE047" strokeWidth="1.5" />
              {/* Cute Hand */}
              <circle cx="28" cy="80" r="6.5" fill="url(#princessSkin)" />
              <circle cx="23" cy="76" r="2.2" fill="url(#princessSkin)" />
            </g>

            {/* Princess Gown Skirt */}
            <path
              d="M64 142 L106 142 C128 175, 134 205, 132 214 Q108 222 85 215 Q62 222 38 214 C36 205, 42 175, 64 142 Z"
              fill="url(#dressPink)"
              stroke="#FBCFE8"
              strokeWidth="1.8"
            />
            {/* Scalloped Pastel Overskirt & Gold Sash */}
            <path
              d="M64 142 Q85 162 106 142 Q115 165 98 173 Q85 164 72 173 Q55 165 64 142 Z"
              fill="#FCE7F3"
              opacity="0.88"
            />
            <path
              d="M62 140 Q85 148 108 140"
              fill="none"
              stroke="url(#goldTrim)"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            {/* Dress Pearl Sparkles */}
            <circle cx="70" cy="188" r="2.3" fill="#FEF08A" />
            <circle cx="96" cy="196" r="2.5" fill="#FEF08A" />
            <circle cx="84" cy="176" r="2" fill="#FFFFFF" />

            {/* Sweetheart Bodice */}
            <path
              d="M64 116 Q85 123 106 116 L108 141 Q85 147 62 141 Z"
              fill="#EC4899"
              stroke="#FDE047"
              strokeWidth="1.6"
            />
            {/* Right Puffed Sleeve */}
            <circle cx="108" cy="123" r="10.5" fill="#F9A8D4" stroke="#FDE047" strokeWidth="1.5" />

            {/* Neck */}
            <rect x="78" y="99" width="14" height="19" rx="6" fill="url(#princessSkin)" />
            {/* Gold Pearl Necklace */}
            <path d="M74 115 Q85 121 96 115" fill="none" stroke="#FDE047" strokeWidth="2.2" />
            <circle cx="85" cy="118" r="2.6" fill="#F43F5E" stroke="#FEF08A" strokeWidth="1" />

            {/* Head */}
            <ellipse cx="85" cy="74" rx="30" ry="31" fill="url(#princessSkin)" />

            {/* Rosy Fairytale Cheeks */}
            <ellipse cx="66" cy="83" rx="6.5" ry="3.8" fill="#FB7185" opacity="0.45" />
            <ellipse cx="104" cy="83" rx="6.5" ry="3.8" fill="#FB7185" opacity="0.45" />

            {/* Expressive Storybook Eyes */}
            {/* Left Eye (blinks or winks on blow-kiss) */}
            {isWinking ? (
              <path
                d="M66 74 Q72 69 78 74"
                fill="none"
                stroke="#451A03"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            ) : (
              <g className="animate-princess-blink" style={{ transformOrigin: '72px 74px' }}>
                <ellipse cx="72" cy="74" rx="5.5" ry="6.8" fill="#FFFFFF" />
                <circle cx="71.5" cy="74.5" r="4.2" fill="#0284C7" />
                <circle cx="71.5" cy="74.5" r="2.3" fill="#0F172A" />
                <circle cx="70" cy="72.2" r="1.6" fill="#FFFFFF" />
                <circle cx="73.5" cy="76.2" r="0.8" fill="#FFFFFF" />
                <path d="M65 70 Q72 64 78 69" fill="none" stroke="#451A03" strokeWidth="2" strokeLinecap="round" />
              </g>
            )}

            {/* Right Eye */}
            <g className="animate-princess-blink" style={{ transformOrigin: '98px 74px' }}>
              <ellipse cx="98" cy="74" rx="5.5" ry="6.8" fill="#FFFFFF" />
              <circle cx="97.5" cy="74.5" r="4.2" fill="#0284C7" />
              <circle cx="97.5" cy="74.5" r="2.3" fill="#0F172A" />
              <circle cx="96" cy="72.2" r="1.6" fill="#FFFFFF" />
              <circle cx="99.5" cy="76.2" r="0.8" fill="#FFFFFF" />
              <path d="M92 69 Q98 64 105 70" fill="none" stroke="#451A03" strokeWidth="2" strokeLinecap="round" />
            </g>

            {/* Cute Eyebrows */}
            <path d="M66 63 Q72 60 77 62" fill="none" stroke="#7C2D12" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M93 62 Q98 60 104 63" fill="none" stroke="#7C2D12" strokeWidth="1.8" strokeLinecap="round" />

            {/* Cute Nose */}
            <path d="M83.5 80 Q85 82.5 86.5 80" fill="none" stroke="#E29578" strokeWidth="1.8" strokeLinecap="round" />

            {/* Cheerful Smile OR Blow-Kiss Mouth */}
            {mouthMode === 'kiss' ? (
              <ellipse cx="85" cy="90" rx="3.4" ry="3.8" fill="#E11D48" stroke="#9F1239" strokeWidth="1" />
            ) : (
              <path
                d="M77 88 Q85 95 93 88"
                fill="none"
                stroke="#BE123C"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            )}

            {/* Front Swept Fairytale Bangs */}
            <path
              d="M54 68 C54 44, 116 44, 116 68 C105 58, 94 56, 85 60 C74 55, 63 58, 54 68 Z"
              fill="url(#princessHair)"
            />
            <path
              d="M64 49 Q85 43 106 49"
              fill="none"
              stroke="#C26D45"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.65"
            />

            {/* Golden-Pink Sparkling Princess Tiara */}
            <path
              d="M68 47 L73 32 L80 41 L85 26 L90 41 L97 32 L102 47 Z"
              fill="url(#goldTrim)"
              stroke="#FFFBEB"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            {/* Tiara Heart Gem */}
            <circle cx="85" cy="40" r="3.4" fill="#F43F5E" stroke="#FEF08A" strokeWidth="1" />
            <circle cx="73.5" cy="36" r="1.8" fill="#38BDF8" />
            <circle cx="96.5" cy="36" r="1.8" fill="#38BDF8" />
          </g>
        </svg>
      </div>
    </div>
  );
};
