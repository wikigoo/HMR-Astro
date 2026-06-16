import * as React from 'react';

/**
 * HMR GlassCard — translucent navy surface with cyan hairline + blur.
 */
export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Use the more opaque fill. @default false */
  strong?: boolean;
  /** Enable hover lift + glow. @default true */
  hover?: boolean;
  /** CSS padding. @default 'var(--space-6)' */
  padding?: string;
}

export function GlassCard(props: GlassCardProps): JSX.Element;
