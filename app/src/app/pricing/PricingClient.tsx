"use client";

import React, { useState, useEffect } from 'react';
import Script from 'next/script';
import { useAuth } from '@clerk/nextjs';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';

interface PricingClientProps {
    initialCountry: string; // 'IN' or 'US', expected
}

type RazorpayResponse = {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
};

type RazorpayOptions = {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    handler: (response: RazorpayResponse) => void;
    theme?: { color?: string };
};

type RazorpayConstructor = new (options: RazorpayOptions) => { open: () => void };
type RazorpayWindow = Window & { Razorpay?: RazorpayConstructor };

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
            yearly: { price: "₹9,999", perMonth: "₹833", billed: "billed yearly", id: "prod_in_yearly", save: "16%" } // 999*12 = 11988. 9999/11988 ~ 16.5% discount
        }
    };

    const currentRegion = isIndia ? plans.india : plans.global;
    const currentPlan = billingCycle === 'monthly' ? currentRegion.monthly : currentRegion.yearly;

    const { isLoaded: authLoaded, isSignedIn } = useAuth();
    const [checkingOut, setCheckingOut] = useState(false);

    // Same Razorpay checkout for both regions: INR plans for India, USD plans (international cards) elsewhere
    const handleSubscribe = async (planId: string) => {
        if (checkingOut) return;

        // Paying needs an account to attach Pro to: sign up first, then come back here
        if (authLoaded && !isSignedIn) {
            window.location.assign(`/sign-up?redirect_url=${encodeURIComponent('/pricing')}`);
            return;
        }

        setCheckingOut(true);
        try {
            // 1. Create Order
            const res = await fetch('/api/billing/razorpay/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId })
            });
            const data = await res.json().catch(() => ({}));

            if (res.status === 401) {
                window.location.assign(`/sign-up?redirect_url=${encodeURIComponent('/pricing')}`);
                return;
            }
            if (!res.ok || data.error) throw new Error(data.error || `Could not start the payment (${res.status})`);

            const RazorpayCtor = (window as RazorpayWindow).Razorpay;
            if (!RazorpayCtor) throw new Error('The payment window is still loading. Please try again in a moment.');

            // 2. Open Modal
            const options = {
                key: data.keyId,
                amount: data.amount,
                currency: data.currency,
                name: "CounterDraft",
                description: "Pro Subscription",
                order_id: data.orderId,
                handler: async function (response: RazorpayResponse) {
                    // 3. Verify Payment
                    const toastId = toast.loading('Confirming your payment...');
                    try {
                        const verifyRes = await fetch('/api/billing/razorpay/verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                ...response,
                                planId
                            })
                        });
                        const verifyData = await verifyRes.json();
                        if (verifyData.success) {
                            toast.success('Payment confirmed. Welcome to Pro.', { id: toastId });
                            window.location.href = verifyData.redirectUrl;
                        } else {
                            toast.error('We could not confirm your payment. If you were charged, email us and we will sort it out.', { id: toastId, duration: 10000 });
                        }
                    } catch (e) {
                        console.error(e);
                        toast.error('We could not confirm your payment. If you were charged, email us and we will sort it out.', { id: toastId, duration: 10000 });
                    }
                },
                theme: { color: "#d4592a" }
            };

            const rzp = new RazorpayCtor(options);
            rzp.open();

        } catch (e: unknown) {
            console.error("Razorpay Error:", e);
            toast.error(e instanceof Error ? e.message : 'Could not start the payment.');
        } finally {
            setCheckingOut(false);
        }
    };

    return (
        <div className="min-h-screen bg-canvas font-sans text-ink selection:bg-ember-100 selection:text-ember-700 flex flex-col">
            {/* Checkout is only needed here, so other pages don't download it */}
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
            <Navbar isScrolled={scrolled} />

            {/* Clears the fixed navbar */}
            <main className="flex-grow w-full pt-28 md:pt-[180px] pb-12 md:pb-20 mx-auto px-4 md:px-6 max-w-6xl">

                {/* HERO SECTION */}
                <div className="text-center max-w-3xl mx-auto mb-10 md:mb-20">
                    <span className="inline-flex items-center h-8 px-4 rounded-full bg-canvas shadow-well text-ink-soft font-medium text-xs mb-6 md:mb-8">
                        Used by founders, operators, and independent thinkers
                    </span>

                    <h1 className="text-4xl md:text-6xl font-medium mb-6 tracking-[-0.03em] text-ink leading-[1.05]">
                        Authority isn’t written.<br />
                        It’s <span className="text-ember-500">engineered</span>.
                    </h1>

                    <p className="text-lg md:text-xl text-ink-soft max-w-2xl mx-auto mb-6 md:mb-8 leading-relaxed">
                        Counterdraft is a strategic writing OS that helps you form stronger positions, expose weak arguments, and publish ideas that hold up under pressure.
                    </p>
                    <p className="text-lg text-ink-muted font-medium">Stop posting. Start persuading.</p>
                </div>



                {/* PRICING TOGGLE */}
                <div className="flex items-center justify-center gap-4 mb-8 md:mb-16">
                    <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-ink' : 'text-ink-muted'}`}>Monthly</span>
                    <button
                        onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                        aria-label="Switch between monthly and yearly billing"
                        className={`w-14 h-8 rounded-full p-1 shadow-well transition-colors duration-300 ${billingCycle === 'yearly' ? 'bg-ink' : 'bg-canvas'}`}
                    >
                        <div className={`w-6 h-6 rounded-full bg-surface shadow-raised transform transition-transform duration-300 ${billingCycle === 'yearly' ? 'translate-x-6' : ''}`}></div>
                    </button>
                    <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-ink' : 'text-ink-muted'}`}>
                        Yearly <span className="text-xs text-ember-600 font-medium ml-1">(SAVE 20%)</span>
                    </span>
                </div>

                {/* COUNTRY TOGGLE (For Beta/Testing) */}
                <div className="flex justify-center mb-8">
                    <button
                        onClick={() => setIsIndia(!isIndia)}
                        className="text-xs font-medium text-ink-soft hover:text-ink flex items-center gap-2 h-10 rounded-full px-4 bg-canvas shadow-raised active:shadow-pressed transition-all"
                    >
                        <span>{isIndia ? "🇮🇳 India" : "🌎 Global"}</span>
                        <span className="text-ink-muted">|</span>
                        <span>Click to Switch</span>
                    </button>
                </div>

                {/* TIERS GRID */}
                <div className="grid md:grid-cols-2 gap-5 md:gap-8 max-w-5xl mx-auto mb-10 md:mb-20 items-stretch">

                    {/* TIER 1: STARTER (TRIAL) */}
                    <div className="bg-surface rounded-card shadow-card p-6 md:p-10 flex flex-col items-start text-left hover:shadow-float transition-all">
                        <div className="mb-6">
                            <h3 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-2">🧪 Starter (Trial)</h3>
                            <p className="text-sm text-ink-soft leading-relaxed">
                                Experience the system, not just the output. Understand how Counterdraft thinks before you commit.
                            </p>
                        </div>

                        <div className="mt-auto mb-8 w-full border-t border-line pt-6">
                            <div className="flex items-baseline mb-1">
                                <span className="text-5xl font-medium tracking-[-0.03em] text-ink">$0</span>
                            </div>
                            <p className="text-sm text-ink-muted">Use Forever</p>
                        </div>

                        <button className="w-full h-12 px-5 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all mb-10 flex items-center justify-center gap-2">
                            Start with Starter
                        </button>

                        <div className="space-y-5 w-full">
                            <p className="text-sm text-ink-muted">You Get</p>
                            <div className="flex items-start gap-4">
                                <span className="text-ember-500 mt-1">●</span>
                                <span className="text-ink-soft text-sm">Limited access to <span className="font-medium text-ink">Studio</span></span>
                            </div>
                            <div className="flex items-start gap-4">
                                <span className="text-ember-500 mt-1">●</span>
                                <span className="text-ink-soft text-sm">1 complete strategic analysis from <span className="font-medium text-ink">The Brain</span></span>
                            </div>
                            <div className="flex items-start gap-4">
                                <span className="text-ember-500 mt-1">●</span>
                                <span className="text-ink-soft text-sm">Basic syntax & clarity checks</span>
                            </div>

                            <div className="border-t border-dashed border-line my-4"></div>

                            <div className="flex items-start gap-4 opacity-50">
                                <span className="text-ink-muted mt-1">○</span>
                                <span className="text-ink-muted text-sm">Strategy depth is capped</span>
                            </div>
                            <div className="flex items-start gap-4 opacity-50">
                                <span className="text-ink-muted mt-1">○</span>
                                <span className="text-ink-muted text-sm">No belief or tension tracking</span>
                            </div>
                        </div>
                    </div>

                    {/* TIER 2: PRO (AUTHORITY) */}
                    <div className="bg-ink rounded-card p-6 md:p-10 flex flex-col items-start text-left shadow-float relative overflow-hidden">
                        <div className="mb-4 md:mb-0 md:absolute md:top-6 md:right-6 bg-ember-500 text-white text-xs font-medium h-7 px-3 flex items-center rounded-full shadow-ember z-10">
                            The Full OS
                        </div>

                        <div className="mb-6 relative z-10">
                            <h3 className="text-2xl font-medium tracking-[-0.02em] text-white mb-2">🧠 Pro Membership</h3>
                            <p className="text-sm text-white/70 leading-relaxed">
                                Build defensible authority. Stop guessing why a post feels weak or where your argument breaks.
                            </p>
                        </div>

                        <div className="mt-auto mb-8 w-full border-t border-white/10 pt-6 relative z-10">
                            <div className="flex items-baseline mb-1">
                                <span className="text-5xl font-medium tracking-[-0.03em] text-white">{currentPlan.perMonth}</span>
                                <span className="ml-2 text-white/60 font-medium">/ month</span>
                            </div>
                            <p className="text-sm text-white/60">
                                {currentPlan.billed}
                                {billingCycle === 'yearly' && isIndia && <span className="text-ember-200 ml-2"> (₹9,999/yr)</span>}
                                {billingCycle === 'yearly' && !isIndia && <span className="text-ember-200 ml-2"> (Total {currentPlan.price}/yr)</span>}
                            </p>
                        </div>

                        <button
                            onClick={() => handleSubscribe(currentPlan.id)}
                            disabled={checkingOut}
                            className="w-full h-12 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all mb-10 flex items-center justify-center gap-2 relative z-10 disabled:opacity-70"
                        >
                            {checkingOut && <Loader2 size={16} className="animate-spin" />}
                            Upgrade to Pro
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                        </button>

                        <div className="space-y-5 w-full relative z-10 text-white">
                            <p className="text-sm text-white/60">You Get Everything In Starter, Plus:</p>

                            <div className="flex items-start gap-4">
                                <div className="w-5 h-5 rounded-full bg-ember-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                    <svg className="w-3 h-3 text-ember-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                </div>
                                <div>
                                    <span className="text-white font-medium text-sm block">Unlimited Drafts & Revisions</span>
                                    <span className="text-white/60 text-xs mt-0.5 block">Iterate until it&apos;s perfect.</span>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-5 h-5 rounded-full bg-ember-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                    <svg className="w-3 h-3 text-ember-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                </div>
                                <div>
                                    <span className="text-white font-medium text-sm block">Full Brain Access</span>
                                    <span className="text-white/60 text-xs mt-0.5 block">Deep strategic analysis & logic checks.</span>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-5 h-5 rounded-full bg-ember-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                    <svg className="w-3 h-3 text-ember-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                </div>
                                <div>
                                    <span className="text-white font-medium text-sm block">Belief & Tension Tracking</span>
                                    <span className="text-white/60 text-xs mt-0.5 block">Detect inconsistencies in your position.</span>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-5 h-5 rounded-full bg-ember-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                    <svg className="w-3 h-3 text-ember-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                </div>
                                <div>
                                    <span className="text-white font-medium text-sm block">Turn Weak Opinions into Defensible Positions</span>
                                    <span className="text-white/60 text-xs mt-0.5 block">Strategic rewrites, not cosmetic edits.</span>
                                </div>
                            </div>
                        </div>

                        {/* Subtle Background Gradient for Pro */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-ember-500/20 blur-[100px] pointer-events-none"></div>
                    </div>
                </div>

                {/* SOCIAL PROOF / NON-AI PROMISE */}
                <div className="mt-12 md:mt-24 text-center max-w-2xl mx-auto bg-surface rounded-card shadow-card p-6 md:p-8">
                    <h4 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-4">Why is this not just another AI Writer?</h4>
                    <p className="text-ink-soft leading-relaxed">
                        AI writers generate text. <span className="text-ember-700 font-medium bg-ember-50 px-1 rounded">Counterdraft interrogates your thinking</span> before text exists. If your goal is SEO spam or engagement bait, this isn&apos;t for you. If your goal is credibility, influence, and long-term trust, you&apos;re home.
                    </p>
                </div>

                <div className="mt-8 md:mt-12 mb-8 md:mb-16 text-center">
                    <p className="text-xs text-ink-muted font-medium">
                        {isIndia ? "🇮🇳 Localized pricing for India applied." : "Secure payments via Razorpay. International cards accepted."} • Protected by 256-bit encryption.
                    </p>
                </div>
            </main>

            <Footer />
        </div>
    );
}
