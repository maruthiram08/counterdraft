import React from 'react';
import Link from 'next/link';
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { HeroInterface } from './HeroInterface';
import { LiveAuditWidget } from './LiveAuditWidget';
import { usePostHog } from 'posthog-js/react';

export const Hero: React.FC = () => {
  const posthog = usePostHog();

  return (
    <section className="relative pt-40 pb-24 md:pt-52 md:pb-40 px-4 hero-gradient overflow-hidden">
      <div className="max-w-7xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-green-50 border border-green-100 text-[11px] font-black text-green-700 mb-10 tracking-[0.2em] uppercase animate-fade-in-up shadow-sm">
          EDITORIAL ENGINE 2.5
        </div>
        <h1 className="font-display text-6xl md:text-[7rem] font-black tracking-tighter mb-10 max-w-6xl mx-auto leading-[0.9] text-zinc-900 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          Write with <span className="text-green-600">conviction</span>, not a prompt.
        </h1>
        <p className="text-zinc-500 text-xl md:text-2xl max-w-2xl mx-auto mb-14 font-medium leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          Stop publishing generative noise. Counterdraft is the <strong>Professional OS for Thought Leadership</strong>—designed to scale your unique expertise.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-28 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <SignedOut>
            <Link href="/waitlist" onClick={() => posthog?.capture('click_join_waitlist', { location: 'hero' })}>
              <button className="w-full sm:w-auto bg-green-600 text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-green-700 transition-all transform hover:scale-105 active:scale-95 shadow-xl shadow-green-600/20">
                Join Waitlist
              </button>
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/workspace">
              <button className="w-full sm:w-auto bg-green-600 text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-green-700 transition-all transform hover:scale-105 active:scale-95 shadow-xl shadow-green-600/20">
                Go to Dashboard
              </button>
            </Link>
          </SignedIn>
          <Link href="/philosophy" className="w-full sm:w-auto bg-white border border-zinc-200 text-zinc-900 px-10 py-5 rounded-xl font-bold text-lg hover:bg-zinc-50 transition-all flex items-center justify-center">
            The Philosophy
          </Link>
        </div>

        {/* Live Trial Widget */}
        <div className="mb-24 animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
          <LiveAuditWidget />
        </div>

        {/* Dashboard Preview Container */}
        <div className="relative mx-auto max-w-6xl px-4 md:px-0 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-4/5 h-48 bg-green-600/5 blur-[100px] rounded-full z-0 opacity-40"></div>
          <div className="bg-white rounded-3xl overflow-hidden border border-zinc-200 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] relative z-10 p-2 md:p-3">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 mb-2">
              <div className="flex gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-100"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-100"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-100"></div>
              </div>
              <div className="text-[9px] text-zinc-400 font-mono tracking-widest uppercase flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                CONNECTED_BRAIN_INSTANCE.PRO
              </div>
              <div className="w-12"></div>
            </div>
            {/* Live Component Interface */}
            <div className="aspect-video bg-zinc-50 rounded-2xl overflow-hidden border border-zinc-100 relative">
              <HeroInterface className="w-full h-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};