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
            console.log("Search Recorded. Usage:", data.usage);
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
        <main className="min-h-screen bg-[var(--background)]">
            {/* Header */}
            <header className="border-b border-[var(--border)] bg-[var(--surface)]">
                <div className="container py-4 flex items-center justify-between">
                    <h1 className="text-xl font-medium tracking-tight">counterdraft</h1>
                    <nav className="flex items-center gap-6">
                        <a href="/beliefs" className="text-sm text-[var(--text-muted)] hover:text-[var(--foreground)]">Beliefs</a>
                        <a href="/tensions" className="text-sm text-[var(--text-muted)] hover:text-[var(--foreground)]">Tensions</a>
                        <a href="/ideas" className="text-sm font-medium">Ideas</a>
                    </nav>
                </div>
            </header>

            <div className="container py-12">
                <div className="max-w-2xl">
                    <h2 className="text-3xl font-serif mb-2">Idea Directions</h2>
                    <p className="text-[var(--text-muted)] mb-8">
                        Based on your belief graph, here&apos;s what might be worth exploring next.
                    </p>

                    <div className="space-y-6">
                        {ideas.map((idea, index) => (
                            <div key={idea.id} className="card animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                                {/* Theme & Topic */}
                                <div className="mb-4">
                                    <p className="text-xs text-[var(--accent-secondary)] uppercase tracking-wider mb-1">
                                        {idea.theme}
                                    </p>
                                    <h3 className="text-xl font-serif">{idea.topic}</h3>
                                </div>

                                {/* Belief connections */}
                                <div className="space-y-2 mb-4 text-sm">
                                    <div className="flex items-start gap-2">
                                        <span className="text-[var(--belief-core)]">↑</span>
                                        <span className="text-[var(--text-muted)]">
                                            Strengthens: <span className="text-[var(--foreground)]">{idea.strengthensBelief}</span>
                                        </span>
                                    </div>
                                    {idea.exploresTension && (
                                        <div className="flex items-start gap-2">
                                            <span className="text-[var(--tension-explore)]">◐</span>
                                            <span className="text-[var(--text-muted)]">
                                                Explores: <span className="text-[var(--foreground)]">{idea.exploresTension}</span>
                                            </span>
                                        </div>
                                    )}
                                    {idea.risksWeakening && (
                                        <div className="flex items-start gap-2">
                                            <span className="text-[var(--tension-inconsistency)]">↓</span>
                                            <span className="text-[var(--text-muted)]">
                                                Risks: <span className="text-[var(--foreground)]">{idea.risksWeakening}</span>
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Opening line */}
                                <div className="bg-[var(--background)] rounded-lg p-4 mb-4 border border-[var(--border)]">
                                    <p className="text-sm text-[var(--text-subtle)] mb-1">Opening line</p>
                                    <p className="font-serif italic">&quot;{idea.openingLine}&quot;</p>
                                </div>

                                {/* Rationale */}
                                <p className="text-sm text-[var(--text-muted)] mb-4">
                                    {idea.rationale}
                                </p>

                                {/* Actions */}
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleExplore}
                                        className="btn btn-primary"
                                    >
                                        Explore This
                                    </button>
                                    <button className="btn btn-secondary">Dismiss</button>
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
