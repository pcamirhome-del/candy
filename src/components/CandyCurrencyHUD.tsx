import React from 'react';
import { Plus } from 'lucide-react';

export const PinkGemIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="pinkGemTop" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FBCFE8" />
        <stop offset="55%" stopColor="#F43F98" />
        <stop offset="100%" stopColor="#BE185D" />
      </linearGradient>
      <linearGradient id="pinkGemBody" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#EC4899" />
        <stop offset="100%" stopColor="#831843" />
      </linearGradient>
    </defs>
    <polygon points="9,5 27,5 34,14 18,33 2,14" fill="url(#pinkGemBody)" stroke="#FCE7F3" strokeWidth="1.5" strokeLinejoin="round" />
    <polygon points="9,5 27,5 23,14 13,14" fill="#F9A8D4" opacity="0.9" />
    <polygon points="9,5 13,14 2,14" fill="#F472B6" />
    <polygon points="27,5 34,14 23,14" fill="#DB2777" />
    <polygon points="13,14 23,14 18,33" fill="url(#pinkGemTop)" />
    <ellipse cx="14" cy="9" rx="3.2" ry="1.2" fill="#FFFFFF" opacity="0.8" />
  </svg>
);

export const GoldenKeyIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="goldKeyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="50%" stopColor="#FBBF24" />
        <stop offset="100%" stopColor="#B45309" />
      </linearGradient>
    </defs>
    <g transform="rotate(-36 18 18)">
      <circle cx="11" cy="18" r="7.5" fill="url(#goldKeyGrad)" stroke="#78350F" strokeWidth="1.4" />
      <circle cx="11" cy="18" r="3" fill="#4C1D95" stroke="#FEF08A" strokeWidth="1" />
      <rect x="17" y="15.5" width="15" height="5" rx="2" fill="url(#goldKeyGrad)" stroke="#78350F" strokeWidth="1.2" />
      <rect x="25" y="19.5" width="3" height="5" rx="1" fill="url(#goldKeyGrad)" stroke="#78350F" strokeWidth="1" />
      <rect x="29.5" y="19.5" width="2.8" height="4" rx="1" fill="url(#goldKeyGrad)" stroke="#78350F" strokeWidth="1" />
    </g>
  </svg>
);

export const GoldenDollarCoinIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="goldCoinFace" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="50%" stopColor="#FBBF24" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
    </defs>
    <circle cx="18" cy="18" r="15.5" fill="url(#goldCoinFace)" stroke="#92400E" strokeWidth="1.6" />
    <circle cx="18" cy="18" r="11.5" fill="none" stroke="#FEF9C3" strokeWidth="1.4" opacity="0.85" />
    <text
      x="18"
      y="23.5"
      textAnchor="middle"
      fontSize="16"
      fontWeight="900"
      fontFamily="Outfit, sans-serif"
      fill="#78350F"
    >
      $
    </text>
  </svg>
);

interface CurrencyPillProps {
  icon: React.ReactNode;
  value: string | number;
  subText?: string;
  onClick?: () => void;
  ariaLabel: string;
  compact?: boolean;
}

export const CandyCurrencyPill: React.FC<CurrencyPillProps> = ({
  icon,
  value,
  subText,
  onClick,
  ariaLabel,
  compact = false,
}) => {
  return (
    <div className="relative flex flex-col items-center shrink-0">
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={`relative flex items-center rounded-full bg-gradient-to-b from-[#6B21A8]/95 to-[#4C1D95]/95 border border-pink-200/60 shadow-[0_3px_10px_rgba(46,16,101,0.55)] active:scale-95 transition-transform ${
          compact ? 'h-[30px] pl-6 pr-1 gap-1' : 'h-[34px] pl-7 pr-1 gap-1.5'
        }`}
      >
        <span
          className={`absolute -left-1.5 top-1/2 -translate-y-1/2 pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] ${
            compact ? 'w-6 h-6' : 'w-7 h-7'
          }`}
        >
          {icon}
        </span>
        <span
          className={`font-display font-extrabold text-white tabular-nums leading-none drop-shadow ${
            compact ? 'text-[11px] min-w-[16px]' : 'text-xs min-w-[20px]'
          }`}
        >
          {value}
        </span>
        <span
          className={`rounded-full bg-gradient-to-b from-lime-300 via-emerald-500 to-green-700 border border-white/80 flex items-center justify-center text-white shadow-inner shrink-0 ${
            compact ? 'w-[18px] h-[18px]' : 'w-[22px] h-[22px]'
          }`}
        >
          <Plus className={compact ? 'w-3 h-3 stroke-[3]' : 'w-3.5 h-3.5 stroke-[3]'} />
        </span>
      </button>
      {subText && (
        <span className="mt-0.5 rounded-full bg-[#4C1D95]/90 border border-pink-200/40 px-2 py-0.5 text-[9px] font-bold text-amber-200 tabular-nums leading-none shadow">
          {subText}
        </span>
      )}
    </div>
  );
};
