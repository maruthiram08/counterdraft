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
    const { user, isLoaded } = useUser();
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
        <div className="min-h-screen bg-[#fcfcfc]">
            <Navbar />

            <div className="pt-32 pb-20 max-w-5xl mx-auto px-6">

                {/* Header */}
                <div className="flex items-end justify-between mb-12">
                    <div>
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[10px] font-bold text-blue-700 mb-4 tracking-widest uppercase">
                            Community Roadmap
                        </div>
                        <h1 className="text-4xl font-bold text-zinc-900 mb-4">Feature Wishlist</h1>
                        <p className="text-zinc-500 text-lg max-w-2xl">
                            Help us build the Professional OS. Upvote the features you need most.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-zinc-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-black transition-all flex items-center gap-2 shadow-lg"
                    >
                        <Plus size={18} /> Request Feature
                    </button>
                </div>

                {/* Content */}
                <div className="flex gap-12">
                    {/* List Column */}
                    <div className="flex-1">
                        {loading ? (
                            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-zinc-300" /></div>
                        ) : features.length === 0 ? (
                            <div className="text-center py-20 bg-zinc-50 rounded-2xl border border-zinc-100">
                                <p className="text-zinc-400 font-medium">No active features yet. Be the first!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {features.map(feature => (
                                    <div key={feature.id} className="bg-white border border-zinc-200 rounded-xl p-6 flex gap-6 hover:shadow-md transition-shadow group">
                                        {/* Vote Box */}
                                        <div className="flex flex-col items-center gap-1">
                                            <button
                                                onClick={() => handleVote(feature.id)}
                                                className="w-10 h-10 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-400 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-all"
                                            >
                                                <ArrowUp size={20} className="stroke-[3]" />
                                            </button>
                                            <span className="text-sm font-bold text-zinc-900">{feature.upvotes}</span>
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-lg font-bold text-zinc-900">{feature.title}</h3>
                                                {feature.status === 'in_progress' && (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-0.5 rounded">In Progress</span>
                                                )}
                                                {feature.status === 'done' && (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 px-2 py-0.5 rounded">Live</span>
                                                )}
                                            </div>
                                            <p className="text-zinc-500 text-sm leading-relaxed mb-3">{feature.description}</p>
                                            <div className="flex items-center gap-4 text-xs text-zinc-400">
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
                        <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100 sticky top-32">
                            <h3 className="font-bold text-zinc-900 mb-4">Roadmap Status</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="flex items-center gap-2 text-zinc-600">
                                        <div className="w-2 h-2 rounded-full bg-amber-400"></div> In Progress
                                    </span>
                                    <span className="font-mono text-zinc-900 font-bold">{features.filter(f => f.status === 'in_progress').length}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="flex items-center gap-2 text-zinc-600">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div> Completed
                                    </span>
                                    <span className="font-mono text-zinc-900 font-bold">{features.filter(f => f.status === 'done').length}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="flex items-center gap-2 text-zinc-600">
                                        <div className="w-2 h-2 rounded-full bg-zinc-300"></div> Planned
                                    </span>
                                    <span className="font-mono text-zinc-900 font-bold">{features.filter(f => f.status === 'approved').length}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Request Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold mb-1">Request a Feature</h2>
                        <p className="text-sm text-zinc-500 mb-6">What functionality is missing for you?</p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Feature Title</label>
                                <input
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                                    placeholder="e.g. Export to PDF"
                                    value={newTitle}
                                    onChange={e => setNewTitle(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Description</label>
                                <textarea
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all h-32 resize-none"
                                    placeholder="Why do you need this?"
                                    value={newDesc}
                                    onChange={e => setNewDesc(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-3 rounded-xl border border-zinc-200 font-bold text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitStatus === 'loading' || submitStatus === 'success'}
                                    className="flex-[2] py-3 rounded-xl bg-zinc-900 text-white font-bold text-sm hover:bg-black transition-colors flex items-center justify-center gap-2"
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
