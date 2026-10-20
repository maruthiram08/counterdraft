"use client";

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layers, Zap } from 'lucide-react';
import { BeliefCard } from '@/components/thinking/BeliefCard';
import { TensionCard } from '@/components/thinking/TensionCard';
import { AddContentModal } from '@/components/thinking/AddContentModal';
import { UrlPreviewModal } from '@/components/modal/UrlPreviewModal';
import { useBeliefs } from '@/hooks/useBeliefs';
import { useTensions, type Tension } from '@/hooks/useTensions';
import { useDrafts } from '@/hooks/useDrafts';
import { GenealogyTree } from '@/components/thinking/GenealogyTree';
import { ArtifactGrid } from '@/components/brain/ArtifactGrid';
import { BookMarked } from 'lucide-react';
import { toast } from 'sonner';
import { LimitModal } from '@/components/modal/LimitModal';

import { Artifact, ContentReference } from '@/types';

interface YourMindProps {
    onDraftRequest?: (data: {
        id?: string;
        hook: string;
        type: string;
        references?: ContentReference[];
    }) => void;
}

function SkeletonBeliefCard() {
    return ( // ... unchanged ...
        <div className="bg-surface p-5 rounded-tile shadow-card animate-pulse">
            <div className="flex items-center gap-2 mb-4">
                <div className="h-5 w-24 bg-surface-muted rounded-full"></div>
                <div className="flex-1"></div>
                <div className="h-4 w-12 bg-surface-muted rounded-full"></div>
            </div>
            <div className="h-4 w-full bg-surface-muted rounded-full mb-2"></div>
            <div className="h-4 w-2/3 bg-surface-muted rounded-full mb-6"></div>
            <div className="flex gap-2 justify-end">
                <div className="h-9 w-24 bg-surface-muted rounded-full"></div>
                <div className="h-9 w-24 bg-surface-muted rounded-full"></div>
            </div>
        </div>
    );
}

function SkeletonTensionCard() {
    return ( // ... unchanged ...
        <div className="bg-surface p-5 rounded-tile shadow-card animate-pulse">
            <div className="h-5 w-1/3 bg-surface-muted rounded-full mb-6 mx-auto"></div>
            <div className="flex gap-4 mb-6">
                <div className="flex-1 p-4 bg-surface-muted rounded-tile">
                    <div className="h-4 w-full bg-line rounded-full mb-2"></div>
                    <div className="h-4 w-3/4 bg-line rounded-full"></div>
                </div>
                <div className="flex-1 p-4 bg-surface-muted rounded-tile">
                    <div className="h-4 w-full bg-line rounded-full mb-2"></div>
                    <div className="h-4 w-3/4 bg-line rounded-full"></div>
                </div>
            </div>
            <div className="flex justify-center gap-2">
                <div className="h-9 w-32 bg-surface-muted rounded-full"></div>
                <div className="h-9 w-32 bg-surface-muted rounded-full"></div>
            </div>
        </div>
    );
}

export function YourMind({ onDraftRequest }: YourMindProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Persist sub-tabs and views in URL
    const initialTab = searchParams.get('subtab') as 'beliefs' | 'tensions' | 'artifacts' || 'beliefs';
    const initialView = searchParams.get('view') as 'list' | 'tree' || 'list';

    const [activeTab, setActiveTab] = useState<'beliefs' | 'tensions' | 'artifacts'>(initialTab);
    const [beliefView, setBeliefView] = useState<'list' | 'tree'>(initialView);
    const [addContentModalOpen, setAddContentModalOpen] = useState(false);

    // NEW: URL Preview Modal state
    const [urlPreviewModalOpen, setUrlPreviewModalOpen] = useState(false);
    const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);

    // Sync helpers
    const updateUrl = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set(key, value);
        router.push(`/workspace?${params.toString()}`, { scroll: false });
    };

    const handleTabChange = (tab: 'beliefs' | 'tensions' | 'artifacts') => {
        setActiveTab(tab);
        updateUrl('subtab', tab);
    };

    const handleViewChange = (view: 'list' | 'tree') => {
        setBeliefView(view);
        updateUrl('view', view);
    };

    // Hooks for data
    const { beliefs, loading: beliefsLoading, submitFeedback } = useBeliefs();
    const { tensions, loading: tensionsLoading, classifyTension } = useTensions();
    const { drafts } = useDrafts();

    // Local state to hide items immediately after action
    const [reviewedBeliefIds, setReviewedBeliefIds] = useState<Set<string>>(new Set());
    const [classifiedTensionIds, setClassifiedTensionIds] = useState<Set<string>>(new Set());

    // Limit Handling
    const [limitModalOpen, setLimitModalOpen] = useState(false);
    const [limitState, setLimitState] = useState({ tier: 'free', usage: 0, limit: 0 });

    // --- Handlers ---

    const handleBeliefReviewed = async (beliefId: string, feedback: 'accurate' | 'misses' | 'clarify') => {
        await submitFeedback(beliefId, feedback);
        setReviewedBeliefIds(prev => new Set([...prev, beliefId]));
    };

    const handleWriteAbout = async (beliefData: { id: string; text: string; type: string; tags?: string[]; entities?: string[]; context?: string; urls?: string[] }) => {
        try {
            const res = await fetch('/api/content/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hook: beliefData.text,
                    outcome: 'Thought Leadership',
                    sourceType: beliefData.type,
                    sourceId: beliefData.id,
                    stance: 'agree',
                    tags: beliefData.tags,
                    entities: beliefData.entities,
                    context: beliefData.context, // Content
                    urls: beliefData.urls, // Pass URLs for scraping
                    stage: 'idea' // As requested: Goes to Ideas pile
                }),
            });

            if (res.ok) {
                // Redirect to pipeline (Command Center) where Ideas live
                window.location.href = `/workspace?tab=pipeline`;
            } else if (res.status === 403) {
                const data = await res.json();
                setLimitState({
                    tier: data.usage?.tier || 'free',
                    usage: data.usage?.count || 0,
                    limit: data.usage?.limit || 2
                });
                setLimitModalOpen(true);
            } else {
                toast.error("Failed to create draft");
            }
        } catch (error) {
            console.error('Error creating draft:', error);
            toast.error("Network error");
        }
    };

    const handleTensionClassified = async (tensionId: string, classification: 'inconsistency' | 'intentional_nuance' | 'explore') => {
        await classifyTension(tensionId, classification);
        if (classification !== 'explore') {
            setClassifiedTensionIds(prev => new Set([...prev, tensionId]));
        }
    };

    const handleTurnTensionIntoIdea = async (tensionData: { id: string; tension: string; sideA: string; sideB: string }) => {
        try {
            await fetch('/api/content/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hook: `Exploring tension: ${tensionData.tension}`,
                    outcome: 'Nuance',
                    sourceType: 'tension',
                    sourceId: tensionData.id
                }),
            });
            setClassifiedTensionIds(prev => new Set([...prev, tensionData.id]));
        } catch (error) {
            console.error('Error creating draft from tension:', error);
        }
    };

    // Filter items
    const unreviewedCore = beliefs.core.filter((b: { id: string }) => !reviewedBeliefIds.has(b.id));
    const unreviewedEmerging = beliefs.emerging.filter((b: { id: string }) => !reviewedBeliefIds.has(b.id));
    const unreviewedOverused = beliefs.overused.filter((b: { id: string }) => !reviewedBeliefIds.has(b.id));

    const unclassifiedTensions = tensions.filter((t: { id: string }) => !classifiedTensionIds.has(t.id));

    return (
        <div className="h-full min-h-0 overflow-y-auto bg-canvas">
            {/* Header */}
            <div className="max-w-[1440px] mx-auto px-4 md:px-10 pt-5 md:pt-7">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <h1 className="text-2xl md:text-[32px] md:leading-tight font-medium tracking-[-0.02em] text-ink flex items-center gap-3">
                        Your Mind
                    </h1>
                    <button
                        onClick={() => setAddContentModalOpen(true)}
                        className="self-start md:self-auto h-10 px-4 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all"
                    >
                        Import Source
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-3 mt-4 overflow-x-auto p-2 -m-2 scrollbar-none">
                    <button
                        onClick={() => handleTabChange('beliefs')}
                        className={`h-10 px-5 rounded-full bg-canvas transition-all flex items-center gap-2 font-medium text-sm whitespace-nowrap ${activeTab === 'beliefs'
                            ? 'shadow-pressed text-ember-600'
                            : 'shadow-raised text-ink-soft hover:text-ink'
                            }`}
                    >
                        <Layers size={16} />
                        Beliefs
                    </button>
                    <button
                        onClick={() => handleTabChange('tensions')}
                        className={`h-10 px-5 rounded-full bg-canvas transition-all flex items-center gap-2 font-medium text-sm whitespace-nowrap ${activeTab === 'tensions'
                            ? 'shadow-pressed text-ember-600'
                            : 'shadow-raised text-ink-soft hover:text-ink'
                            }`}
                    >
                        <Zap size={16} />
                        Tensions
                    </button>
                    <button
                        onClick={() => handleTabChange('artifacts')}
                        className={`h-10 px-5 rounded-full bg-canvas transition-all flex items-center gap-2 font-medium text-sm whitespace-nowrap ${activeTab === 'artifacts'
                            ? 'shadow-pressed text-ember-600'
                            : 'shadow-raised text-ink-soft hover:text-ink'
                            }`}
                    >
                        <BookMarked size={16} />
                        Artifacts
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="max-w-[1440px] mx-auto px-4 md:px-10 pt-8 pb-28 md:pb-12">
                {activeTab === 'beliefs' && (
                    <div className="w-full flex flex-col gap-8">
                        {/* View Toggle */}
                        <div className="flex items-center justify-between gap-4">
                            <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink">
                                {beliefView === 'list' ? 'Belief List' : 'Strategic Mind Map'}
                            </h2>
                            <div className="bg-canvas shadow-well rounded-full p-1 flex items-center text-sm font-medium shrink-0">
                                <button
                                    onClick={() => handleViewChange('list')}
                                    className={`h-9 px-4 rounded-full transition-all ${beliefView === 'list' ? 'bg-surface shadow-raised text-ink' : 'text-ink-muted hover:text-ink'}`}
                                >
                                    List
                                </button>
                                <button
                                    onClick={() => handleViewChange('tree')}
                                    className={`h-9 px-4 rounded-full transition-all ${beliefView === 'tree' ? 'bg-surface shadow-raised text-ink' : 'text-ink-muted hover:text-ink'}`}
                                >
                                    Mind Map
                                </button>
                            </div>
                        </div>

                        {beliefView === 'tree' ? (
                            <div className="animate-fade-in">
                                <GenealogyTree
                                    beliefs={[...beliefs.core, ...beliefs.emerging, ...beliefs.overused, ...beliefs.confirmed]}
                                    drafts={drafts}
                                    onSelectDraft={(id) => {
                                        window.location.href = `/workspace?draftId=${id}`;
                                    }}
                                />
                            </div>
                        ) : beliefsLoading ? (
                            <section>
                                <div className="space-y-4">
                                    <SkeletonBeliefCard />
                                    <SkeletonBeliefCard />
                                    <SkeletonBeliefCard />
                                </div>
                            </section>
                        ) : (
                            <>
                                {/* Core Beliefs */}
                                {unreviewedCore.length > 0 && (
                                    <section>
                                        <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-4">Core Beliefs</h2>
                                        <div className="space-y-4">
                                            {unreviewedCore.map((b: { id: string; statement: string }) => (
                                                <BeliefCard
                                                    key={b.id}
                                                    beliefId={b.id}
                                                    type="core"
                                                    belief={b.statement}
                                                    sourceCount={1}
                                                    onFeedback={handleBeliefReviewed}
                                                    onWriteAbout={handleWriteAbout}
                                                />
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Emerging Theses */}
                                {unreviewedEmerging.length > 0 && (
                                    <section>
                                        <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-4">Emerging Theses</h2>
                                        <div className="space-y-4">
                                            {unreviewedEmerging.map((b: { id: string; statement: string }) => (
                                                <BeliefCard
                                                    key={b.id}
                                                    beliefId={b.id}
                                                    type="emerging"
                                                    belief={b.statement}
                                                    sourceCount={1}
                                                    onFeedback={handleBeliefReviewed}
                                                    onWriteAbout={handleWriteAbout}
                                                />
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Overused Patterns */}
                                {unreviewedOverused.length > 0 && (
                                    <section>
                                        <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-4">Overused Patterns</h2>
                                        <div className="space-y-4">
                                            {unreviewedOverused.map((b: { id: string; statement: string }) => (
                                                <BeliefCard
                                                    key={b.id}
                                                    beliefId={b.id}
                                                    type="overused"
                                                    belief={b.statement}
                                                    sourceCount={1}
                                                    onFeedback={handleBeliefReviewed}
                                                    onWriteAbout={handleWriteAbout}
                                                />
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Empty State */}
                                {unreviewedCore.length === 0 && unreviewedEmerging.length === 0 && unreviewedOverused.length === 0 && (
                                    <div className="p-16 text-center bg-canvas shadow-pressed rounded-card">
                                        <p className="text-ink-muted">No beliefs found. Import content to generate insights.</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'tensions' && (
                    <div className="w-full flex flex-col gap-4">
                        {tensionsLoading ? (
                            <>
                                <SkeletonTensionCard />
                                <SkeletonTensionCard />
                            </>
                        ) : unclassifiedTensions.length > 0 ? (
                            unclassifiedTensions.map((t: Tension) => (
                                <TensionCard
                                    key={t.id}
                                    tensionId={t.id}
                                    tension={t.summary || "Tension detected"}
                                    sideA={t.beliefA || "Perspective A"}
                                    sideB={t.beliefB || "Perspective B"}
                                    onClassify={handleTensionClassified}
                                    onTurnIntoIdea={handleTurnTensionIntoIdea}
                                />
                            ))
                        ) : (
                            <div className="p-16 text-center bg-canvas shadow-pressed rounded-card">
                                <p className="text-ink-muted">No tensions detected yet.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'artifacts' && (
                    <ArtifactGrid
                        onDraft={(artifact) => {
                            // NEW: Open preview modal instead of direct draft
                            if (artifact.source_url) {
                                setSelectedArtifact(artifact);
                                setUrlPreviewModalOpen(true);
                            } else if (onDraftRequest) {
                                // No URL, use ocr_text directly (e.g., screenshots)
                                onDraftRequest({
                                    id: artifact.id,
                                    hook: artifact.user_note || "New Draft from Artifact",
                                    type: 'artifact',
                                    references: artifact.ocr_text ? [{
                                        id: `ref-${Date.now()}`,
                                        contentItemId: '',
                                        referenceType: 'text',
                                        content: artifact.ocr_text,
                                        title: "Screenshot Content",
                                        createdAt: new Date()
                                    }] : []
                                });
                            } else {
                                // Fallback (Legacy)
                                handleWriteAbout({
                                    id: artifact.id,
                                    text: artifact.user_note || (artifact.ocr_text ? artifact.ocr_text.slice(0, 100) + "..." : "Saved Highlight"),
                                    context: artifact.ocr_text,
                                    type: 'artifact',
                                    tags: artifact.ai_metadata?.tags,
                                    entities: artifact.ai_metadata?.entities
                                });
                            }
                        }}
                        onSynthesize={(selectedArtifacts) => {
                            if (onDraftRequest) {
                                onDraftRequest({
                                    hook: `Synthesis of ${selectedArtifacts.length} sources`,
                                    type: 'synthesis',
                                    references: selectedArtifacts.map(a => ({
                                        id: `ref-${a.id}`,
                                        contentItemId: '',
                                        referenceType: 'text',
                                        content: a.ocr_text || a.user_note,
                                        url: a.source_url,
                                        title: a.source_title || a.user_note || 'Research Snippet',
                                        createdAt: new Date()
                                    }))
                                });
                            }
                        }}
                    />
                )}
            </div>

            <AddContentModal
                isOpen={addContentModalOpen}
                onClose={() => setAddContentModalOpen(false)}
                onSuccess={() => window.location.reload()}
            />

            {/* NEW: URL Preview Modal */}
            <UrlPreviewModal
                isOpen={urlPreviewModalOpen}
                onClose={() => {
                    setUrlPreviewModalOpen(false);
                    setSelectedArtifact(null);
                }}
                artifact={selectedArtifact}
                onCreateDraft={(content, title, url) => {
                    if (onDraftRequest) {
                        onDraftRequest({
                            id: selectedArtifact?.id,
                            hook: selectedArtifact?.user_note || title || "New Draft from URL",
                            type: 'artifact',
                            references: content ? [{
                                id: `ref-${Date.now()}`,
                                contentItemId: '',
                                referenceType: 'text',
                                content: content,
                                url: url,
                                title: title || "Fetched Article Content",
                                createdAt: new Date()
                            }] : []
                        });
                    }
                }}
            />

            <LimitModal
                isOpen={limitModalOpen}
                onClose={() => setLimitModalOpen(false)}
                tier={limitState.tier}
                usage={limitState.usage}
                limit={limitState.limit}
            />
        </div>
    );
}
