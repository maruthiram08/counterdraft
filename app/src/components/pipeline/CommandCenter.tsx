
import { useState, useEffect } from "react";
import { CheckCircle, FileText, Lightbulb, Settings, User } from "lucide-react";
import { toast } from "sonner";
import { DevelopmentWizard } from "./DevelopmentWizard";
import { NewDraftModal } from "./NewDraftModal";
import { LimitModal } from "../modal/LimitModal";
import { ProfileSetupModal } from "../modal/ProfileSetupModal";
import { BrainMetadata } from "@/types";
import { ContentItem, Stage } from "./board/types";
import { PipelineHeader } from "./board/PipelineHeader";
import { StatusColumn } from "./board/StatusColumn";
import { STAGE_STYLES } from "./board/stageStyles";

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

    // Resolves true once the draft is saved and the wizard is closing, false if it was not saved
    const handleWizardComplete = async (draftContent: string): Promise<boolean> => {
        if (!developingItem) return false;

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
                    brain_metadata: updatedMetadata,
                    dev_step: null
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
                    return false;
                }
            }

            if (!res.ok) throw new Error(`Saving the draft failed (${res.status})`);

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
            if (!draftRes.ok) throw new Error(`Creating the draft failed (${draftRes.status})`);
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
            toast.success("Draft saved. Opening it in the editor.");
            return true;

        } catch (e) {
            console.error("Failed to sync/update:", e);
            toast.error("Couldn't save your draft. Check your connection and try again.");
            return false;
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
        <div className="h-full overflow-y-auto bg-canvas">
            <div className="max-w-[1440px] mx-auto px-4 md:px-10 pt-4 md:pt-6 pb-28 md:pb-12 flex flex-col gap-5">
                <PipelineHeader
                    loading={loading}
                    counts={{ idea: ideas.length, developing: developing.length, draft: drafts.length, published: published.length }}
                    onSuggest={handleSuggest}
                    onNewDraft={handleNewDraftClick}
                />

                {showProfileBanner && (
                    <div className="p-4 pl-5 bg-ember-50 rounded-tile shadow-raised flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-ember-500 rounded-full flex items-center justify-center text-white shrink-0">
                                <User size={16} />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-ink">Your profile is incomplete.</h3>
                                <p className="text-sm text-ink-soft">Set your Role & Voice to help the Brain write better drafts.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowProfileBanner(false)}
                                className="text-sm font-medium text-ink-soft hover:text-ink h-10 px-4 rounded-full"
                            >
                                Dismiss
                            </button>
                            <button
                                onClick={() => setIsProfileModalOpen(true)}
                                className="text-sm font-medium bg-ink text-white h-10 px-5 rounded-full hover:bg-ink/90 transition-colors"
                            >
                                Complete setup
                            </button>
                        </div>
                    </div>
                )}
                <div>
                    {isMobile && (
                        <div className="flex items-center gap-3 mb-5 overflow-x-auto p-2 -m-2 scrollbar-none">
                            {(['idea', 'developing', 'draft', 'published'] as Stage[]).map(stage => (
                                <button
                                    key={stage}
                                    onClick={() => setActiveStage(stage)}
                                    className={`h-10 px-5 rounded-full text-sm font-medium whitespace-nowrap transition-all bg-canvas ${activeStage === stage
                                        ? 'shadow-pressed text-ember-600'
                                        : 'shadow-raised text-ink-soft hover:text-ink'
                                        }`}
                                >
                                    {STAGE_STYLES[stage].label}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
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
