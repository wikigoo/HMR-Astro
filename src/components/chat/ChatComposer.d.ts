import * as React from 'react';

/**
 * HMR ChatComposer — glass input bar + neon send button.
 */
export interface ChatComposerProps {
  value?: string;
  onChange?: (value: string) => void;
  onSend?: () => void;
  placeholder?: string;
  /** Persian RTL. @default false */
  rtl?: boolean;
}

export function ChatComposer(props: ChatComposerProps): JSX.Element;
