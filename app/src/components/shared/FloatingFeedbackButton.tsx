"use client";

import React, { useState, useEffect } from 'react';
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
        } catch (err) {
            setStatus('error');
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">

            {/* Expanded Form */}
            {isOpen && (
                <div className="mb-4 bg-white rounded-2xl shadow-2xl border border-zinc-200 w-[320px] overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
                    <div className="bg-zinc-50 px-4 py-3 border-b border-zinc-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Share Feedback</span>
                        <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                            <X size={16} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-4">
                        <textarea
                            className="w-full h-24 bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all resize-none placeholder:text-zinc-400 mb-3"
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
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all placeholder:text-zinc-400 mb-3"
                            />
                        )}

                        <button
                            type="submit"
                            disabled={status === 'loading' || !content.trim()}
                            className="w-full bg-zinc-900 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                className={`h-12 w-12 rounded-full shadow-xl flex items-center justify-center transition-all transform hover:scale-105 active:scale-95
                    ${isOpen ? 'bg-zinc-200 text-zinc-600' : 'bg-white border border-zinc-200 text-zinc-900 hover:border-green-500 hover:text-green-600'}
                `}
            >
                {isOpen ? <X size={20} /> : <MessageSquare size={20} />}
            </button>
        </div>
    );
};
