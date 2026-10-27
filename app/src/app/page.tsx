"use client";

import React, { useState, useEffect } from 'react';
import { SignedIn, SignedOut } from "@clerk/nextjs";
import Link from 'next/link';
import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { CommandCenter } from '@/components/landing/CommandCenter';
import { SmartStudio } from '@/components/landing/SmartStudio';
import { TheBrain } from '@/components/landing/TheBrain';
import { Footer } from '@/components/landing/Footer';
import { usePostHog } from 'posthog-js/react';

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const posthog = usePostHog();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Navbar isScrolled={scrolled} />

      <main>
        <Hero />

        <section id="the-brain" className="py-16 md:py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {/* ... */}
          <div className="text-center mb-10 md:mb-20">
            <div className="inline-flex items-center h-8 px-4 rounded-full bg-ember-100 text-ember-700 text-sm font-medium mb-6">
              Find your angle
            </div>
            <h2 className="text-4xl md:text-[56px] md:leading-[1.05] font-medium mb-6 tracking-[-0.03em] text-ink">Start with clarity, not a blank page.</h2>
            <p className="text-ink-soft text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              Before you write a word, we help you define your reader, lock your perspective, and cut the clichés. So every post sounds like you, not like everyone else.
            </p>
          </div>
          <TheBrain />
        </section>

        <section id="command-center" className="py-16 md:py-32 bg-surface-muted overflow-hidden">
          {/* ... */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-end justify-between gap-6 md:gap-12 mb-10 md:mb-20">
              <div className="md:w-3/5">
                <div className="inline-flex items-center h-8 px-4 rounded-full bg-canvas shadow-raised text-ink-soft text-sm font-medium mb-6">
                  Stay organized
                </div>
                <h2 className="text-4xl md:text-[56px] md:leading-[1.05] font-medium mb-6 tracking-[-0.03em] text-ink">All your ideas. Finally in one place.</h2>
                <p className="text-ink-soft text-lg md:text-xl max-w-xl">
                  From first spark to posted: capture ideas, develop drafts, and keep track of what you&apos;ve posted, without scattered docs and lost notes.
                </p>
              </div>
            </div>
            <CommandCenter />
          </div>
        </section>

        <section id="smart-studio" className="py-16 md:py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {/* ... */}
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-20 items-start">
            <div className="lg:w-1/3 lg:sticky lg:top-32">
              <div className="inline-flex items-center h-8 px-4 rounded-full bg-ember-100 text-ember-700 text-sm font-medium mb-6">
                Repurpose everywhere
              </div>
              <h2 className="text-4xl md:text-5xl font-medium mb-6 tracking-[-0.03em] leading-[1.05] text-ink">One post. More places. Your voice.</h2>
              <p className="text-ink-soft text-lg mb-10 leading-relaxed">
                Write your LinkedIn post, then turn it into a Medium article, an Instagram carousel, an X thread or a newsletter issue, without sounding like a robot.
              </p>
              <div className="space-y-6">
                {[
                  { label: "LinkedIn posts that stand out", desc: "Not another generic hot take. Connect LinkedIn to post from the app, or copy it." },
                  { label: "Medium articles", desc: "A longer article from your post, with a cover image." },
                  { label: "Instagram carousels and captions", desc: "Slide-by-slide scripts, hashtags and a matching image." },
                  { label: "X threads and newsletters", desc: "A thread with a strong first post, or an issue with subject line and preview text. Ready to copy: you post and send them yourself." }
                ].map((item, i) => (
                  <div key={i} className="group cursor-default">
                    <div className="flex flex-wrap items-center gap-3 text-[17px] font-medium tracking-[-0.01em] mb-1 text-ink">
                      <div className="w-1.5 h-1.5 rounded-full bg-ember-500"></div>
                      {item.label}
                    </div>
                    <p className="text-ink-muted text-sm pl-4.5">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:w-2/3 w-full">
              <SmartStudio />
            </div>
          </div>
        </section>

        <section className="py-20 md:py-40 text-center relative overflow-hidden bg-canvas">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[500px] bg-ember-500/10 blur-[120px] rounded-full pointer-events-none"></div>

          <div className="relative z-10 max-w-4xl mx-auto px-4">
            <h2 className="text-4xl md:text-7xl font-medium mb-6 md:mb-8 tracking-[-0.03em] leading-[1.05] text-ink">Ready to write something you&apos;re proud of?</h2>
            <p className="text-ink-soft text-lg md:text-2xl max-w-2xl mx-auto mb-8 md:mb-12">
              Find your angle, draft in your voice, and post to LinkedIn. Then turn it into an article, a carousel, an X thread or a newsletter.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-6">
              <SignedOut>
                <Link href="/sign-up" className="w-full sm:w-auto" onClick={() => posthog?.capture('click_get_started', { location: 'footer' })}>
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
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
