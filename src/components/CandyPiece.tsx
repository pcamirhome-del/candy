import React from 'react';
import { CandyTile } from '../game/types';

interface CandyPieceProps {
  tile: CandyTile;
  isSelected: boolean;
  isHinted: boolean;
}

export const CandyPiece: React.FC<CandyPieceProps> = React.memo(
  ({ tile, isSelected, isHinted }) => {
    const uid = tile.id;

    // Black Spiral Licorice Swirl
    if (tile.isLicoriceSwirl) {
      return (
        <div className="w-full h-full p-[6%] flex items-center justify-center">
          <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-[0_4px_6px_rgba(0,0,0,0.65)]">
            <defs>
              <radialGradient id={`lic_${uid}`} cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#475569" />
                <stop offset="45%" stopColor="#1E293B" />
                <stop offset="100%" stopColor="#020617" />
              </radialGradient>
            </defs>
            <circle cx="32" cy="32" r="24" fill={`url(#lic_${uid})`} stroke="#64748B" strokeWidth="1.5" />
            <path
              d="M32 32 m-2 0 a2 2 0 1 1 4 0 a5.5 5.5 0 1 1 -11 0 a10 10 0 1 1 20 0 a15 15 0 1 1 -30 0 a20 20 0 1 1 40 0"
              fill="none"
              stroke="#94A3B8"
              strokeWidth="3.2"
              strokeLinecap="round"
              opacity="0.72"
            />
            <ellipse cx="22" cy="18" rx="7" ry="3.2" transform="rotate(-28 22 18)" fill="#FFFFFF" opacity="0.35" />
          </svg>
        </div>
      );
    }

    // Spreading Dark Chocolate Blocker
    if (tile.isChocolate) {
      return (
        <div className="w-full h-full p-[5%] flex items-center justify-center">
          <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-[0_4px_6px_rgba(0,0,0,0.65)]">
            <defs>
              <linearGradient id={`chocblk_${uid}`} x1="15%" y1="10%" x2="85%" y2="90%">
                <stop offset="0%" stopColor="#7A442C" />
                <stop offset="45%" stopColor="#452112" />
                <stop offset="100%" stopColor="#230E05" />
              </linearGradient>
            </defs>
            <rect
              x="5"
              y="5"
              width="54"
              height="54"
              rx="10"
              fill={`url(#chocblk_${uid})`}
              stroke="#9C6449"
              strokeWidth="1.8"
            />
            <rect x="12" y="12" width="17" height="17" rx="3.5" fill="#5D311E" stroke="#2D1409" strokeWidth="1.5" />
            <rect x="35" y="12" width="17" height="17" rx="3.5" fill="#5D311E" stroke="#2D1409" strokeWidth="1.5" />
            <rect x="12" y="35" width="17" height="17" rx="3.5" fill="#5D311E" stroke="#2D1409" strokeWidth="1.5" />
            <rect x="35" y="35" width="17" height="17" rx="3.5" fill="#5D311E" stroke="#2D1409" strokeWidth="1.5" />
            <path d="M11 9 H53" stroke="#B68267" strokeWidth="2.2" strokeLinecap="round" opacity="0.5" />
          </svg>
        </div>
      );
    }

    // Ingredients: Cherry & Hazelnut
    if (tile.isIngredient) {
      const isHazelnut = tile.ingredientKind === 'hazelnut';
      return (
        <div
          className={`w-full h-full p-[6%] flex items-center justify-center transition-transform duration-150 ${
            isSelected ? 'scale-110' : ''
          }`}
        >
          {isHazelnut ? (
            <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-[0_4px_6px_rgba(0,0,0,0.55)]">
              <defs>
                <radialGradient id={`haz_${uid}`} cx="36%" cy="32%" r="70%">
                  <stop offset="0%" stopColor="#FDE68A" />
                  <stop offset="45%" stopColor="#D97706" />
                  <stop offset="100%" stopColor="#78350F" />
                </radialGradient>
              </defs>
              {/* Acorn/Hazelnut Cap */}
              <path d="M16 26 C18 14, 46 14, 48 26 Z" fill="#5C3A21" stroke="#A16207" strokeWidth="1.5" />
              <path d="M32 15 V9" stroke="#78350F" strokeWidth="4" strokeLinecap="round" />
              {/* Nut Body */}
              <path
                d="M18 26 C16 42, 24 54, 32 56 C40 54, 48 42, 46 26 Z"
                fill={`url(#haz_${uid})`}
                stroke="#FEF3C7"
                strokeWidth="1.6"
              />
              <ellipse cx="26" cy="36" rx="4.5" ry="7" transform="rotate(-12 26 36)" fill="#FFFFFF" opacity="0.5" />
            </svg>
          ) : (
            <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-[0_4px_6px_rgba(0,0,0,0.55)]">
              <defs>
                <radialGradient id={`chr_${uid}`} cx="35%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#FDA4AF" />
                  <stop offset="40%" stopColor="#E11D48" />
                  <stop offset="100%" stopColor="#881337" />
                </radialGradient>
              </defs>
              <path
                d="M23 32 C24 18, 32 12, 39 9 M41 34 C40 21, 39 14, 39 9"
                fill="none"
                stroke="#65A30D"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              <path d="M39 11 C31 6, 25 10, 28 16 C32 18, 37 15, 39 11 Z" fill="#22C55E" />
              <circle cx="22" cy="43" r="12.5" fill={`url(#chr_${uid})`} stroke="#FFE4E6" strokeWidth="1.5" />
              <circle cx="42" cy="45" r="12.5" fill={`url(#chr_${uid})`} stroke="#FFE4E6" strokeWidth="1.5" />
              <ellipse cx="18" cy="38" rx="4" ry="2.4" transform="rotate(-30 18 38)" fill="#FFFFFF" opacity="0.7" />
              <ellipse cx="38" cy="40" rx="4" ry="2.4" transform="rotate(-30 38 40)" fill="#FFFFFF" opacity="0.7" />
            </svg>
          )}
        </div>
      );
    }

    // Color Bomb: Glossy dark chocolate sphere with rainbow sprinkles + electric sparks
    if (tile.special === 'color_bomb') {
      return (
        <div
          className={`w-full h-full p-[5%] flex items-center justify-center transition-transform duration-150 ${
            isSelected ? 'scale-110' : isHinted ? 'animate-pulse scale-105' : ''
          }`}
        >
          <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-[0_5px_8px_rgba(0,0,0,0.68)]">
            <defs>
              <radialGradient id={`choco_${uid}`} cx="34%" cy="28%" r="68%">
                <stop offset="0%" stopColor="#8D553A" />
                <stop offset="48%" stopColor="#4A2515" />
                <stop offset="100%" stopColor="#1B0A04" />
              </radialGradient>
            </defs>
            {/* Electric spark halo */}
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="#FDE047"
              strokeWidth="1.5"
              strokeDasharray="4 5"
              opacity="0.7"
            />
            <circle
              cx="32"
              cy="32"
              r="24.5"
              fill={`url(#choco_${uid})`}
              stroke="#E2B892"
              strokeWidth="1.6"
            />
            <ellipse cx="22" cy="19" rx="8" ry="3.8" transform="rotate(-30 22 19)" fill="#FFFFFF" opacity="0.34" />
            {/* Bright rainbow sprinkles */}
            <rect x="17" y="19" width="7.5" height="3.3" rx="1.65" transform="rotate(28 17 19)" fill="#FF2E54" />
            <rect x="34" y="14" width="7.5" height="3.3" rx="1.65" transform="rotate(-22 34 14)" fill="#FFD600" />
            <rect x="42" y="25" width="7.5" height="3.3" rx="1.65" transform="rotate(64 42 25)" fill="#00D26A" />
            <rect x="14" y="34" width="7.5" height="3.3" rx="1.65" transform="rotate(-48 14 34)" fill="#00A8FF" />
            <rect x="27" y="29" width="8" height="3.5" rx="1.75" transform="rotate(14 27 29)" fill="#FFFFFF" />
            <rect x="22" y="43" width="7.5" height="3.3" rx="1.65" transform="rotate(-16 22 43)" fill="#C084FC" />
            <rect x="37" y="40" width="7.5" height="3.3" rx="1.65" transform="rotate(36 37 40)" fill="#FF7A00" />
            <rect x="31" y="49" width="7" height="3.2" rx="1.6" transform="rotate(-35 31 49)" fill="#38BDF8" />
            <rect x="44" y="34" width="6.5" height="3" rx="1.5" transform="rotate(-68 44 34)" fill="#FB7185" />
            {/* Spark stars */}
            <path d="M9 14 L11 10 L13 14 L17 16 L13 18 L11 22 L9 18 L5 16 Z" fill="#FEF08A" />
            <path d="M52 46 L53.5 43 L55 46 L58 47.5 L55 49 L53.5 52 L52 49 L49 47.5 Z" fill="#38BDF8" />
          </svg>
        </div>
      );
    }

    const renderBaseCandy = () => {
      switch (tile.color) {
        case 'red':
          // 1. Red Jelly Bean: Deep ruby-red curved bean with bright white crescent gloss
          return (
            <>
              <defs>
                <radialGradient id={`g_${uid}`} cx="34%" cy="26%" r="72%">
                  <stop offset="0%" stopColor="#FF96AB" />
                  <stop offset="34%" stopColor="#F4113B" />
                  <stop offset="80%" stopColor="#B80022" />
                  <stop offset="100%" stopColor="#6D0011" />
                </radialGradient>
                <clipPath id={`clip_${uid}`}>
                  <path d="M15 16 C23 7, 45 9, 52 21 C58 33, 53 51, 39 54 C25 58, 12 50, 10 38 C9 29, 19 28, 21 24 C23 20, 11 21, 15 16 Z" />
                </clipPath>
              </defs>
              <path
                d="M15 16 C23 7, 45 9, 52 21 C58 33, 53 51, 39 54 C25 58, 12 50, 10 38 C9 29, 19 28, 21 24 C23 20, 11 21, 15 16 Z"
                fill={`url(#g_${uid})`}
                stroke="#FFCCD6"
                strokeWidth="1.5"
              />
              {/* Bright white crescent gloss */}
              <path
                d="M21 15 C28 11, 41 12, 46 20"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="4.2"
                strokeLinecap="round"
                opacity="0.72"
              />
              <circle cx="20" cy="41" r="2.8" fill="#FFFFFF" opacity="0.52" />
            </>
          );

        case 'orange':
          // 2. Orange Oval Lozenge: Bright tangerine-orange HORIZONTAL oval drop with inner beveled ring
          return (
            <>
              <defs>
                <radialGradient id={`g_${uid}`} cx="36%" cy="28%" r="68%">
                  <stop offset="0%" stopColor="#FFE1A8" />
                  <stop offset="35%" stopColor="#FF8C14" />
                  <stop offset="80%" stopColor="#EA580C" />
                  <stop offset="100%" stopColor="#9A3412" />
                </radialGradient>
                <clipPath id={`clip_${uid}`}>
                  <ellipse cx="32" cy="32" rx="25" ry="17.5" />
                </clipPath>
              </defs>
              <ellipse
                cx="32"
                cy="32"
                rx="25"
                ry="17.5"
                fill={`url(#g_${uid})`}
                stroke="#FED7AA"
                strokeWidth="1.5"
              />
              {/* Inner beveled ring */}
              <ellipse
                cx="32"
                cy="32"
                rx="18"
                ry="11.5"
                fill="none"
                stroke="#FFF7ED"
                strokeWidth="2"
                opacity="0.48"
              />
              <ellipse cx="24" cy="22.5" rx="9" ry="3.2" fill="#FFFFFF" opacity="0.72" />
            </>
          );

        case 'yellow':
          // 3. Yellow Lemon Drop: Vibrant lemon-yellow pointed teardrop tilted at 30 degrees
          return (
            <>
              <defs>
                <radialGradient id={`g_${uid}`} cx="38%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#FFFDE7" />
                  <stop offset="32%" stopColor="#FFE600" />
                  <stop offset="80%" stopColor="#EAB308" />
                  <stop offset="100%" stopColor="#92400E" />
                </radialGradient>
                <clipPath id={`clip_${uid}`}>
                  <path
                    d="M32 6 C39 16, 51 25, 51 38 C51 49, 42.5 57, 32 57 C21.5 57, 13 49, 13 38 C13 25, 25 16, 32 6 Z"
                    transform="rotate(30 32 32)"
                  />
                </clipPath>
              </defs>
              <g transform="rotate(30 32 32)">
                <path
                  d="M32 6 C39 16, 51 25, 51 38 C51 49, 42.5 57, 32 57 C21.5 57, 13 49, 13 38 C13 25, 25 16, 32 6 Z"
                  fill={`url(#g_${uid})`}
                  stroke="#FEF9C3"
                  strokeWidth="1.5"
                />
                <ellipse cx="25.5" cy="29" rx="6.5" ry="3.4" transform="rotate(-48 25.5 29)" fill="#FFFFFF" opacity="0.76" />
                <path d="M22 46 Q32 53 43 44" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" opacity="0.35" />
              </g>
            </>
          );

        case 'green':
          // 4. Green Chiclets Square: Rich emerald-green rounded square pillow with raised center highlight
          return (
            <>
              <defs>
                <radialGradient id={`g_${uid}`} cx="34%" cy="30%" r="72%">
                  <stop offset="0%" stopColor="#A7F3D0" />
                  <stop offset="36%" stopColor="#0DE873" />
                  <stop offset="82%" stopColor="#047857" />
                  <stop offset="100%" stopColor="#064E3B" />
                </radialGradient>
                <clipPath id={`clip_${uid}`}>
                  <rect x="9" y="9" width="46" height="46" rx="11.5" />
                </clipPath>
              </defs>
              <rect
                x="9"
                y="9"
                width="46"
                height="46"
                rx="11.5"
                fill={`url(#g_${uid})`}
                stroke="#D1FAE5"
                strokeWidth="1.6"
              />
              {/* Raised center pillow */}
              <rect
                x="16"
                y="16"
                width="32"
                height="32"
                rx="7.5"
                fill="#FFFFFF"
                fillOpacity="0.16"
                stroke="#FFFFFF"
                strokeWidth="1.4"
                opacity="0.45"
              />
              <ellipse cx="23" cy="17.5" rx="9" ry="3.2" transform="rotate(-10 23 17.5)" fill="#FFFFFF" opacity="0.7" />
            </>
          );

        case 'blue':
          // 5. Blue Lollipop Head: Electric sapphire-blue circle with embossed spiral/swirl rings
          return (
            <>
              <defs>
                <radialGradient id={`g_${uid}`} cx="34%" cy="28%" r="70%">
                  <stop offset="0%" stopColor="#BAE6FD" />
                  <stop offset="35%" stopColor="#0284C7" />
                  <stop offset="80%" stopColor="#1D4ED8" />
                  <stop offset="100%" stopColor="#1E3A8A" />
                </radialGradient>
                <clipPath id={`clip_${uid}`}>
                  <circle cx="32" cy="32" r="23.5" />
                </clipPath>
              </defs>
              <circle
                cx="32"
                cy="32"
                r="23.5"
                fill={`url(#g_${uid})`}
                stroke="#E0F2FE"
                strokeWidth="1.6"
              />
              <path
                d="M32 32 m-2.5 0 a2.5 2.5 0 1 1 5 0 a6 6 0 1 1 -12 0 a10 10 0 1 1 20 0 a15 15 0 1 1 -30 0"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.58"
              />
              <ellipse cx="23" cy="18.5" rx="8" ry="3.5" transform="rotate(-28 23 18.5)" fill="#FFFFFF" opacity="0.72" />
            </>
          );

        case 'purple':
        default:
          // 6. Purple Grape Cluster: Deep royal-purple 5-lobed grape bunch silhouette (distinct from round blue)
          return (
            <>
              <defs>
                <radialGradient id={`g_${uid}`} cx="35%" cy="28%" r="70%">
                  <stop offset="0%" stopColor="#F5D0FE" />
                  <stop offset="36%" stopColor="#9333EA" />
                  <stop offset="82%" stopColor="#581C87" />
                  <stop offset="100%" stopColor="#2E1065" />
                </radialGradient>
                <clipPath id={`clip_${uid}`}>
                  {/* 5-lobed bunch silhouette */}
                  <path d="M22 13 A9.5 9.5 0 1 1 42 13 A10 10 0 1 1 52 30 A9.5 9.5 0 1 1 40 49 A9.5 9.5 0 1 1 24 49 A10 10 0 1 1 12 30 A9.5 9.5 0 1 1 22 13 Z" />
                </clipPath>
              </defs>
              {/* Small green grapevine stem */}
              <path d="M32 10 V4" stroke="#4ADE80" strokeWidth="3" strokeLinecap="round" />
              {/* 5 Distinct Royal Grape Lobes */}
              <circle cx="22" cy="21" r="10.2" fill={`url(#g_${uid})`} stroke="#F3E8FF" strokeWidth="1.3" />
              <circle cx="42" cy="21" r="10.2" fill={`url(#g_${uid})`} stroke="#F3E8FF" strokeWidth="1.3" />
              <circle cx="17" cy="36" r="10.2" fill={`url(#g_${uid})`} stroke="#F3E8FF" strokeWidth="1.3" />
              <circle cx="47" cy="36" r="10.2" fill={`url(#g_${uid})`} stroke="#F3E8FF" strokeWidth="1.3" />
              <circle cx="32" cy="47" r="10.5" fill={`url(#g_${uid})`} stroke="#F3E8FF" strokeWidth="1.3" />
              <circle cx="32" cy="32" r="10" fill={`url(#g_${uid})`} />
              {/* Specular gloss dots on lobes */}
              <circle cx="19" cy="17.5" r="3" fill="#FFFFFF" opacity="0.68" />
              <circle cx="39" cy="17.5" r="2.6" fill="#FFFFFF" opacity="0.58" />
              <circle cx="14" cy="32.5" r="2.4" fill="#FFFFFF" opacity="0.52" />
              <circle cx="29.5" cy="43.5" r="2.8" fill="#FFFFFF" opacity="0.55" />
            </>
          );
      }
    };

    const renderSpecialOverlay = () => {
      if (tile.special === 'striped_h') {
        return (
          <g clipPath={`url(#clip_${uid})`}>
            <rect x="0" y="13" width="64" height="6" fill="#FFFFFF" opacity="0.94" />
            <rect x="0" y="29" width="64" height="6.5" fill="#FFFFFF" opacity="0.98" />
            <rect x="0" y="45" width="64" height="6" fill="#FFFFFF" opacity="0.94" />
          </g>
        );
      }
      if (tile.special === 'striped_v') {
        return (
          <g clipPath={`url(#clip_${uid})`}>
            <rect x="13" y="0" width="6" height="64" fill="#FFFFFF" opacity="0.94" />
            <rect x="29" y="0" width="6.5" height="64" fill="#FFFFFF" opacity="0.98" />
            <rect x="45" y="0" width="6" height="64" fill="#FFFFFF" opacity="0.94" />
          </g>
        );
      }
      if (tile.special === 'wrapped') {
        return (
          <g>
            {/* Pulsing cellophane wrapper with twisted ends */}
            <rect
              x="5"
              y="5"
              width="54"
              height="54"
              rx="14"
              fill="#FFFFFF"
              fillOpacity="0.2"
              stroke="#FEF08A"
              strokeWidth="2.8"
            />
            <path d="M9 14 L55 50 M55 14 L9 50" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.35" />
            <polygon points="1,10 12,4 9,16" fill="#FEF08A" />
            <polygon points="63,54 52,60 55,48" fill="#FEF08A" />
            {tile.wrappedArmed && (
              <circle
                cx="32"
                cy="32"
                r="27"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="3.5"
                opacity="0.95"
              />
            )}
          </g>
        );
      }
      return null;
    };

    const hasStripe = tile.special === 'striped_h' || tile.special === 'striped_v';
    const hasWrap = tile.special === 'wrapped';

    return (
      <div
        className={`relative w-full h-full p-[6%] flex items-center justify-center transition-transform duration-150 ${
          isSelected
            ? 'scale-112 drop-shadow-[0_0_10px_rgba(255,255,255,0.88)]'
            : isHinted
            ? 'scale-108 animate-pulse'
            : ''
        } ${tile.wrappedArmed ? 'animate-pulse scale-110' : ''} ${
          hasWrap ? 'drop-shadow-[0_0_8px_rgba(254,240,138,0.65)]' : ''
        }`}
      >
        <svg
          viewBox="0 0 64 64"
          className={`w-full h-full drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)] ${
            hasStripe ? 'animate-pulse' : ''
          }`}
        >
          {renderBaseCandy()}
          {renderSpecialOverlay()}
        </svg>

        {/* Licorice Lock / Cage (Metal Lattice Bars) */}
        {tile.locked && (
          <svg
            viewBox="0 0 64 64"
            className="absolute inset-0 w-full h-full p-[4%] pointer-events-none"
          >
            <rect
              x="5"
              y="5"
              width="54"
              height="54"
              rx="12"
              fill="rgba(15, 23, 42, 0.25)"
              stroke="#E2E8F0"
              strokeWidth="3.2"
            />
            <path
              d="M22 6 V58 M42 6 V58 M6 22 H58 M6 42 H58"
              stroke="#CBD5E1"
              strokeWidth="2.8"
              strokeLinecap="round"
              opacity="0.92"
            />
          </svg>
        )}

        {/* Candy Bomb Countdown Badge */}
        {typeof tile.bombTimer === 'number' && (
          <div
            className={`absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px] px-1 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-extrabold tabular-nums shadow-md ${
              tile.bombTimer <= 3 ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-900 text-amber-300'
            }`}
          >
            {tile.bombTimer}
          </div>
        )}
      </div>
    );
  }
);

CandyPiece.displayName = 'CandyPiece';
