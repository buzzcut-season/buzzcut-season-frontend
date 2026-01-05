import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Buzzcut Marketplace",
  description: "Product feed + email-code auth",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  return (
    <html lang="ru">
      <body className="bg-aurora">
        {recaptchaKey ? (
          <Script
            src={`https://www.google.com/recaptcha/api.js?render=${recaptchaKey}`}
            strategy="afterInteractive"
            data-recaptcha-v3="true"
          />
        ) : null}
        {children}
      </body>
    </html>
  );
}
