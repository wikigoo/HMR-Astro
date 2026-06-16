import React from 'react';

/**
 * HMR LangToggle — the bilingual EN/FA pill switch in the nav.
 * Controlled: pass lang ('en' | 'fa') and onChange.
 */
export function LangToggle({ lang = 'en', onChange = () => {} }) {
  const opt = (code, label) => {
    const active = lang === code;
    return (
      <button
        type="button"
        key={code}
        onClick={() => onChange(code)}
        style={{
          border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-en)', fontWeight: 600, fontSize: 'var(--fs-sm)',
          padding: '6px 14px', borderRadius: 'var(--radius-pill)',
          background: active ? 'var(--gradient-cta)' : 'transparent',
          color: active ? 'var(--text-on-accent)' : 'var(--text-secondary)',
          boxShadow: active ? '0 2px 12px rgba(0,212,255,0.3)' : 'none',
          transition: 'all var(--dur-med) var(--ease-out)',
        }}
      >
        {label}
      </button>
    );
  };
  return (
    <div
      style={{
        display: 'inline-flex', gap: '2px', padding: '3px',
        background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-pill)',
        backdropFilter: 'var(--blur-glass-sm)', WebkitBackdropFilter: 'var(--blur-glass-sm)',
      }}
    >
      {opt('en', 'EN')}
      {opt('fa', 'فا')}
    </div>
  );
}
