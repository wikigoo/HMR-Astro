import React from 'react';

/**
 * HMR Button — neon-glass call to action.
 * variant: 'primary' (gradient fill) | 'secondary' (glass outline) | 'ghost'
 * size: 'sm' | 'md' | 'lg'
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  iconLeft = null,
  iconRight = null,
  disabled = false,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: { padding: '8px 16px', fontSize: '0.82rem', radius: 'var(--radius-sm)' },
    md: { padding: '12px 24px', fontSize: '0.92rem', radius: 'var(--radius-lg)' },
    lg: { padding: '15px 32px', fontSize: '1rem', radius: 'var(--radius-lg)' },
  };
  const s = sizes[size] || sizes.md;

  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: 'var(--font-en)',
    fontWeight: 600,
    fontSize: s.fontSize,
    padding: s.padding,
    borderRadius: s.radius,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    border: '1px solid transparent',
    transition: 'transform var(--dur-med) var(--ease-out), box-shadow var(--dur-med) var(--ease-out), background var(--dur-med) var(--ease-out)',
    whiteSpace: 'nowrap',
    lineHeight: 1,
  };

  const variants = {
    primary: {
      background: 'var(--gradient-cta)',
      color: 'var(--text-on-accent)',
      boxShadow: 'var(--shadow-cta)',
    },
    secondary: {
      background: 'var(--surface-card)',
      color: 'var(--text-body)',
      borderColor: 'var(--border-subtle)',
      backdropFilter: 'var(--blur-glass)',
      WebkitBackdropFilter: 'var(--blur-glass)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-secondary)',
    },
  };

  return (
    <button
      type="button"
      disabled={disabled}
      style={{ ...base, ...(variants[variant] || variants.primary), ...style }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = 'var(--lift-cta)';
        if (variant === 'primary') e.currentTarget.style.boxShadow = 'var(--shadow-cta-hover)';
        if (variant === 'secondary') e.currentTarget.style.borderColor = 'var(--border-glow)';
        if (variant === 'ghost') e.currentTarget.style.color = 'var(--accent)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        if (variant === 'primary') e.currentTarget.style.boxShadow = 'var(--shadow-cta)';
        if (variant === 'secondary') e.currentTarget.style.borderColor = 'var(--border-subtle)';
        if (variant === 'ghost') e.currentTarget.style.color = 'var(--text-secondary)';
      }}
      {...rest}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
}
