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

function Column({ title, icon, items, stage, color, onAction, loading }: ColumnProps) {
    return (
        <div className="flex-1 min-w-[280px] sm:min-w-[250px] max-w-full sm:max-w-[300px] bg-gray-50 rounded-xl p-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <span className={`p-1.5 rounded-lg ${color}`}>{icon}</span>
                <h3 className="font-medium text-gray-900">{title}</h3>
                <span className="ml-auto text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
                    {items.length}
                </span>
            </div>

            {/* Items */}
            <div className="space-y-2">
                {loading ? (
                    <div className="flex justify-center py-8 text-gray-400">
                        <Loader2 size={20} className="animate-spin" />
                    </div>
                ) : items.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No items</p>
                ) : (
                    items.map(item => (
                        <div key={item.id} className="bg-white p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-all group">
                            <p className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
                                {item.hook || item.draft_content?.slice(0, 80) || 'Untitled'}
                            </p>
                            {item.format && (
                                <span className="text-xs text-gray-400 uppercase tracking-wider">
                                    {item.format}
                                </span>
                            )}
                            {item.dev_step && stage === 'developing' && (
                                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                    {item.dev_step}
                                </span>
                            )}

                            {/* Actions */}
                            <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {stage === 'idea' && (
                                    <>
                                        <button
                                            onClick={() => onAction(item.id, 'develop')}
                                            className="flex items-center gap-1 text-xs px-2 py-1 bg-amber-50 text-amber-600 rounded hover:bg-amber-100"
                                        >
                                            <Wand2 size={12} /> Develop
                                        </button>
                                        <button
                                            onClick={() => onAction(item.id, 'start_draft')}
                                            className="flex items-center gap-1 text-xs px-2 py-1 bg-[var(--accent)]/10 text-[var(--accent)] rounded hover:bg-[var(--accent)]/20"
                                        >
                                            <ArrowRight size={12} /> Quick
                                        </button>
                                        <button
                                            onClick={() => onAction(item.id, 'archive')}
                                            className="p-1 text-gray-400 hover:text-gray-600"
                                        >
                                            <Archive size={14} />
                                        </button>
                                        <button
                                            onClick={() => onAction(item.id, 'delete')}
                                            className="p-1 text-gray-400 hover:text-red-500"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </>
                                )}
                                {stage === 'draft' && (
                                    <>
                                        <button
                                            onClick={() => onAction(item.id, 'edit')}
                                            className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => onAction(item.id, 'archive')}
                                            className="p-1 text-gray-400 hover:text-gray-600"
                                        >
                                            <Archive size={14} />
                                        </button>
                                    </>
                                )}
                                {stage === 'published' && (
                                    <a
                                        href="#"
                                        className="text-xs text-gray-500 hover:text-[var(--accent)]"
                                    >
                                        View on {item.platform || 'LinkedIn'}
                                    </a>
                                )}
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
}

export function CommandCenter({ onEdit, onDraftCreated }: CommandCenterProps) {
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
                    {/* <button className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-dark)] transition-colors">
                        <Plus size={16} />
                        New Idea
                    </button> */}
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
