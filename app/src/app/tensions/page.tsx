"use client";

import { useTensions } from "@/hooks/useTensions";
import { useState } from "react";
import { Loader2, Filter, Archive } from "lucide-react";

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
        <main className="min-h-screen bg-canvas">
            {/* Header */}
            <header className="bg-canvas/90 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-[1440px] mx-auto px-4 md:px-10 py-4 flex items-center justify-between gap-4">
                    <h1 className="text-xl font-medium tracking-[-0.02em] text-ink">counterdraft</h1>
                    <nav className="flex items-center gap-2 md:gap-3">
                        <a href="/beliefs" className="h-10 px-4 inline-flex items-center rounded-full bg-canvas shadow-raised text-sm font-medium text-ink-soft hover:text-ink transition-all">Beliefs</a>
                        <a href="/tensions" className="h-10 px-4 inline-flex items-center rounded-full bg-canvas shadow-pressed text-sm font-medium text-ember-600">Tensions</a>
                        <a href="/ideas" className="h-10 px-4 inline-flex items-center rounded-full bg-canvas shadow-raised text-sm font-medium text-ink-soft hover:text-ink transition-all">Ideas</a>
                    </nav>
                </div>
            </header>

            <div className="max-w-[1440px] mx-auto px-4 md:px-10 pt-8 md:pt-12 pb-28 md:pb-12">
                <div className="flex flex-col gap-8">
                    <header>
                        <h2 className="text-4xl md:text-[56px] md:leading-[1.05] font-medium tracking-[-0.03em] text-ink">Tensions & Contradictions</h2>
                        <p className="mt-3 text-base text-ink-soft">
                            We&apos;ve detected beliefs that might conflict. Classify each one to refine your worldview.
                        </p>
                    </header>

                    {/* Controls */}
                    <div className="flex flex-wrap items-center gap-3">
                        <Filter size={16} className="text-ink-muted mr-1" />
                        <button
                            onClick={() => setActiveFilter('pending')}
                            className={`h-10 px-4 rounded-full bg-canvas text-sm font-medium transition-all ${activeFilter === 'pending'
                                ? 'shadow-pressed text-ember-600'
                                : 'shadow-raised text-ink-soft hover:text-ink'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                Needs Review
                                <span className="bg-sand-100 text-sand-700 px-2 py-0.5 rounded-full text-xs">
                                    {pendingTensions.length}
                                </span>
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveFilter('resolved')}
                            className={`h-10 px-4 rounded-full bg-canvas text-sm font-medium transition-all ${activeFilter === 'resolved'
                                ? 'shadow-pressed text-ember-600'
                                : 'shadow-raised text-ink-soft hover:text-ink'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                Classified
                                <span className="bg-sage-100 text-sage-700 px-2 py-0.5 rounded-full text-xs">
                                    {resolvedTensions.length}
                                </span>
                            </span>
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center py-20">
                            <Loader2 className="mx-auto animate-spin mb-4 text-ember-500" />
                            <p className="text-ink-muted">Loading tensions...</p>
                        </div>
                    ) : filteredList.length === 0 ? (
                        <div className="text-center py-20 bg-canvas shadow-pressed rounded-card">
                            <Archive className="mx-auto mb-4 text-ink-muted" />
                            <p className="text-ink-muted">
                                {activeFilter === 'pending' ? "No new tensions found! Great clarity." : "No tensions classified yet."}
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-5">
                            {filteredList.map((tension) => (
                                <div key={tension.id} className={`bg-surface rounded-card shadow-card p-6 md:p-8 animate-fade-in ${activeFilter === 'resolved' ? 'opacity-80 hover:opacity-100' : ''}`}>
                                    <div className="mb-4">
                                        <div className="flex items-center justify-center gap-4 mb-4">
                                            <div className="flex-1 text-right">
                                                <p className="text-[17px] md:text-lg font-medium tracking-[-0.01em] text-ink leading-snug">
                                                    &quot;{tension.beliefA}&quot;
                                                </p>
                                            </div>
                                            <div className="shrink-0 w-10 h-10 flex items-center justify-center text-xs font-medium text-white bg-ink rounded-full">
                                                VS
                                            </div>
                                            <div className="flex-1 text-left">
                                                <p className="text-[17px] md:text-lg font-medium tracking-[-0.01em] text-ink leading-snug">
                                                    &quot;{tension.beliefB}&quot;
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-sm text-ink-soft text-center max-w-lg mx-auto bg-canvas shadow-well px-4 py-3 rounded-2xl">
                                            {tension.summary}
                                        </p>
                                    </div>

                                    {(activeFilter === 'pending' || activeFilter === 'all') && (
                                        <div className="pt-5 border-t border-line mt-5">
                                            <p className="text-sm font-medium mb-4 text-center text-ink-soft">How do you hold this tension?</p>
                                            <div className="flex flex-wrap justify-center gap-3">
                                                <button
                                                    onClick={() => classifyTension(tension.id, "inconsistency")}
                                                    className={`h-10 px-4 rounded-full text-sm font-medium transition-all ${tension.classification === 'inconsistency'
                                                        ? 'bg-rose-100 text-rose-700 shadow-pressed'
                                                        : 'bg-canvas shadow-raised text-ink-soft hover:text-rose-700 active:shadow-pressed'
                                                        }`}
                                                >
                                                    ❌ Inconsistency
                                                </button>
                                                <button
                                                    onClick={() => classifyTension(tension.id, "intentional_nuance")}
                                                    className={`h-10 px-4 rounded-full text-sm font-medium transition-all ${tension.classification === 'intentional_nuance'
                                                        ? 'bg-sage-100 text-sage-700 shadow-pressed'
                                                        : 'bg-canvas shadow-raised text-ink-soft hover:text-sage-700 active:shadow-pressed'
                                                        }`}
                                                >
                                                    ✅ Nuance
                                                </button>
                                                <button
                                                    onClick={() => classifyTension(tension.id, "explore")}
                                                    className={`h-10 px-4 rounded-full text-sm font-medium transition-all ${tension.classification === 'explore'
                                                        ? 'bg-dusk-100 text-dusk-700 shadow-pressed'
                                                        : 'bg-canvas shadow-raised text-ink-soft hover:text-dusk-700 active:shadow-pressed'
                                                        }`}
                                                >
                                                    🤔 Explore
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {activeFilter === 'resolved' && (
                                        <div className="flex justify-center pt-2">
                                            <span className={`h-7 inline-flex items-center px-3 rounded-full text-xs font-medium ${tension.classification === 'inconsistency' ? 'bg-rose-100 text-rose-700' :
                                                tension.classification === 'intentional_nuance' ? 'bg-sage-100 text-sage-700' :
                                                    'bg-dusk-100 text-dusk-700'
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
