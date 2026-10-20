"use client";

import React, { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import { usePathname } from 'next/navigation';

export const FloatingFeedbackButton = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [content, setContent] = useState('');
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const { user, isLoaded } = useUser();
    const pathname = usePathname();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        setStatus('loading');

        try {
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    page_url: window.location.href, // Full URL including query params
                    user_id: user?.id || null,
                    email: user ? user.primaryEmailAddress?.emailAddress : email,
                    metadata: {
                        userAgent: navigator.userAgent,
                        pathname: pathname
                    }
                })
            });

            if (res.ok) {
                setStatus('success');
                setTimeout(() => {
                    setIsOpen(false);
                    setStatus('idle');
                    setContent('');
                    setEmail('');
                }, 2000);
            } else {
                setStatus('error');
            }
        } catch (error) {
            console.error("Feedback submit failed:", error);
            setStatus('error');
        }
    };

    return (
        <div className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-[100] flex flex-col items-end">

            {/* Expanded Form */}
            {isOpen && (
                <div className="mb-4 bg-canvas rounded-card shadow-float w-[min(320px,calc(100vw-2rem))] overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
                    <div className="px-5 pt-5 pb-1 flex justify-between items-center">
                        <span className="text-[17px] font-medium tracking-[-0.01em] text-ink">Share Feedback</span>
                        <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center bg-canvas shadow-raised text-ink-soft hover:text-ink active:shadow-pressed transition-all">
                            <X size={16} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-5 pt-3">
                        <textarea
                            className="w-full h-24 bg-canvas shadow-well rounded-2xl px-4 py-3 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 text-sm transition-all resize-none mb-3"
                            placeholder="Help us improve. What's on your mind?"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            autoFocus
                        />

                        {/* Email field only for anonymous users */}
                        {isLoaded && !user && (
                            <input
                                type="email"
                                placeholder="Your email (optional)"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-canvas shadow-well rounded-2xl px-4 py-3 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 text-sm transition-all mb-3"
                            />
                        )}

                        <button
                            type="submit"
                            disabled={status === 'loading' || !content.trim()}
                            className="w-full h-10 px-4 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {status === 'loading' ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : status === 'success' ? (
                                "Sent!"
                            ) : (
                                <>
                                    Send Feedback <Send size={14} />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`h-12 w-12 rounded-full flex items-center justify-center transition-all
                    ${isOpen ? 'bg-canvas shadow-pressed text-ember-600' : 'bg-canvas shadow-raised text-ink hover:text-ember-600 active:shadow-pressed'}
                `}
            >
                {isOpen ? <X size={20} /> : <MessageSquare size={20} />}
            </button>
        </div>
    );
};
