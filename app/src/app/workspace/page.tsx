"use client";

import { useState, useEffect, Suspense } from "react";
import { BeliefCard } from "@/components/thinking/BeliefCard";
import { useBeliefs } from "@/hooks/useBeliefs";
import { TensionCard } from "@/components/thinking/TensionCard";
import { DirectionCard } from "@/components/thinking/DirectionCard";
import { AddContentModal } from "@/components/thinking/AddContentModal";
import { CheckCircle, Sparkles, Loader2 } from "lucide-react";
import { useDirections } from "@/hooks/useDirections";
import { useTensions } from "@/hooks/useTensions";
import { useDrafts } from "@/hooks/useDrafts";
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
import NewDraftModal from "@/components/modal/NewDraftModal";
import type { ContentReference } from "@/types";
import { YourMind } from "@/components/thinking/YourMind";
import { GenealogyTree } from "@/components/thinking/GenealogyTree";
import { useRouter, useSearchParams } from "next/navigation";

export default function WorkspacePage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[var(--background)]"><div className="text-[var(--text-muted)] animate-pulse">Loading workspace...</div></div>}>
            <WorkspaceContent />
        </Suspense>
    );
}

function WorkspaceContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Support URL-based persistence for sections
    const sections = ['mind', 'beliefs', 'tensions', 'directions', 'drafts', 'explore', 'pipeline'] as const;
    type Section = typeof sections[number];
    const isSection = (value: string | null): value is Section =>
        value !== null && (sections as readonly string[]).includes(value);

    const urlTab = searchParams.get('tab');
    const urlDraftId = searchParams.get('draftId');
    const initialSection: Section = isSection(urlTab) ? urlTab : 'pipeline';

    const [activeSection, setActiveSection] = useState<Section>(initialSection);
    const [beliefView, setBeliefView] = useState<'list' | 'tree'>('list');
    const { beliefs, loading, submitFeedback } = useBeliefs();
    const [reviewedBeliefIds, setReviewedBeliefIds] = useState<Set<string>>(new Set());
    const { directions, loading: directionsLoading, generateDirections, generated } = useDirections();
    const { tensions, loading: tensionsLoading, classifyTension } = useTensions();
    const [classifiedTensionIds, setClassifiedTensionIds] = useState<Set<string>>(new Set());
    const { drafts, loading: draftsLoading, updateDraft, refetch } = useDrafts();
    const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
    const activeDraftId = urlDraftId ?? selectedDraftId;
    const selectedDraft = drafts.find(d => d.id === activeDraftId) || null;
    const [postsTab, setPostsTab] = useState<'drafts' | 'published'>('drafts');
    const effectiveSection: Section = urlDraftId ? 'drafts' : (isSection(urlTab) ? urlTab : activeSection);
    const effectivePostsTab = selectedDraft?.status === 'published' ? 'published' : postsTab;

    // Handle Deep Linking
    useEffect(() => {
        // 1. Handle Stale Data (Sync Fix)
        if (urlDraftId && !draftsLoading && drafts.length > 0 && !drafts.find(d => d.id === urlDraftId)) {
            refetch();
        }

        // Auto-cleanup
        if (urlTab === 'style') {
            router.replace('/style');
            return;
        }

        if (urlTab && urlTab !== 'drafts' && urlDraftId) {
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete('draftId');
            router.replace(`/workspace?${newParams.toString()}`, { scroll: false });
        }
    }, [searchParams, urlDraftId, urlTab, drafts, draftsLoading, refetch, router]);

    // Agent update handler
    const handleAgentApply = (refinedContent: string) => {
        if (activeDraftId) {
            updateDraft(activeDraftId, { content: refinedContent });
        }
    };

    const handlePublish = async (id: string) => {
        // 1. Update status effectively moving it to Published list
        await updateDraft(id, { status: 'published' });
        // 2. Switch tab immediately for visibility
        setPostsTab('published');
    };

    // Modal state
    const [draftModalOpen, setDraftModalOpen] = useState(false);
    type SourceType = 'belief' | 'tension' | 'idea' | 'manual';
    const sourceTypes: SourceType[] = ['belief', 'tension', 'idea', 'manual'];
    const isSourceType = (value: string | undefined): value is SourceType =>
        typeof value === 'string' && sourceTypes.includes(value as SourceType);

    const [newDraftPrefill, setNewDraftPrefill] = useState<{
        hook?: string;
        sourceType?: SourceType;
        sourceId?: string;
        references?: Array<Partial<ContentReference>>;
    } | undefined>(undefined);
    const [addContentModalOpen, setAddContentModalOpen] = useState(false);

    // Auto-navigation state
    const [autoNavToWizardId, setAutoNavToWizardId] = useState<string | undefined>(undefined);

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

    const handleBeliefReviewed = async (beliefId: string, feedback: 'accurate' | 'misses' | 'clarify') => {
        setReviewedBeliefIds(prev => new Set([...prev, beliefId]));
        await submitFeedback(beliefId, feedback);
    };

    const unreviewedCore = beliefs.core.filter((b: { id: string }) => !reviewedBeliefIds.has(b.id));
    const unreviewedEmerging = beliefs.emerging.filter((b: { id: string }) => !reviewedBeliefIds.has(b.id));
    const unreviewedOverused = beliefs.overused.filter((b: { id: string }) => !reviewedBeliefIds.has(b.id));
    const allBeliefsReviewed = unreviewedCore.length === 0 && unreviewedEmerging.length === 0 && unreviewedOverused.length === 0 && beliefs.core.length + beliefs.emerging.length + beliefs.overused.length > 0;

    const renderEmptyState = (type: string) => (
        <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-lg">
            <p className="text-[var(--text-muted)]">No {type} found yet.</p>
        </div>
    );

    const renderCompletionState = () => (
        <div className="text-center py-16 border border-green-200 bg-green-50/50 rounded-lg">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
            <h3 className="text-xl font-medium text-green-700 mb-2">All beliefs reviewed!</h3>
            <p className="text-[var(--text-muted)]">Great job! Add more content to extract new beliefs.</p>
        </div>
    );

    const draftItems = drafts.filter(d => d.status === 'draft');
    const publishedItems = drafts.filter(d => d.status === 'published');

    return (
        <div className="flex h-screen bg-[var(--background)] overflow-hidden">
            <GlobalSidebar
                activeSection={effectiveSection}
                onNavigate={(section) => {
                    if (section === 'settings') {
                        router.push('/settings');
                    } else if (section === 'style') {
                        router.push('/style');
                    } else {
                        if (isSection(section)) {
                            setActiveSection(section);
                        }
                        const params = new URLSearchParams(searchParams.toString());
                        params.set('tab', section);
                        if (section !== 'drafts') {
                            params.delete('draftId');
                        }
                        router.replace(`/workspace?${params.toString()}`, { scroll: false });
                    }
                }}
                onNewDraft={() => {
                    setNewDraftPrefill(undefined);
                    setDraftModalOpen(true);
                }}
                onImport={() => setAddContentModalOpen(true)}
            />

            <main className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden bg-paper">
                {effectiveSection === 'mind' && (
                    <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                        <YourMind
                            onDraftRequest={(data) => {
                                setNewDraftPrefill({
                                    hook: data.hook,
                                    sourceType: isSourceType(data.type) ? data.type : undefined,
                                    sourceId: data.id,
                                    references: data.references
                                });
                                setDraftModalOpen(true);
                            }}
                        />
                    </div>
                )}

                {effectiveSection !== 'drafts' && effectiveSection !== 'explore' && effectiveSection !== 'pipeline' && effectiveSection !== 'mind' && (
                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-12 pb-24 md:pb-12">
                        <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
                            {effectiveSection === 'beliefs' && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-xl font-serif">Belief Graph</h2>
                                        <div className="bg-gray-100 p-1 rounded-lg flex items-center text-xs font-medium shrink-0">
                                            <button
                                                onClick={() => setBeliefView('list')}
                                                className={`px-3 py-1 rounded-md transition-all ${beliefView === 'list' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}
                                            >
                                                List
                                            </button>
                                            <button
                                                onClick={() => setBeliefView('tree')}
                                                className={`px-3 py-1 rounded-md transition-all ${beliefView === 'tree' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}
                                            >
                                                Mind Map
                                            </button>
                                        </div>
                                    </div>

                                    {beliefView === 'tree' ? (
                                        <GenealogyTree
                                            beliefs={[...beliefs.core, ...beliefs.emerging, ...beliefs.overused, ...beliefs.confirmed]}
                                            drafts={drafts}
                                            onSelectDraft={(id) => {
                                                setSelectedDraftId(id);
                                                setActiveSection('drafts');
                                            }}
                                        />
                                    ) : (
                                        <>
                                            {!allBeliefsReviewed && (
                                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                                    <p className="text-sm text-blue-800">
                                                        <strong>Review your beliefs:</strong> Mark as <strong>Accurate</strong> if it reflects your thinking, <strong>Misses</strong> if it&apos;s wrong, or <strong>Clarify</strong> if it needs nuance.
                                                    </p>
                                                </div>
                                            )}
                                            {allBeliefsReviewed && renderCompletionState()}
                                        </>
                                    )}

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
                                                            setNewDraftPrefill({
                                                                hook: beliefData.text,
                                                                sourceType: 'belief',
                                                                sourceId: beliefData.id
                                                            });
                                                            setDraftModalOpen(true);
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </section>
                                    )}

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
                                                            setNewDraftPrefill({
                                                                hook: beliefData.text,
                                                                sourceType: 'belief',
                                                                sourceId: beliefData.id
                                                            });
                                                            setDraftModalOpen(true);
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </section>
                                    )}

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
                                                            setNewDraftPrefill({
                                                                hook: beliefData.text,
                                                                sourceType: 'belief',
                                                                sourceId: beliefData.id
                                                            });
                                                            setDraftModalOpen(true);
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    {beliefView === 'list' && beliefs.core.length === 0 && beliefs.emerging.length === 0 && beliefs.overused.length === 0 && renderEmptyState("beliefs")}
                                </div>
                            )}

                            {effectiveSection === 'tensions' && (
                                <div className="space-y-6">
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
                                                if (classification !== 'explore') {
                                                    setClassifiedTensionIds(prev => new Set([...prev, id]));
                                                }
                                            }}
                                            onTurnIntoIdea={async (tensionData) => {
                                                setNewDraftPrefill({
                                                    hook: `Exploring the tension between "${tensionData.sideA}" and "${tensionData.sideB}"`,
                                                    sourceType: 'tension',
                                                    sourceId: tensionData.id
                                                });
                                                setDraftModalOpen(true);
                                            }}
                                        />
                                    ))}
                                </div>
                            )}

                            {effectiveSection === 'directions' && (
                                <div className="space-y-6">
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
                                                        setNewDraftPrefill({
                                                            hook: topic,
                                                            sourceType: 'idea'
                                                        });
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

                {effectiveSection === 'explore' && (
                    <div className="flex-1 overflow-y-auto bg-gray-50/30">
                        <ExplorerView />
                    </div>
                )}

                {effectiveSection === 'pipeline' && (
                    <div className="flex-1 overflow-hidden bg-gray-50/30">
                        <CommandCenter
                            onDraftCreated={refetch}
                            onEdit={(draftId) => {
                                const params = new URLSearchParams(searchParams.toString());
                                params.set('tab', 'drafts');
                                params.set('draftId', draftId);
                                router.push(`/workspace?${params.toString()}`);
                                setSelectedDraftId(draftId);
                                setActiveSection('drafts');

                                // Sync tab based on draft status
                                const draft = drafts.find(d => d.id === draftId);
                                if (draft?.status === 'published') {
                                    setPostsTab('published');
                                } else {
                                    setPostsTab('drafts');
                                }
                            }}
                            autoOpenItemId={autoNavToWizardId}
                            onAutoOpenHandled={() => setAutoNavToWizardId(undefined)}
                        />
                    </div>
                )}

                {effectiveSection === 'drafts' && (
                    <div className="flex-1 flex flex-col h-full min-h-0 min-w-0 overflow-hidden bg-gray-50/30">
                        {/* Sub-Tabs for Posts */}
                        <div className="flex items-center gap-6 px-6 py-3 border-b bg-white">
                            <button
                                onClick={() => {
                                    setPostsTab('drafts');
                                    setSelectedDraftId(null);
                                }}
                                className={`text-sm font-medium pb-0.5 border-b-2 transition-colors ${effectivePostsTab === 'drafts'
                                    ? 'border-[var(--foreground)] text-[var(--foreground)]'
                                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--foreground)]'
                                    }`}
                            >
                                Drafts
                            </button>
                            <button
                                onClick={() => {
                                    setPostsTab('published');
                                    setSelectedDraftId(null);
                                }}
                                className={`text-sm font-medium pb-0.5 border-b-2 transition-colors ${effectivePostsTab === 'published'
                                    ? 'border-[var(--foreground)] text-[var(--foreground)]'
                                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--foreground)]'
                                    }`}
                            >
                                Published
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
                            {(effectivePostsTab === 'drafts' || (effectivePostsTab === 'published' && activeDraftId)) ? (
                                isMobile ? (
                                    <div className="h-full flex flex-col pb-20">
                                        {activeDraftId ? (
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
                                                        onUpdateMetadata={async (id, metadata) => {
                                                            return await updateDraft(id, { brain_metadata: metadata });
                                                        }}
                                                        onPublish={handlePublish}
                                                    />
                                                </div>
                                                <MobileAgentSheet>
                                                    <AgentSidebar
                                                        currentContent={selectedDraft?.content || null}
                                                        beliefContext={selectedDraft?.belief_text || null}
                                                        availableBeliefs={beliefs.confirmed || []}
                                                        onApplyParams={handleAgentApply}
                                                    />
                                                </MobileAgentSheet>
                                            </div>
                                        ) : (
                                            <div className="flex-1 overflow-y-auto">
                                                <DraftsSidebar
                                                    drafts={effectivePostsTab === 'drafts' ? draftItems : publishedItems}
                                                    placeholder={effectivePostsTab === 'published' ? "Search published..." : "Search drafts..."}
                                                    emptyMessage={effectivePostsTab === 'published' ? "No published posts" : "No drafts"}
                                                    selectedDraftId={activeDraftId}
                                                    onSelect={(draft) => setSelectedDraftId(draft.id)}
                                                    onNew={() => {
                                                        setNewDraftPrefill(undefined);
                                                        setDraftModalOpen(true);
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <ThreePaneLayout
                                        leftPane={
                                            <DraftsSidebar
                                                drafts={effectivePostsTab === 'drafts' ? draftItems : publishedItems}
                                                placeholder={effectivePostsTab === 'published' ? "Search published..." : "Search drafts..."}
                                                emptyMessage={effectivePostsTab === 'published' ? "No published posts" : "No drafts"}
                                                selectedDraftId={activeDraftId}
                                                onSelect={(draft) => setSelectedDraftId(draft.id)}
                                                onNew={() => {
                                                    setNewDraftPrefill(undefined);
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
                                                onUpdateMetadata={async (id, metadata) => {
                                                    return await updateDraft(id, { brain_metadata: metadata });
                                                }}
                                                onPublish={handlePublish}
                                            />
                                        }
                                        rightPane={
                                            <AgentSidebar
                                                currentContent={selectedDraft?.content || null}
                                                beliefContext={selectedDraft?.belief_text || null}
                                                availableBeliefs={beliefs.confirmed || []}
                                                onApplyParams={handleAgentApply}
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
                )}
            </main>

            <NewDraftModal
                isOpen={draftModalOpen}
                onClose={() => {
                    setDraftModalOpen(false);
                    setNewDraftPrefill(undefined);
                }}
                prefill={newDraftPrefill}
                onSubmit={async (data) => {
                    const brainMetadata = {
                        outcome: data.outcome,
                        audience: data.audience,
                        stance: data.stance,
                        references: data.references,
                    };

                    const res = await fetch('/api/content', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            hook: data.hook,
                            angle: "Draft created from Command Center",
                            brain_metadata: brainMetadata,
                            source_type: newDraftPrefill?.sourceType,
                            source_id: newDraftPrefill?.sourceId,
                            stage: 'developing',
                            references: data.references
                        }),
                    });

                    if (res.ok) {
                        const responseData = await res.json();
                        const newItemId = responseData.item?.id || responseData.id;

                        if (newItemId) {
                            setAutoNavToWizardId(newItemId);
                            setActiveSection('pipeline');
                        }
                    }

                    setDraftModalOpen(false);
                    setNewDraftPrefill(undefined);
                    refetch();
                }}
            />
            <AddContentModal
                isOpen={addContentModalOpen}
                onClose={() => setAddContentModalOpen(false)}
                onSuccess={() => window.location.reload()}
            />

            <MobileBottomNav
                activeSection={effectiveSection}
                onNavigate={(section) => {
                    if (section === 'settings') {
                        router.push('/settings');
                        return;
                    }
                    if (section === 'style') {
                        router.push('/style');
                        return;
                    }
                    if (isSection(section)) {
                        setActiveSection(section);
                        const params = new URLSearchParams(searchParams.toString());
                        params.set('tab', section);
                        if (section !== 'drafts') {
                            params.delete('draftId');
                        }
                        router.replace(`/workspace?${params.toString()}`, { scroll: false });
                    }
                }}
            />
        </div>
    );
}
