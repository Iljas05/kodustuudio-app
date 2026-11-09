import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// "latin-ext" covers Estonian letters such as š and ž in addition to õ, ä, ö and ü.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "KoduStuudio – virtuaalne sisustusabiline",
  description:
    "KoduStuudio on eestikeelne virtuaalne sisustusabiline, mis annab nõu mööbli paigutuse, valguse, värvide ja kodukaunistuste kohta. Õppeprojekti demoversioon.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="et" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
