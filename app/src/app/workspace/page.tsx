"use client";

import { useState, useEffect } from "react";
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
import { PublishedPostsList } from "@/components/editor/PublishedPostsList";
import { ExplorerView } from "@/components/explore/ExplorerView";
import { GlobalSidebar } from "@/components/navigation/GlobalSidebar";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { MobileAgentSheet } from "@/components/mobile/MobileAgentSheet";
import { CommandCenter } from "@/components/pipeline/CommandCenter";

export default function WorkspacePage() {
    const [activeSection, setActiveSection] = useState<'beliefs' | 'tensions' | 'directions' | 'drafts' | 'explore' | 'pipeline' | 'mindmap'>('pipeline');
    const { beliefs, loading, submitFeedback } = useBeliefs();
    const [reviewedBeliefIds, setReviewedBeliefIds] = useState<Set<string>>(new Set());
    const { directions, loading: directionsLoading, generateDirections, generated } = useDirections();
    const { tensions, loading: tensionsLoading, classifyTension } = useTensions();
    const [classifiedTensionIds, setClassifiedTensionIds] = useState<Set<string>>(new Set());
    const { drafts, loading: draftsLoading, saveDraft, deleteDraft, updateDraft, refetch } = useDrafts();
    const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
    const selectedDraft = drafts.find(d => d.id === selectedDraftId) || null;
    const [postsTab, setPostsTab] = useState<'drafts' | 'published'>('drafts');

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

    // Mobile detection for responsive layouts
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
                <div className="text-[var(--text-muted)] animate-pulse">Loading your belief graph...</div>
            </div>
        );
    }

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

    // Drafts Filtering Logic
    const draftItems = drafts.filter(d => d.status === 'draft');

    return (
        <div className="flex h-screen bg-[var(--background)] overflow-hidden">
            <GlobalSidebar
                activeSection={activeSection}
                onNavigate={(section) => setActiveSection(section as any)}
                onNewDraft={() => {
                    setSelectedBelief("");
                    setDraftModalOpen(true);
                }}
                onImport={() => setAddContentModalOpen(true)}
            />

            <main className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden bg-paper">
                {/* CONTENT AREA: Scrollable Container for Non-Drafts */}
                {
                    activeSection !== 'drafts' && activeSection !== 'explore' && activeSection !== 'pipeline' && activeSection !== 'mindmap' && (
                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-12 pb-24 md:pb-12">
                            <div className="max-w-4xl mx-auto animate-fade-in space-y-6">

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
                                                            onWriteAbout={async (beliefData) => {
                                                                await fetch('/api/content', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({
                                                                        hook: beliefData.text,
                                                                        angle: `Expanding on this ${beliefData.type} belief`,
                                                                        format: 'Thought Leadership',
                                                                        source_type: 'belief',
                                                                        source_id: beliefData.id,
                                                                        stage: 'idea',
                                                                    }),
                                                                });
                                                            }}
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
                                                            onWriteAbout={async (beliefData) => {
                                                                await fetch('/api/content', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({
                                                                        hook: beliefData.text,
                                                                        angle: `Expanding on this ${beliefData.type} belief`,
                                                                        format: 'Thought Leadership',
                                                                        source_type: 'belief',
                                                                        source_id: beliefData.id,
                                                                        stage: 'idea',
                                                                    }),
                                                                });
                                                            }}
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
                                                            onWriteAbout={async (beliefData) => {
                                                                await fetch('/api/content', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({
                                                                        hook: beliefData.text,
                                                                        angle: `Expanding on this ${beliefData.type} belief`,
                                                                        format: 'Thought Leadership',
                                                                        source_type: 'belief',
                                                                        source_id: beliefData.id,
                                                                        stage: 'idea',
                                                                    }),
                                                                });
                                                            }}
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
                                                    // Only hide immediately if NOT explore (so we can show the "Turn into Idea" prompt)
                                                    if (classification !== 'explore') {
                                                        setClassifiedTensionIds(prev => new Set([...prev, id]));
                                                    }
                                                }}
                                                onTurnIntoIdea={async (tensionData) => {
                                                    await fetch('/api/content', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            hook: `I believe two things that contradict each other...`,
                                                            angle: `Exploring the nuance between: "${tensionData.sideA}" and "${tensionData.sideB}"`,
                                                            format: 'Contrarian Take',
                                                            source_type: 'tension',
                                                            source_id: tensionData.id,
                                                            stage: 'idea',
                                                        }),
                                                    });
                                                    // Now hide it after conversion
                                                    setClassifiedTensionIds(prev => new Set([...prev, tensionData.id]));
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
                    )
                }

                {/* EXPLORE SECTION */}
                {
                    activeSection === 'explore' && (
                        <div className="flex-1 overflow-y-auto bg-gray-50/30">
                            <ExplorerView />
                        </div>
                    )
                }

                {/* PIPELINE SECTION (Command Center) */}
                {
                    activeSection === 'pipeline' && (
                        <div className="flex-1 overflow-hidden bg-gray-50/30">
                            <CommandCenter
                                onDraftCreated={refetch}
                                onEdit={(draftId) => {
                                    setSelectedDraftId(draftId);
                                    setActiveSection('drafts');
                                    setPostsTab('drafts');
                                }}
                            />
                        </div>
                    )
                }

                {/* MIND MAP SECTION (Coming Soon) */}
                {
                    activeSection === 'mindmap' && (
                        <div className="flex-1 flex items-center justify-center bg-gray-50/30">
                            <div className="text-center max-w-md p-8">
                                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Sparkles size={32} className="text-purple-600" />
                                </div>
                                <h2 className="text-2xl font-serif text-gray-900 mb-3">Mind Map Coming Soon</h2>
                                <p className="text-gray-500 mb-6">
                                    We&apos;re building a visual map of your thinking. In the meantime, the AI is already using connections behind the scenes to improve your suggestions.
                                </p>
                                <button
                                    onClick={() => setActiveSection('explore')}
                                    className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg font-medium hover:bg-[var(--accent-dark)] transition-colors"
                                >
                                    Explore Ideas Instead →
                                </button>
                            </div>
                        </div>
                    )
                }

                {/* POSTS SECTION (formerly Drafts) */}
                {
                    activeSection === 'drafts' && (
                        <div className="flex-1 flex flex-col h-full min-h-0 min-w-0 overflow-hidden bg-gray-50/30">
                            {/* Sub-Tabs for Posts */}
                            <div className="flex items-center gap-6 px-6 py-3 border-b bg-white">
                                <button
                                    onClick={() => setPostsTab('drafts')}
                                    className={`text-sm font-medium pb-0.5 border-b-2 transition-colors ${postsTab === 'drafts'
                                        ? 'border-[var(--foreground)] text-[var(--foreground)]'
                                        : 'border-transparent text-[var(--text-muted)] hover:text-[var(--foreground)]'
                                        }`}
                                >
                                    Drafts
                                </button>
                                <button
                                    onClick={() => setPostsTab('published')}
                                    className={`text-sm font-medium pb-0.5 border-b-2 transition-colors ${postsTab === 'published'
                                        ? 'border-[var(--foreground)] text-[var(--foreground)]'
                                        : 'border-transparent text-[var(--text-muted)] hover:text-[var(--foreground)]'
                                        }`}
                                >
                                    Published
                                </button>
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
                                {postsTab === 'drafts' ? (
                                    isMobile ? (
                                        /* MOBILE: Full-width list or editor */
                                        <div className="h-full flex flex-col pb-20">
                                            {selectedDraftId ? (
                                                /* Mobile Editor View */
                                                <div className="flex-1 flex flex-col min-h-0">
                                                    <div className="flex items-center gap-3 px-4 py-3 border-b bg-white shrink-0">
                                                        <button
                                                            onClick={() => setSelectedDraftId(null)}
                                                            className="p-2 -ml-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                                        >
                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M19 12H5M12 19l-7-7 7-7" />
                                                            </svg>
                                                        </button>
                                                        <span className="font-medium text-gray-900 truncate flex-1 text-sm">
                                                            {selectedDraft?.belief_text || 'Edit Draft'}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 overflow-y-auto pb-32">
                                                        <MainEditor
                                                            draft={selectedDraft}
                                                            onSave={async (id, content) => {
                                                                const success = await updateDraft(id, { content });
                                                                return success;
                                                            }}
                                                        />
                                                    </div>

                                                    {/* Bottom Sheet AI Agent */}
                                                    <MobileAgentSheet>
                                                        <AgentSidebar
                                                            currentContent={selectedDraft?.content || null}
                                                            beliefContext={selectedDraft?.belief_text || null}
                                                            availableBeliefs={beliefs.confirmed || []}
                                                            onApplyParams={(refinedContent) => {
                                                                if (selectedDraftId) {
                                                                    updateDraft(selectedDraftId, { content: refinedContent });
                                                                }
                                                            }}
                                                        />
                                                    </MobileAgentSheet>
                                                </div>
                                            ) : (
                                                /* Mobile List View */
                                                <div className="flex-1 overflow-y-auto">
                                                    <DraftsSidebar
                                                        drafts={draftItems}
                                                        selectedDraftId={selectedDraftId}
                                                        onSelect={(draft) => setSelectedDraftId(draft.id)}
                                                        onNew={() => {
                                                            setSelectedBelief("");
                                                            setDraftModalOpen(true);
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        /* DESKTOP: ThreePaneLayout */
                                        <ThreePaneLayout
                                            leftPane={
                                                <DraftsSidebar
                                                    drafts={draftItems}
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
                                                    availableBeliefs={beliefs.confirmed || []}
                                                    onApplyParams={(refinedContent) => {
                                                        if (selectedDraftId) {
                                                            updateDraft(selectedDraftId, { content: refinedContent });
                                                        }
                                                    }}
                                                />
                                            }
                                        />
                                    )
                                ) : (
                                    <div className={`h-full overflow-y-auto ${isMobile ? 'pb-20' : ''}`}>
                                        <PublishedPostsList drafts={drafts} />
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }
            </main >




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

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav
                activeSection={activeSection}
                onNavigate={(section) => setActiveSection(section as any)}
            />
        </div >
    );
}
