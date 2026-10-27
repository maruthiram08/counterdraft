import type { Metadata, Viewport } from "next";
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
  // Upright only: italics are used in a handful of captions, and the browser can slant those.
  // Each extra style is four more font files on every first load, which phones feel most.
  weight: ["400", "500", "600", "700"],
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
  description: "The writing tool for LinkedIn posts, with Medium articles, Instagram carousels, X threads and newsletters from each one. Find your angle and publish without sounding generic.",
  keywords: ["writing tool", "LinkedIn content", "LinkedIn posts", "content creation", "Medium", "Instagram carousel", "X threads", "newsletters"],
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

// Mobile first: fit the device width, let content reach the screen edges so the
// safe-area insets (iPhone notch and home indicator) are reported to CSS, and tint
// the browser chrome to match the canvas.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ecedf1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${plexSans.variable} ${plexSerif.variable} ${plexMono.variable}`}
        suppressHydrationWarning
      >
        <CSPostHogProvider>
          <body>
            <PostHogPageView />
            <FloatingFeedbackButton />
            <CouponClaimer />
            {children}
            {/* On phones, toasts sit above the bottom nav instead of on top of it */}
            <Toaster position="bottom-right" mobileOffset={{ bottom: 104 }} />
          </body>
        </CSPostHogProvider>
      </html>
    </ClerkProvider>
  );
}
