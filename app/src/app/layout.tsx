import type { Metadata } from "next";
import { Inter, Newsreader, JetBrains_Mono, Outfit } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { CSPostHogProvider } from "./providers";
import PostHogPageView from "./PostHogPageView";
import { FloatingFeedbackButton } from "@/components/shared/FloatingFeedbackButton";
import { Toaster } from 'sonner';

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
  title: "Counterdraft — Write Content That Sounds Like You",
  description: "The writing tool for LinkedIn posts, blog articles, newsletters, and books. Find your angle and publish without sounding generic.",
  keywords: ["writing tool", "LinkedIn content", "newsletter creator", "blog writing", "content creation", "Substack", "Medium"],
  openGraph: {
    title: "Counterdraft — Write Content That Sounds Like You",
    description: "The writing tool for creators who want to stand out.",
    type: "website",
    url: "https://counterdraft.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Counterdraft",
    description: "The writing tool for creators who want to stand out.",
  }
};

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
            <Toaster position="bottom-right" />
          </body>
        </CSPostHogProvider>
      </html>
    </ClerkProvider>
  );
}
