import { Edit2, Eye, Check, Save, Image as ImageIcon } from "lucide-react";
import { AnimatedIcon } from "@/components/icons/AnimatedIcon";
import { BrainIcon, CopyIcon, RefreshCWIcon, SendIcon, ShieldCheckIcon } from "@/components/icons/animated";
import type { Draft } from "@/types";

interface EditorHeaderProps {
    draft: Draft;
    saving: boolean;
    saved: boolean;
    extracting: boolean;
    isPreview: boolean;
    setIsPreview: (v: boolean) => void;
    handleCopy: () => void;
    handleSave: () => void;
    setShowRepurposeModal: (v: boolean) => void;
    handleFinalize: () => void;
    learning: boolean;
    setShowFactCheck: (v: boolean) => void;
    handleDownloadDesign: () => void;
    setShowPublishModal: (v: boolean) => void;
    copied: boolean;
}

export function EditorHeader({
    draft,
    saving,
    saved,
    extracting,
    isPreview,
    setIsPreview,
    handleCopy,
    handleSave,
    setShowRepurposeModal,
    handleFinalize,
    learning,
    setShowFactCheck,
    handleDownloadDesign,
    setShowPublishModal,
    copied
}: EditorHeaderProps) {
    return (
        // Touch screens can't hover, so there the controls always show. Phones don't pin them: two rows would cover the text
        <div className="relative md:sticky md:top-4 flex flex-row flex-wrap items-center justify-end gap-2 md:gap-3 z-20 pointer-events-none mb-4">
            {/* View Mode Switcher */}
            <div className="flex items-center p-1 bg-canvas shadow-well rounded-full pointer-events-auto transition-opacity duration-300 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
                <button
                    onClick={() => setIsPreview(false)}
                    className={`flex items-center gap-1.5 h-9 md:h-8 px-3.5 text-xs font-medium rounded-full transition-all ${!isPreview
                        ? 'bg-surface shadow-raised text-ink'
                        : 'text-ink-muted hover:text-ink'
                        }`}
                >
                    <Edit2 size={12} />
                    <span>Edit</span>
                </button>
                <button
                    onClick={() => setIsPreview(true)}
                    className={`flex items-center gap-1.5 h-9 md:h-8 px-3.5 text-xs font-medium rounded-full transition-all ${isPreview
                        ? 'bg-surface shadow-raised text-ink'
                        : 'text-ink-muted hover:text-ink'
                        }`}
                >
                    <Eye size={12} />
                    <span>Preview</span>
                </button>
            </div>

            {/* Actions Bar + Status */}
            <div className="flex items-center gap-1 bg-surface shadow-card rounded-full pl-3 pr-1.5 py-1.5 pointer-events-auto transition-opacity duration-300 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
                <div className="flex items-center gap-1.5 mr-1 pl-1 pr-2 sm:pr-3 border-r border-line select-none" title={saving ? "Saving" : extracting ? "Analyzing" : saved ? "Saved" : draft.status === 'published' ? "Published" : "Draft"}>
                    <div className={`w-1.5 h-1.5 rounded-full ${saving ? 'bg-sand-500 animate-pulse' : extracting ? 'bg-dusk-500 animate-pulse' : saved ? 'bg-sage-500' : draft.status === 'published' ? 'bg-ink' : 'bg-ink-muted/50'}`}></div>
                    {/* Phones keep just the dot, so every action fits on one row */}
                    <span className="hidden sm:inline text-xs font-medium text-ink-muted">
                        {saving ? "Saving" : extracting ? "Analyzing" : saved ? "Saved" : draft.status === 'published' ? "Published" : "Draft"}
                    </span>
                </div>

                <button
                    onClick={handleCopy}
                    title="Copy to Clipboard"
                    className="w-9 h-9 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all active:shadow-pressed text-ink-muted hover:text-ink"
                >
                    {copied ? <Check size={14} className="text-sage-700" /> : <AnimatedIcon icon={CopyIcon} size={14} />}
                </button>

                {draft.status !== 'published' && (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        title="Save Draft (Cmd+S)"
                        className="w-9 h-9 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all active:shadow-pressed text-ink-muted hover:text-ember-600"
                    >
                        <Save size={14} />
                    </button>
                )}

                <div className="hidden sm:block w-px h-4 bg-line mx-1"></div>

                <button
                    onClick={() => setShowRepurposeModal(true)}
                    title="Repurpose / Rewrite"
                    className="w-9 h-9 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all active:shadow-pressed text-ember-500 hover:text-ember-600"
                >
                    <AnimatedIcon icon={RefreshCWIcon} size={14} />
                </button>

                <div className="hidden sm:block w-px h-4 bg-line mx-1"></div>

                {draft.status !== 'published' && (
                    <button
                        onClick={handleFinalize}
                        disabled={learning}
                        title="Finalize & Learn (Updates Voice)"
                        className="h-9 md:h-8 px-3 rounded-full bg-ember-100 text-ember-700 hover:bg-ember-200 active:shadow-pressed transition-all flex items-center gap-1.5"
                    >
                        <AnimatedIcon icon={BrainIcon} size={14} />
                        <span className="hidden sm:inline text-xs font-medium">Finalize</span>
                    </button>
                )}

                <button
                    onClick={() => setShowFactCheck(true)}
                    title="Verify Claims & Plagiarism"
                    className="w-9 h-9 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all active:shadow-pressed text-ink-muted hover:text-ink"
                >
                    <AnimatedIcon icon={ShieldCheckIcon} size={14} />
                </button>

                {draft.platform === 'instagram' && (
                    <button
                        onClick={handleDownloadDesign}
                        title="Download Design (PPTX)"
                        className="w-9 h-9 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all active:shadow-pressed text-ink-muted hover:text-ink"
                    >
                        <ImageIcon size={14} />
                    </button>
                )}

                {draft.status !== 'published' && (
                    <button
                        onClick={() => setShowPublishModal(true)}
                        className="ml-1 h-9 md:h-8 px-4 rounded-full bg-ember-500 hover:bg-ember-600 text-white text-xs font-medium shadow-ember active:shadow-pressed transition-all flex items-center gap-1.5"
                    >
                        <AnimatedIcon icon={SendIcon} size={13} />
                        Publish
                    </button>
                )}
            </div>
        </div>
    );
}
