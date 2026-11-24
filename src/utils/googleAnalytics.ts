/**
 * Google Analytics 4: visitors, new vs returning users, countries, devices.
 *
 * The Measurement ID comes from the VITE_GA_MEASUREMENT_ID setting (Vercel → Project →
 * Settings → Environment Variables, or a local `.env.local`), so it isn't in the code.
 * Nothing loads without it, or while developing locally.
 */

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

/** GA4 Measurement IDs look like G-XXXXXXXXXX. */
const ID_FORMAT = /^G-[A-Z0-9]{4,}$/;

export function initGoogleAnalytics(): void {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
  if (!id || import.meta.env.DEV) return;
  if (!ID_FORMAT.test(id)) {
    console.warn('Google Analytics: VITE_GA_MEASUREMENT_ID should look like G-XXXXXXXXXX');
    return;
  }

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  // gtag must push the `arguments` object itself (that's how Google's snippet works).
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', id);
}
