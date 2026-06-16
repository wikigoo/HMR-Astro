import React from 'react';

/**
 * HMR Badge — small pill label. Used for hero eyebrows and status tags.
 * tone: 'brand' | 'neutral' | 'success' | 'warning' | 'danger'
 */
export function Badge({ children, tone = 'brand', dot = false, style = {}, ...rest }) {
  const tones = {
    brand:   { color: 'var(--accent)',    border: 'var(--border-subtle)', bg: 'var(--surface-well)' },
    neutral: { color: 'var(--text-secondary)', border: 'var(--border-hairline)', bg: 'var(--surface-card)' },
    success: { color: 'var(--hmr-success)', border: 'rgba(52,224,161,0.3)', bg: 'rgba(52,224,161,0.1)' },
    warning: { color: 'var(--hmr-warning)', border: 'rgba(246,183,60,0.3)', bg: 'rgba(246,183,60,0.1)' },
    danger:  { color: 'var(--hmr-danger)', border: 'rgba(255,84,112,0.3)', bg: 'rgba(255,84,112,0.1)' },
  };
  const t = tones[tone] || tones.brand;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '7px',
        fontFamily: 'var(--font-en)', fontWeight: 600,
        fontSize: 'var(--fs-badge)', letterSpacing: 'var(--ls-badge)',
        textTransform: 'uppercase',
        color: t.color, background: t.bg,
        border: `1px solid ${t.border}`, borderRadius: 'var(--radius-pill)',
        padding: '6px 14px', lineHeight: 1,
        backdropFilter: 'var(--blur-glass-sm)', WebkitBackdropFilter: 'var(--blur-glass-sm)',
        ...style,
      }}
      {...rest}
    >
      {dot && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.color, boxShadow: `0 0 8px ${t.color}` }} />
      )}
      {children}
    </span>
  );
}
