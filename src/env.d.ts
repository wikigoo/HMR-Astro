/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user?: { username: string; role: string };
  }
}

interface GoogleCredentialResponse {
  credential: string;
}

interface Window {
  onGoogleLibraryLoad?: () => void;
  __hmrOnCredential?: (response: GoogleCredentialResponse) => void;
  google?: {
    accounts: {
      id: {
        initialize: (config: {
          client_id: string;
          callback: (response: GoogleCredentialResponse) => void;
          auto_select?: boolean;
          cancel_on_tap_outside?: boolean;
          use_fedcm_for_prompt?: boolean;
        }) => void;
        prompt?: () => void;
        renderButton?: (parent: HTMLElement, options: Record<string, unknown>) => void;
      };
    };
  };
}
