import * as React from 'react';

/** HMR IconWell — translucent rounded tile holding a line icon. */
export interface IconWellProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Square size in px. @default 48 */
  size?: number;
  /** Tint. @default 'cyan' */
  accent?: 'cyan' | 'blue' | 'indigo';
}

export function IconWell(props: IconWellProps): JSX.Element;
