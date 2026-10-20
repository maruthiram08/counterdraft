"use client";

import { useBeliefs } from "@/hooks/useBeliefs";
import { useDrafts } from "@/hooks/useDrafts";
import { useState } from "react";
import { Loader2, Check, Edit2, X, Archive, Filter } from "lucide-react";
import { GenealogyTree } from "@/components/thinking/GenealogyTree";
import { useRouter } from "next/navigation";

type FilterType = 'all' | 'core' | 'emerging' | 'overused' | 'confirmed' | 'tree';

export default function BeliefsPage() {
    const router = useRouter();
    const { beliefs, loading, updateBelief, submitFeedback } = useBeliefs();
    const { drafts } = useDrafts();
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");

    const handleEditStart = (id: string, currentText: string) => {
        setEditingId(id);
        setEditValue(currentText);
    };

    const handleEditSave = async () => {
        if (editingId && editValue.trim()) {
            await updateBelief(editingId, editValue);
            setEditingId(null);
        }
    };

    const getFilteredBeliefs = () => {
        const allList = [
            ...beliefs.core,
            ...beliefs.emerging,
            ...beliefs.overused
        ];

        switch (activeFilter) {
            case 'core': return beliefs.core;
            case 'emerging': return beliefs.emerging;
            case 'overused': return beliefs.overused;
            case 'confirmed': return beliefs.confirmed;
            case 'all': default: return allList;
        }
    };

    const filteredList = getFilteredBeliefs();

    return (
        <main className="min-h-screen bg-canvas">
            {/* Header */}
            <header className="bg-canvas/90 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-[1440px] mx-auto px-4 md:px-10 py-4 flex items-center justify-between gap-4">
                    <h1 className="text-xl font-medium tracking-[-0.02em] text-ink">counterdraft</h1>
                    <nav className="flex items-center gap-2 md:gap-3">
                        <a href="/beliefs" className="h-10 px-4 inline-flex items-center rounded-full bg-canvas shadow-pressed text-sm font-medium text-ember-600">Beliefs</a>
                        <a href="/tensions" className="h-10 px-4 inline-flex items-center rounded-full bg-canvas shadow-raised text-sm font-medium text-ink-soft hover:text-ink transition-all">Tensions</a>
                        <a href="/ideas" className="h-10 px-4 inline-flex items-center rounded-full bg-canvas shadow-raised text-sm font-medium text-ink-soft hover:text-ink transition-all">Ideas</a>
                    </nav>
                </div>
            </header>

            <div className="max-w-[1440px] mx-auto px-4 md:px-10 pt-5 md:pt-7 pb-28 md:pb-12">
                <div className="flex flex-col gap-8">
                    <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h2 className="text-2xl md:text-[32px] md:leading-tight font-medium tracking-[-0.02em] text-ink">Your Belief Graph</h2>
                            <p className="mt-1 text-sm text-ink-soft">
                                Review, edit, and link your beliefs into a Strategy Tree.
                            </p>
                        </div>

                        {/* View Toggle */}
                        <div className="self-start md:self-auto bg-canvas shadow-well rounded-full p-1 flex items-center text-sm font-medium">
                            <button
                                onClick={() => setActiveFilter('all')} // Use filter as view toggle for now or add new state? Let's assume activeFilter=tree is managed elsewhere or just use a boolean
                                className={`h-9 px-4 rounded-full transition-all ${activeFilter !== 'tree' ? 'bg-surface shadow-raised text-ink' : 'text-ink-muted hover:text-ink'}`}
                            >
                                List
                            </button>
                            <button
                                onClick={() => setActiveFilter('tree')}
                                className={`h-9 px-4 rounded-full transition-all ${activeFilter === 'tree' ? 'bg-surface shadow-raised text-ink' : 'text-ink-muted hover:text-ink'}`}
                            >
                                Mind Map
                            </button>
                        </div>
                    </header>

                    {activeFilter === 'tree' ? (
                        <GenealogyTree
                            beliefs={[...beliefs.core, ...beliefs.emerging, ...beliefs.overused, ...beliefs.confirmed]}
                            drafts={drafts}
                            onSelectDraft={(id) => router.push(`/workspace?draftId=${id}`)}
                        />
                    ) : (
                        <>
                            {/* Controls */}
                            <div className="flex flex-wrap items-center gap-3 mb-8">
                                <Filter size={16} className="text-ink-muted mr-1" />
                                {(['all', 'core', 'emerging', 'overused', 'confirmed'] as const).map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setActiveFilter(type)}
                                        className={`h-10 px-4 rounded-full bg-canvas text-sm font-medium transition-all capitalize ${activeFilter === type
                                            ? 'shadow-pressed text-ember-600'
                                            : 'shadow-raised text-ink-soft hover:text-ink'
                                            }`}
                                    >
                                        {type}
                                        <span className="ml-2 text-xs text-ink-muted">
                                            {type === 'all'
                                                ? beliefs.core.length + beliefs.emerging.length + beliefs.overused.length
                                                : type === 'confirmed' ? beliefs.confirmed.length
                                                    : beliefs[type].length}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {loading ? (
                                <div className="text-center py-20">
                                    <Loader2 className="mx-auto animate-spin mb-4 text-ember-500" />
                                    <p className="text-ink-muted">Loading your beliefs...</p>
                                </div>
                            ) : filteredList.length === 0 ? (
                                <div className="text-center py-20 bg-canvas shadow-pressed rounded-card">
                                    <Archive className="mx-auto mb-4 text-ink-muted" />
                                    <p className="text-ink-muted">No beliefs found in this category.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {filteredList.map((belief) => (
                                        <div
                                            key={belief.id}
                                            className={`group bg-surface rounded-tile shadow-card p-5 hover:shadow-float hover:-translate-y-0.5 transition-all ${activeFilter === 'all' // visual hints for type when in 'all' view
                                                ? belief.beliefType === 'core' ? 'border-l-4 border-l-[var(--belief-core)]'
                                                    : belief.beliefType === 'overused' ? 'border-l-4 border-l-[var(--belief-overused)]'
                                                        : belief.beliefType === 'emerging' ? 'border-l-4 border-l-[var(--belief-emerging)]'
                                                            : ''
                                                : ''
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    {editingId === belief.id ? (
                                                        <div className="flex gap-2">
                                                            <textarea
                                                                value={editValue}
                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                className="w-full bg-canvas shadow-well rounded-2xl px-4 py-3 text-lg text-ink placeholder:text-ink-muted border-0 resize-none focus:outline-none focus:ring-2 focus:ring-ember-200"
                                                                rows={2}
                                                                autoFocus
                                                            />
                                                            <div className="flex flex-col gap-2">
                                                                <button
                                                                    onClick={handleEditSave}
                                                                    className="w-10 h-10 flex items-center justify-center rounded-full bg-sage-100 text-sage-700 hover:shadow-raised active:shadow-pressed transition-all"
                                                                    title="Save"
                                                                >
                                                                    <Check size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingId(null)}
                                                                    className="w-10 h-10 flex items-center justify-center rounded-full text-ink-muted hover:text-ink active:shadow-pressed transition-all"
                                                                    title="Cancel"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <p className={`text-[17px] md:text-xl font-medium tracking-[-0.01em] mb-3 ${belief.userConfirmed ? 'text-sage-700' : 'text-ink'}`}>
                                                                {belief.statement}
                                                            </p>
                                                            <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                                                                <span className="capitalize inline-flex items-center h-7 px-3 rounded-full bg-canvas shadow-well text-ink-soft font-medium">
                                                                    {belief.beliefType}
                                                                </span>
                                                                {belief.userConfirmed && (
                                                                    <span className="inline-flex items-center gap-1 h-7 px-3 rounded-full bg-sage-100 text-sage-700 font-medium">
                                                                        <Check size={12} /> Confirmed
                                                                    </span>
                                                                )}
                                                                <span>
                                                                    Found {new Date(belief.createdAt).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                {!editingId && !belief.userConfirmed && (
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleEditStart(belief.id, belief.statement)}
                                                            className="w-10 h-10 flex items-center justify-center rounded-full text-ink-muted hover:text-ink active:shadow-pressed transition-all"
                                                            title="Edit"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => submitFeedback(belief.id, 'accurate')}
                                                            className="h-9 px-4 rounded-full bg-ink text-white text-xs font-medium hover:bg-ink/90 transition-colors"
                                                        >
                                                            Confirm
                                                        </button>
                                                    </div>
                                                )}
                                                {!editingId && belief.userConfirmed && (
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleEditStart(belief.id, belief.statement)}
                                                            className="w-10 h-10 flex items-center justify-center rounded-full text-ink-muted hover:text-ink active:shadow-pressed transition-all"
                                                            title="Edit"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </main>
    );
}
