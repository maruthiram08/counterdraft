import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Serif, IBM_Plex_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { CSPostHogProvider } from "./providers";
import PostHogPageView from "./PostHogPageView";
import { FloatingFeedbackButton } from "@/components/shared/FloatingFeedbackButton";
import { Toaster } from 'sonner';
import { CouponClaimer } from "@/components/auth/CouponClaimer";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const plexSerif = IBM_Plex_Serif({
  variable: "--font-plex-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
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
            className={`${plexSans.variable} ${plexSerif.variable} ${plexMono.variable}`}
          >
            <PostHogPageView />
            <FloatingFeedbackButton />
            <CouponClaimer />
            {children}
            <Toaster position="bottom-right" />
            <script src="https://checkout.razorpay.com/v1/checkout.js" async />
          </body>
        </CSPostHogProvider>
      </html>
    </ClerkProvider>
  );
}
