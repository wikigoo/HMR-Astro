import React from 'react';

/**
 * HMR GlassCard — the defining surface: translucent navy fill,
 * cyan hairline, backdrop blur, soft shadow. Lifts + glows on hover.
 */
export function GlassCard({
  children,
  strong = false,
  hover = true,
  padding = 'var(--space-6)',
  style = {},
  ...rest
}) {
  const base = {
    background: strong ? 'var(--surface-card-2)' : 'var(--surface-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-xl)',
    padding,
    backdropFilter: 'var(--blur-glass)',
    WebkitBackdropFilter: 'var(--blur-glass)',
    boxShadow: 'var(--shadow-card-rest)',
    transition: 'transform var(--dur-med) var(--ease-out), box-shadow var(--dur-med) var(--ease-out), border-color var(--dur-med) var(--ease-out)',
  };
  return (
    <div
      style={{ ...base, ...style }}
      onMouseEnter={(e) => {
        if (!hover) return;
        e.currentTarget.style.transform = 'var(--lift-card)';
        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
        e.currentTarget.style.borderColor = 'var(--border-glow)';
      }}
      onMouseLeave={(e) => {
        if (!hover) return;
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'var(--shadow-card-rest)';
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
