"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { usePostHog } from 'posthog-js/react';

interface NavbarProps {
  isScrolled?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ isScrolled = false }) => {
  const posthog = usePostHog();

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled ? 'bg-canvas/85 backdrop-blur-xl py-3 shadow-raised' : 'bg-transparent py-4 md:py-8'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-10 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-1.5 md:gap-3 group cursor-pointer min-w-0">
          <Image src="/brand/logo-icon.png" alt="Counterdraft Icon" width={36} height={36} className="h-8 w-8 md:h-9 md:w-9 shrink-0 group-hover:scale-105 transition-transform" />
          <Image src="/brand/logo-text.png" alt="Counterdraft" width={200} height={44} className="h-8 md:h-[44px] w-auto mt-0.5" />
        </Link>

        <div className="hidden lg:flex items-center gap-10">
          <a href="#the-brain" className="text-ink-soft hover:text-ember-600 transition-colors text-sm font-medium">How It Works</a>
          <a href="#command-center" className="text-ink-soft hover:text-ember-600 transition-colors text-sm font-medium">Organize</a>
          <a href="#smart-studio" className="text-ink-soft hover:text-ember-600 transition-colors text-sm font-medium">Repurpose</a>
          <a href="#" className="text-ink-soft hover:text-ember-600 transition-colors text-sm font-medium">Blog</a>
        </div>

        <div className="flex items-center gap-3 md:gap-6 shrink-0">
          <SignedOut>
            <div className="flex items-center gap-1 md:gap-4">
              <SignInButton mode="modal">
                <button className="h-10 px-3 whitespace-nowrap text-ink-soft hover:text-ember-600 transition-colors text-sm font-medium">
                  Sign In
                </button>
              </SignInButton>
              <Link href="/sign-up" onClick={() => posthog?.capture('click_get_started', { location: 'navbar' })}>
                <button className="h-10 px-4 md:px-5 whitespace-nowrap rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all">
                  Get Started
                </button>
              </Link>
            </div>
          </SignedOut>

          <SignedIn>
            <Link href="/workspace">
              <button className="h-10 px-3 whitespace-nowrap text-ink-soft hover:text-ember-600 transition-colors text-sm font-medium md:mr-4">
                Dashboard
              </button>
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>
    </nav>
  );
};
