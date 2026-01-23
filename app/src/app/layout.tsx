import type { Metadata } from "next";
import { Inter, Newsreader, JetBrains_Mono, Outfit } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Counterdraft | The Professional OS for Thought Leadership",
  description: "Escape generative slop. Counterdraft is the strategic writing platform for experts who want to build authority, not just content.",
  keywords: ["Thought Leadership Software", "Content Strategy Tool", "Anti-AI Writing", "Executive Personal Branding", "Editorial Workflow"],
  openGraph: {
    title: "Counterdraft",
    description: "Write with conviction. The first editorial engine designed for unique expertise.",
    type: "website",
    locale: "en_US",
    siteName: "Counterdraft",
  },
  twitter: {
    card: "summary_large_image",
    title: "Counterdraft | Own Your Expertise",
    description: "Don't outsource your brain to a prompt. Build meaningful authority.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${inter.variable} ${newsreader.variable} ${jetbrainsMono.variable} ${outfit.variable}`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

