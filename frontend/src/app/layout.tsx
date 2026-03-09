import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finanças — Controle Financeiro",
  description: "Sistema de controle financeiro pessoal com Telegram",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.svg", type: "image/svg+xml" },
      { url: "/icon-512.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icon-192.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a1a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>
      <body style={{ fontFamily: "'Inter', sans-serif" }}>{children}</body>
    </html>
  );
}
