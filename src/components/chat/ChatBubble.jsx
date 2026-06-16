import React from 'react';

/**
 * HMR ChatBubble — a single message in the advisor chat.
 * role: 'user' (neon-tinted, trailing side) | 'assistant' (glass, leading side)
 * Set rtl for Persian conversations.
 */
export function ChatBubble({ role = 'assistant', children, rtl = false, style = {} }) {
  const isUser = role === 'user';
  const align = isUser ? 'flex-end' : 'flex-start';
  const userBg = 'linear-gradient(120deg, rgba(0,212,255,0.18), rgba(47,107,255,0.18))';
  return (
    <div style={{ display: 'flex', justifyContent: align, direction: rtl ? 'rtl' : 'ltr' }}>
      <div
        style={{
          maxWidth: '78%',
          padding: '12px 16px',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isUser ? userBg : 'var(--surface-card)',
          border: `1px solid ${isUser ? 'var(--border-blue)' : 'var(--border-subtle)'}`,
          color: 'var(--text-body)',
          fontSize: 'var(--fs-body)',
          lineHeight: 'var(--lh-body)',
          backdropFilter: 'var(--blur-glass)',
          WebkitBackdropFilter: 'var(--blur-glass)',
          boxShadow: isUser ? '0 4px 18px rgba(0,212,255,0.12)' : 'var(--shadow-card-rest)',
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
}
