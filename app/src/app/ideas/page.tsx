"use client";

import { useState } from 'react';
import { LimitModal } from '@/components/modal/LimitModal';

export default function IdeasPage() {
    const [limitModalOpen, setLimitModalOpen] = useState(false);
    const [limitState, setLimitState] = useState({ tier: 'free', usage: 0, limit: 0 });

    const handleExplore = async () => {
        try {
            // CALL REAL API (Check + Increment)
            const res = await fetch('/api/user/usage/search', { method: 'POST' });
            const data = await res.json();

            if (res.status === 403 || (data.usage && !data.allowed)) {
                // Trigger Modal
                setLimitState({
                    tier: data.tier || 'free',
                    usage: data.usage,
                    limit: data.limit
                });
                setLimitModalOpen(true);
                return;
            }

            // Success
            alert(`Exploring... (Usage: ${data.usage}/${data.limit})`);

        } catch (e) {
            console.error("Search check failed", e);
            // Fail open? or Alert?
            alert("Error checking usage. proceeding...");
        }
    };

    const ideas = [
        {
            id: "1",
            theme: "Hiring Philosophy",
            topic: "Why I hire for attitude, not skill",
            strengthensBelief: "Culture eats strategy for breakfast",
            exploresTension: "Speed vs quality",
            risksWeakening: "Move fast and break things",
            openingLine: "Most founders get hiring wrong. They optimize for skill when they should optimize for alignment.",
            rationale: "This explores your underexplored theme of hiring while connecting to your core culture belief.",
        },
        {
            id: "2",
            theme: "Building in Public",
            topic: "The hidden costs of transparency",
            strengthensBelief: "Build in public creates accountability",
            exploresTension: "Transparency vs competitive edge",
            openingLine: "Everyone tells you to build in public. Nobody tells you what it costs.",
            rationale: "Directly explores a tension you marked as 'explore' - could clarify your stance.",
        },
        {
            id: "3",
            theme: "Network Effects",
            topic: "Why I'm betting on networks over hierarchies",
            strengthensBelief: "Networks trump hierarchies",
            openingLine: "The org chart is a relic. Here's what's replacing it.",
            rationale: "Your emerging thesis needs more exploration to solidify as a core belief.",
        },
    ];

    return (
        <main className="min-h-screen bg-canvas">
            {/* Header */}
            <header className="bg-canvas">
                <div className="max-w-[1440px] mx-auto px-4 md:px-10 py-4 flex items-center justify-between gap-4">
                    <h1 className="text-xl font-medium tracking-[-0.02em] text-ink">counterdraft</h1>
                    <nav className="flex items-center gap-2 md:gap-3">
                        <a href="/beliefs" className="h-10 px-4 inline-flex items-center rounded-full bg-canvas shadow-raised text-sm font-medium text-ink-soft hover:text-ink transition-all">Beliefs</a>
                        <a href="/tensions" className="h-10 px-4 inline-flex items-center rounded-full bg-canvas shadow-raised text-sm font-medium text-ink-soft hover:text-ink transition-all">Tensions</a>
                        <a href="/ideas" className="h-10 px-4 inline-flex items-center rounded-full bg-canvas shadow-pressed text-sm font-medium text-ember-600">Ideas</a>
                    </nav>
                </div>
            </header>

            <div className="max-w-[1440px] mx-auto px-4 md:px-10 pt-8 md:pt-12 pb-28 md:pb-12">
                <div className="flex flex-col gap-8">
                    <div>
                    <h2 className="text-4xl md:text-[56px] md:leading-[1.05] font-medium tracking-[-0.03em] text-ink">Idea Directions</h2>
                    <p className="mt-3 text-base text-ink-soft">
                        Based on your belief graph, here&apos;s what might be worth exploring next.
                    </p>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-2">
                        {ideas.map((idea, index) => (
                            <div key={idea.id} className="bg-surface rounded-tile shadow-card p-5 md:p-6 hover:shadow-float hover:-translate-y-0.5 transition-all animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                                {/* Theme & Topic */}
                                <div className="mb-4">
                                    <p className="text-sm text-ember-600 font-medium mb-1">
                                        {idea.theme}
                                    </p>
                                    <h3 className="text-2xl font-medium tracking-[-0.02em] text-ink">{idea.topic}</h3>
                                </div>

                                {/* Belief connections */}
                                <div className="space-y-2 mb-4 text-sm">
                                    <div className="flex items-start gap-2">
                                        <span className="text-[var(--belief-core)]">↑</span>
                                        <span className="text-ink-muted">
                                            Strengthens: <span className="text-ink">{idea.strengthensBelief}</span>
                                        </span>
                                    </div>
                                    {idea.exploresTension && (
                                        <div className="flex items-start gap-2">
                                            <span className="text-[var(--tension-explore)]">◐</span>
                                            <span className="text-ink-muted">
                                                Explores: <span className="text-ink">{idea.exploresTension}</span>
                                            </span>
                                        </div>
                                    )}
                                    {idea.risksWeakening && (
                                        <div className="flex items-start gap-2">
                                            <span className="text-[var(--tension-inconsistency)]">↓</span>
                                            <span className="text-ink-muted">
                                                Risks: <span className="text-ink">{idea.risksWeakening}</span>
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Opening line */}
                                <div className="bg-canvas shadow-well rounded-2xl p-4 mb-4">
                                    <p className="text-sm text-ink-muted mb-1">Opening line</p>
                                    <p className="italic text-ink">&quot;{idea.openingLine}&quot;</p>
                                </div>

                                {/* Rationale */}
                                <p className="text-sm text-ink-soft mb-5">
                                    {idea.rationale}
                                </p>

                                {/* Actions */}
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleExplore}
                                        className="h-10 px-4 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all"
                                    >
                                        Explore This
                                    </button>
                                    <button className="h-10 px-4 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all">Dismiss</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <LimitModal
                isOpen={limitModalOpen}
                onClose={() => setLimitModalOpen(false)}
                tier={limitState.tier}
                usage={limitState.usage}
                limit={limitState.limit}
            />
        </main>
    );
}
