"use client";

import React from 'react';
import Link from 'next/link';
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { HeroInterface } from './HeroInterface';
import { LiveAuditWidget } from './LiveAuditWidget';
import { usePostHog } from 'posthog-js/react';

export const Hero: React.FC = () => {
  const posthog = usePostHog();

  return (
    <section className="relative pt-28 pb-16 md:pt-52 md:pb-40 px-4 hero-gradient overflow-hidden">
      <div className="max-w-7xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center h-8 px-4 rounded-full bg-ember-100 text-ember-700 text-sm font-medium mb-6 md:mb-10 animate-fade-in-up">
          For writers & creators
        </div>
        <h1 className="text-5xl md:text-[96px] font-medium tracking-[-0.04em] mb-6 md:mb-8 max-w-5xl mx-auto leading-[1] text-ink animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          Write content that <span className="text-ember-500">sounds like you</span>.
        </h1>
        <p className="text-ink-soft text-lg md:text-xl max-w-2xl mx-auto mb-8 md:mb-12 leading-relaxed animate-fade-in-up [&_strong]:font-medium [&_strong]:text-ink" style={{ animationDelay: '0.2s' }}>
          LinkedIn posts first, then Medium articles, Instagram carousels, X threads and newsletters from them. Counterdraft helps you <strong>find your angle, organize your ideas, and publish without sounding generic</strong>.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 mb-16 md:mb-28 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <SignedOut>
            <Link href="/sign-up" className="w-full sm:w-auto" onClick={() => posthog?.capture('click_get_started', { location: 'hero' })}>
              <button className="w-full sm:w-auto h-14 px-8 rounded-full bg-ember-500 text-white text-base font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all">
                Get Started
              </button>
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/workspace" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto h-14 px-8 rounded-full bg-ember-500 text-white text-base font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all">
                Go to Dashboard
              </button>
            </Link>
          </SignedIn>
          <Link href="/philosophy" className="w-full sm:w-auto h-14 px-8 rounded-full bg-canvas text-ink text-base font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all flex items-center justify-center">
            The Philosophy
          </Link>
        </div>

        {/* Live Trial Widget */}
        <div className="mb-16 md:mb-24 animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
          <LiveAuditWidget />
        </div>

        {/* Dashboard Preview Container */}
        <div className="relative mx-auto max-w-6xl px-4 md:px-0 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-4/5 h-48 bg-ember-500/10 blur-[100px] rounded-full z-0 opacity-40"></div>
          <div className="bg-surface rounded-card overflow-hidden shadow-float relative z-10 p-2 md:p-3">
            <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 mb-1">
              <div className="flex gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-canvas shadow-well"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-canvas shadow-well"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-canvas shadow-well"></div>
              </div>
              <div className="text-xs text-ink-muted font-mono flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-sage-500 animate-pulse"></span>
                WORKSPACE_PREVIEW
              </div>
              <div className="hidden sm:block w-12"></div>
            </div>
            {/* Live Component Interface */}
            <div className="min-h-[600px] md:aspect-video bg-canvas rounded-tile overflow-hidden shadow-pressed relative">
              <HeroInterface className="w-full h-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
