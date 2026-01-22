"use client";

import { useTensions } from "@/hooks/useTensions";
import { useState } from "react";
import { Loader2, Check, Filter, Archive, AlertCircle } from "lucide-react";

type FilterType = 'pending' | 'resolved' | 'all';

export default function TensionsPage() {
    const { tensions, loading, classifyTension } = useTensions();
    const [activeFilter, setActiveFilter] = useState<FilterType>('pending');

    const pendingTensions = tensions.filter(t => !t.classification || t.classification === 'pending');
    const resolvedTensions = tensions.filter(t => t.classification && t.classification !== 'pending');

    const filteredList = activeFilter === 'pending' ? pendingTensions
        : activeFilter === 'resolved' ? resolvedTensions
            : tensions;

    return (
        <main className="min-h-screen bg-[var(--background)]">
            {/* Header */}
            <header className="border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-10">
                <div className="container py-4 flex items-center justify-between">
                    <h1 className="text-xl font-medium tracking-tight">counterdraft</h1>
                    <nav className="flex items-center gap-6">
                        <a href="/beliefs" className="text-sm text-[var(--text-muted)] hover:text-[var(--foreground)]">Beliefs</a>
                        <a href="/tensions" className="text-sm font-medium">Tensions</a>
                        <a href="/ideas" className="text-sm text-[var(--text-muted)] hover:text-[var(--foreground)]">Ideas</a>
                    </nav>
                </div>
            </header>

            <div className="container py-12">
                <div className="max-w-3xl mx-auto">
                    <header className="mb-8">
                        <h2 className="text-3xl font-serif mb-2">Tensions & Contradictions</h2>
                        <p className="text-[var(--text-muted)]">
                            We&apos;ve detected beliefs that might conflict. Classify each one to refine your worldview.
                        </p>
                    </header>

                    {/* Controls */}
                    <div className="flex flex-wrap items-center gap-2 mb-8 pb-4 border-b">
                        <Filter size={16} className="text-[var(--text-muted)] mr-2" />
                        <button
                            onClick={() => setActiveFilter('pending')}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${activeFilter === 'pending'
                                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-gray-50'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                Needs Review
                                <span className="bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-full text-xs">
                                    {pendingTensions.length}
                                </span>
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveFilter('resolved')}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${activeFilter === 'resolved'
                                ? 'bg-green-100 text-green-900 border border-green-200'
                                : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-gray-50'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                Classified
                                <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">
                                    {resolvedTensions.length}
                                </span>
                            </span>
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center py-20">
                            <Loader2 className="mx-auto animate-spin mb-4 text-[var(--text-muted)]" />
                            <p className="text-[var(--text-muted)]">Loading tensions...</p>
                        </div>
                    ) : filteredList.length === 0 ? (
                        <div className="text-center py-20 border border-dashed rounded-lg bg-gray-50/50">
                            <Archive className="mx-auto mb-4 text-[var(--text-muted)]" />
                            <p className="text-[var(--text-muted)]">
                                {activeFilter === 'pending' ? "No new tensions found! Great clarity." : "No tensions classified yet."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {filteredList.map((tension) => (
                                <div key={tension.id} className={`card animate-fade-in ${activeFilter === 'resolved' ? 'opacity-80 hover:opacity-100' : ''}`}>
                                    <div className="mb-4">
                                        <div className="flex items-center justify-center gap-4 mb-2">
                                            <div className="flex-1 text-right">
                                                <p className="text-lg font-serif text-[var(--foreground)] leading-tight">
                                                    &quot;{tension.beliefA}&quot;
                                                </p>
                                            </div>
                                            <div className="shrink-0 text-xs font-bold text-[var(--text-subtle)] bg-gray-100 px-2 py-1 rounded-full uppercase tracking-wider">
                                                VS
                                            </div>
                                            <div className="flex-1 text-left">
                                                <p className="text-lg font-serif text-[var(--foreground)] leading-tight">
                                                    &quot;{tension.beliefB}&quot;
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-sm text-[var(--text-muted)] text-center max-w-lg mx-auto bg-gray-50 p-2 rounded">
                                            {tension.summary}
                                        </p>
                                    </div>

                                    {(activeFilter === 'pending' || activeFilter === 'all') && (
                                        <div className="pt-4 border-t mt-4">
                                            <p className="text-sm font-medium mb-3 text-center text-[var(--text-secondary)]">How do you hold this tension?</p>
                                            <div className="flex flex-wrap justify-center gap-3">
                                                <button
                                                    onClick={() => classifyTension(tension.id, "inconsistency")}
                                                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${tension.classification === 'inconsistency'
                                                        ? 'bg-red-50 border-red-200 text-red-700 ring-2 ring-red-500/20'
                                                        : 'bg-white border-gray-200 hover:border-red-200 hover:text-red-700'
                                                        }`}
                                                >
                                                    ❌ Inconsistency
                                                </button>
                                                <button
                                                    onClick={() => classifyTension(tension.id, "intentional_nuance")}
                                                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${tension.classification === 'intentional_nuance'
                                                        ? 'bg-green-50 border-green-200 text-green-700 ring-2 ring-green-500/20'
                                                        : 'bg-white border-gray-200 hover:border-green-200 hover:text-green-700'
                                                        }`}
                                                >
                                                    ✅ Nuance
                                                </button>
                                                <button
                                                    onClick={() => classifyTension(tension.id, "explore")}
                                                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${tension.classification === 'explore'
                                                        ? 'bg-blue-50 border-blue-200 text-blue-700 ring-2 ring-blue-500/20'
                                                        : 'bg-white border-gray-200 hover:border-blue-200 hover:text-blue-700'
                                                        }`}
                                                >
                                                    🤔 Explore
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {activeFilter === 'resolved' && (
                                        <div className="flex justify-center pt-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${tension.classification === 'inconsistency' ? 'bg-red-50 text-red-700 border-red-100' :
                                                tension.classification === 'intentional_nuance' ? 'bg-green-50 text-green-700 border-green-100' :
                                                    'bg-blue-50 text-blue-700 border-blue-100'
                                                }`}>
                                                {tension.classification === 'inconsistency' ? 'Resolved as Inconsistency' :
                                                    tension.classification === 'intentional_nuance' ? 'Accepted as Nuance' :
                                                        'Marked for Exploration'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
