import { useEffect, useRef } from "react";

/**
 * Widget Cloudflare Turnstile (CAPTCHA invisible/managed) en rendu explicite.
 * Charge le script une seule fois, monte le widget et remonte le token via
 * onToken. onExpire est appelé à l'expiration ou en cas d'erreur (token à rejouer).
 */
interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    if (window.turnstile) return resolve();
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Turnstile : échec du chargement."));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

interface TurnstileProps {
  siteKey: string;
  onToken: (token: string) => void;
  onExpire?: () => void;
}

const Turnstile = ({ siteKey, onToken, onExpire }: TurnstileProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  // Callbacks dans des refs : le widget n'est monté qu'une fois, on garde
  // toujours la dernière version sans le re-render.
  const onTokenRef = useRef(onToken);
  const onExpireRef = useRef(onExpire);
  onTokenRef.current = onToken;
  onExpireRef.current = onExpire;

  useEffect(() => {
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onExpireRef.current?.(),
          "error-callback": () => onExpireRef.current?.(),
        });
      })
      .catch(() => onExpireRef.current?.());

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [siteKey]);

  return <div ref={containerRef} />;
};

export default Turnstile;
