"use client";

import { useEffect, useState, useCallback } from 'react';
import { getArtifacts, deleteArtifact } from '@/app/brain/actions';
import { ArtifactCard } from './ArtifactCard';
import { Loader2, Search, MousePointerClick } from 'lucide-react';

import { Artifact } from '@/types';

interface ArtifactGridProps {
    onDraft: (artifact: Artifact) => void;
    onSynthesize?: (artifacts: Artifact[]) => void;
}

export function ArtifactGrid({ onDraft, onSynthesize }: ArtifactGridProps) {
    const [artifacts, setArtifacts] = useState<Artifact[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const fetchArtifacts = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getArtifacts({ search: search || undefined });
            setArtifacts(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        // Debounce search
        const timer = setTimeout(() => {
            fetchArtifacts();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchArtifacts]);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSelectMode, setIsSelectMode] = useState(false);

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleSynthesize = () => {
        const selectedArtifacts = artifacts.filter(a => selectedIds.has(a.id));

        if (onSynthesize) {
            onSynthesize(selectedArtifacts);
        } else {
            // Fallback: Synthesis logic (combine text)
            const combinedText = selectedArtifacts.map(a => a.ocr_text || a.user_note).join("\n\n---\n\n");
            const allTags = selectedArtifacts.flatMap(a => a.ai_metadata?.tags || []);

            onDraft({
                id: 'synthesis', // Mock ID
                user_note: `Synthesis of ${selectedIds.size} artifacts`,
                ocr_text: combinedText,
                urls: selectedArtifacts.map(a => a.source_url).filter((url): url is string => !!url), // Collect URLs
                ai_metadata: { tags: Array.from(new Set(allTags)) }, // Dedupe tags
                userId: 'user', // Mock for synthesis
                createdAt: new Date()
            });
        }

        setIsSelectMode(false);
        setSelectedIds(new Set());
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this snippet?")) return;
        setArtifacts(prev => prev.filter(a => a.id !== id)); // Optimistic
        await deleteArtifact(id);
    };

    return (
        <div className="space-y-6">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                {isSelectMode ? (
                    <div className="flex items-center gap-3 w-full bg-ember-50 p-2 rounded-full shadow-raised animate-slide-in">
                        <span className="text-sm font-medium text-ember-700 ml-3">{selectedIds.size} Selected</span>
                        <div className="flex-1" />
                        <button
                            onClick={() => { setIsSelectMode(false); setSelectedIds(new Set()); }}
                            className="h-10 px-4 rounded-full text-sm font-medium text-ink-soft hover:text-ink"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSynthesize}
                            disabled={selectedIds.size < 2}
                            className="h-10 px-4 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Synthesize
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" size={16} />
                            <input
                                type="text"
                                placeholder="Search your brain..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full h-12 pl-10 pr-4 bg-canvas shadow-well rounded-full text-sm text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200"
                            />
                        </div>

                        <div className="flex gap-2 w-full sm:w-auto items-center">
                            <button
                                onClick={() => setIsSelectMode(true)}
                                className="w-10 h-10 rounded-full flex items-center justify-center bg-canvas shadow-raised text-ink-soft hover:text-ember-600 active:shadow-pressed transition-all"
                                title="Select Multiple"
                            >
                                <MousePointerClick size={18} />
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Grid */}
            {loading ? (
                <div className="py-20 flex justify-center">
                    <Loader2 className="animate-spin text-ember-500" />
                </div>
            ) : artifacts.length === 0 ? (
                <div className="py-20 text-center bg-canvas shadow-pressed rounded-card">
                    <p className="text-ink-muted">No artifacts found.</p>
                </div>
            ) : (
                <div className="columns-1 md:columns-2 lg:columns-3 gap-5 space-y-5">
                    {artifacts.map(artifact => (
                        <div key={artifact.id} className="relative group break-inside-avoid mb-4">
                            {isSelectMode && (
                                <div
                                    className="absolute top-3 right-3 z-10 cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleSelection(artifact.id);
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(artifact.id)}
                                        onChange={() => toggleSelection(artifact.id)}
                                        className="w-5 h-5 rounded border-line accent-ember-500 focus:ring-ember-200 cursor-pointer"
                                    />
                                </div>
                            )}
                            <ArtifactCard
                                artifact={artifact}
                                onDelete={handleDelete}
                                onCreateDraft={onDraft}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
