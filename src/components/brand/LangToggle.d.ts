import * as React from 'react';

/** HMR LangToggle — bilingual EN / فا pill switch. */
export interface LangToggleProps {
  /** @default 'en' */
  lang?: 'en' | 'fa';
  onChange?: (lang: 'en' | 'fa') => void;
}

export function LangToggle(props: LangToggleProps): JSX.Element;
