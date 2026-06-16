import * as React from 'react';

/**
 * HMR PillarCard — feature card for a product pillar (icon + title + copy + sample question).
 */
export interface PillarCardProps {
  /** Icon node or glyph. @default '◈' */
  icon?: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  /** Italic sample question shown under a hairline. */
  question?: React.ReactNode;
  /** @default 'cyan' */
  accent?: 'cyan' | 'blue' | 'indigo';
  /** Persian RTL. @default false */
  rtl?: boolean;
  style?: React.CSSProperties;
}

export function PillarCard(props: PillarCardProps): JSX.Element;
