"use client";

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { Check, Loader2 } from 'lucide-react';
import { usePostHog } from 'posthog-js/react';

export default function WaitlistPage() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const posthog = usePostHog();

    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setStatus('loading');
        try {
            const res = await fetch('/api/marketing/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    source: 'instagram_campaign_light'
                })
            });

            const data = await res.json();

            if (res.ok) {
                setStatus('success');
                setMessage("You're on the list.");

                // Track successful submission
                posthog.capture('waitlist_submitted', {
                    source: 'instagram_campaign_light'
                });

                setEmail('');
            } else {
                setStatus('error');
                setMessage(data.error || 'Something went wrong.');
            }
        } catch (error) {
            console.error("Waitlist submit failed:", error);
            setStatus('error');
            setMessage('Network error.');
        }
    };

    return (
        <div className="min-h-screen bg-canvas text-ink font-sans flex flex-col items-center justify-center">

            {/* 2. Content: Centered without image */}
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[480px] px-4 py-6 pb-20 mx-auto">
                {/* Logo Section - Moved inside for better proximity */}
                <div className="flex items-center justify-center gap-4 mb-8">
                    <Image src="/brand/logo-icon.png" alt="Icon" width={64} height={64} className="h-16 w-16 object-contain" />
                    <Image src="/brand/logo-text.png" alt="CounterDraft" width={200} height={48} className="h-12 w-auto opacity-90" />
                </div>

                <h1 className="text-3xl md:text-4xl font-medium tracking-[-0.03em] text-center mb-3 text-ink leading-tight">
                    We challenge your ideas <br />
                    <span className="text-ink-muted">before the internet does.</span>
                </h1>

                <p className="text-sm text-ink-soft text-center mb-8 font-medium">
                    NOT A WRITING ASSISTANT. A THINKING ADVERSARY.
                </p>

                <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={status === 'loading' || status === 'success'}
                            className="w-full h-14 bg-canvas shadow-well rounded-2xl px-4 py-3 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 text-base transition-all appearance-none"
                            required
                        />
                        {status === 'success' && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sage-500">
                                <Check size={20} />
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={status === 'loading' || status === 'success'}
                        className={`w-full h-12 px-5 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-2
                            ${status === 'success'
                                ? 'bg-canvas text-ink-muted cursor-default shadow-pressed'
                                : 'bg-ember-500 text-white hover:bg-ember-600 shadow-ember active:shadow-pressed'
                            }
                        `}
                    >
                        {status === 'loading' ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : status === 'success' ? (
                            "You're on the list"
                        ) : (
                            <>
                                Join the waitlist
                            </>
                        )}
                    </button>

                    <div className="flex items-center justify-center gap-4 mt-2">
                        {message && status === 'error' && (
                            <p className="text-xs text-rose-500">{message}</p>
                        )}
                        {!message && (
                            <p className="text-xs text-ink-muted">
                                Early access + thinking frameworks. No spam.
                            </p>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
