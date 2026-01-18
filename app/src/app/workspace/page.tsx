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
import { DraftCard } from "@/components/thinking/DraftCard";
import { Layers, Zap, Compass, Plus, CheckCircle, Sparkles, Loader2, FileText } from "lucide-react";
import { useDirections } from "@/hooks/useDirections";
import { useTensions } from "@/hooks/useTensions";
import { useDrafts, Draft } from "@/hooks/useDrafts";
import { ThreePaneLayout } from "@/components/editor/ThreePaneLayout";
import { DraftsSidebar } from "@/components/editor/DraftsSidebar";
import { MainEditor } from "@/components/editor/MainEditor";
import { AgentSidebar } from "@/components/editor/AgentSidebar";

export default function WorkspacePage() {
    const [activeSection, setActiveSection] = useState<'beliefs' | 'tensions' | 'directions' | 'drafts'>('beliefs');
    const { beliefs, loading, submitFeedback } = useBeliefs();
    const [reviewedBeliefIds, setReviewedBeliefIds] = useState<Set<string>>(new Set());
    const { directions, loading: directionsLoading, generateDirections, generated } = useDirections();
    const { tensions, loading: tensionsLoading, classifyTension } = useTensions();
    const [classifiedTensionIds, setClassifiedTensionIds] = useState<Set<string>>(new Set());
    const { drafts, loading: draftsLoading, saveDraft, deleteDraft, updateDraft } = useDrafts();
    const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
    const selectedDraft = drafts.find(d => d.id === selectedDraftId) || null;

    // Agent update handler
    const handleAgentApply = (refinedContent: string) => {
        if (selectedDraftId) {
            updateDraft(selectedDraftId, { content: refinedContent });
        }
    };

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

    const isDraftsMode = activeSection === 'drafts';

    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)] h-screen overflow-hidden">
            <Header className="border-b" />

            <main className="flex-1 flex flex-col min-h-0 bg-white">

                {/* Navigation Tabs & Actions */}
                <div className="flex items-center justify-between px-4 pt-2 bg-gray-50/50 border-b border-[var(--border)] shrink-0">
                    <div className="flex items-center gap-1">
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
                            <Zap size={18} /> Tensions {tensions.filter(t => t.classification === 'pending').length > 0 && <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">{tensions.filter(t => t.classification === 'pending').length}</span>}
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
                        <button
                            onClick={() => setActiveSection('drafts')}
                            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${activeSection === 'drafts'
                                ? 'border-[var(--accent)] text-[var(--foreground)]'
                                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--foreground)]'
                                }`}
                        >
                            <FileText size={18} /> Drafts {drafts.length > 0 && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">{drafts.length}</span>}
                        </button>
                    </div>

                    <button
                        onClick={() => setAddContentModalOpen(true)}
                        className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--foreground)] px-3 py-1.5 rounded-md hover:bg-gray-200/50 transition-colors"
                    >
                        <Plus size={16} /> <span className="hidden sm:inline">Add Content</span>
                    </button>
                </div>

                {/* CONTENT AREA: Scrollable Container for Non-Drafts */}
                {activeSection !== 'drafts' && (
                    <div className="flex-1 overflow-y-auto">
                        <div className="container py-8 max-w-4xl mx-auto animate-fade-in space-y-6">

                            {/* BELIEFS SECTION */}
                            {activeSection === 'beliefs' && (
                                <div className="space-y-6">
                                    {/* Guidance Banner */}
                                    {!allBeliefsReviewed && (
                                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                            <p className="text-sm text-blue-800">
                                                <strong>Review your beliefs:</strong> Mark as <strong>Accurate</strong> if it reflects your thinking, <strong>Misses</strong> if it's wrong, or <strong>Clarify</strong> if it needs nuance.
                                            </p>
                                        </div>
                                    )}
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
                                    {/* Guidance Banner */}
                                    {!tensionsLoading && tensions.filter(t => !classifiedTensionIds.has(t.id)).length > 0 && (
                                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                            <p className="text-sm text-amber-800">
                                                <strong>Classify your tensions:</strong> Is this a real <strong>Inconsistency</strong> to resolve, an <strong>Intentional Nuance</strong> you hold, or something to <strong>Explore</strong> further?
                                            </p>
                                        </div>
                                    )}
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
                                    {/* Guidance Banner */}
                                    {generated && directions.length > 0 && (
                                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                            <p className="text-sm text-green-800">
                                                <strong>Your writing directions:</strong> Based on your beliefs, here are ideas for what to write next. Click on a card to start drafting.
                                            </p>
                                        </div>
                                    )}
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
                                                    relatedBelief={d.strengthensBelief}
                                                    onDraft={(topic) => {
                                                        const beliefToUse = d.strengthensBelief || topic;
                                                        setSelectedBelief(beliefToUse);
                                                        setDraftModalOpen(true);
                                                    }}
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
                    </div>
                )}

                {/* DRAFTS SECTION - 3-Pane Editor */}
                {activeSection === 'drafts' && (
                    <div className="flex-1 h-full min-h-0">
                        <ThreePaneLayout
                            leftPane={
                                <DraftsSidebar
                                    drafts={drafts}
                                    selectedDraftId={selectedDraftId}
                                    onSelect={(draft) => setSelectedDraftId(draft.id)}
                                    onNew={() => {
                                        setSelectedBelief("");
                                        setDraftModalOpen(true);
                                    }}
                                />
                            }
                            middlePane={
                                <MainEditor
                                    draft={selectedDraft}
                                    onSave={async (id, content) => {
                                        const success = await updateDraft(id, { content });
                                        return success;
                                    }}
                                />
                            }
                            rightPane={
                                <AgentSidebar
                                    currentContent={selectedDraft?.content || null}
                                    beliefContext={selectedDraft?.belief_text || null}
                                    onApplyParams={(refinedContent) => {
                                        if (selectedDraftId) {
                                            updateDraft(selectedDraftId, { content: refinedContent });
                                        }
                                    }}
                                />
                            }
                        />
                    </div>
                )}

            </main>

            <Footer />

            <DraftModal
                belief={selectedBelief}
                isOpen={draftModalOpen}
                onClose={() => setDraftModalOpen(false)}
                onSave={saveDraft}
            />
            <AddContentModal
                isOpen={addContentModalOpen}
                onClose={() => setAddContentModalOpen(false)}
                onSuccess={() => window.location.reload()}
            />
        </div>
    );
}
