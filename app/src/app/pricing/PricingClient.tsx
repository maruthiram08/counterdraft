"use client";

import React, { useState, useEffect } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PAID_PLANS, discountedAmount, formatAmount } from '@/lib/billing/plans';
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

// What Pro unlocks today; keep in step with the free limits in lib/constants/pricing.ts
const PRO_FEATURES = [
    { title: 'Unlimited Drafts & Revisions', detail: 'From brief to outline to finished LinkedIn post.' },
    { title: 'Explore and Web Research', detail: 'Find what to write about, with sources behind each draft.' },
    { title: 'Craft Score and Strategy Check', detail: 'Scores for every draft, with a Fix for each weak part.' },
    { title: 'Medium and Instagram Versions', detail: 'Turn a post into an article or a carousel, with images.' },
    { title: 'Belief & Tension Tracking', detail: 'Your Mind keeps learning from everything you add and write.' },
];

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
            monthly: { price: "$29", perMonth: "$29", billed: "Paid once for 1 month", id: "prod_gl_monthly" },
            yearly: { price: "$290", perMonth: "$24", billed: "Paid once for 12 months", id: "prod_gl_yearly", save: "16%" } // 29*12 = 348. 290/348 ~ 16.7% discount
        },
        india: {
            monthly: { price: "₹999", perMonth: "₹999", billed: "Paid once for 1 month", id: "prod_in_monthly" },
            yearly: { price: "₹9,999", perMonth: "₹833", billed: "Paid once for 12 months", id: "prod_in_yearly", save: "16%" } // 999*12 = 11988. 9999/11988 ~ 16.5% discount
        }
    };

    const currentRegion = isIndia ? plans.india : plans.global;
    const currentPlan = billingCycle === 'monthly' ? currentRegion.monthly : currentRegion.yearly;

    const { isLoaded: authLoaded, isSignedIn } = useAuth();
    const [checkingOut, setCheckingOut] = useState(false);

    // Discount code (checked on the server; the order API re-checks it before charging)
    const [couponOpen, setCouponOpen] = useState(false);
    const [couponInput, setCouponInput] = useState('');
    const [coupon, setCoupon] = useState<{ code: string; discountPercent: number } | null>(null);
    const [couponError, setCouponError] = useState('');
    const [couponChecking, setCouponChecking] = useState(false);

    const signUpThenBack = (code?: string) => {
        const back = code ? `/pricing?coupon=${encodeURIComponent(code)}` : '/pricing';
        window.location.assign(`/sign-up?redirect_url=${encodeURIComponent(back)}`);
    };

    const applyCoupon = async (raw: string) => {
        const code = raw.trim().toUpperCase();
        if (!code) return;
        if (authLoaded && !isSignedIn) { signUpThenBack(code); return; }
        setCouponChecking(true);
        setCouponError('');
        try {
            const res = await fetch('/api/billing/coupon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, planId: currentPlan.id }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.status === 401) { signUpThenBack(code); return; }
            if (!res.ok) { setCoupon(null); setCouponError(data.error || 'That code is not valid.'); return; }
            setCoupon({ code: data.code, discountPercent: data.discountPercent });
            setCouponOpen(false);
        } catch {
            setCouponError('Could not check that code. Please try again.');
        } finally {
            setCouponChecking(false);
        }
    };

    // A shared link like /pricing?coupon=LAUNCH20 fills in and applies the code
    const [linkCoupon, setLinkCoupon] = useState<string | null>(null);
    useEffect(() => {
        const code = new URLSearchParams(window.location.search).get('coupon');
        if (code) { setLinkCoupon(code); setCouponInput(code.toUpperCase()); setCouponOpen(true); }
    }, []);
    useEffect(() => {
        if (linkCoupon && authLoaded && isSignedIn) { setLinkCoupon(null); applyCoupon(linkCoupon); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [linkCoupon, authLoaded, isSignedIn]);

    const paidPlan = PAID_PLANS[currentPlan.id];
    const discountedTotal = coupon && paidPlan ? formatAmount(discountedAmount(paidPlan.amount, coupon.discountPercent), paidPlan.currency) : null;

    // Same Razorpay checkout for both regions: INR plans for India, USD plans (international cards) elsewhere
    const handleSubscribe = async (planId: string) => {
        if (checkingOut) return;

        // Paying needs an account to attach Pro to: sign up first, then come back here
        if (authLoaded && !isSignedIn) {
            signUpThenBack(coupon?.code);
            return;
        }

        setCheckingOut(true);
        try {
            // 1. Create Order
            const res = await fetch('/api/billing/razorpay/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId, couponCode: coupon?.code })
            });
            const data = await res.json().catch(() => ({}));

            if (res.status === 401) {
                signUpThenBack(coupon?.code);
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
                description: "Counterdraft Pro",
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
                        Pay once. No auto-renewal.
                    </span>

                    <h1 className="text-4xl md:text-6xl font-medium mb-6 tracking-[-0.03em] text-ink leading-[1.05]">
                        Authority isn’t written.<br />
                        It’s <span className="text-ember-500">engineered</span>.
                    </h1>

                    <p className="text-lg md:text-xl text-ink-soft max-w-2xl mx-auto mb-6 md:mb-8 leading-relaxed">
                        Counterdraft helps you find your angle, check every draft against your strategy, and write LinkedIn posts that sound like you.
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
                        Yearly <span className="text-xs text-ember-600 font-medium ml-1">(SAVE {currentRegion.yearly.save})</span>
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

                    {/* TIER 1: STARTER (FREE) */}
                    <div className="bg-surface rounded-card shadow-card p-6 md:p-10 flex flex-col items-start text-left hover:shadow-float transition-all">
                        <div className="mb-6">
                            <h3 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-2">🧪 Starter</h3>
                            <p className="text-sm text-ink-soft leading-relaxed">
                                Look around before you commit. Set up your voice and see how Counterdraft works.
                            </p>
                        </div>

                        <div className="mt-auto mb-8 w-full border-t border-line pt-6">
                            <div className="flex items-baseline mb-1">
                                <span className="text-5xl font-medium tracking-[-0.03em] text-ink">$0</span>
                            </div>
                            <p className="text-sm text-ink-muted">No card needed</p>
                        </div>

                        <a
                            href={isSignedIn ? '/workspace' : '/sign-up'}
                            className="w-full h-12 px-5 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all mb-10 flex items-center justify-center gap-2"
                        >
                            {isSignedIn ? 'Go to your workspace' : 'Create a free account'}
                        </a>

                        <div className="space-y-5 w-full">
                            <p className="text-sm text-ink-muted">You Get</p>
                            <div className="flex items-start gap-4">
                                <span className="text-ember-500 mt-1">●</span>
                                <span className="text-ink-soft text-sm">Set up your <span className="font-medium text-ink">voice and writing style</span></span>
                            </div>
                            <div className="flex items-start gap-4">
                                <span className="text-ember-500 mt-1">●</span>
                                <span className="text-ink-soft text-sm">Look around the workspace and see how The Brain works</span>
                            </div>
                            <div className="flex items-start gap-4">
                                <span className="text-ember-500 mt-1">●</span>
                                <span className="text-ink-soft text-sm">See the <span className="font-medium text-ink">beliefs</span> The Brain finds in your first posts</span>
                            </div>
                            <div className="flex items-start gap-4">
                                <span className="text-ember-500 mt-1">●</span>
                                <span className="text-ink-soft text-sm">Upgrade any time, or use an invite code</span>
                            </div>

                            <div className="border-t border-dashed border-line my-4"></div>

                            <div className="flex items-start gap-4 opacity-50">
                                <span className="text-ink-muted mt-1">○</span>
                                <span className="text-ink-muted text-sm">Drafting, Explore, research and images need Pro</span>
                            </div>
                            <div className="flex items-start gap-4 opacity-50">
                                <span className="text-ink-muted mt-1">○</span>
                                <span className="text-ink-muted text-sm">Ongoing belief and tension tracking needs Pro</span>
                            </div>
                        </div>
                    </div>

                    {/* TIER 2: PRO (AUTHORITY) */}
                    <div className="bg-ink rounded-card p-6 md:p-10 flex flex-col items-start text-left shadow-float relative overflow-hidden">
                        <div className="mb-4 md:mb-0 md:absolute md:top-6 md:right-6 bg-ember-500 text-white text-xs font-medium h-7 px-3 flex items-center rounded-full shadow-ember z-10">
                            Full access
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

                        {/* Discount code */}
                        <div className="-mt-2 mb-5 relative z-10 w-full">
                            {coupon ? (
                                <div className="flex items-center justify-between gap-3 rounded-full bg-white/10 px-4 py-2.5 text-sm">
                                    <span className="text-white">
                                        <span className="font-mono font-medium">{coupon.code}</span>
                                        <span className="text-white/70">: {coupon.discountPercent}% off{discountedTotal ? `, you pay ${discountedTotal}` : ''}</span>
                                    </span>
                                    <button
                                        onClick={() => { setCoupon(null); setCouponInput(''); }}
                                        className="min-h-[44px] -my-2.5 px-2 text-xs text-white/60 hover:text-white"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : couponOpen ? (
                                <form
                                    onSubmit={(e) => { e.preventDefault(); applyCoupon(couponInput); }}
                                    className="flex gap-2 w-full"
                                >
                                    <input
                                        autoFocus
                                        value={couponInput}
                                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                                        placeholder="Coupon code"
                                        className="flex-1 min-w-0 h-11 rounded-full bg-white/10 px-4 text-base md:text-sm text-white placeholder:text-white/40 font-mono uppercase border-0 focus:outline-none focus:ring-2 focus:ring-ember-300"
                                    />
                                    <button
                                        type="submit"
                                        disabled={couponChecking || !couponInput.trim()}
                                        className="shrink-0 h-11 px-4 rounded-full bg-white text-ink text-sm font-medium disabled:opacity-60 flex items-center gap-1.5"
                                    >
                                        {couponChecking && <Loader2 size={14} className="animate-spin" />}
                                        Apply
                                    </button>
                                </form>
                            ) : (
                                <button
                                    onClick={() => setCouponOpen(true)}
                                    className="min-h-[44px] text-sm text-white/70 hover:text-white underline underline-offset-4"
                                >
                                    Have a coupon?
                                </button>
                            )}
                            {couponError && <p className="mt-2 text-xs text-ember-200">{couponError}</p>}
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

                            {PRO_FEATURES.map(feature => (
                                <div key={feature.title} className="flex items-start gap-4">
                                    <div className="w-5 h-5 rounded-full bg-ember-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                        <svg className="w-3 h-3 text-ember-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                    </div>
                                    <div>
                                        <span className="text-white font-medium text-sm block">{feature.title}</span>
                                        <span className="text-white/60 text-xs mt-0.5 block">{feature.detail}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Subtle Background Gradient for Pro */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-ember-500/20 blur-[100px] pointer-events-none"></div>
                    </div>
                </div>

                {/* SOCIAL PROOF / NON-AI PROMISE */}
                <div className="mt-12 md:mt-24 text-center max-w-2xl mx-auto bg-surface rounded-card shadow-card p-6 md:p-8">
                    <h4 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-4">Why is this not just another AI Writer?</h4>
                    <p className="text-ink-soft leading-relaxed">
                        AI writers start from a prompt. <span className="text-ember-700 font-medium bg-ember-50 px-1 rounded">Counterdraft starts from your thinking</span>: your reader, your stance and your goal, before it drafts anything. If your goal is SEO spam or engagement bait, this isn&apos;t for you. If your goal is credibility, influence, and long-term trust, you&apos;re home.
                    </p>
                </div>

                <div className="mt-8 md:mt-12 mb-8 md:mb-16 text-center">
                    <p className="text-xs text-ink-muted font-medium">
                        {isIndia ? "🇮🇳 Localized pricing for India applied." : "Prices in US dollars."} Payments are handled by Razorpay; we never see your card details. Pro doesn&apos;t renew automatically. See our <Link href="/terms" className="underline underline-offset-2 hover:text-ink">Terms</Link>.
                    </p>
                </div>
            </main>

            <Footer />
        </div>
    );
}
