import React from 'react';
import { GlassCard } from '../core/GlassCard.jsx';
import { IconWell } from '../core/IconWell.jsx';

/**
 * HMR PillarCard — the feature card for one of the five product pillars:
 * icon well + title + description + an italic sample question.
 */
export function PillarCard({ icon = '◈', title, description, question, accent = 'cyan', rtl = false, style = {} }) {
  return (
    <GlassCard style={{ direction: rtl ? 'rtl' : 'ltr', ...style }}>
      <IconWell accent={accent} size={52} style={{ marginBottom: 'var(--space-4)', fontSize: 22 }}>
        {icon}
      </IconWell>
      <h3 style={{
        margin: '0 0 8px', color: 'var(--text-body)',
        fontFamily: rtl ? 'var(--font-fa)' : 'var(--font-en)',
        fontSize: 'var(--fs-h3)', fontWeight: 600,
      }}>
        {title}
      </h3>
      <p style={{
        margin: 0, color: 'var(--text-secondary)',
        fontFamily: rtl ? 'var(--font-fa)' : 'var(--font-en)',
        fontSize: 'var(--fs-sm)', lineHeight: rtl ? 'var(--lh-relaxed)' : 'var(--lh-body)',
      }}>
        {description}
      </p>
      {question && (
        <p style={{
          margin: 'var(--space-4) 0 0', paddingTop: 'var(--space-3)',
          borderTop: '1px solid var(--border-hairline)',
          color: 'var(--accent)', fontStyle: 'italic',
          fontFamily: rtl ? 'var(--font-fa)' : 'var(--font-en)',
          fontSize: 'var(--fs-xs)',
        }}>
          “{question}”
        </p>
      )}
    </GlassCard>
  );
}
