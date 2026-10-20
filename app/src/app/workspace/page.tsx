"use client";

import { useState, useEffect, useRef, Suspense } from "react";
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
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-canvas"><div className="text-sm text-ink-muted animate-pulse">Loading workspace...</div></div>}>
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
    const refetchedForDraftId = useRef<string | null>(null);
    useEffect(() => {
        // 1. Handle Stale Data (Sync Fix): refetch once per linked id so a deleted draft can't loop forever
        if (urlDraftId && !draftsLoading && drafts.length > 0 && !drafts.find(d => d.id === urlDraftId)
            && refetchedForDraftId.current !== urlDraftId) {
            refetchedForDraftId.current = urlDraftId;
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

    // The URL wins over local state (see activeDraftId/effectiveSection), so local
    // navigation has to update the URL too or it is silently ignored.
    const selectDraft = (id: string | null) => {
        setSelectedDraftId(id);
        setActiveSection('drafts');
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', 'drafts');
        if (id) {
            params.set('draftId', id);
        } else {
            params.delete('draftId');
        }
        router.replace(`/workspace?${params.toString()}`, { scroll: false });
    };

    const goToSection = (section: Section) => {
        setActiveSection(section);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', section);
        if (section !== 'drafts') {
            params.delete('draftId');
        }
        router.replace(`/workspace?${params.toString()}`, { scroll: false });
    };

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
            <div className="min-h-screen flex items-center justify-center bg-canvas">
                <div className="text-sm text-ink-muted animate-pulse">Loading your belief graph...</div>
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
        <div className="text-center py-12 bg-canvas shadow-pressed rounded-card">
            <p className="text-ink-muted">No {type} found yet.</p>
        </div>
    );

    const renderCompletionState = () => (
        <div className="text-center py-16 px-6 bg-surface rounded-card shadow-card">
            <CheckCircle size={48} className="mx-auto text-sage-500 mb-4" />
            <h3 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-2">All beliefs reviewed!</h3>
            <p className="text-ink-soft">Great job! Add more content to extract new beliefs.</p>
        </div>
    );

    const draftItems = drafts.filter(d => d.status === 'draft');
    const publishedItems = drafts.filter(d => d.status === 'published');

    return (
        <div className="flex h-screen bg-canvas overflow-hidden">
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

            <main className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden bg-canvas">
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
                    <div className="flex-1 h-full overflow-y-auto overflow-x-hidden bg-canvas">
                        <div className="max-w-[1440px] mx-auto px-4 md:px-10 pt-5 md:pt-7 pb-28 md:pb-12 flex flex-col gap-8 animate-fade-in">
                            {effectiveSection === 'beliefs' && (
                                <div className="flex flex-col gap-8">
                                    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                                        <h2 className="text-2xl md:text-[32px] md:leading-tight font-medium tracking-[-0.02em] text-ink">Belief Graph</h2>
                                        <div className="bg-canvas shadow-well rounded-full p-1 flex items-center text-sm font-medium shrink-0 self-start md:self-auto">
                                            <button
                                                onClick={() => setBeliefView('list')}
                                                className={`h-9 px-4 rounded-full transition-all ${beliefView === 'list' ? 'bg-surface shadow-raised text-ink' : 'text-ink-muted hover:text-ink'}`}
                                            >
                                                List
                                            </button>
                                            <button
                                                onClick={() => setBeliefView('tree')}
                                                className={`h-9 px-4 rounded-full transition-all ${beliefView === 'tree' ? 'bg-surface shadow-raised text-ink' : 'text-ink-muted hover:text-ink'}`}
                                            >
                                                Mind Map
                                            </button>
                                        </div>
                                    </div>

                                    {beliefView === 'tree' ? (
                                        <GenealogyTree
                                            beliefs={[...beliefs.core, ...beliefs.emerging, ...beliefs.overused, ...beliefs.confirmed]}
                                            drafts={drafts}
                                            onSelectDraft={(id) => selectDraft(id)}
                                        />
                                    ) : (
                                        <>
                                            {!allBeliefsReviewed && (
                                                <div className="p-4 bg-dusk-100 rounded-tile shadow-raised">
                                                    <p className="text-sm text-dusk-700">
                                                        <strong>Review your beliefs:</strong> Mark as <strong>Accurate</strong> if it reflects your thinking, <strong>Misses</strong> if it&apos;s wrong, or <strong>Clarify</strong> if it needs nuance.
                                                    </p>
                                                </div>
                                            )}
                                            {allBeliefsReviewed && renderCompletionState()}
                                        </>
                                    )}

                                    {unreviewedCore.length > 0 && (
                                        <section>
                                            <h3 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-4">Core beliefs</h3>
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
                                            <h3 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-4">Emerging theses</h3>
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
                                            <h3 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-4">Overused angles</h3>
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
                                <div className="flex flex-col gap-6">
                                    <h2 className="text-2xl md:text-[32px] md:leading-tight font-medium tracking-[-0.02em] text-ink">Tensions</h2>
                                    {!tensionsLoading && tensions.filter(t => !classifiedTensionIds.has(t.id)).length > 0 && (
                                        <div className="p-4 bg-sand-100 rounded-tile shadow-raised">
                                            <p className="text-sm text-sand-700">
                                                <strong>Classify your tensions:</strong> Is this a real <strong>Inconsistency</strong> to resolve, an <strong>Intentional Nuance</strong> you hold, or something to <strong>Explore</strong> further?
                                            </p>
                                        </div>
                                    )}
                                    {tensionsLoading && (
                                        <div className="text-center py-16">
                                            <Loader2 size={32} className="mx-auto animate-spin text-ember-500 mb-4" />
                                            <p className="text-ink-muted">Loading tensions...</p>
                                        </div>
                                    )}

                                    {!tensionsLoading && tensions.filter(t => !classifiedTensionIds.has(t.id)).length === 0 && (
                                        tensions.length === 0
                                            ? renderEmptyState("tensions")
                                            : (
                                                <div className="text-center py-16 px-6 bg-surface rounded-card shadow-card">
                                                    <CheckCircle size={48} className="mx-auto text-sage-500 mb-4" />
                                                    <h3 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-2">All tensions classified!</h3>
                                                    <p className="text-ink-soft">Great work! Add more content to detect new tensions.</p>
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
                                <div className="flex flex-col gap-6">
                                    <h2 className="text-2xl md:text-[32px] md:leading-tight font-medium tracking-[-0.02em] text-ink">Ideas</h2>
                                    {generated && directions.length > 0 && (
                                        <div className="p-4 bg-ember-50 rounded-tile shadow-raised">
                                            <p className="text-sm text-ember-700">
                                                <strong>Your writing directions:</strong> Based on your beliefs, here are ideas for what to write next. Click on a card to start drafting.
                                            </p>
                                        </div>
                                    )}
                                    {!generated && !directionsLoading && (
                                        <div className="text-center py-16 px-6 bg-surface rounded-card shadow-card">
                                            <Sparkles size={48} className="mx-auto text-ember-500 mb-4" />
                                            <h3 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-2">Generate Content Ideas</h3>
                                            <p className="text-ink-soft mb-6">Based on your beliefs, AI will suggest what to write next.</p>
                                            <button
                                                onClick={generateDirections}
                                                className="inline-flex items-center gap-2 h-12 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all"
                                            >
                                                <Sparkles size={16} /> Generate Ideas
                                            </button>
                                        </div>
                                    )}

                                    {directionsLoading && (
                                        <div className="text-center py-16">
                                            <Loader2 size={32} className="mx-auto animate-spin text-ember-500 mb-4" />
                                            <p className="text-ink-muted">Generating ideas...</p>
                                        </div>
                                    )}

                                    {generated && directions.length > 0 && (
                                        <div className="grid md:grid-cols-2 gap-5">
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
                                            <p className="text-ink-muted">No ideas generated. Try adding more content first.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {effectiveSection === 'explore' && (
                    <div className="flex-1 overflow-hidden bg-canvas">
                        <ExplorerView />
                    </div>
                )}

                {effectiveSection === 'pipeline' && (
                    <div className="flex-1 overflow-hidden bg-canvas">
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
                    <div className="flex-1 flex flex-col h-full min-h-0 min-w-0 overflow-hidden bg-canvas">
                        {/* Sub-Tabs for Posts */}
                        <div className="flex items-center gap-3 px-4 md:px-6 py-3 bg-canvas">
                            <button
                                onClick={() => {
                                    setPostsTab('drafts');
                                    selectDraft(null);
                                }}
                                className={`h-10 px-5 rounded-full text-sm font-medium bg-canvas transition-all ${effectivePostsTab === 'drafts'
                                    ? 'shadow-pressed text-ember-600'
                                    : 'shadow-raised text-ink-soft hover:text-ink'
                                    }`}
                            >
                                Drafts
                            </button>
                            <button
                                onClick={() => {
                                    setPostsTab('published');
                                    selectDraft(null);
                                }}
                                className={`h-10 px-5 rounded-full text-sm font-medium bg-canvas transition-all ${effectivePostsTab === 'published'
                                    ? 'shadow-pressed text-ember-600'
                                    : 'shadow-raised text-ink-soft hover:text-ink'
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
                                                <div className="flex items-center gap-3 px-4 py-3 bg-canvas shrink-0">
                                                    <button
                                                        onClick={() => selectDraft(null)}
                                                        className="w-10 h-10 rounded-full flex items-center justify-center bg-canvas shadow-raised text-ink-soft hover:text-ink active:shadow-pressed transition-all"
                                                    >
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M19 12H5M12 19l-7-7 7-7" />
                                                        </svg>
                                                    </button>
                                                    <span className="font-medium text-ink truncate flex-1 text-sm">
                                                        {selectedDraft?.belief_text || 'Edit Draft'}
                                                    </span>
                                                </div>
                                                <div className="flex-1 overflow-y-auto pb-32">
                                                    <MainEditor
                                                        draft={selectedDraft}
                                                        onSave={async (id, content, title) => {
                                                            const success = await updateDraft(id, {
                                                                content,
                                                                ...(title ? { belief_text: title } : {})
                                                            });
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
                                                    onSelect={(draft) => selectDraft(draft.id)}
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
                                                onSelect={(draft) => selectDraft(draft.id)}
                                                onNew={() => {
                                                    setNewDraftPrefill(undefined);
                                                    setDraftModalOpen(true);
                                                }}
                                            />
                                        }
                                        middlePane={
                                            <MainEditor
                                                draft={selectedDraft}
                                                onSave={async (id, content, title) => {
                                                    const success = await updateDraft(id, {
                                                        content,
                                                        ...(title ? { belief_text: title } : {})
                                                    });
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
                            goToSection('pipeline');
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
                        goToSection(section);
                    }
                }}
            />
        </div>
    );
}
