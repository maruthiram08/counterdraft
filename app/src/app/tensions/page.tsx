"use client";

import { useState } from "react";

type Classification = "inconsistency" | "intentional_nuance" | "explore" | null;

interface Tension {
    id: string;
    beliefA: string;
    beliefB: string;
    summary: string;
    classification: Classification;
}

export default function TensionsPage() {
    const [tensions, setTensions] = useState<Tension[]>([
        {
            id: "1",
            beliefA: "Move fast and break things",
            beliefB: "Quality over speed always",
            summary: "You advocate for both speed and quality, which can conflict in practice.",
            classification: null,
        },
        {
            id: "2",
            beliefA: "Build in public",
            beliefB: "Keep your edge hidden",
            summary: "Tension between transparency and competitive advantage.",
            classification: null,
        },
    ]);

    const classifyTension = (id: string, classification: Classification) => {
        setTensions((prev) =>
            prev.map((t) => (t.id === id ? { ...t, classification } : t))
        );
        // TODO: POST to /api/tensions/:id/classify
    };

    const pendingTensions = tensions.filter((t) => !t.classification);
    const resolvedTensions = tensions.filter((t) => t.classification);

    return (
        <main className="min-h-screen bg-[var(--background)]">
            {/* Header */}
            <header className="border-b border-[var(--border)] bg-[var(--surface)]">
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
                <div className="max-w-2xl">
                    <h2 className="text-3xl font-serif mb-2">Tensions & Contradictions</h2>
                    <p className="text-[var(--text-muted)] mb-8">
                        We&apos;ve detected beliefs that might conflict.
                        Classify each one to help us understand your thinking.
                    </p>

                    {pendingTensions.length > 0 && (
                        <section className="mb-12">
                            <h3 className="text-lg font-medium mb-4">
                                Needs Classification ({pendingTensions.length})
                            </h3>
                            <div className="space-y-6">
                                {pendingTensions.map((tension) => (
                                    <div key={tension.id} className="card animate-fade-in">
                                        <div className="mb-4">
                                            <p className="text-lg font-serif text-[var(--foreground)] mb-2">
                                                &quot;{tension.beliefA}&quot;
                                            </p>
                                            <p className="text-center text-[var(--text-subtle)] text-sm my-2">vs</p>
                                            <p className="text-lg font-serif text-[var(--foreground)]">
                                                &quot;{tension.beliefB}&quot;
                                            </p>
                                        </div>
                                        <p className="text-sm text-[var(--text-muted)] mb-6">
                                            {tension.summary}
                                        </p>
                                        <p className="text-sm font-medium mb-3">How do you hold these?</p>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => classifyTension(tension.id, "inconsistency")}
                                                className="tension-btn inconsistency"
                                            >
                                                ❌ Inconsistency
                                            </button>
                                            <button
                                                onClick={() => classifyTension(tension.id, "intentional_nuance")}
                                                className="tension-btn nuance"
                                            >
                                                ✅ Intentional Nuance
                                            </button>
                                            <button
                                                onClick={() => classifyTension(tension.id, "explore")}
                                                className="tension-btn explore"
                                            >
                                                🤔 Explore This
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {resolvedTensions.length > 0 && (
                        <section>
                            <h3 className="text-lg font-medium mb-4">
                                Classified ({resolvedTensions.length})
                            </h3>
                            <div className="space-y-4">
                                {resolvedTensions.map((tension) => (
                                    <div key={tension.id} className="card opacity-70">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-sm text-[var(--text-muted)]">
                                                    &quot;{tension.beliefA}&quot; vs &quot;{tension.beliefB}&quot;
                                                </p>
                                            </div>
                                            <span className={`badge ${tension.classification === "inconsistency" ? "bg-[var(--tension-inconsistency)]" :
                                                    tension.classification === "intentional_nuance" ? "bg-[var(--tension-nuance)]" :
                                                        "bg-[var(--tension-explore)]"
                                                } text-white`}>
                                                {tension.classification?.replace("_", " ")}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </main>
    );
}
