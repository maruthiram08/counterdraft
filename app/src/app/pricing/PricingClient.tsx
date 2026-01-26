"use client";

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from 'next/link';

interface PricingClientProps {
    initialCountry: string; // 'IN' or 'US', expected
}

export default function PricingClient({ initialCountry }: PricingClientProps) {
    const [isIndia, setIsIndia] = useState(initialCountry === 'IN');
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // We can rely on SSR prop unless we want to "re-verify" client side?
    // For now, let's trust the prop to avoid flicker.
    // However, if we want to be doubly sure, we could keep the fetch but only set state if different.

    // NOTE: ipapi.co might be blocked by adblockers, SSR header is safer. We'll skip the effect.

    const plans = {
        global: {
            monthly: { price: "$29", perMonth: "$29", billed: "billed monthly", id: "prod_gl_monthly" },
            yearly: { price: "$290", perMonth: "$24", billed: "billed annually", id: "prod_gl_yearly", save: "20%" }
        },
        india: {
            monthly: { price: "₹999", perMonth: "₹999", billed: "billed monthly", id: "prod_in_monthly" },
            yearly: { price: "₹9,999", perMonth: "₹833", billed: "billed annually", id: "prod_in_yearly", save: "20%" }
        }
    };

    const currentRegion = isIndia ? plans.india : plans.global;
    const currentPlan = billingCycle === 'monthly' ? currentRegion.monthly : currentRegion.yearly;

    const handleSubscribe = async (planId: string) => {
        try {
            const res = await fetch('/api/billing/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId: planId, billingCycle })
            });

            const data = await res.json();
            if (data.error) {
                alert('Checkout Error: ' + data.error);
                return;
            }

            if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
            }
        } catch (e) {
            console.error(e);
            alert('Failed to initiate checkout.');
        }
    };

    return (
        <div className="min-h-screen bg-[#fcfcfc] font-sans text-zinc-900 selection:bg-green-100 selection:text-green-900 flex flex-col">
            <Navbar isScrolled={scrolled} />

            {/* Main Content with Massive Top Padding - Inline style to force fix */}
            <main className="flex-grow pb-20 container mx-auto px-6 max-w-6xl" style={{ paddingTop: '180px' }}>

                {/* HERO SECTION */}
                <div className="text-center max-w-3xl mx-auto mb-20">
                    <span className="inline-block py-1.5 px-4 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-600 font-bold text-[10px] uppercase tracking-widest mb-8">
                        Used by founders, operators, and independent thinkers
                    </span>

                    <h1 className="text-5xl md:text-6xl font-black mb-6 tracking-tight text-zinc-900 leading-tight">
                        Authority isn’t written.<br />
                        It’s <span className="text-green-600">engineered</span>.
                    </h1>

                    <p className="text-xl text-zinc-500 max-w-2xl mx-auto mb-8 leading-relaxed font-medium">
                        Counterdraft is a strategic writing OS that helps you form stronger positions, expose weak arguments, and publish ideas that hold up under pressure.
                    </p>
                    <p className="text-lg text-zinc-400 font-medium">Stop posting. Start persuading.</p>
                </div>

                {/* CLARITY BLOCK */}
                <div className="text-center max-w-4xl mx-auto mb-24 hidden md:block opacity-60 hover:opacity-100 transition-opacity duration-500">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">
                                <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </div>
                            <span className="font-bold text-zinc-700">See Blind Spots</span>
                        </div>
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">
                                <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <span className="font-bold text-zinc-700">Identify Belief Gaps</span>
                        </div>
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">
                                <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                            <span className="font-bold text-zinc-700">Engineer Tension</span>
                        </div>
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">
                                <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            </div>
                            <span className="font-bold text-zinc-700">Compound Authority</span>
                        </div>
                    </div>
                </div>

                {/* PRICING TOGGLE */}
                <div className="flex items-center justify-center gap-4 mb-16">
                    <span className={`text-sm font-bold ${billingCycle === 'monthly' ? 'text-zinc-900' : 'text-zinc-400'}`}>Monthly</span>
                    <button
                        onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                        className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ${billingCycle === 'yearly' ? 'bg-zinc-900' : 'bg-zinc-200'}`}
                    >
                        <div className={`w-6 h-6 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${billingCycle === 'yearly' ? 'translate-x-6' : ''}`}></div>
                    </button>
                    <span className={`text-sm font-bold ${billingCycle === 'yearly' ? 'text-zinc-900' : 'text-zinc-400'}`}>
                        Yearly <span className="text-xs text-green-600 font-black ml-1">(SAVE 20%)</span>
                    </span>
                </div>

                {/* TIERS GRID */}
                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-20 items-stretch">

                    {/* TIER 1: STARTER (TRIAL) */}
                    <div className="bg-white rounded-3xl border border-zinc-200 p-10 flex flex-col items-start text-left shadow-sm hover:border-zinc-300 transition-colors">
                        <div className="mb-6">
                            <h3 className="text-lg font-black text-zinc-400 uppercase tracking-widest mb-2">🧪 Starter (Trial)</h3>
                            <p className="text-sm text-zinc-500 font-medium font-display leading-relaxed">
                                Experience the system, not just the output. Understand how Counterdraft thinks before you commit.
                            </p>
                        </div>

                        <div className="mt-auto mb-8 w-full border-t border-zinc-100 pt-6">
                            <div className="flex items-baseline mb-1">
                                <span className="text-4xl font-black text-zinc-900">$0</span>
                            </div>
                            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Use Forever</p>
                        </div>

                        <button className="w-full bg-zinc-100 text-zinc-900 font-bold py-4 rounded-xl hover:bg-zinc-200 transition-colors mb-10 flex items-center justify-center gap-2">
                            Start with Starter
                        </button>

                        <div className="space-y-5 w-full">
                            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">You Get</p>
                            <div className="flex items-start gap-4">
                                <span className="text-green-600 mt-1">●</span>
                                <span className="text-zinc-700 font-medium text-sm">Limited access to <span className="font-bold">Studio</span></span>
                            </div>
                            <div className="flex items-start gap-4">
                                <span className="text-green-600 mt-1">●</span>
                                <span className="text-zinc-700 font-medium text-sm">1 complete strategic analysis from <span className="font-bold">The Brain</span></span>
                            </div>
                            <div className="flex items-start gap-4">
                                <span className="text-green-600 mt-1">●</span>
                                <span className="text-zinc-700 font-medium text-sm">Basic syntax & clarity checks</span>
                            </div>

                            <div className="border-t border-dashed border-zinc-200 my-4"></div>

                            <div className="flex items-start gap-4 opacity-50">
                                <span className="text-zinc-300 mt-1">○</span>
                                <span className="text-zinc-400 font-medium text-sm">Strategy depth is capped</span>
                            </div>
                            <div className="flex items-start gap-4 opacity-50">
                                <span className="text-zinc-300 mt-1">○</span>
                                <span className="text-zinc-400 font-medium text-sm">No belief or tension tracking</span>
                            </div>
                        </div>
                    </div>

                    {/* TIER 2: PRO (AUTHORITY) */}
                    <div className="bg-zinc-900 rounded-3xl p-10 flex flex-col items-start text-left shadow-2xl relative overflow-hidden ring-1 ring-zinc-900/5">
                        <div className="absolute top-0 right-0 bg-green-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-bl-xl uppercase tracking-widest z-10">
                            The Full OS
                        </div>

                        <div className="mb-6 relative z-10">
                            <h3 className="text-lg font-black text-green-500 uppercase tracking-widest mb-2">🧠 Pro Membership</h3>
                            <p className="text-sm text-zinc-400 font-medium font-display leading-relaxed">
                                Build defensible authority. Stop guessing why a post feels weak or where your argument breaks.
                            </p>
                        </div>

                        <div className="mt-auto mb-8 w-full border-t border-zinc-800 pt-6 relative z-10">
                            <div className="flex items-baseline mb-1">
                                <span className="text-5xl font-black text-white">{currentPlan.perMonth}</span>
                                <span className="ml-2 text-zinc-500 font-bold">/ month</span>
                            </div>
                            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">
                                {currentPlan.billed}
                                {billingCycle === 'yearly' && <span className="text-green-500 ml-2"> (Total {currentPlan.price}/yr)</span>}
                            </p>
                        </div>

                        <button
                            onClick={() => handleSubscribe(currentPlan.id)}
                            className="w-full bg-white text-zinc-900 font-black py-4 rounded-xl hover:bg-zinc-100 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)] mb-10 flex items-center justify-center gap-2 relative z-10"
                        >
                            Upgrade to Pro
                            <svg className="w-4 h-4 text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                        </button>

                        <div className="space-y-5 w-full relative z-10 text-white">
                            <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">You Get Everything In Starter, Plus:</p>

                            <div className="flex items-start gap-4">
                                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                    <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                </div>
                                <div>
                                    <span className="text-zinc-200 font-bold text-sm block">Unlimited Drafts & Revisions</span>
                                    <span className="text-zinc-500 text-xs mt-0.5 block">Iterate until it's perfect.</span>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                    <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                </div>
                                <div>
                                    <span className="text-zinc-200 font-bold text-sm block">Full Brain Access</span>
                                    <span className="text-zinc-500 text-xs mt-0.5 block">Deep strategic analysis & logic checks.</span>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                    <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                </div>
                                <div>
                                    <span className="text-zinc-200 font-bold text-sm block">Belief & Tension Tracking</span>
                                    <span className="text-zinc-500 text-xs mt-0.5 block">Detect inconsistencies in your position.</span>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                    <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                </div>
                                <div>
                                    <span className="text-zinc-200 font-bold text-sm block">Turn Weak Opinions into Defensible Positions</span>
                                    <span className="text-zinc-500 text-xs mt-0.5 block">Strategic rewrites, not cosmetic edits.</span>
                                </div>
                            </div>
                        </div>

                        {/* Subtle Background Gradient for Pro */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-green-900/10 blur-[100px] pointer-events-none"></div>
                    </div>
                </div>

                {/* SOCIAL PROOF / NON-AI PROMISE */}
                <div className="mt-24 text-center max-w-2xl mx-auto border-t border-zinc-100 pt-16">
                    <h4 className="text-sm font-bold text-zinc-900 uppercase tracking-widest mb-4">Why is this not just another AI Writer?</h4>
                    <p className="text-zinc-500 leading-relaxed font-medium">
                        AI writers generate text. <span className="text-zinc-900 font-bold bg-green-50 px-1 rounded">Counterdraft interrogates your thinking</span> before text exists. If your goal is SEO spam or engagement bait, this isn't for you. If your goal is credibility, influence, and long-term trust, you're home.
                    </p>
                </div>

                <div className="mt-12 mb-16 text-center">
                    <p className="text-xs text-zinc-400 font-medium">
                        {isIndia ? "🇮🇳 Localized pricing for India applied." : "Secure payments via Dodo Payments."} • Protected by 256-bit encryption.
                    </p>
                </div>
            </main>

            <Footer />
        </div>
    );
}
