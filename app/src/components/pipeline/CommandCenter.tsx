"use client";

import { useState, useEffect } from "react";
import { Lightbulb, Settings, FileText, CheckCircle, Loader2, Archive, Trash2, Plus, ArrowRight, Wand2 } from "lucide-react";
import { DevelopmentWizard } from "./DevelopmentWizard";

type Stage = 'idea' | 'developing' | 'draft' | 'published';


interface ContentItem {
    id: string;
    hook: string;
    angle?: string;
    format?: string;
    stage: 'idea' | 'developing' | 'draft' | 'published';
    dev_step?: string;
    status: string;
    draft_content?: string;
    source_topics?: string[];
    created_at: string;
    updated_at: string;
    published_at?: string;
    platform?: string;
}

interface ColumnProps {
    title: string;
    icon: React.ReactNode;
    items: ContentItem[];
    stage: string;
    color: string;
    onAction: (id: string, action: string) => void;
    loading?: boolean;
}

function SkeletonCard() {
    return (
        <div className="bg-white p-4 rounded-xl border border-gray-100/80 shadow-sm flex flex-col gap-3 h-auto min-h-[140px] animate-pulse">
            {/* Top Tags */}
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    <div className="h-5 w-16 bg-gray-100 rounded"></div>
                    <div className="h-5 w-12 bg-gray-100 rounded"></div>
                </div>
                <div className="h-4 w-12 bg-gray-100 rounded"></div>
            </div>

            {/* Content */}
            <div className="space-y-2 mt-1">
                <div className="h-5 w-3/4 bg-gray-100 rounded"></div>
                <div className="space-y-1">
                    <div className="h-3 w-full bg-gray-50 rounded"></div>
                    <div className="h-3 w-5/6 bg-gray-50 rounded"></div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-3 flex items-center justify-between border-t border-gray-50">
                <div className="flex gap-2">
                    <div className="h-8 w-12 bg-gray-50 rounded-lg"></div>
                    <div className="h-8 w-12 bg-gray-50 rounded-lg"></div>
                </div>
                <div className="flex gap-1">
                    <div className="h-7 w-7 bg-gray-50 rounded-md"></div>
                    <div className="h-7 w-7 bg-gray-50 rounded-md"></div>
                </div>
            </div>
        </div>
    );
}

function Column({ title, icon, items, stage, color, onAction, loading }: ColumnProps) {
    return (
        <div className="flex-1 min-w-[280px] sm:min-w-[250px] max-w-full sm:max-w-[300px] bg-gray-50/50 rounded-xl p-3">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h3>
                    <span className="text-xs font-medium text-gray-500 bg-gray-200/60 px-2 py-0.5 rounded-full">
                        {loading ? '-' : items.length}
                    </span>
                </div>
            </div>

            {/* Items */}
            <div className="space-y-3">
                {loading ? (
                    <>
                        <SkeletonCard />
                        <SkeletonCard />
                    </>
                ) : items.length === 0 ? (
                    <div className="h-32 border-2 border-dashed border-gray-100 rounded-xl flex items-center justify-center">
                        <p className="text-sm text-gray-400">Empty</p>
                    </div>
                ) : (
                    items.map(item => (
                        <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-200/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group flex flex-col gap-3 h-auto min-h-[140px]">
                            {/* Top Tags */}
                            <div className="flex items-center justify-between">
                                <div className="flex gap-2">
                                    {item.format && (
                                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-semibold uppercase tracking-wider">
                                            {item.format}
                                        </span>
                                    )}
                                    {item.platform && (
                                        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 text-[10px] font-semibold uppercase tracking-wider">
                                            {item.platform}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] font-medium text-gray-400">
                                    {new Date(item.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                            </div>

                            {/* Content */}
                            <div className="space-y-1.5">
                                <h3 className="text-[15px] font-bold text-gray-900 leading-snug text-balance font-sans">
                                    {item.hook || 'Untitled Idea'}
                                </h3>
                                <p className="text-[13px] text-gray-500 line-clamp-3 leading-relaxed font-sans">
                                    {item.draft_content || item.angle || "No content yet..."}
                                </p>
                            </div>

                            {/* Footer Actions / Meta */}
                            <div className="mt-auto pt-3 flex items-center justify-between border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <div className="flex gap-2">
                                    {stage === 'idea' && (
                                        <>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onAction(item.id, 'develop'); }}
                                                className="flex flex-col items-center gap-1 p-2 hover:bg-amber-50 text-gray-400 hover:text-amber-700 rounded-lg transition-colors group/btn min-w-[50px]"
                                                title="Develop"
                                            >
                                                <Wand2 size={14} className="group-hover/btn:scale-110 transition-transform mb-0.5" />
                                                <span className="text-[10px] font-medium leading-none">Develop</span>
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onAction(item.id, 'start_draft'); }}
                                                className="flex flex-col items-center gap-1 p-2 hover:bg-blue-50 text-gray-400 hover:text-blue-700 rounded-lg transition-colors group/btn min-w-[50px]"
                                                title="Quick Draft"
                                            >
                                                <ArrowRight size={14} className="group-hover/btn:scale-110 transition-transform mb-0.5" />
                                                <span className="text-[10px] font-medium leading-none">Draft</span>
                                            </button>
                                        </>
                                    )}
                                    {stage === 'draft' && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onAction(item.id, 'edit'); }}
                                            className="flex flex-col items-center gap-1 p-2 hover:bg-blue-50 text-gray-400 hover:text-blue-700 rounded-lg transition-colors group/btn min-w-[50px]"
                                        >
                                            <FileText size={14} className="group-hover/btn:scale-110 transition-transform mb-0.5" />
                                            <span className="text-[10px] font-medium leading-none">Open</span>
                                        </button>
                                    )}
                                </div>

                                <div className="flex gap-1 items-center">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onAction(item.id, 'archive'); }}
                                        className="p-1.5 hover:bg-gray-100 text-gray-300 hover:text-gray-500 rounded-md transition-colors"
                                        title="Archive"
                                    >
                                        <Archive size={14} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onAction(item.id, 'delete'); }}
                                        className="p-1.5 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-md transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export interface CommandCenterProps {
    onEdit?: (id: string) => void;
    onDraftCreated?: () => void;
    onNewDraft?: () => void; // New prop to trigger modal
}

export function CommandCenter({ onEdit, onDraftCreated, onNewDraft }: CommandCenterProps) {
    const [items, setItems] = useState<ContentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [developingItem, setDevelopingItem] = useState<ContentItem | null>(null);
    const [activeStage, setActiveStage] = useState<Stage>('idea');
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/content');
            const data = await res.json();
            setItems(data.items || []);
        } catch (err) {
            console.error('Failed to fetch content items:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSuggest = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/directions', { method: 'POST' });
            const data = await res.json();
            if (data.success && data.persisted) {
                // Refresh items to show new suggestions
                await fetchItems();
            } else if (data.ideas && !data.persisted) {
                // If not persisted, we might need to manually add them to state?
                // But for now assume persistence works.
                console.warn("Ideas generated but not persisted?", data);
            }
        } catch (err) {
            console.error("Suggestion failed:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id: string, action: string) => {
        try {
            if (action === 'delete') {
                await fetch(`/api/content?id=${id}`, { method: 'DELETE' });
                setItems(prev => prev.filter(i => i.id !== id));
            } else if (action === 'archive') {
                await fetch('/api/content', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, status: 'archived' }),
                });
                setItems(prev => prev.filter(i => i.id !== id));
            } else if (action === 'start_draft') {
                await fetch('/api/content', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, stage: 'draft' }),
                });
                setItems(prev => prev.map(i => i.id === id ? { ...i, stage: 'draft' } : i));
            } else if (action === 'develop') {
                const item = items.find(i => i.id === id);
                if (item) setDevelopingItem(item);
            } else if (action === 'edit') {
                if (onEdit) onEdit(id);
            }
        } catch (err) {
            console.error('Action failed:', err);
        }
    };

    const handleWizardComplete = async (draftContent: string) => {
        if (!developingItem) return;

        // 1. Update Content Item (Pipeline Status)
        await fetch('/api/content', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: developingItem.id,
                stage: 'draft',
                draft_content: draftContent,
            }),
        });

        // 2. Create Real Draft (Bridge to Editor)
        // We create a synchronized record in the 'drafts' table for the Editor to use.
        try {
            const draftRes = await fetch('/api/drafts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: developingItem.id, // FORCE SYNC: Use same ID as Pipeline Item
                    beliefText: developingItem.angle || developingItem.hook,
                    content: draftContent,
                }),
            });
            const draftData = await draftRes.json();

            if (draftData.draft) {
                // Notify parent to refresh drafts list
                if (onDraftCreated) onDraftCreated();

                // Open the NEW draft ID in the editor
                if (onEdit) onEdit(draftData.draft.id);
            }

        } catch (e) {
            console.error("Failed to sync to drafts table:", e);
            // Fallback to old behavior (might result in blank screen if not synced)
            if (onEdit) onEdit(developingItem.id);
        }

        setItems(prev => prev.map(i =>
            i.id === developingItem.id
                ? { ...i, stage: 'draft', draft_content: draftContent }
                : i
        ));

        setDevelopingItem(null);
    };

    const ideas = items.filter(i => i.stage === 'idea');
    const developing = items.filter(i => i.stage === 'developing');
    const drafts = items.filter(i => i.stage === 'draft');
    const published = items.filter(i => i.stage === 'published');

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4">
                <div>
                    <h1 className="text-2xl font-serif text-gray-900">Command Center</h1>
                    <p className="text-sm text-gray-500">Your content pipeline at a glance</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleSuggest}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                    >
                        <Wand2 size={16} />
                        Suggest Ideas
                    </button>
                    <button
                        onClick={onNewDraft}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={16} />
                        New Draft
                    </button>
                </div>
            </div>

            {/* Pipeline - Responsive Grid */}
            {/* Pipeline - Responsive Grid */}
            <div className="flex-1 overflow-x-auto p-4 md:p-6 pt-2 pb-24 md:pb-6">
                {/* Mobile Tabs */}
                {isMobile && (
                    <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-none">
                        {(['idea', 'developing', 'draft', 'published'] as Stage[]).map(stage => (
                            <button
                                key={stage}
                                onClick={() => setActiveStage(stage)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeStage === stage
                                    ? 'bg-[var(--foreground)] text-white'
                                    : 'bg-white border border-gray-200 text-gray-600'
                                    }`}
                            >
                                {stage === 'idea' ? 'Ideas' :
                                    stage === 'developing' ? 'In Development' :
                                        stage === 'draft' ? 'Drafts' : 'Published'}
                            </button>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-h-full">
                    {(!isMobile || activeStage === 'idea') && (
                        <Column
                            title="Ideas"
                            icon={<Lightbulb size={16} className="text-purple-600" />}
                            items={ideas}
                            stage="idea"
                            color="bg-purple-100"
                            onAction={handleAction}
                            loading={loading}
                        />
                    )}
                    {(!isMobile || activeStage === 'developing') && (
                        <Column
                            title="In Development"
                            icon={<Settings size={16} className="text-amber-600" />}
                            items={developing}
                            stage="developing"
                            color="bg-amber-100"
                            onAction={handleAction}
                            loading={loading}
                        />
                    )}
                    {(!isMobile || activeStage === 'draft') && (
                        <Column
                            title="Drafts"
                            icon={<FileText size={16} className="text-blue-600" />}
                            items={drafts}
                            stage="draft"
                            color="bg-blue-100"
                            onAction={handleAction}
                            loading={loading}
                        />
                    )}
                    {(!isMobile || activeStage === 'published') && (
                        <Column
                            title="Published"
                            icon={<CheckCircle size={16} className="text-green-600" />}
                            items={published}
                            stage="published"
                            color="bg-green-100"
                            onAction={handleAction}
                            loading={loading}
                        />
                    )}
                </div>
            </div>

            {/* Development Wizard Modal */}
            {
                developingItem && (
                    <DevelopmentWizard
                        item={developingItem}
                        onClose={() => setDevelopingItem(null)}
                        onComplete={handleWizardComplete}
                    />
                )
            }
        </div >
    );
}
