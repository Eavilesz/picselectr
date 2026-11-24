import type { Metadata } from "next";
import { Cormorant_Garamond, Geist, Pinyon_Script } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// STTORIA's brand serif, used by the landing page and the client pages
const cormorant = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
});

// Script accent ("ser eterna"), only used on the landing page
const pinyon = Pinyon_Script({
  variable: "--font-script",
  subsets: ["latin"],
  weight: "400",
});

// Absolute base for og:image URLs — link previews (WhatsApp) need full URLs
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Picselectr — Selección de Fotos",
  description: "Selecciona tus fotos favoritas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${cormorant.variable} ${pinyon.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
