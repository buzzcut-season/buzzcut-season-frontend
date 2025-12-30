import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buzzcut Marketplace",
  description: "Product feed + email-code auth",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-aurora">
        {children}
      </body>
    </html>
  );
}
