// Thin wrapper around Google Identity Services (loaded via the <script> in
// index.html). Renders the official sign-in button and forwards the ID-token
// credential, which the server verifies.

interface GoogleId {
  initialize(opts: {
    client_id: string;
    callback: (resp: { credential: string }) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }): void;
  renderButton(el: HTMLElement, opts: Record<string, unknown>): void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleId } };
  }
}

export function renderGoogleButton(
  el: HTMLElement,
  clientId: string,
  onCredential: (credential: string) => void,
): void {
  const tryInit = () => {
    const id = window.google?.accounts?.id;
    if (!id) {
      setTimeout(tryInit, 120);
      return;
    }
    id.initialize({
      client_id: clientId,
      callback: (resp) => onCredential(resp.credential),
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    id.renderButton(el, {
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "signin_with",
      width: 280,
    });
  };
  tryInit();
}
