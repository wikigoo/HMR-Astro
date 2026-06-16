import React from 'react';

/**
 * HMR SuggestionChip — a tappable sample-question pill shown above the
 * composer to seed the conversation.
 */
export function SuggestionChip({ children, onClick, rtl = false, style = {} }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: rtl ? 'var(--font-fa)' : 'var(--font-en)',
        fontSize: 'var(--fs-sm)',
        color: 'var(--text-secondary)',
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-pill)',
        padding: '8px 16px',
        cursor: 'pointer',
        backdropFilter: 'var(--blur-glass-sm)',
        WebkitBackdropFilter: 'var(--blur-glass-sm)',
        transition: 'all var(--dur-med) var(--ease-out)',
        direction: rtl ? 'rtl' : 'ltr',
        whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-glow)';
        e.currentTarget.style.color = 'var(--text-body)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
        e.currentTarget.style.color = 'var(--text-secondary)';
      }}
    >
      {children}
    </button>
  );
}
