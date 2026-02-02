"use client";

import { useEffect, useState } from 'react';
import { getArtifacts, deleteArtifact } from '@/app/brain/actions';
import { ArtifactCard } from './ArtifactCard';
import { Loader2, Search, Filter, MousePointerClick } from 'lucide-react';

interface ArtifactGridProps {
    onDraft: (artifact: any) => void;
}

export function ArtifactGrid({ onDraft }: ArtifactGridProps) {
    const [artifacts, setArtifacts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    const fetchArtifacts = async () => {
        setLoading(true);
        try {
            const data = await getArtifacts({ intent: filter || undefined, search: search || undefined });
            setArtifacts(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Debounce search
        const timer = setTimeout(() => {
            fetchArtifacts();
        }, 300);
        return () => clearTimeout(timer);
    }, [filter, search]);

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
        // Synthesize logic: combine text
        const combinedText = selectedArtifacts.map(a => a.ocr_text || a.user_note).join("\n\n---\n\n");
        const allTags = selectedArtifacts.flatMap(a => a.ai_metadata?.tags || []);

        onDraft({
            id: 'synthesis', // Mock ID
            user_note: `Synthesis of ${selectedIds.size} artifacts`,
            ocr_text: combinedText,
            urls: selectedArtifacts.map(a => a.source_url).filter(Boolean), // Collect URLs
            ai_metadata: { tags: Array.from(new Set(allTags)) } // Dedupe tags
        });

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
                    <div className="flex items-center gap-4 w-full bg-blue-50 p-2 rounded-lg border border-blue-100 animate-slide-in">
                        <span className="text-sm font-medium text-blue-900 ml-2">{selectedIds.size} Selected</span>
                        <div className="flex-1" />
                        <button
                            onClick={() => { setIsSelectMode(false); setSelectedIds(new Set()); }}
                            className="px-3 py-1 text-sm text-gray-500 hover:text-gray-900"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSynthesize}
                            disabled={selectedIds.size < 2}
                            className="px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Synthesize
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search your brain..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div className="flex gap-2 w-full sm:w-auto items-center">
                            <button
                                onClick={() => setIsSelectMode(true)}
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Select Multiple"
                            >
                                <MousePointerClick size={20} />
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Grid */}
            {loading ? (
                <div className="py-20 flex justify-center">
                    <Loader2 className="animate-spin text-gray-400" />
                </div>
            ) : artifacts.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-xl">
                    <p className="text-gray-400">No artifacts found.</p>
                </div>
            ) : (
                <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
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
                                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shadow-sm"
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
