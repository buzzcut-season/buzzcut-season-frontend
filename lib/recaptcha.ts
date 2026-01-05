declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

let loadPromise: Promise<void> | null = null;

function loadRecaptchaScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("reCAPTCHA can only run in browser"));
  }
  if (window.grecaptcha) return Promise.resolve();
  if (!SITE_KEY) {
    return Promise.reject(new Error("NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set"));
  }
  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector("script[data-recaptcha-v3='true']");
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Failed to load reCAPTCHA")), {
          once: true,
        });
        return;
      }
      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
      script.async = true;
      script.defer = true;
      script.dataset.recaptchaV3 = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load reCAPTCHA"));
      document.head.appendChild(script);
    });
  }
  return loadPromise;
}

export async function getRecaptchaToken(action: string): Promise<string> {
  if (!SITE_KEY) {
    throw new Error("NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set");
  }
  await loadRecaptchaScript();
  const grecaptcha = window.grecaptcha;
  if (!grecaptcha) {
    throw new Error("reCAPTCHA is not available");
  }
  return new Promise((resolve, reject) => {
    grecaptcha.ready(() => {
      grecaptcha.execute(SITE_KEY, { action }).then(resolve).catch(reject);
    });
  });
}

