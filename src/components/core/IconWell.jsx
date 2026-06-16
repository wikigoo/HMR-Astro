import React from 'react';

/**
 * HMR IconWell — translucent cyan-tinted rounded square that holds a
 * line icon. The deliberately-transparent container used across features.
 * size in px; pass a Lucide SVG (or any node) as children.
 */
export function IconWell({ children, size = 48, accent = 'cyan', style = {}, ...rest }) {
  const accents = {
    cyan:   { color: 'var(--hmr-cyan)',   bg: 'rgba(0,212,255,0.08)',  border: 'rgba(0,212,255,0.22)' },
    blue:   { color: 'var(--hmr-blue)',   bg: 'rgba(47,107,255,0.10)', border: 'rgba(47,107,255,0.28)' },
    indigo: { color: 'var(--hmr-indigo)', bg: 'rgba(99,102,241,0.10)', border: 'rgba(99,102,241,0.28)' },
  };
  const a = accents[accent] || accents.cyan;
  return (
    <div
      style={{
        width: size, height: size, flex: 'none',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 'var(--radius-md)',
        background: a.bg, border: `1px solid ${a.border}`, color: a.color,
        backdropFilter: 'var(--blur-glass-sm)', WebkitBackdropFilter: 'var(--blur-glass-sm)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
