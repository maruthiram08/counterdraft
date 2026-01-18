"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BeliefCard } from "@/components/thinking/BeliefCard";
import { useBeliefs } from "@/hooks/useBeliefs";
import { TensionCard } from "@/components/thinking/TensionCard";
import { DirectionCard } from "@/components/thinking/DirectionCard";
import { DraftModal } from "@/components/thinking/DraftModal";
import { AddContentModal } from "@/components/thinking/AddContentModal";
import { Layers, Zap, Compass, Plus, CheckCircle, Sparkles, Loader2 } from "lucide-react";
import { useDirections } from "@/hooks/useDirections";
import { useTensions } from "@/hooks/useTensions";

export default function WorkspacePage() {
    const [activeSection, setActiveSection] = useState<'beliefs' | 'tensions' | 'directions'>('beliefs');
    const { beliefs, loading, submitFeedback } = useBeliefs();
    const [reviewedBeliefIds, setReviewedBeliefIds] = useState<Set<string>>(new Set());
    const { directions, loading: directionsLoading, generateDirections, generated } = useDirections();
    const { tensions, loading: tensionsLoading, classifyTension } = useTensions();
    const [classifiedTensionIds, setClassifiedTensionIds] = useState<Set<string>>(new Set());

    // Modal state
    const [draftModalOpen, setDraftModalOpen] = useState(false);
    const [selectedBelief, setSelectedBelief] = useState("");
    const [addContentModalOpen, setAddContentModalOpen] = useState(false);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
                <div className="text-[var(--text-muted)] animate-pulse">Loading your belief graph...</div>
            </div>
        );
    }

    const totalSources = 3; // TODO: Fetch real source count

    // Track and persist when a belief is reviewed
    const handleBeliefReviewed = async (beliefId: string, feedback: 'accurate' | 'misses' | 'clarify') => {
        setReviewedBeliefIds(prev => new Set([...prev, beliefId]));
        await submitFeedback(beliefId, feedback);
    };

    // Filter out reviewed beliefs
    const unreviewedCore = beliefs.core.filter((b: { id: string }) => !reviewedBeliefIds.has(b.id));
    const unreviewedEmerging = beliefs.emerging.filter((b: { id: string }) => !reviewedBeliefIds.has(b.id));
    const unreviewedOverused = beliefs.overused.filter((b: { id: string }) => !reviewedBeliefIds.has(b.id));
    const allBeliefsReviewed = unreviewedCore.length === 0 && unreviewedEmerging.length === 0 && unreviewedOverused.length === 0 && beliefs.core.length + beliefs.emerging.length + beliefs.overused.length > 0;

    // Helper to render empty states
    const renderEmptyState = (type: string) => (
        <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-lg">
            <p className="text-[var(--text-muted)]">No {type} found yet.</p>
        </div>
    );

    // Completion message when all reviewed
    const renderCompletionState = () => (
        <div className="text-center py-16 border border-green-200 bg-green-50/50 rounded-lg">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
            <h3 className="text-xl font-medium text-green-700 mb-2">All beliefs reviewed!</h3>
            <p className="text-[var(--text-muted)]">Great job! Add more content to extract new beliefs.</p>
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            <Header />

            <main className="flex-1 container py-8">

                {/* Workspace Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-serif font-medium">Your Thinking Workspace</h1>
                        <p className="text-[var(--text-muted)]">{totalSources} documents analyzed</p>
                    </div>
                    <button
                        onClick={() => setAddContentModalOpen(true)}
                        className="btn btn-secondary text-sm"
                    >
                        <Plus size={16} /> Add Content
                    </button>
                </div>

                {/* Navigation Tabs (Sections) */}
                <div className="flex items-center gap-1 border-b border-[var(--border)] mb-8">
                    <button
                        onClick={() => setActiveSection('beliefs')}
                        className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${activeSection === 'beliefs'
                            ? 'border-[var(--accent)] text-[var(--foreground)]'
                            : 'border-transparent text-[var(--text-muted)] hover:text-[var(--foreground)]'
                            }`}
                    >
                        <Layers size={18} /> Beliefs
                    </button>
                    <button
                        onClick={() => setActiveSection('tensions')}
                        className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${activeSection === 'tensions'
                            ? 'border-[var(--accent)] text-[var(--foreground)]'
                            : 'border-transparent text-[var(--text-muted)] hover:text-[var(--foreground)]'
                            }`}
                    >
                        <Zap size={18} /> Tensions {tensions.length > 0 && <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">{tensions.filter(t => t.classification === 'pending').length}</span>}
                    </button>
                    <button
                        onClick={() => setActiveSection('directions')}
                        className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${activeSection === 'directions'
                            ? 'border-[var(--accent)] text-[var(--foreground)]'
                            : 'border-transparent text-[var(--text-muted)] hover:text-[var(--foreground)]'
                            }`}
                    >
                        <Compass size={18} /> Directions
                    </button>
                </div>

                {/* CONTENT AREA */}
                <div className="animate-fade-in max-w-4xl">

                    {/* BELIEFS SECTION */}
                    {activeSection === 'beliefs' && (
                        <div className="space-y-6">
                            {/* Show completion if all reviewed */}
                            {allBeliefsReviewed && renderCompletionState()}

                            {/* Core Beliefs */}
                            {unreviewedCore.length > 0 && (
                                <section>
                                    <h3 className="text-sm font-medium text-[var(--text-muted)] mb-3">CORE BELIEFS</h3>
                                    <div className="space-y-4">
                                        {unreviewedCore.map((b: { id: string; statement: string }) => (
                                            <BeliefCard
                                                key={b.id}
                                                beliefId={b.id}
                                                type="core"
                                                belief={b.statement}
                                                sourceCount={1}
                                                onFeedback={handleBeliefReviewed}
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Emerging Beliefs */}
                            {unreviewedEmerging.length > 0 && (
                                <section>
                                    <h3 className="text-sm font-medium text-[var(--text-muted)] mb-3">EMERGING THESES</h3>
                                    <div className="space-y-4">
                                        {unreviewedEmerging.map((b: { id: string; statement: string }) => (
                                            <BeliefCard
                                                key={b.id}
                                                beliefId={b.id}
                                                type="emerging"
                                                belief={b.statement}
                                                sourceCount={1}
                                                onFeedback={handleBeliefReviewed}
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Overused Beliefs */}
                            {unreviewedOverused.length > 0 && (
                                <section>
                                    <h3 className="text-sm font-medium text-[var(--text-muted)] mb-3">OVERUSED ANGLES</h3>
                                    <div className="space-y-4">
                                        {unreviewedOverused.map((b: { id: string; statement: string }) => (
                                            <BeliefCard
                                                key={b.id}
                                                beliefId={b.id}
                                                type="overused"
                                                belief={b.statement}
                                                sourceCount={1}
                                                onFeedback={handleBeliefReviewed}
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Empty state when no beliefs ever existed */}
                            {beliefs.core.length === 0 && beliefs.emerging.length === 0 && beliefs.overused.length === 0 && renderEmptyState("beliefs")}
                        </div>
                    )}

                    {/* TENSIONS SECTION */}
                    {activeSection === 'tensions' && (
                        <div className="space-y-6">
                            {tensionsLoading && (
                                <div className="text-center py-16">
                                    <Loader2 size={32} className="mx-auto animate-spin text-[var(--accent)] mb-4" />
                                    <p className="text-[var(--text-muted)]">Loading tensions...</p>
                                </div>
                            )}

                            {!tensionsLoading && tensions.filter(t => !classifiedTensionIds.has(t.id)).length === 0 && (
                                tensions.length === 0
                                    ? renderEmptyState("tensions")
                                    : (
                                        <div className="text-center py-16 border border-green-200 bg-green-50/50 rounded-lg">
                                            <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
                                            <h3 className="text-xl font-medium text-green-700 mb-2">All tensions classified!</h3>
                                            <p className="text-[var(--text-muted)]">Great work! Add more content to detect new tensions.</p>
                                        </div>
                                    )
                            )}

                            {!tensionsLoading && tensions.filter(t => !classifiedTensionIds.has(t.id)).map(t => (
                                <TensionCard
                                    key={t.id}
                                    tensionId={t.id}
                                    tension={t.summary}
                                    sideA={t.beliefA}
                                    sideB={t.beliefB}
                                    initialClassification={t.classification}
                                    onClassify={(id, classification) => {
                                        classifyTension(id, classification);
                                        setClassifiedTensionIds(prev => new Set([...prev, id]));
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    {/* DIRECTIONS SECTION */}
                    {activeSection === 'directions' && (
                        <div className="space-y-6">
                            {!generated && !directionsLoading && (
                                <div className="text-center py-16 border border-dashed border-[var(--border)] rounded-lg">
                                    <Sparkles size={48} className="mx-auto text-[var(--accent)] mb-4" />
                                    <h3 className="text-xl font-medium mb-2">Generate Content Ideas</h3>
                                    <p className="text-[var(--text-muted)] mb-6">Based on your beliefs, AI will suggest what to write next.</p>
                                    <button
                                        onClick={generateDirections}
                                        className="btn btn-primary"
                                    >
                                        <Sparkles size={16} /> Generate Ideas
                                    </button>
                                </div>
                            )}

                            {directionsLoading && (
                                <div className="text-center py-16">
                                    <Loader2 size={32} className="mx-auto animate-spin text-[var(--accent)] mb-4" />
                                    <p className="text-[var(--text-muted)]">Generating ideas...</p>
                                </div>
                            )}

                            {generated && directions.length > 0 && (
                                <div className="grid md:grid-cols-2 gap-6">
                                    {directions.map((d, idx) => (
                                        <DirectionCard
                                            key={idx}
                                            title={d.theme}
                                            reason={d.rationale}
                                        />
                                    ))}
                                </div>
                            )}

                            {generated && directions.length === 0 && (
                                <div className="text-center py-12">
                                    <p className="text-[var(--text-muted)]">No ideas generated. Try adding more content first.</p>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </main>

            <Footer />

            {/* Modals */}
            <DraftModal
                belief={selectedBelief}
                isOpen={draftModalOpen}
                onClose={() => setDraftModalOpen(false)}
            />
            <AddContentModal
                isOpen={addContentModalOpen}
                onClose={() => setAddContentModalOpen(false)}
                onSuccess={() => window.location.reload()}
            />
        </div>
    );
}
