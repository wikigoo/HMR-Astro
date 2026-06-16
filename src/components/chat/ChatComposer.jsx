import React from 'react';

/**
 * HMR ChatComposer — the glass input bar at the bottom of the chat:
 * a text field + neon send button. Controlled via value/onChange/onSend.
 */
export function ChatComposer({
  value = '',
  onChange = () => {},
  onSend = () => {},
  placeholder = 'Ask about any phone — price, faults, accessories…',
  rtl = false,
}) {
  return (
    <div
      style={{
        display: 'flex', gap: '10px', alignItems: 'center',
        padding: '8px 8px 8px 18px',
        background: 'var(--surface-card-2)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-pill)',
        backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)',
        direction: rtl ? 'rtl' : 'ltr',
      }}
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onSend(); }}
        placeholder={placeholder}
        style={{
          flex: 1, background: 'transparent', border: 'none', outline: 'none',
          color: 'var(--text-body)', fontFamily: rtl ? 'var(--font-fa)' : 'var(--font-en)',
          fontSize: 'var(--fs-body)',
        }}
      />
      <button
        type="button"
        onClick={onSend}
        aria-label="Send"
        style={{
          flex: 'none', width: 42, height: 42, borderRadius: '50%', border: 'none',
          cursor: 'pointer', background: 'var(--gradient-cta)', color: 'var(--text-on-accent)',
          boxShadow: 'var(--shadow-cta)', display: 'inline-flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 18, fontWeight: 700,
          transform: rtl ? 'scaleX(-1)' : 'none',
        }}
      >
        ↑
      </button>
    </div>
  );
}
