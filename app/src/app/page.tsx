"use client";

import React, { useState, useEffect } from 'react';
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import Link from 'next/link';
import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { CommandCenter } from '@/components/landing/CommandCenter';
import { SmartStudio } from '@/components/landing/SmartStudio';
import { TheBrain } from '@/components/landing/TheBrain';
import { Testimonials } from '@/components/landing/Testimonials';
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
    <div className="min-h-screen bg-[#fcfcfc]">
      <Navbar isScrolled={scrolled} />

      <main>
        <Hero />

        <section id="the-brain" className="py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {/* ... */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-50 border border-green-100 text-[10px] font-bold text-green-700 mb-6 tracking-widest uppercase">
              STRATEGIC FOUNDATION
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-8 tracking-tighter text-zinc-900">Strategy, then Syllables.</h2>
            <p className="text-zinc-500 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              Don't outsource your brain to a prompt. Our engine pressure-tests your expertise against industry clichés before the first draft is ever generated.
            </p>
          </div>
          <TheBrain />
        </section>

        <section id="command-center" className="py-32 bg-zinc-50 border-y border-zinc-100 overflow-hidden">
          {/* ... */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-end justify-between gap-12 mb-20">
              <div className="md:w-3/5">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-white border border-zinc-200 text-[10px] font-bold text-zinc-500 mb-6 tracking-widest uppercase shadow-sm">
                  INTELLECTUAL PIPELINE
                </div>
                <h2 className="text-4xl md:text-6xl font-bold mb-8 tracking-tighter leading-[1.1] text-zinc-900">An OS for your Insights.</h2>
                <p className="text-zinc-500 text-lg md:text-xl max-w-xl">
                  Move past fragmented notes. Our command center is an editorial instrument designed to scale your unique perspective with surgical precision.
                </p>
              </div>
              <div className="hidden md:flex gap-3 mb-4">
                <button className="h-12 w-12 rounded-full border border-zinc-200 bg-white flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:border-zinc-300 transition-all">←</button>
                <button className="h-12 w-12 rounded-full border border-zinc-200 bg-white flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:border-zinc-300 transition-all">→</button>
              </div>
            </div>
            <CommandCenter />
          </div>
        </section>

        <section id="smart-studio" className="py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {/* ... */}
          <div className="flex flex-col lg:flex-row gap-20 items-start">
            <div className="lg:w-1/3 lg:sticky lg:top-32">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-50 border border-green-100 text-[10px] font-bold text-green-700 mb-6 tracking-widest uppercase">
                SMART STUDIO
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 tracking-tighter leading-tight text-zinc-900">The Semantic Remix.</h2>
              <p className="text-zinc-500 text-lg mb-10 leading-relaxed">
                Platform-native assets that actually sound like you. We don't just crop text; we restructure ideas for the specific psychology of each network.
              </p>
              <div className="space-y-6">
                {[
                  { label: "High-Signal LinkedIn Content", desc: "Built for deep professional engagement." },
                  { label: "Dense Editorial Threads", desc: "Complex ideas, simplified for X/Threads." },
                  { label: "Visual Strategy Slides", desc: "Convert documents into stunning visual assets." }
                ].map((item, i) => (
                  <div key={i} className="group cursor-default">
                    <div className="flex items-center gap-3 text-zinc-800 font-bold mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div>
                      {item.label}
                    </div>
                    <p className="text-zinc-400 text-sm pl-4.5">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:w-2/3 w-full">
              <SmartStudio />
            </div>
          </div>
        </section>

        {/* <Testimonials /> */}

        <section className="py-40 text-center relative overflow-hidden bg-white">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[500px] bg-green-600/5 blur-[120px] rounded-full pointer-events-none"></div>

          <div className="relative z-10 max-w-4xl mx-auto px-4">
            <h2 className="text-5xl md:text-7xl font-bold mb-10 tracking-tighter text-zinc-900">Own your expertise.</h2>
            <p className="text-zinc-500 text-xl md:text-2xl max-w-2xl mx-auto mb-12 font-light">
              Join the experts building meaningful authority in the age of generative noise.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <SignedOut>
                <Link href="/sign-up" onClick={() => posthog?.capture('click_get_started', { location: 'footer' })}>
                  <button className="w-full sm:w-auto bg-green-600 text-white px-10 py-5 rounded-xl font-bold text-xl hover:bg-green-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-green-600/20">
                    Join the Experts
                  </button>
                </Link>
              </SignedOut>
              <SignedIn>
                <Link href="/workspace">
                  <button className="w-full sm:w-auto bg-green-600 text-white px-10 py-5 rounded-xl font-bold text-xl hover:bg-green-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-green-600/20">
                    Go to Dashboard
                  </button>
                </Link>
              </SignedIn>
              <button className="w-full sm:w-auto bg-white border border-zinc-200 text-zinc-900 px-10 py-5 rounded-xl font-bold text-xl hover:bg-zinc-50 transition-all">
                The Philosophy
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
