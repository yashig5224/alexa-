import React from 'react';

export interface QlyqLogoProps {
  variant?: 'symbol' | 'horizontal' | 'vertical';
  theme?: 'dark' | 'light' | 'monochrome';
  size?: number;
  className?: string;
  showTagline?: boolean;
  animate?: boolean;
}

/**
 * QLYQ Brand Symbol — Geometric Q-ring with inner spark
 *
 * Design rationale:
 * - Bold outer ring with a sharp diagonal tail → letter Q
 * - Inner 4-pointed diamond spark → intelligence / AI core
 * - Violet → blue gradient ties to the QLYQ design system
 * - Readable at 16 px and crisp at 256 px
 */
export const QlyqSymbol: React.FC<{
  size?: number;
  theme?: 'dark' | 'light' | 'monochrome';
  className?: string;
  animate?: boolean;
}> = ({ size = 32, theme = 'dark', className = '', animate = false }) => {
  const uid = React.useId().replace(/:/g, '');
  const isDark  = theme === 'dark';
  const isLight = theme === 'light';
  const isMono  = theme === 'monochrome';

  const ringStroke  = isMono ? (isLight ? '#312E81' : '#94A3B8') : `url(#${uid}-ring)`;
  const tailStroke  = isMono ? (isLight ? '#4338CA' : '#64748B') : `url(#${uid}-ring)`;
  const sparkFill   = isMono ? (isLight ? '#4338CA' : '#CBD5E1') : `url(#${uid}-spark)`;
  const bgOpacity   = isDark ? '0.07' : '0';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${animate ? 'animate-pulse' : ''} ${className}`}
      aria-label="QLYQ"
      role="img"
    >
      <defs>
        {/* Ring: violet → lavender → sky */}
        <linearGradient id={`${uid}-ring`} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#7C3AED" />
          <stop offset="55%"  stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#60A5FA" />
        </linearGradient>

        {/* Spark: soft lavender → cyan */}
        <linearGradient id={`${uid}-spark`} x1="17" y1="17" x2="31" y2="31" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#C4B5FD" />
          <stop offset="100%" stopColor="#67E8F9" />
        </linearGradient>

        {/* Ambient glow */}
        <filter id={`${uid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b" />
          <feColorMatrix in="b" type="matrix"
            values="0 0 0 0 0.49  0 0 0 0 0.35  0 0 0 0 0.98  0 0 0 0.65 0"
            result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Tinted backdrop disc */}
      <circle cx="24" cy="24" r="22" fill="#7C3AED" fillOpacity={bgOpacity} />

      {/* ── Q ring ── */}
      <circle
        cx="22" cy="20"
        r="10"
        stroke={ringStroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        fill="none"
        filter={isDark ? `url(#${uid}-glow)` : undefined}
      />

      {/* ── Q tail (diagonal, bottom-right) ── */}
      <line
        x1="29" y1="27"
        x2="37" y2="37"
        stroke={tailStroke}
        strokeWidth="3.4"
        strokeLinecap="round"
        filter={isDark ? `url(#${uid}-glow)` : undefined}
      />

      {/* ── Inner spark / 4-pointed diamond ── */}
      <path
        d="M22 13.5 L23.2 18.8 L28.5 20 L23.2 21.2 L22 26.5 L20.8 21.2 L15.5 20 L20.8 18.8 Z"
        fill={sparkFill}
        opacity="0.92"
      />
    </svg>
  );
};

/**
 * QLYQ Wordmark text block
 */
const QlyqWordmark: React.FC<{
  theme?: 'dark' | 'light' | 'monochrome';
  size?: number;
  showTagline?: boolean;
}> = ({ theme = 'dark', size = 20, showTagline = false }) => {
  const isLight = theme === 'light';
  const isMono  = theme === 'monochrome';
  const nameColor    = isMono ? (isLight ? '#0F172A' : '#F1F5F9') : '#FFFFFF';
  const taglineColor = isMono ? (isLight ? '#475569' : '#64748B') : '#6D7DA8';

  return (
    <div className="flex flex-col items-start select-none">
      <div className="flex items-end gap-1" style={{ lineHeight: 1 }}>
        <span
          style={{
            fontSize: `${size}px`,
            fontFamily: "'Inter', system-ui, sans-serif",
            fontWeight: 800,
            letterSpacing: '-0.04em',
            color: nameColor,
          }}
        >
          QLYQ
        </span>
        {/* Accent dot */}
        <span
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg,#A78BFA,#60A5FA)',
            display: 'inline-block',
            marginBottom: '3px',
            flexShrink: 0,
          }}
        />
      </div>
      {showTagline && (
        <span
          style={{
            fontSize: `${Math.max(8, Math.round(size * 0.42))}px`,
            fontFamily: "'Inter', system-ui, sans-serif",
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: taglineColor,
            marginTop: '4px',
          }}
        >
          Think less. Ship more.
        </span>
      )}
    </div>
  );
};

/**
 * Full QLYQ Logo lockup — symbol + wordmark
 */
export const QlyqLogo: React.FC<QlyqLogoProps> = ({
  variant = 'horizontal',
  theme = 'dark',
  size = 32,
  className = '',
  showTagline = false,
  animate = false,
}) => {
  if (variant === 'symbol') {
    return <QlyqSymbol size={size} theme={theme} className={className} animate={animate} />;
  }

  const tileSize  = size + 12;
  const tileRadius = Math.round(tileSize * 0.27);

  return (
    <div
      className={`inline-flex select-none ${
        variant === 'vertical' ? 'flex-col items-center gap-2' : 'flex-row items-center gap-2.5'
      } ${className}`}
    >
      {/* Symbol tile with gradient border */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: `${tileSize}px`,
          height: `${tileSize}px`,
          borderRadius: `${tileRadius}px`,
          background: 'linear-gradient(135deg, rgba(124,58,237,0.16) 0%, rgba(96,165,250,0.09) 100%)',
          border: '1px solid rgba(167,139,250,0.2)',
          flexShrink: 0,
        }}
      >
        <QlyqSymbol size={size} theme={theme} animate={animate} />
      </div>

      <QlyqWordmark
        theme={theme}
        size={Math.max(14, Math.round(size * 0.65))}
        showTagline={showTagline}
      />
    </div>
  );
};

export default QlyqLogo;
