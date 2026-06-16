import * as React from 'react';

/** HMR SuggestionChip — tappable sample-question pill. */
export interface SuggestionChipProps {
  children: React.ReactNode;
  onClick?: () => void;
  /** Persian RTL. @default false */
  rtl?: boolean;
  style?: React.CSSProperties;
}

export function SuggestionChip(props: SuggestionChipProps): JSX.Element;
