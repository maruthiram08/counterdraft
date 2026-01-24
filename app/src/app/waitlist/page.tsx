"use client";

import React, { useState, useRef } from 'react';
import { Check, Loader2 } from 'lucide-react';

export default function WaitlistPage() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

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
                setEmail('');
            } else {
                setStatus('error');
                setMessage(data.error || 'Something went wrong.');
            }
        } catch (err) {
            setStatus('error');
            setMessage('Network error.');
        }
    };

    return (
        <div className="min-h-screen bg-[#fcfcfc] text-zinc-900 font-sans flex flex-col items-center justify-center">

            {/* 2. Content: Centered without image */}
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[480px] p-6 pb-20 mx-auto">
                {/* Logo Section - Moved inside for better proximity */}
                <div className="flex items-center justify-center gap-4 mb-8">
                    <img src="/brand/logo-icon.png" alt="Icon" className="h-16 w-16 object-contain" />
                    <img src="/brand/logo-text.png" alt="CounterDraft" className="h-12 w-auto opacity-90" />
                </div>

                <h1 className="text-3xl font-bold text-center mb-3 text-zinc-900 leading-tight">
                    We challenge your ideas <br />
                    <span className="text-zinc-500">before the internet does.</span>
                </h1>

                <p className="text-xs text-zinc-500 text-center mb-8 font-medium tracking-wide">
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
                            className="w-full bg-white border border-zinc-200 text-zinc-900 rounded-xl py-4 px-4 text-base focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition-all placeholder:text-zinc-400 shadow-sm appearance-none"
                            required
                        />
                        {status === 'success' && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600">
                                <Check size={20} />
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={status === 'loading' || status === 'success'}
                        className={`w-full py-4 rounded-xl font-bold text-base transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg
                            ${status === 'success'
                                ? 'bg-zinc-100 text-zinc-400 cursor-default shadow-none border border-zinc-200'
                                : 'bg-black text-white hover:bg-zinc-800 shadow-xl shadow-black/5'
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
                            <p className="text-xs text-red-500">{message}</p>
                        )}
                        {!message && (
                            <p className="text-[10px] text-zinc-500">
                                Early access + thinking frameworks. No spam.
                            </p>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
