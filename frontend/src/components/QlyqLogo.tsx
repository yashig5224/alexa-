import React from 'react';

export interface QlyqLogoProps {
  /** Variant of the logo: symbol-only, horizontal lockup, or symbol with tagline */
  variant?: 'symbol' | 'horizontal' | 'vertical';
  /** Color theme */
  theme?: 'dark' | 'light' | 'monochrome' | 'monochrome-dark';
  /** Size in pixels (applies to symbol width/height) */
  size?: number;
  /** Custom CSS classes */
  className?: string;
  /** Show tagline below wordmark in lockup */
  showTagline?: boolean;
}

/**
 * Signature QLYQ Interwoven Ribbon Vector Symbol
 * Inspired by the official QLYQ brand identity — representing intelligence, connection, and momentum.
 */
export const QlyqSymbol: React.FC<{
  size?: number;
  theme?: 'dark' | 'light' | 'monochrome' | 'monochrome-dark';
  className?: string;
}> = ({ size = 32, theme = 'dark', className = '' }) => {
  const gradientId = React.useId();
  const glowId = React.useId();

  // Color mapping based on theme
  const isMono = theme === 'monochrome';
  const isMonoDark = theme === 'monochrome-dark';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-300 ${className}`}
      aria-label="QLYQ Ribbon Symbol"
    >
      <defs>
        {/* Primary Ribbon Gradient 1: Violet to Lavender */}
        <linearGradient id={`${gradientId}-ribbon-1`} x1="20" y1="20" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          {isMono ? (
            <>
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#94A3B8" />
            </>
          ) : isMonoDark ? (
            <>
              <stop offset="0%" stopColor="#475569" />
              <stop offset="100%" stopColor="#0F172A" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#7C3AED" />
              <stop offset="45%" stopColor="#A78BFA" />
              <stop offset="100%" stopColor="#60A5FA" />
            </>
          )}
        </linearGradient>

        {/* Ribbon Gradient 2: Blue Glow to Lavender */}
        <linearGradient id={`${gradientId}-ribbon-2`} x1="100" y1="30" x2="30" y2="110" gradientUnits="userSpaceOnUse">
          {isMono ? (
            <>
              <stop offset="0%" stopColor="#E2E8F0" />
              <stop offset="100%" stopColor="#64748B" />
            </>
          ) : isMonoDark ? (
            <>
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0B0B14" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="55%" stopColor="#A78BFA" />
              <stop offset="100%" stopColor="#5B21B6" />
            </>
          )}
        </linearGradient>

        {/* Ribbon Gradient 3: Underflow fold */}
        <linearGradient id={`${gradientId}-ribbon-3`} x1="40" y1="100" x2="90" y2="20" gradientUnits="userSpaceOnUse">
          {isMono ? (
            <>
              <stop offset="0%" stopColor="#CBD5E1" />
              <stop offset="100%" stopColor="#475569" />
            </>
          ) : isMonoDark ? (
            <>
              <stop offset="0%" stopColor="#1E293B" />
              <stop offset="100%" stopColor="#020617" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#C4B5FD" />
              <stop offset="50%" stopColor="#7C3AED" />
              <stop offset="100%" stopColor="#4C1D95" />
            </>
          )}
        </linearGradient>

        {/* Specular Highlight Gradient */}
        <linearGradient id={`${gradientId}-specular`} x1="30" y1="25" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        {/* Ambient Soft Glow Filter */}
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#7C3AED" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Outer Glow Halo */}
      <circle cx="60" cy="60" r="46" fill="#A78BFA" fillOpacity={isMono || isMonoDark ? '0' : '0.04'} />

      {/* Abstract Interwoven Ribbon Loops (Trefoil Mobius Topology) */}
      <g filter={`url(#${glowId})`}>
        {/* Loop Segment A: Top-Right loop flowing under */}
        <path
          d="M 60 22 C 78 22 96 35 96 56 C 96 74 82 86 64 92 C 50 96 36 90 28 80 C 20 70 20 54 30 42 C 40 30 52 28 60 22 Z"
          fill={`url(#${gradientId}-ribbon-1)`}
          fillOpacity="0.95"
        />

        {/* Loop Segment B: Interwoven Bottom fold crossing across */}
        <path
          d="M 32 46 C 44 32 66 30 82 42 C 94 52 98 68 90 82 C 82 94 66 98 52 94 C 36 88 26 72 28 56 C 29 52 30 49 32 46 Z"
          fill={`url(#${gradientId}-ribbon-2)`}
          fillOpacity="0.85"
        />

        {/* Loop Segment C: Inner crest with core shadow to produce volumetric ribbon depth */}
        <path
          d="M 48 38 C 58 32 74 36 82 46 C 88 54 88 66 80 74 C 72 82 58 84 48 78 C 38 72 36 60 42 50 C 44 45 46 41 48 38 Z"
          fill={`url(#${gradientId}-ribbon-3)`}
          fillOpacity="0.9"
        />

        {/* Specular Ridge / Light Edge */}
        <path
          d="M 52 24 C 68 24 88 36 92 52 C 94 60 90 70 82 78"
          stroke={`url(#${gradientId}-specular)`}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M 32 50 C 38 40 50 34 64 34"
          stroke={`url(#${gradientId}-specular)`}
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

/**
 * Reusable QLYQ Logo Component
 * Supports standalone symbol, horizontal lockup, vertical lockup, and dark/light/monochrome themes.
 */
export const QlyqLogo: React.FC<QlyqLogoProps> = ({
  variant = 'horizontal',
  theme = 'dark',
  size = 32,
  className = '',
  showTagline = true,
}) => {
  const isLight = theme === 'light';
  const isMono = theme === 'monochrome';
  const isMonoDark = theme === 'monochrome-dark';

  const textColor = isLight
    ? 'text-slate-900'
    : isMono
    ? 'text-white'
    : isMonoDark
    ? 'text-slate-900'
    : 'text-white';

  const taglineColor = isLight
    ? 'text-slate-500'
    : isMono
    ? 'text-slate-400'
    : isMonoDark
    ? 'text-slate-600'
    : 'text-slate-400';

  if (variant === 'symbol') {
    return <QlyqSymbol size={size} theme={theme} className={className} />;
  }

  return (
    <div
      className={`inline-flex items-center gap-3 select-none ${
        variant === 'vertical' ? 'flex-col text-center' : 'flex-row'
      } ${className}`}
    >
      <QlyqSymbol size={size} theme={theme} />

      <div className={`flex flex-col ${variant === 'vertical' ? 'items-center' : 'items-start'}`}>
        <div className="flex items-center gap-1.5">
          <span
            className={`font-sans font-extrabold tracking-tight ${textColor}`}
            style={{ fontSize: `${Math.max(16, size * 0.65)}px`, lineHeight: 1 }}
          >
            QLYQ
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mb-2 animate-pulse" />
        </div>

        {showTagline && (
          <span
            className={`font-sans uppercase font-semibold tracking-wider mt-1 ${taglineColor}`}
            style={{ fontSize: `${Math.max(9, size * 0.28)}px`, letterSpacing: '0.08em' }}
          >
            Think less. Ship more.
          </span>
        )}
      </div>
    </div>
  );
};

export default QlyqLogo;
