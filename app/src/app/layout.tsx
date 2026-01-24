import type { Metadata } from "next";
import { Inter, Newsreader, JetBrains_Mono, Outfit } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { CSPostHogProvider } from "./providers";
import PostHogPageView from "./PostHogPageView";
import { FloatingFeedbackButton } from "@/components/shared/FloatingFeedbackButton";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <CSPostHogProvider>
          <body
            className={`${inter.variable} ${newsreader.variable} ${jetbrainsMono.variable} ${outfit.variable}`}
          >
            <PostHogPageView />
            <FloatingFeedbackButton />
            {children}
          </body>
        </CSPostHogProvider>
      </html>
    </ClerkProvider>
  );
}

