
import { useState, useEffect } from "react";
import { CheckCircle, FileText, Lightbulb, Settings, User } from "lucide-react";
import { DevelopmentWizard } from "./DevelopmentWizard";
import { NewDraftModal } from "./NewDraftModal";
import { LimitModal } from "../modal/LimitModal";
import { ProfileSetupModal } from "../modal/ProfileSetupModal";
import { BrainMetadata } from "@/types";
import { ContentItem, Stage } from "./board/types";
import { PipelineHeader } from "./board/PipelineHeader";
import { StatusColumn } from "./board/StatusColumn";

export interface CommandCenterProps {
    onEdit?: (id: string) => void;
    onDraftCreated?: () => Promise<void> | void;
    onNewDraft?: () => void;
    autoOpenItemId?: string; // ID of item to auto-open in wizard
    onAutoOpenHandled?: () => void; // Callback after auto-open is processed
}

export function CommandCenter({ onEdit, onDraftCreated, autoOpenItemId, onAutoOpenHandled }: CommandCenterProps) {
    const [items, setItems] = useState<ContentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [developingItem, setDevelopingItem] = useState<ContentItem | null>(null);
    const [activeStage, setActiveStage] = useState<Stage>('idea');
    const [isMobile, setIsMobile] = useState(false);
    const [isNewDraftModalOpen, setIsNewDraftModalOpen] = useState(false);

    // Profile State
    const [showProfileBanner, setShowProfileBanner] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    // Limit State
    const [limitModalOpen, setLimitModalOpen] = useState(false);
    const [limitState, setLimitState] = useState({ tier: 'free', usage: 0, limit: 0 });

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        fetchItems();
        checkProfile();
    }, []);

    // Auto-open wizard if autoOpenItemId is provided
    useEffect(() => {
        if (autoOpenItemId && items.length > 0 && !loading && !developingItem) {
            const itemToOpen = items.find(i => i.id === autoOpenItemId);
            if (itemToOpen) {
                console.log('[CommandCenter] Auto-opening wizard for:', itemToOpen.hook);
                setDevelopingItem(itemToOpen);
                setActiveStage('developing'); // Switch to developing tab
                if (onAutoOpenHandled) onAutoOpenHandled();
            }
        }
    }, [autoOpenItemId, items, loading, developingItem, onAutoOpenHandled]);

    const checkProfile = async () => {
        try {
            const res = await fetch('/api/user/status');
            const data = await res.json();
            // If any field is missing, show banner
            if (data.profile && (!data.profile.role || !data.profile.context || !data.profile.voice_tone)) {
                setShowProfileBanner(true);
            }
        } catch (e) {
            console.error("Failed to check profile", e);
        }
    };

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
                await fetchItems();
            } else if (data.ideas && !data.persisted) {
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
                // Check Limit before promoting to draft
                try {
                    const res = await fetch('/api/user/status');
                    const data = await res.json();
                    if (data.usage && !data.usage.is_allowed) {
                        setLimitState({
                            tier: data.usage.tier,
                            usage: data.usage.count,
                            limit: data.usage.limit
                        });
                        setLimitModalOpen(true);
                        return;
                    }
                } catch (e) {
                    console.error("Failed to check limit", e);
                }

                console.log("Start Draft clicked");
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

        try {
            // 1. Update Content Item (Pipeline Status) & Save Initial Draft for Voice Learning
            const updatedMetadata = {
                ...(developingItem.brain_metadata || {}),
                initial_draft: draftContent
            };

            const res = await fetch('/api/content', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: developingItem.id,
                    stage: 'draft',
                    draft_content: draftContent,
                    brain_metadata: updatedMetadata
                }),
            });

            if (res.status === 403) {
                const data = await res.json();
                if (data.error === 'Limit Reached') {
                    setLimitState({
                        tier: data.tier,
                        usage: data.message.includes('used') ? parseInt(data.message.match(/used (\d+)/)?.[1] || '0') : 0,
                        limit: 2
                    });
                    const statusRes = await fetch('/api/user/status');
                    const statusData = await statusRes.json();
                    if (statusData.usage) {
                        setLimitState({
                            tier: statusData.usage.tier,
                            usage: statusData.usage.count,
                            limit: statusData.usage.limit
                        });
                        setLimitModalOpen(true);
                    } else {
                        alert(data.message);
                    }
                    return;
                }
            }

            // 2. Create Real Draft (Bridge to Editor)
            const draftRes = await fetch('/api/drafts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: developingItem.id,
                    beliefText: developingItem.angle || developingItem.hook,
                    content: draftContent,
                }),
            });
            const draftData = await draftRes.json();

            if (draftData.draft) {
                // Trigger Knowledge Extraction
                try {
                    fetch('/api/knowledge/extract', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            text: draftContent,
                            contentId: draftData.draft.id
                        })
                    });
                } catch { }

                if (onDraftCreated) await onDraftCreated();
                if (onEdit) onEdit(draftData.draft.id);
            }

            setItems(prev => prev.map(i =>
                i.id === developingItem.id
                    ? { ...i, stage: 'draft', draft_content: draftContent }
                    : i
            ));

            setDevelopingItem(null);

        } catch (e) {
            console.error("Failed to sync/update:", e);
        }
    };

    const handleNewDraftStart = async (topic: string, metadata: BrainMetadata) => {
        try {
            const res = await fetch('/api/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hook: topic,
                    stage: 'developing',
                    brain_metadata: metadata,
                    dev_step: null
                }),
            });

            if (res.ok) {
                await fetchItems();
            } else {
                const data = await res.json();
                if (data.error === 'Limit Reached') {
                    setLimitModalOpen(true);
                } else {
                    alert(`Error: ${data.error}`);
                }
            }
        } catch (error) {
            console.error("Failed to create new draft:", error);
        }
    };

    const handleNewDraftClick = async () => {
        try {
            const res = await fetch('/api/user/status');
            const data = await res.json();
            if (data.usage && !data.usage.is_allowed) {
                setLimitState({
                    tier: data.usage.tier,
                    usage: data.usage.count,
                    limit: data.usage.limit
                });
                setLimitModalOpen(true);
                return;
            }
        } catch (e) {
            console.error("Failed to check limit", e);
        }
        setIsNewDraftModalOpen(true);
    };

    const ideas = items.filter(i => i.stage === 'idea');
    const developing = items.filter(i => i.stage === 'developing');
    const drafts = items.filter(i => i.stage === 'draft');
    const published = items.filter(i => i.stage === 'published');

    return (
        <div className="h-full flex flex-col">
            <PipelineHeader
                loading={loading}
                onSuggest={handleSuggest}
                onNewDraft={handleNewDraftClick}
            />

            {showProfileBanner && (
                <div className="mx-6 mb-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                            <User size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-indigo-900">Your profile is incomplete.</h3>
                            <p className="text-xs text-indigo-700">Set your Role & Voice to help the Brain write better drafts.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowProfileBanner(false)}
                            className="text-xs font-bold text-indigo-400 hover:text-indigo-600 px-3 py-2"
                        >
                            Dismiss
                        </button>
                        <button
                            onClick={() => setIsProfileModalOpen(true)}
                            className="text-xs font-bold bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            Complete Setup
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-x-auto p-4 md:p-6 pt-2 pb-24 md:pb-6">
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
                        <StatusColumn
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
                        <StatusColumn
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
                        <StatusColumn
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
                        <StatusColumn
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

            {developingItem && (
                <DevelopmentWizard
                    item={developingItem}
                    onClose={() => {
                        setDevelopingItem(null);
                        fetchItems(); // PIPELINE FIX: Refresh list to show stage changes
                    }}
                    onComplete={handleWizardComplete}
                />
            )}

            <NewDraftModal
                isOpen={isNewDraftModalOpen}
                onClose={() => setIsNewDraftModalOpen(false)}
                onStart={handleNewDraftStart}
            />

            <LimitModal
                isOpen={limitModalOpen}
                onClose={() => setLimitModalOpen(false)}
                tier={limitState.tier}
                usage={limitState.usage}
                limit={limitState.limit}
            />

            <ProfileSetupModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                onComplete={() => {
                    setShowProfileBanner(false);
                    // Could refresh other things if needed
                }}
            />
        </div>
    );
}
