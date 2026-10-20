"use client";

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { ArrowUp, Plus, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Feature = {
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'approved' | 'in_progress' | 'done';
    upvotes: number;
    created_at: string;
};

export default function WishlistPage() {
    const { user } = useUser();
    const [features, setFeatures] = useState<Feature[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // New Feature Form State
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success'>('idle');

    // Fetch Features
    useEffect(() => {
        fetchFeatures();
    }, []);

    const fetchFeatures = async () => {
        try {
            const res = await fetch('/api/wishlist');
            const data = await res.json();
            if (data.features) {
                setFeatures(data.features);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleVote = async (featureId: string) => {
        if (!user) {
            alert("Please sign in to vote!");
            return;
        }

        // Optimistic UI update (optional, but good for UX)
        // For simplicity, let's just await.
        try {
            const res = await fetch('/api/wishlist/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feature_id: featureId, vote_type: 1 })
            });
            const data = await res.json();
            if (data.success) {
                // Refresh list to get accurate count
                fetchFeatures();
            }
        } catch (e) {
            console.error("Vote failed", e);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitStatus('loading');
        try {
            const res = await fetch('/api/wishlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle, description: newDesc })
            });

            if (res.ok) {
                setSubmitStatus('success');
                setNewTitle('');
                setNewDesc('');
                setTimeout(() => {
                    setIsModalOpen(false);
                    setSubmitStatus('idle');
                    // We don't refresh immediately because new items are 'pending' and won't show up yet (unless we show pending tab)
                    alert("Feature requested! It will appear once approved.");
                }, 1500);
            }
        } catch (e) {
            console.error(e);
            setSubmitStatus('idle');
        }
    };

    return (
        <div className="min-h-screen bg-canvas">
            <Navbar />

            <div className="pt-32 pb-20 max-w-5xl mx-auto px-4 md:px-10">

                {/* Header */}
                <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between mb-12">
                    <div>
                        <div className="inline-flex items-center h-7 px-3 rounded-full bg-dusk-100 text-xs font-medium text-dusk-700 mb-4">
                            Community Roadmap
                        </div>
                        <h1 className="text-2xl md:text-[32px] md:leading-tight font-medium tracking-[-0.02em] text-ink mb-3">Feature Wishlist</h1>
                        <p className="text-ink-soft text-base max-w-2xl">
                            Help us build the Professional OS. Upvote the features you need most.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="h-12 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all flex items-center gap-2 self-start md:self-auto"
                    >
                        <Plus size={18} /> Request Feature
                    </button>
                </div>

                {/* Content */}
                <div className="flex gap-12">
                    {/* List Column */}
                    <div className="flex-1">
                        {loading ? (
                            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-ink-muted" /></div>
                        ) : features.length === 0 ? (
                            <div className="text-center py-20 bg-canvas shadow-pressed rounded-card">
                                <p className="text-ink-muted font-medium">No active features yet. Be the first!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {features.map(feature => (
                                    <div key={feature.id} className="bg-surface rounded-tile shadow-card p-5 flex gap-5 hover:shadow-float hover:-translate-y-0.5 transition-all group">
                                        {/* Vote Box */}
                                        <div className="flex flex-col items-center gap-1">
                                            <button
                                                onClick={() => handleVote(feature.id)}
                                                className="w-10 h-10 rounded-full bg-canvas shadow-raised flex items-center justify-center text-ink-muted hover:text-ember-600 active:shadow-pressed transition-all"
                                            >
                                                <ArrowUp size={20} className="stroke-[3]" />
                                            </button>
                                            <span className="text-sm font-medium text-ink">{feature.upvotes}</span>
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-[17px] font-medium tracking-[-0.01em] text-ink">{feature.title}</h3>
                                                {feature.status === 'in_progress' && (
                                                    <span className="text-xs font-medium bg-sand-100 text-sand-700 px-2.5 py-0.5 rounded-full">In Progress</span>
                                                )}
                                                {feature.status === 'done' && (
                                                    <span className="text-xs font-medium bg-sage-100 text-sage-700 px-2.5 py-0.5 rounded-full">Live</span>
                                                )}
                                            </div>
                                            <p className="text-ink-soft text-sm leading-relaxed mb-3">{feature.description}</p>
                                            <div className="flex items-center gap-4 text-xs text-ink-muted">
                                                <span className="flex items-center gap-1"><Clock size={12} /> {formatDistanceToNow(new Date(feature.created_at))} ago</span>
                                                {/* <span>by User {feature.user_id.slice(0,4)}...</span> */}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sidebar Stats */}
                    <div className="w-80 hidden lg:block">
                        <div className="bg-surface rounded-card shadow-card p-6 sticky top-32">
                            <h3 className="text-lg font-medium tracking-[-0.02em] text-ink mb-4">Roadmap Status</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="flex items-center gap-2 text-ink-soft">
                                        <div className="w-2 h-2 rounded-full bg-sand-500"></div> In Progress
                                    </span>
                                    <span className="font-mono text-ink font-medium">{features.filter(f => f.status === 'in_progress').length}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="flex items-center gap-2 text-ink-soft">
                                        <div className="w-2 h-2 rounded-full bg-sage-500"></div> Completed
                                    </span>
                                    <span className="font-mono text-ink font-medium">{features.filter(f => f.status === 'done').length}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="flex items-center gap-2 text-ink-soft">
                                        <div className="w-2 h-2 rounded-full bg-ink-muted"></div> Planned
                                    </span>
                                    <span className="font-mono text-ink font-medium">{features.filter(f => f.status === 'approved').length}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Request Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative bg-surface rounded-card w-full max-w-md p-6 md:p-8 shadow-float animate-in fade-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-1">Request a Feature</h2>
                        <p className="text-sm text-ink-soft mb-6">What functionality is missing for you?</p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-ink-muted mb-2">Feature Title</label>
                                <input
                                    className="w-full bg-canvas shadow-well rounded-2xl px-4 py-3 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 text-sm transition-all"
                                    placeholder="e.g. Export to PDF"
                                    value={newTitle}
                                    onChange={e => setNewTitle(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-ink-muted mb-2">Description</label>
                                <textarea
                                    className="w-full bg-canvas shadow-well rounded-2xl px-4 py-3 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 text-sm transition-all h-32 resize-none"
                                    placeholder="Why do you need this?"
                                    value={newDesc}
                                    onChange={e => setNewDesc(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 h-12 px-5 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitStatus === 'loading' || submitStatus === 'success'}
                                    className="flex-[2] h-12 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all flex items-center justify-center gap-2"
                                >
                                    {submitStatus === 'loading' ? <Loader2 className="animate-spin" size={18} /> :
                                        submitStatus === 'success' ? <CheckCircle2 size={18} /> : 'Submit Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    )
}
