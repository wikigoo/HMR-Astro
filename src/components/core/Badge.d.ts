import * as React from 'react';

/** HMR Badge — uppercase pill for eyebrows and status tags. */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  /** @default 'brand' */
  tone?: 'brand' | 'neutral' | 'success' | 'warning' | 'danger';
  /** Show a leading glow dot. @default false */
  dot?: boolean;
}

export function Badge(props: BadgeProps): JSX.Element;
