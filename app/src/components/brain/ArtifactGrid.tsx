"use client";

import { useEffect, useState, useCallback, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getArtifacts, deleteArtifact, setArtifactKind } from '@/app/brain/actions';
import { ArtifactCard } from './ArtifactCard';
import { CaptureIdeasModal } from './CaptureIdeasModal';
import { ReframeSheet } from './ReframeSheet';
import { Loader2, Search, MousePointerClick } from 'lucide-react';
import { captureKind } from '@/lib/brain/captures';
import { canReframe } from '@/lib/brain/reframe';
import { toast } from 'sonner';

import { Artifact, CaptureKind } from '@/types';

interface ArtifactGridProps {
    // Opens a saved idea in the writing wizard
    onOpenItem?: (itemId: string) => void;
}

const KIND_FILTERS: Array<{ id: CaptureKind | 'all'; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'frame', label: 'Frames' },
    { id: 'snip', label: 'Snips' },
    { id: 'bookmark', label: 'Bookmarks' },
];

export function ArtifactGrid({ onOpenItem }: ArtifactGridProps) {
    const [artifacts, setArtifacts] = useState<Artifact[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [kindFilter, setKindFilter] = useState<CaptureKind | 'all'>('all');
    // The captures post ideas are being found for
    const [ideasFor, setIdeasFor] = useState<Artifact[] | null>(null);
    // The capture being reframed
    const [reframing, setReframing] = useState<Artifact | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const reframeParam = searchParams.get('reframe');

    const fetchArtifacts = useCallback(async (quiet = false) => {
        if (!quiet) setLoading(true);
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

    // Lens "Save and reframe" links here with the new capture's id
    useEffect(() => {
        if (!reframeParam || loading) return;
        const capture = artifacts.find(a => a.id === reframeParam);
        if (capture && canReframe(capture)) setReframing(capture);
        else if (capture) toast.info('That capture has no text to react to yet. Try Find ideas on it.');
        const params = new URLSearchParams(searchParams.toString());
        params.delete('reframe');
        router.replace(`/workspace?${params.toString()}`, { scroll: false });
    }, [reframeParam, loading, artifacts, searchParams, router]);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSelectMode, setIsSelectMode] = useState(false);

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    // Several captures go to the idea step together; the server reads at most six
    const handleFindIdeasForSelection = () => {
        setIdeasFor(artifacts.filter(a => selectedIds.has(a.id)).slice(0, 6));
        setIsSelectMode(false);
        setSelectedIds(new Set());
    };

    const shown = kindFilter === 'all' ? artifacts : artifacts.filter(a => captureKind(a) === kindFilter);

    // Older captures only have a guessed kind; one tap corrects it and moves the card to that filter
    const handleChangeKind = async (artifact: Artifact, kind: 'snip' | 'frame') => {
        const before = artifact.ai_metadata;
        const patch = (meta: Artifact['ai_metadata']) =>
            setArtifacts(prev => prev.map(a => a.id === artifact.id ? { ...a, ai_metadata: meta } : a));
        patch({ ...(before || {}), kind });
        try {
            await setArtifactKind(artifact.id, kind);
            toast.success(`Moved to ${kind === 'frame' ? 'Frames' : 'Snips'}`);
        } catch (e) {
            console.error(e);
            patch(before);
            toast.error("Couldn't change the type. Try again.");
        }
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
                        <span className="text-sm font-medium text-ember-700 ml-3">{selectedIds.size > 6 ? '6 max' : `${selectedIds.size} selected`}</span>
                        <div className="flex-1" />
                        <button
                            onClick={() => { setIsSelectMode(false); setSelectedIds(new Set()); }}
                            className="h-10 px-4 rounded-full text-sm font-medium text-ink-soft hover:text-ink"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleFindIdeasForSelection}
                            disabled={selectedIds.size < 1 || selectedIds.size > 6}
                            className="h-11 px-4 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Find ideas
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
                                className="h-11 pl-3 pr-4 rounded-full flex items-center gap-2 bg-canvas shadow-raised text-sm font-medium text-ink-soft hover:text-ember-600 active:shadow-pressed transition-all"
                                title="Pick several captures and find ideas that connect them"
                            >
                                <MousePointerClick size={18} />
                                Select several
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Kind filter: flat pills, the chosen one solid */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1" role="tablist" aria-label="Capture type">
                {KIND_FILTERS.map(f => {
                    const active = kindFilter === f.id;
                    const count = f.id === 'all' ? artifacts.length : artifacts.filter(a => captureKind(a) === f.id).length;
                    return (
                        <button
                            key={f.id}
                            role="tab"
                            aria-selected={active}
                            onClick={() => setKindFilter(f.id)}
                            className={`h-11 md:h-10 px-4 shrink-0 rounded-full text-sm font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-200 ${active ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink hover:bg-surface'}`}
                        >
                            {f.label}
                            {!loading && <span className={`text-xs tabular-nums ${active ? 'text-white/70' : 'text-ink-muted'}`}>{count}</span>}
                        </button>
                    );
                })}
            </div>

            {/* Grid */}
            {loading ? (
                <div className="py-20 flex justify-center">
                    <Loader2 className="animate-spin text-ember-500" />
                </div>
            ) : shown.length === 0 ? (
                <div className="py-20 text-center bg-canvas shadow-pressed rounded-card">
                    <p className="text-ink-muted">{artifacts.length ? 'Nothing of this type yet.' : 'No captures yet. Save one with CounterDraft Lens.'}</p>
                </div>
            ) : (
                <div className="columns-1 md:columns-2 lg:columns-3 gap-5 space-y-5">
                    {shown.map(artifact => (
                        <div
                            key={artifact.id}
                            className={`relative group break-inside-avoid mb-4 ${isSelectMode ? 'cursor-pointer rounded-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-300' : ''}`}
                            // While picking, the whole card is the checkbox, so it's easy to hit on a phone
                            {...(isSelectMode ? {
                                role: 'checkbox',
                                'aria-checked': selectedIds.has(artifact.id),
                                'aria-label': artifact.source_title || artifact.source_domain || 'Capture',
                                tabIndex: 0,
                                onClick: () => toggleSelection(artifact.id),
                                onKeyDown: (e: ReactKeyboardEvent) => {
                                    if (e.key === ' ' || e.key === 'Enter') {
                                        e.preventDefault();
                                        toggleSelection(artifact.id);
                                    }
                                },
                            } : {})}
                        >
                            <ArtifactCard
                                artifact={artifact}
                                onDelete={handleDelete}
                                onFindIdeas={a => setIdeasFor([a])}
                                onReframe={setReframing}
                                onChangeKind={handleChangeKind}
                                selecting={isSelectMode}
                                selected={selectedIds.has(artifact.id)}
                            />
                        </div>
                    ))}
                </div>
            )}

            {ideasFor && (
                <CaptureIdeasModal
                    captures={ideasFor}
                    onClose={() => setIdeasFor(null)}
                    onOpenItem={onOpenItem}
                    onSaved={() => fetchArtifacts(true)}
                />
            )}
            {reframing && (
                <ReframeSheet
                    capture={reframing}
                    onClose={() => setReframing(null)}
                    onOpenItem={onOpenItem}
                    onSaved={() => fetchArtifacts(true)}
                />
            )}
        </div>
    );
}
