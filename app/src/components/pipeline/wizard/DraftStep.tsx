
import { useMemo, useRef, useState } from "react";
import { Bold, Italic, Underline, AlignLeft, AlignCenter, Copy, Target, Loader2, Wand2, Eye } from "lucide-react";
import { toast } from "sonner";
import { StrategyFeedbackPanel } from "../StrategyFeedbackPanel";
import { BrainMetadata } from "@/types";
import { hasStrategy, StrategyAnalysis } from "@/lib/brain/strategy";
import { ResearchPoint, DeepDiveData } from "./types";
import { StrategyChangedBanner } from "./StrategyChangedBanner";
import { HookLab } from "@/components/editor/HookLab";
import { LinkedInPreview } from "@/components/editor/LinkedInPreview";
import { PlaceholderNotice } from "@/components/editor/PlaceholderNotice";
import { findPlaceholders, markPlaceholders, Placeholder } from "@/lib/editor/placeholders";

interface DraftStepProps {
    draftContent: string;
    loading: boolean;
    showContextPanel: boolean;
    verifyingStrategy: boolean;
    fixingStrategy: boolean;
    strategyAnalysis: StrategyAnalysis | null;
    brainMetadata: BrainMetadata | undefined;
    outline: ResearchPoint[];
    deepDive: DeepDiveData | null;
    readOnly?: boolean;
    onUpdateDraft: (content: string) => void;
    onToggleContextPanel: () => void;
    onVerifyStrategy: () => void;
    onAutoFix: (instruction: string) => void;
    strategyChanged?: boolean;
    onRebuild: () => void;
}

export function DraftStep({
    draftContent,
    loading,
    showContextPanel,
    verifyingStrategy,
    fixingStrategy,
    strategyAnalysis,
    brainMetadata,
    outline,
    deepDive,
    readOnly,
    onUpdateDraft,
    onToggleContextPanel,
    onVerifyStrategy,
    onAutoFix,
    strategyChanged,
    onRebuild
}: DraftStepProps) {
    const [showOpenings, setShowOpenings] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    const placeholders = useMemo(() => findPlaceholders(draftContent), [draftContent]);

    // Scroll the draft to a placeholder and select it, so typing replaces it
    const jumpTo = (p: Placeholder) => {
        const area = textareaRef.current;
        if (!area) return;
        const mark = backdropRef.current?.querySelector<HTMLElement>(`[data-placeholder="${p.index}"]`);
        if (mark) area.scrollTop = Math.max(0, mark.offsetTop - area.clientHeight / 3);
        area.focus({ preventScroll: true });
        area.setSelectionRange(p.start, p.end);
        if (backdropRef.current) backdropRef.current.scrollTop = area.scrollTop;
    };

    // Helper to check if context exists
    const strategySet = hasStrategy(brainMetadata);
    const hasOutline = outline.length > 0;
    const hasResearch = !!(deepDive && deepDive.research.length > 0);
    const hasContext = strategySet || hasOutline || hasResearch;

    if (loading) {
        return (
            <div className="flex flex-col items-center py-12 text-ink-muted">
                <Loader2 size={32} className="animate-spin mb-4 text-ember-500" />
                <p>Writing your draft...</p>
            </div>
        );
    }

    if (!draftContent) {
        return <div className="flex items-center justify-center h-full text-ink-muted">Ready to draft.</div>;
    }

    return (
        <div className="flex-1 flex flex-col min-h-[600px] h-full">
            {strategyChanged && !readOnly && (
                <div className="mb-4">
                    <StrategyChangedBanner
                        message="Your strategy has changed since this draft was written. A new strategy starts from a new outline; this draft stays until you write the next one."
                        action="Rebuild outline"
                        onClick={onRebuild}
                    />
                </div>
            )}
            <div className="flex flex-1 gap-6">
                {/* Editor Pane (Left) */}
                <div className={`flex-1 flex flex-col transition-all duration-300 ${showContextPanel ? 'md:mr-0' : 'w-full'}`}>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-medium tracking-[-0.01em] text-ink">Draft</h3>
                        <div className="flex gap-2">
                            {hasContext && (
                                <button
                                    onClick={onToggleContextPanel}
                                    className={`flex items-center gap-1.5 h-9 px-4 rounded-full bg-canvas text-sm font-medium transition-all ${showContextPanel
                                        ? 'shadow-pressed text-ember-600'
                                        : 'shadow-raised text-ink-soft hover:text-ember-600 active:shadow-pressed'
                                        }`}
                                >
                                    {showContextPanel ? 'Hide Context' : 'Show Context'}
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex-1 bg-surface rounded-card shadow-card flex flex-col overflow-hidden">
                        {/* Mock Toolbar */}
                        <div className="flex items-center gap-1 px-4 py-3 border-b border-line bg-surface">
                            <div className="flex gap-0.5">
                                <button className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted hover:text-ink active:shadow-pressed transition-all"><Bold size={14} /></button>
                                <button className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted hover:text-ink active:shadow-pressed transition-all"><Italic size={14} /></button>
                                <button className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted hover:text-ink active:shadow-pressed transition-all"><Underline size={14} /></button>
                            </div>
                            <div className="w-px h-4 bg-line mx-1" />
                            <div className="flex gap-0.5">
                                <button className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted hover:text-ink active:shadow-pressed transition-all"><AlignLeft size={14} /></button>
                                <button className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted hover:text-ink active:shadow-pressed transition-all"><AlignCenter size={14} /></button>
                            </div>
                            <div className="w-px h-4 bg-line mx-1" />
                            <button
                                onClick={() => onVerifyStrategy()}
                                disabled={verifyingStrategy}
                                className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-ember-100 text-ember-700 text-xs font-medium hover:bg-ember-200 active:shadow-pressed transition-all disabled:opacity-50"
                            >
                                {verifyingStrategy ? <Loader2 size={12} className="animate-spin" /> : <Target size={12} />}
                                Check Strategy
                            </button>
                            <button
                                onClick={() => setShowOpenings(v => !v)}
                                aria-pressed={showOpenings}
                                className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition-all ${showOpenings ? 'shadow-pressed text-ember-600' : 'text-ink-muted hover:text-ink active:shadow-pressed'}`}
                            >
                                <Wand2 size={12} /> Openings
                            </button>
                            <button
                                onClick={() => setShowPreview(v => !v)}
                                aria-pressed={showPreview}
                                className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition-all ${showPreview ? 'shadow-pressed text-ember-600' : 'text-ink-muted hover:text-ink active:shadow-pressed'}`}
                            >
                                <Eye size={12} /> LinkedIn preview
                            </button>
                            <div className="flex-1" />
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(draftContent);
                                    toast.success('Copied to clipboard');
                                }}
                                className="flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium text-ink-muted hover:text-ink active:shadow-pressed transition-all"
                            >
                                <Copy size={12} /> Copy
                            </button>
                        </div>
                        {showOpenings && (
                            <div className="px-4 py-4 md:px-6 border-b border-line">
                                <HookLab content={draftContent} brainMetadata={brainMetadata} onApply={onUpdateDraft} disabled={readOnly} />
                            </div>
                        )}
                        {showPreview && (
                            <div className="px-4 py-5 md:px-6 border-b border-line bg-canvas">
                                <LinkedInPreview content={draftContent} />
                            </div>
                        )}
                        {placeholders.length > 0 && !readOnly && (
                            <div className="px-4 pt-4 md:px-6">
                                <PlaceholderNotice placeholders={placeholders} onJump={jumpTo} />
                            </div>
                        )}
                        <div className="flex-1 relative min-h-[320px] bg-surface">
                            {/* Highlight backdrop: same box and type as the textarea, so the marks sit under the placeholders */}
                            <div
                                ref={backdropRef}
                                aria-hidden="true"
                                className="absolute inset-0 overflow-y-scroll pointer-events-none whitespace-pre-wrap break-words text-lg leading-relaxed text-transparent p-6 md:px-12 md:py-8"
                                dangerouslySetInnerHTML={{ __html: markPlaceholders(draftContent) }}
                            />
                            <textarea
                                ref={textareaRef}
                                value={draftContent}
                                readOnly={readOnly}
                                onChange={(e) => onUpdateDraft(e.target.value)}
                                onScroll={(e) => { if (backdropRef.current) backdropRef.current.scrollTop = e.currentTarget.scrollTop; }}
                                className="absolute inset-0 w-full h-full resize-none outline-none overflow-y-scroll bg-transparent text-lg leading-relaxed text-ink placeholder:text-ink-muted p-6 md:px-12 md:py-8"
                                placeholder="Start writing..."
                            />
                        </div>
                    </div>
                </div>

                {/* Context Pane (Right) */}
                {showContextPanel && hasContext && (
                    <div className="w-80 shrink-0 hidden md:flex flex-col animate-in slide-in-from-right-4 duration-300">
                        <div className="flex flex-col h-full bg-surface rounded-card shadow-card overflow-hidden">
                            <div className="px-5 pt-5 pb-3">
                                <h4 className="text-sm text-ink-muted">Strategic Context</h4>
                            </div>
                            <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-6">

                                {/* Strategy */}
                                {strategySet && (
                                    <div className="space-y-2">
                                        <h5 className="text-[17px] font-medium tracking-[-0.01em] text-ink pb-1">Strategic Coach</h5>
                                        {/* Dynamic Analysis Panel */}
                                        <StrategyFeedbackPanel
                                            analysis={strategyAnalysis}
                                            loading={verifyingStrategy}
                                            isFixing={fixingStrategy}
                                            onVerify={onVerifyStrategy}
                                            onAutoFix={onAutoFix}
                                        />

                                        {/* Fallback Static Info (only if no analysis yet) */}
                                        {!strategyAnalysis && !verifyingStrategy && (
                                            <div className="text-xs text-ink-soft bg-dusk-100 p-4 rounded-tile space-y-2 mt-2">
                                                {brainMetadata?.audience?.role && (
                                                    <p><span className="font-medium text-dusk-700">Audience:</span> {brainMetadata.audience.role}</p>
                                                )}
                                                {brainMetadata?.outcome && (
                                                    <p><span className="font-medium text-dusk-700">Goal:</span> {brainMetadata.outcome}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Outline */}
                                {hasOutline && (
                                    <div className="space-y-2">
                                        <h5 className="text-[17px] font-medium tracking-[-0.01em] text-ink pb-1">Outline</h5>
                                        <ul className="space-y-2">
                                            {outline.map((sect, i) => (
                                                <li key={i} className="text-xs text-ink-soft pl-3 border-l-2 border-ember-200">
                                                    {sect.text}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Key Stats/Research */}
                                {hasResearch && (
                                    <div className="space-y-2">
                                        <h5 className="text-[17px] font-medium tracking-[-0.01em] text-ink pb-1">Key Findings</h5>
                                        <ul className="space-y-2">
                                            {deepDive?.research.slice(0, 5).map((r, i) => (
                                                <li key={i} className="text-xs text-ink-soft bg-canvas shadow-well p-3 rounded-2xl">
                                                    {r.text}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
