"use client";

import { useBeliefs } from "@/hooks/useBeliefs";
import { useState } from "react";
import { Loader2, Check, Edit2, X, Archive, Filter } from "lucide-react";

type FilterType = 'all' | 'core' | 'emerging' | 'overused' | 'confirmed';

export default function BeliefsPage() {
    const { beliefs, loading, updateBelief, submitFeedback } = useBeliefs();
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
        <main className="min-h-screen bg-[var(--background)]">
            {/* Header */}
            <header className="border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-10">
                <div className="container py-4 flex items-center justify-between">
                    <h1 className="text-xl font-medium tracking-tight">counterdraft</h1>
                    <nav className="flex items-center gap-6">
                        <a href="/beliefs" className="text-sm font-medium">Beliefs</a>
                        <a href="/tensions" className="text-sm text-[var(--text-muted)] hover:text-[var(--foreground)]">Tensions</a>
                        <a href="/ideas" className="text-sm text-[var(--text-muted)] hover:text-[var(--foreground)]">Ideas</a>
                    </nav>
                </div>
            </header>

            <div className="container py-12">
                <div className="max-w-3xl mx-auto">
                    <header className="mb-8">
                        <h2 className="text-3xl font-serif mb-2">Your Belief Graph</h2>
                        <p className="text-[var(--text-muted)]">
                            These are the beliefs extracted from your content. Review, edit, and confirm them.
                        </p>
                    </header>

                    {/* Controls */}
                    <div className="flex flex-wrap items-center gap-2 mb-8 pb-4 border-b">
                        <Filter size={16} className="text-[var(--text-muted)] mr-2" />
                        {(['all', 'core', 'emerging', 'overused', 'confirmed'] as const).map((type) => (
                            <button
                                key={type}
                                onClick={() => setActiveFilter(type)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${activeFilter === type
                                    ? 'bg-[var(--foreground)] text-white'
                                    : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-gray-50'
                                    }`}
                            >
                                {type}
                                <span className="ml-2 opacity-60 text-xs">
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
                            <Loader2 className="mx-auto animate-spin mb-4 text-[var(--text-muted)]" />
                            <p className="text-[var(--text-muted)]">Loading your beliefs...</p>
                        </div>
                    ) : filteredList.length === 0 ? (
                        <div className="text-center py-20 border border-dashed rounded-lg bg-gray-50/50">
                            <Archive className="mx-auto mb-4 text-[var(--text-muted)]" />
                            <p className="text-[var(--text-muted)]">No beliefs found in this category.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredList.map((belief) => (
                                <div
                                    key={belief.id}
                                    className={`card group transition-all ${activeFilter === 'all' // visual hints for type when in 'all' view
                                        ? belief.beliefType === 'core' ? 'border-l-4 border-l-blue-500'
                                            : belief.beliefType === 'overused' ? 'border-l-4 border-l-orange-500'
                                                : belief.beliefType === 'emerging' ? 'border-l-4 border-l-purple-500'
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
                                                        className="w-full p-2 border rounded text-lg font-serif resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                        rows={2}
                                                        autoFocus
                                                    />
                                                    <div className="flex flex-col gap-2">
                                                        <button
                                                            onClick={handleEditSave}
                                                            className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                                            title="Save"
                                                        >
                                                            <Check size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingId(null)}
                                                            className="p-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                                                            title="Cancel"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className={`text-xl font-serif text-[var(--foreground)] mb-2 ${belief.userConfirmed ? 'text-green-900' : ''}`}>
                                                        {belief.statement}
                                                    </p>
                                                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                                                        <span className="capitalize px-2 py-0.5 bg-gray-100 rounded-full">
                                                            {belief.beliefType}
                                                        </span>
                                                        {belief.userConfirmed && (
                                                            <span className="flex items-center gap-1 text-green-700">
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
                                                    className="p-2 text-[var(--text-muted)] hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => submitFeedback(belief.id, 'accurate')}
                                                    className="px-3 py-1.5 bg-[var(--foreground)] text-white text-xs font-medium rounded hover:opacity-90 transition-opacity"
                                                >
                                                    Confirm
                                                </button>
                                            </div>
                                        )}
                                        {!editingId && belief.userConfirmed && (
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEditStart(belief.id, belief.statement)}
                                                    className="p-2 text-[var(--text-muted)] hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
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
                </div>
            </div>
        </main>
    );
}
