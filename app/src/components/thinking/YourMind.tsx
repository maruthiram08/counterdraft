"use client";

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layers, Zap, Network } from 'lucide-react';
import { BeliefCard } from '@/components/thinking/BeliefCard';
import { TensionCard } from '@/components/thinking/TensionCard';
import { AddContentModal } from '@/components/thinking/AddContentModal';
import { useBeliefs } from '@/hooks/useBeliefs';
import { useTensions } from '@/hooks/useTensions';
import { useDrafts } from '@/hooks/useDrafts';
import { GenealogyTree } from '@/components/thinking/GenealogyTree';

function SkeletonBeliefCard() {
    return (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm animate-pulse">
            <div className="flex items-center gap-2 mb-4">
                <div className="h-5 w-24 bg-gray-100 rounded"></div>
                <div className="flex-1"></div>
                <div className="h-4 w-12 bg-gray-50 rounded"></div>
            </div>
            <div className="h-4 w-full bg-gray-100 rounded mb-2"></div>
            <div className="h-4 w-2/3 bg-gray-100 rounded mb-6"></div>
            <div className="flex gap-2 justify-end">
                <div className="h-9 w-24 bg-gray-50 rounded-lg"></div>
                <div className="h-9 w-24 bg-gray-50 rounded-lg"></div>
            </div>
        </div>
    );
}

function SkeletonTensionCard() {
    return (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm animate-pulse">
            <div className="h-5 w-1/3 bg-gray-100 rounded mb-6 mx-auto"></div>
            <div className="flex gap-4 mb-6">
                <div className="flex-1 p-4 bg-gray-50/50 rounded-lg border border-gray-100">
                    <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                </div>
                <div className="flex-1 p-4 bg-gray-50/50 rounded-lg border border-gray-100">
                    <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                </div>
            </div>
            <div className="flex justify-center gap-2">
                <div className="h-9 w-32 bg-gray-100 rounded-lg"></div>
                <div className="h-9 w-32 bg-gray-100 rounded-lg"></div>
            </div>
        </div>
    );
}

export function YourMind() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Persist sub-tabs and views in URL
    const initialTab = searchParams.get('subtab') as 'beliefs' | 'tensions' || 'beliefs';
    const initialView = searchParams.get('view') as 'list' | 'tree' || 'list';

    const [activeTab, setActiveTab] = useState<'beliefs' | 'tensions'>(initialTab);
    const [beliefView, setBeliefView] = useState<'list' | 'tree'>(initialView);
    const [addContentModalOpen, setAddContentModalOpen] = useState(false);

    // Sync helpers
    const updateUrl = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set(key, value);
        router.push(`/workspace?${params.toString()}`, { scroll: false });
    };

    const handleTabChange = (tab: 'beliefs' | 'tensions') => {
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

    // --- Handlers ---

    const handleBeliefReviewed = async (beliefId: string, feedback: 'accurate' | 'misses' | 'clarify') => {
        await submitFeedback(beliefId, feedback);
        setReviewedBeliefIds(prev => new Set([...prev, beliefId]));
    };

    const handleWriteAbout = async (beliefData: { id: string; text: string; type: string }) => {
        try {
            await fetch('/api/content/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hook: beliefData.text,
                    outcome: 'Thought Leadership', // Default outcome
                    sourceType: 'belief',
                    sourceId: beliefData.id,
                    stance: 'agree' // Default stance, user can change later
                }),
            });
            // We don't hide the belief here, just show success in the card (handled by card component)
        } catch (error) {
            console.error('Error creating draft from belief:', error);
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
        <div className="flex flex-col h-full min-h-0 bg-gray-50">
            {/* Header */}
            <div className="flex-none px-6 pt-6 pb-2">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-serif text-gray-900">Your Mind</h1>
                    <button
                        onClick={() => setAddContentModalOpen(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
                    >
                        Import Source
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-6 mt-6 border-b border-gray-200">
                    <button
                        onClick={() => handleTabChange('beliefs')}
                        className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-2 font-medium text-sm ${activeTab === 'beliefs'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        <Layers size={16} />
                        Beliefs
                    </button>
                    <button
                        onClick={() => handleTabChange('tensions')}
                        className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-2 font-medium text-sm ${activeTab === 'tensions'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        <Zap size={16} />
                        Tensions
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6 pb-32 min-h-0">
                {activeTab === 'beliefs' && (
                    <div className="w-full space-y-6">
                        {/* View Toggle */}
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                                {beliefView === 'list' ? 'Belief List' : 'Strategic Mind Map'}
                            </h2>
                            <div className="bg-gray-200/50 p-1 rounded-lg flex items-center text-xs font-medium shrink-0">
                                <button
                                    onClick={() => handleViewChange('list')}
                                    className={`px-3 py-1 rounded-md transition-all ${beliefView === 'list' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}
                                >
                                    List
                                </button>
                                <button
                                    onClick={() => handleViewChange('tree')}
                                    className={`px-3 py-1 rounded-md transition-all ${beliefView === 'tree' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}
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
                                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Core Beliefs</h2>
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
                                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Emerging Theses</h2>
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
                                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Overused Patterns</h2>
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
                                    <div className="p-16 text-center border border-dashed border-gray-300 rounded-lg">
                                        <p className="text-gray-500">No beliefs found. Import content to generate insights.</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'tensions' && (
                    <div className="w-full space-y-4">
                        {tensionsLoading ? (
                            <>
                                <SkeletonTensionCard />
                                <SkeletonTensionCard />
                            </>
                        ) : unclassifiedTensions.length > 0 ? (
                            unclassifiedTensions.map((t: any) => (
                                <TensionCard
                                    key={t.id}
                                    tensionId={t.id}
                                    tension={t.tensionSummary || "Tension detected"}
                                    sideA={t.beliefA?.statement || "Perspective A"}
                                    sideB={t.beliefB?.statement || "Perspective B"}
                                    onClassify={handleTensionClassified}
                                    onTurnIntoIdea={handleTurnTensionIntoIdea}
                                />
                            ))
                        ) : (
                            <div className="p-16 text-center border border-dashed border-gray-300 rounded-lg">
                                <p className="text-gray-500">No tensions detected yet.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <AddContentModal
                isOpen={addContentModalOpen}
                onClose={() => setAddContentModalOpen(false)}
                onSuccess={() => window.location.reload()}
            />
        </div>
    );
}
