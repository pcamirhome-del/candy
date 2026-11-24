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

type CharacterVariant = 'sweetheart_bow' | 'golden_princess' | 'snow_princess' | 'heroine_blossom';

const CHARACTER_ORDER: CharacterVariant[] = [
  'sweetheart_bow',
  'golden_princess',
  'snow_princess',
  'heroine_blossom',
];

const CYCLE_MS = 10500; // 8.3s active choreography + 2.2s pause

const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const easeInCubic = (x: number) => x * x * x;

export const CandyPrincess: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bodyBobRef = useRef<SVGGElement | null>(null);
  const waveArmRef = useRef<SVGGElement | null>(null);
  const lollipopHandRef = useRef<SVGGElement | null>(null);

  const [variant, setVariant] = useState<CharacterVariant>('sweetheart_bow');
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
        setVariant(CHARACTER_ORDER[cycle % CHARACTER_ORDER.length]);
      }

      // 1. Horizontal Slide + Opacity choreography
      let txPct = 0;
      let opacity = 1;
      let bobY = Math.sin(elapsed / 320) * 2.2;

      if (t < 1100) {
        const p = easeOutCubic(t / 1100);
        txPct = (1 - p) * 118;
        opacity = Math.min(1, p * 1.4);
        bobY = Math.sin(p * Math.PI * 2) * -4;
      } else if (t < 7100) {
        txPct = 0;
        opacity = 1;
      } else if (t < 8300) {
        const p = easeInCubic((t - 7100) / 1200);
        txPct = p * 120;
        opacity = Math.max(0, 1 - p * 1.1);
      } else {
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

      // 2. Waving / Blow-Kiss Arm Choreography (shoulder pivot at 62, 126)
      let armAngle = 0;
      let armTx = 0;
      let armTy = 0;

      if (t >= 1100 && t < 3300) {
        armAngle = Math.sin(((t - 1100) / 2200) * Math.PI * 6) * 24 - 8;
      } else if (t >= 3300 && t < 5800) {
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

  // Theme attributes faithful to each attached reference character
  const skinGradId =
    variant === 'snow_princess'
      ? 'url(#skinPorcelain)'
      : variant === 'golden_princess'
      ? 'url(#skinWarm)'
      : 'url(#skinPeach)';

  const eyeIrisColor =
    variant === 'heroine_blossom'
      ? '#06B6D4'
      : variant === 'sweetheart_bow'
      ? '#0284C7'
      : variant === 'golden_princess'
      ? '#65A30D'
      : '#78350F';

  const lipColor =
    variant === 'snow_princess'
      ? '#B91C1C'
      : variant === 'golden_princess'
      ? '#E11D48'
      : '#E11D48';

  const armColor =
    variant === 'golden_princess'
      ? '#FBCFE8' // long pink princess gloves
      : variant === 'heroine_blossom'
      ? '#44403C' // dark charcoal jacket sleeve
      : skinGradId;

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

      {/* Character Wrapper */}
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
            <linearGradient id="skinPeach" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFE8DB" />
              <stop offset="100%" stopColor="#FBC9B0" />
            </linearGradient>
            <linearGradient id="skinPorcelain" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFF1EB" />
              <stop offset="100%" stopColor="#FAD5C5" />
            </linearGradient>
            <linearGradient id="skinWarm" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFE4D0" />
              <stop offset="100%" stopColor="#F5BE9E" />
            </linearGradient>

            {/* Hair Gradients for each reference */}
            <linearGradient id="hairHoney" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D6945E" />
              <stop offset="55%" stopColor="#A6673D" />
              <stop offset="100%" stopColor="#724123" />
            </linearGradient>
            <linearGradient id="hairGolden" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="55%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
            <linearGradient id="hairBlack" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E293B" />
              <stop offset="55%" stopColor="#0F172A" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>
            <linearGradient id="hairIndigo" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B4BA0" />
              <stop offset="55%" stopColor="#262E6E" />
              <stop offset="100%" stopColor="#171A45" />
            </linearGradient>

            {/* Outfit Gradients */}
            <linearGradient id="skyTopGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#BAE6FD" />
              <stop offset="100%" stopColor="#7DD3FC" />
            </linearGradient>
            <linearGradient id="goldSkirtGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="60%" stopColor="#FACC15" />
              <stop offset="100%" stopColor="#EAB308" />
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
            {/* ===== BACK HAIR PER CHARACTER ===== */}
            {variant === 'sweetheart_bow' && (
              <>
                <path
                  d="M52 56 C28 84, 24 128, 42 146 C54 140, 62 126, 66 108 Z"
                  fill="url(#hairHoney)"
                />
                <path
                  d="M118 54 C144 82, 146 130, 126 148 C114 142, 108 126, 104 108 Z"
                  fill="url(#hairHoney)"
                />
              </>
            )}

            {variant === 'golden_princess' && (
              <>
                {/* Top crown bun */}
                <circle cx="85" cy="34" r="16" fill="url(#hairGolden)" />
                {/* Flowing golden curls */}
                <path
                  d="M52 54 C26 78, 28 136, 48 152 C60 144, 66 126, 68 106 Z"
                  fill="url(#hairGolden)"
                />
                <path
                  d="M118 54 C144 80, 144 138, 124 154 C112 146, 106 126, 102 106 Z"
                  fill="url(#hairGolden)"
                />
              </>
            )}

            {variant === 'snow_princess' && (
              <>
                {/* High White Fairytale Stand-up Collar */}
                <path
                  d="M56 112 Q42 84 54 68 Q68 88 74 114 Z"
                  fill="#FFFFFF"
                  stroke="#94A3B8"
                  strokeWidth="1.5"
                />
                <path
                  d="M114 112 Q128 84 116 68 Q102 88 96 114 Z"
                  fill="#FFFFFF"
                  stroke="#94A3B8"
                  strokeWidth="1.5"
                />
                {/* Short wavy black bob */}
                <path
                  d="M48 64 C38 82, 42 108, 60 112 L110 112 C128 108, 132 82, 122 64 Z"
                  fill="url(#hairBlack)"
                />
              </>
            )}

            {variant === 'heroine_blossom' && (
              <>
                {/* Twin low indigo pigtails with red ties */}
                <circle cx="55" cy="107" r="4.5" fill="#DC2626" />
                <ellipse cx="48" cy="116" rx="13" ry="15" transform="rotate(-12 48 116)" fill="url(#hairIndigo)" />
                <circle cx="115" cy="107" r="4.5" fill="#DC2626" />
                <ellipse cx="122" cy="116" rx="13" ry="15" transform="rotate(12 122 116)" fill="url(#hairIndigo)" />
                <path d="M124 108 Q138 110 142 116" fill="none" stroke="#262E6E" strokeWidth="2.4" strokeLinecap="round" />
              </>
            )}

            {/* ===== RIGHT HAND HOLDING GIANT RAINBOW LOLLIPOP ===== */}
            <g ref={lollipopHandRef}>
              <rect x="122" y="68" width="5" height="62" rx="2.5" fill="#FFFBEB" stroke="#E5E7EB" strokeWidth="1" />
              <circle cx="124.5" cy="54" r="24" fill="url(#rainbowLolli)" stroke="#FFFFFF" strokeWidth="2.5" />
              <path
                d="M124.5 54 m-2 0 a2 2 0 1 1 4 0 a6 6 0 1 1 -12 0 a11 11 0 1 1 22 0 a16 16 0 1 1 -32 0"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2.8"
                strokeLinecap="round"
                opacity="0.92"
              />
              <ellipse cx="116" cy="44" rx="6.5" ry="3.5" transform="rotate(-30 116 44)" fill="#FFFFFF" opacity="0.65" />

              <path
                d="M108 124 C118 128, 124 124, 125 112"
                fill="none"
                stroke={armColor}
                strokeWidth="9"
                strokeLinecap="round"
              />
              <circle
                cx="124.5"
                cy="111"
                r="6"
                fill={variant === 'golden_princess' ? '#FBCFE8' : skinGradId}
              />
            </g>

            {/* ===== FREE LEFT ARM (WAVING & BLOWING KISS) ===== */}
            <g ref={waveArmRef}>
              <path
                d="M64 125 C46 118, 34 102, 29 82"
                fill="none"
                stroke={armColor}
                strokeWidth="9.5"
                strokeLinecap="round"
              />
              {/* Left Sleeve */}
              {variant === 'sweetheart_bow' && (
                <circle cx="62" cy="123" r="10.5" fill="#7DD3FC" stroke="#BAE6FD" strokeWidth="1.4" />
              )}
              {variant === 'golden_princess' && (
                <circle cx="62" cy="123" r="11" fill="#F9A8D4" stroke="#FDE047" strokeWidth="1.5" />
              )}
              {variant === 'snow_princess' && (
                <>
                  <circle cx="62" cy="123" r="11.5" fill="#1D4ED8" stroke="#D97706" strokeWidth="1.6" />
                  <ellipse cx="59" cy="121" rx="2.5" ry="5" fill="#DC2626" />
                  <ellipse cx="66" cy="122" rx="2.3" ry="4.5" fill="#DC2626" />
                </>
              )}
              {variant === 'heroine_blossom' && (
                <circle cx="62" cy="123" r="10" fill="#44403C" />
              )}

              {/* Waving Hand */}
              <circle
                cx="28"
                cy="80"
                r="6.5"
                fill={variant === 'golden_princess' ? '#FBCFE8' : skinGradId}
              />
              <circle
                cx="23"
                cy="76"
                r="2.2"
                fill={variant === 'golden_princess' ? '#FBCFE8' : skinGradId}
              />
            </g>

            {/* ===== OUTFIT SKIRT & BODICE PER CHARACTER ===== */}
            {variant === 'sweetheart_bow' && (
              <>
                <path
                  d="M62 117 Q85 126 108 117 L122 214 Q85 222 48 214 Z"
                  fill="url(#skyTopGrad)"
                  stroke="#E0F2FE"
                  strokeWidth="1.6"
                />
                <circle cx="108" cy="123" r="10.5" fill="#7DD3FC" stroke="#BAE6FD" strokeWidth="1.4" />
              </>
            )}

            {variant === 'golden_princess' && (
              <>
                {/* Golden Ballgown Skirt */}
                <path
                  d="M64 142 L106 142 C128 175, 134 205, 132 214 Q108 222 85 215 Q62 222 38 214 C36 205, 42 175, 64 142 Z"
                  fill="url(#goldSkirtGrad)"
                  stroke="#FEF08A"
                  strokeWidth="1.8"
                />
                <path d="M62 142 Q85 162 108 142" fill="#FEF08A" opacity="0.85" />
                {/* Magenta Pink Bodice */}
                <path
                  d="M64 116 Q85 124 106 116 L108 143 Q85 152 62 143 Z"
                  fill="#DB2777"
                  stroke="#FEF08A"
                  strokeWidth="1.6"
                />
                <circle cx="108" cy="123" r="11" fill="#F9A8D4" stroke="#FDE047" strokeWidth="1.5" />
              </>
            )}

            {variant === 'snow_princess' && (
              <>
                {/* Yellow Skirt */}
                <path
                  d="M63 144 L107 144 C126 175, 132 204, 130 214 Q85 222 40 214 C38 204, 44 175, 63 144 Z"
                  fill="url(#goldSkirtGrad)"
                  stroke="#FEF08A"
                  strokeWidth="1.5"
                />
                {/* Royal Navy Bodice with Gold Vertical Seam */}
                <path
                  d="M64 115 Q85 123 106 115 L107 145 L85 153 L63 145 Z"
                  fill="#1E295B"
                  stroke="#D97706"
                  strokeWidth="1.2"
                />
                <line x1="85" y1="121" x2="85" y2="152" stroke="#FBBF24" strokeWidth="1.2" />
                {/* Right Blue & Red Puff Sleeve */}
                <circle cx="108" cy="123" r="11.5" fill="#1D4ED8" stroke="#D97706" strokeWidth="1.6" />
                <ellipse cx="106" cy="121" rx="2.4" ry="4.8" fill="#DC2626" />
                <ellipse cx="112" cy="123" rx="2.2" ry="4.4" fill="#DC2626" />
              </>
            )}

            {variant === 'heroine_blossom' && (
              <>
                {/* White Cherry-Blossom Shirt */}
                <path
                  d="M64 117 Q85 126 106 117 L112 214 Q85 220 58 214 Z"
                  fill="#F8FAFC"
                  stroke="#334155"
                  strokeWidth="1.4"
                />
                {/* Cherry Blossom Flower Print */}
                <g>
                  <circle cx="80" cy="145" r="4.5" fill="#F472B6" />
                  <circle cx="89" cy="138" r="3.5" fill="#F9A8D4" />
                  <circle cx="75" cy="156" r="4" fill="#F472B6" />
                  <path d="M72 158 Q84 146 95 135" fill="none" stroke="#44403C" strokeWidth="1.4" />
                </g>
                {/* Charcoal Cardigan with Pink-Polka Lapel */}
                <path d="M62 116 L74 118 L70 214 L46 214 Z" fill="#44403C" />
                <path d="M108 116 L96 118 L100 214 L124 214 Z" fill="#44403C" />
                <path d="M69 116 L76 118 L72 146 L66 138 Z" fill="#FCE7F3" stroke="#1E293B" strokeWidth="1" />
                <path d="M101 116 L94 118 L98 146 L104 138 Z" fill="#FCE7F3" stroke="#1E293B" strokeWidth="1" />
                <circle cx="108" cy="123" r="10" fill="#44403C" />
              </>
            )}

            {/* ===== NECK & NECKLACE ===== */}
            <rect x="78" y="99" width="14" height="19" rx="6" fill={skinGradId} />
            {variant === 'sweetheart_bow' && (
              <>
                <path d="M75 115 Q85 123 95 115" fill="none" stroke="#E2E8F0" strokeWidth="1.6" />
                <path
                  d="M85 127 L81 122 A2.5 2.5 0 0 1 85 119 A2.5 2.5 0 0 1 89 122 Z"
                  fill="#DC2626"
                  stroke="#FCA5A5"
                  strokeWidth="0.7"
                />
              </>
            )}

            {/* ===== HEAD & EAR ===== */}
            {(variant === 'sweetheart_bow' || variant === 'heroine_blossom') && (
              <>
                <ellipse cx="115" cy="79" rx="5" ry="7.5" fill={skinGradId} />
                {variant === 'sweetheart_bow' && <circle cx="115" cy="83" r="1.4" fill="#FDE047" />}
              </>
            )}
            <ellipse cx="85" cy="74" rx="30" ry="31" fill={skinGradId} />

            {/* Rosy Cheeks */}
            <ellipse cx="66" cy="83" rx="6.5" ry="3.8" fill="#FB7185" opacity="0.45" />
            <ellipse cx="104" cy="83" rx="6.5" ry="3.8" fill="#FB7185" opacity="0.45" />

            {/* ===== EXPRESSIVE EYES ===== */}
            {isWinking ? (
              <path
                d="M66 74 Q72 69 78 74"
                fill="none"
                stroke="#1E293B"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            ) : (
              <g className="animate-princess-blink" style={{ transformOrigin: '72px 74px' }}>
                <ellipse cx="72" cy="74" rx="5.8" ry="7" fill="#FFFFFF" />
                <circle cx="71.5" cy="74.5" r="4.3" fill={eyeIrisColor} />
                <circle cx="71.5" cy="74.5" r="2.3" fill="#0F172A" />
                <circle cx="70" cy="72.2" r="1.6" fill="#FFFFFF" />
                <circle cx="73.5" cy="76.2" r="0.8" fill="#FFFFFF" />
                <path d="M64 70 Q72 64 78 69" fill="none" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" />
              </g>
            )}

            <g className="animate-princess-blink" style={{ transformOrigin: '98px 74px' }}>
              <ellipse cx="98" cy="74" rx="5.8" ry="7" fill="#FFFFFF" />
              <circle cx="97.5" cy="74.5" r="4.3" fill={eyeIrisColor} />
              <circle cx="97.5" cy="74.5" r="2.3" fill="#0F172A" />
              <circle cx="96" cy="72.2" r="1.6" fill="#FFFFFF" />
              <circle cx="99.5" cy="76.2" r="0.8" fill="#FFFFFF" />
              <path d="M92 69 Q98 64 106 70" fill="none" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" />
            </g>

            {/* Eyebrows */}
            <path
              d="M65 62 Q72 59 77 62"
              fill="none"
              stroke={variant === 'snow_princess' ? '#0F172A' : '#7C2D12'}
              strokeWidth="1.9"
              strokeLinecap="round"
            />
            <path
              d="M93 62 Q98 59 105 62"
              fill="none"
              stroke={variant === 'snow_princess' ? '#0F172A' : '#7C2D12'}
              strokeWidth="1.9"
              strokeLinecap="round"
            />

            {/* Nose */}
            <path d="M83.5 80 Q85 82.5 86.5 80" fill="none" stroke="#E29578" strokeWidth="1.8" strokeLinecap="round" />

            {/* Smile or Blow-Kiss Mouth */}
            {mouthMode === 'kiss' ? (
              <ellipse cx="85" cy="90" rx="3.4" ry="3.8" fill={lipColor} stroke="#881337" strokeWidth="1" />
            ) : (
              <path
                d="M77 88 Q85 95 93 88"
                fill="none"
                stroke={lipColor}
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            )}

            {/* ===== FRONT BANGS & HEAD ACCESSORIES PER CHARACTER ===== */}
            {variant === 'sweetheart_bow' && (
              <>
                {/* Swept honey bangs */}
                <path
                  d="M53 68 C52 40, 118 40, 117 68 C108 52, 92 50, 82 59 C72 62, 61 60, 53 68 Z"
                  fill="url(#hairHoney)"
                />
                {/* Pastel Sky-Blue Headband */}
                <path
                  d="M57 52 Q86 35 113 55"
                  fill="none"
                  stroke="#7DD3FC"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                {/* Side Red Bow */}
                <g transform="translate(56, 48) rotate(-25)">
                  <path d="M0 0 L-10 -6 L-10 6 Z" fill="#DC2626" />
                  <path d="M0 0 L10 -6 L10 6 Z" fill="#EF4444" />
                  <circle cx="0" cy="0" r="3" fill="#B91C1C" />
                </g>
              </>
            )}

            {variant === 'golden_princess' && (
              <>
                <path
                  d="M53 68 C53 42, 117 42, 117 68 C105 56, 94 54, 85 59 C74 53, 62 57, 53 68 Z"
                  fill="url(#hairGolden)"
                />
                {/* Crown Tiara Ribbon with Pink Ruby */}
                <path d="M72 41 Q85 35 98 41" fill="none" stroke="#FEF08A" strokeWidth="3.2" strokeLinecap="round" />
                <circle cx="72" cy="40" r="3.4" fill="#EC4899" stroke="#FEF08A" strokeWidth="1.2" />
              </>
            )}

            {variant === 'snow_princess' && (
              <>
                <path
                  d="M53 68 C53 41, 117 41, 117 68 C107 54, 95 54, 85 58 C74 53, 62 56, 53 68 Z"
                  fill="url(#hairBlack)"
                />
                {/* Classic Red Headband & Ribbon Bow */}
                <path
                  d="M58 50 Q85 36 112 50"
                  fill="none"
                  stroke="#DC2626"
                  strokeWidth="4.8"
                  strokeLinecap="round"
                />
                <g transform="translate(97, 42) rotate(12)">
                  <path d="M0 0 L-11 -6 L-10 6 Z" fill="#DC2626" stroke="#991B1B" strokeWidth="0.8" />
                  <path d="M0 0 L11 -6 L10 6 Z" fill="#EF4444" stroke="#991B1B" strokeWidth="0.8" />
                  <circle cx="0" cy="0" r="3.2" fill="#B91C1C" />
                </g>
              </>
            )}

            {variant === 'heroine_blossom' && (
              <>
                <path
                  d="M53 67 C53 40, 117 40, 117 67 C106 60, 92 61, 78 59 C66 57, 59 61, 53 67 Z"
                  fill="url(#hairIndigo)"
                />
                <path
                  d="M64 49 Q85 43 106 49"
                  fill="none"
                  stroke="#6374D1"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  opacity="0.6"
                />
              </>
            )}
          </g>
        </svg>
      </div>
    </div>
  );
};
