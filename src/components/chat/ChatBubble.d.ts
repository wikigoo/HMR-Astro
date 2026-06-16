import * as React from 'react';

/** HMR ChatBubble — a single advisor-chat message. */
export interface ChatBubbleProps {
  /** @default 'assistant' */
  role?: 'user' | 'assistant';
  children: React.ReactNode;
  /** Right-to-left for Persian. @default false */
  rtl?: boolean;
  style?: React.CSSProperties;
}

export function ChatBubble(props: ChatBubbleProps): JSX.Element;
