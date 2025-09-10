// components/Turnstile.tsx
"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    onTurnstileLoad?: () => void;
    turnstile?: {
      render: (el: HTMLElement, opts: any) => string | number;
      remove: (widgetId: string | number) => void;
    };
    __turnstileRenderedOnce?: boolean; // dev guard
  }
}

type Props = {
  onVerify: (token: string) => void;
};

export default function Turnstile({ onVerify }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | number | null>(null);
  const doneRef = useRef(false); // lock after success
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) {
      console.warn("Turnstile: NEXT_PUBLIC_TURNSTILE_SITE_KEY not set — bypassing CAPTCHA in dev.");
      onVerify("dev-bypass");
      return;
    }

    const SCRIPT_ID = "turnstile-script";

    function cleanupWidget() {
      if (widgetIdRef.current != null && window.turnstile?.remove) {
        try { window.turnstile.remove(widgetIdRef.current); } catch {}
        widgetIdRef.current = null;
      }
      if (containerRef.current) containerRef.current.innerHTML = "";
    }

    function renderWidget() {
      if (doneRef.current) return; // already verified
      if (!containerRef.current || !window.turnstile) return;
      cleanupWidget();
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: "auto",
          callback: (token: string) => {
            if (doneRef.current) return;
            doneRef.current = true;
            onVerify(token);
            // remove widget after success so it can't stack
            setTimeout(() => cleanupWidget(), 0);
          },
        });
      } catch (e) {
        console.error("Turnstile render error", e);
      }
    }

    // Load script once globally
    if (!document.getElementById(SCRIPT_ID)) {
      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad";
      s.async = true;
      document.head.appendChild(s);
    }

    const prev = window.onTurnstileLoad;
    window.onTurnstileLoad = () => {
      // Render (guard will avoid duplicates after success)
      renderWidget();
    };

    if (window.turnstile) renderWidget();

    return () => {
      cleanupWidget();
      window.onTurnstileLoad = prev;
    };
  }, [onVerify, siteKey]);

  if (!siteKey) {
    return <div className="text-xs text-muted">CAPTCHA not configured (dev bypass).</div>;
  }

  return <div ref={containerRef} className="my-2" />;
}