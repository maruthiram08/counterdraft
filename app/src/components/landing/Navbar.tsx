import React from 'react';
import Link from 'next/link';
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

interface NavbarProps {
  isScrolled?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ isScrolled = false }) => {
  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled ? 'bg-white/80 backdrop-blur-xl border-b border-zinc-100 py-3 shadow-sm' : 'bg-transparent py-8'}`}>
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group cursor-pointer">
          <img src="/brand/logo-icon.png" alt="Counterdraft Icon" className="h-9 w-9 group-hover:scale-105 transition-transform" />
          <img src="/brand/logo-text.png" alt="Counterdraft" className="h-[44px] w-auto mt-0.5" />
        </Link>

        <div className="hidden lg:flex items-center gap-10">
          <a href="#the-brain" className="text-zinc-500 hover:text-green-600 transition-colors text-xs font-bold uppercase tracking-widest">The Brain</a>
          <a href="#command-center" className="text-zinc-500 hover:text-green-600 transition-colors text-xs font-bold uppercase tracking-widest">Pipeline</a>
          <a href="#smart-studio" className="text-zinc-500 hover:text-green-600 transition-colors text-xs font-bold uppercase tracking-widest">Studio</a>
          <a href="#" className="text-zinc-500 hover:text-green-600 transition-colors text-xs font-bold uppercase tracking-widest">Journal</a>
        </div>

        <div className="flex items-center gap-6">
          <SignedOut>
            <Link href="/waitlist">
              <button className="bg-zinc-900 text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-green-600 transition-all transform hover:scale-105 active:scale-95">
                Join Waitlist
              </button>
            </Link>
          </SignedOut>

          <SignedIn>
            <Link href="/workspace">
              <button className="text-zinc-500 hover:text-green-600 transition-colors text-xs font-bold uppercase tracking-widest mr-4">
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