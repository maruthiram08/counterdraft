
import { Bold, Italic, Underline, AlignLeft, AlignCenter, Copy, Target, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { StrategyFeedbackPanel } from "../StrategyFeedbackPanel";
import { BrainMetadata } from "@/types";
import { ResearchPoint, DeepDiveData } from "./types";

interface DraftStepProps {
    draftContent: string;
    loading: boolean;
    showContextPanel: boolean;
    verifyingStrategy: boolean;
    fixingStrategy: boolean;
    strategyAnalysis: { analysis: string; score: number; suggestions: string[] } | null;
    brainMetadata: BrainMetadata | undefined;
    outline: ResearchPoint[];
    deepDive: DeepDiveData | null;
    onUpdateDraft: (content: string) => void;
    onToggleContextPanel: () => void;
    onVerifyStrategy: () => void;
    onAutoFix: (instruction: string) => void;
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
    onUpdateDraft,
    onToggleContextPanel,
    onVerifyStrategy,
    onAutoFix
}: DraftStepProps) {

    // Helper to check if context exists
    const hasStrategy = !!(brainMetadata && (brainMetadata.outcome || brainMetadata.audience?.role));
    const hasOutline = outline.length > 0;
    const hasResearch = !!(deepDive && deepDive.research.length > 0);
    const hasContext = hasStrategy || hasOutline || hasResearch;

    if (loading) {
        return (
            <div className="flex flex-col items-center py-12 text-gray-400">
                <Loader2 size={32} className="animate-spin mb-4" />
                <p>Writing your draft...</p>
            </div>
        );
    }

    if (!draftContent) {
        return <div className="flex items-center justify-center h-full text-gray-400">Ready to draft.</div>;
    }

    return (
        <div className="flex-1 flex flex-col min-h-[600px] h-full">
            <div className="flex flex-1 gap-6">
                {/* Editor Pane (Left) */}
                <div className={`flex-1 flex flex-col transition-all duration-300 ${showContextPanel ? 'md:mr-0' : 'mx-auto max-w-3xl'}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium text-gray-900">Draft Content</h3>
                        <div className="flex gap-2">
                            {hasContext && (
                                <button
                                    onClick={onToggleContextPanel}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${showContextPanel
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    {showContextPanel ? 'Hide Context' : 'Show Context'}
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                        {/* Mock Toolbar */}
                        <div className="flex items-center gap-1 p-2 border-b border-gray-100 bg-gray-50/50">
                            <div className="flex gap-0.5">
                                <button className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded"><Bold size={14} /></button>
                                <button className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded"><Italic size={14} /></button>
                                <button className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded"><Underline size={14} /></button>
                            </div>
                            <div className="w-px h-4 bg-gray-200 mx-1" />
                            <div className="flex gap-0.5">
                                <button className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded"><AlignLeft size={14} /></button>
                                <button className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded"><AlignCenter size={14} /></button>
                            </div>
                            <div className="w-px h-4 bg-gray-200 mx-1" />
                            <button
                                onClick={onVerifyStrategy}
                                disabled={verifyingStrategy}
                                className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-[var(--accent)] bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded transition-colors"
                            >
                                {verifyingStrategy ? <Loader2 size={12} className="animate-spin" /> : <Target size={12} />}
                                Check Strategy
                            </button>
                            <div className="flex-1" />
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(draftContent);
                                    toast.success('Copied to clipboard');
                                }}
                                className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded"
                            >
                                <Copy size={12} /> Copy
                            </button>
                        </div>
                        <div className="flex-1 relative">
                            <textarea
                                value={draftContent}
                                onChange={(e) => onUpdateDraft(e.target.value)}
                                className="absolute inset-0 w-full h-full resize-none outline-none font-serif text-lg leading-relaxed text-gray-800 placeholder-gray-300 p-8"
                                placeholder="Start writing..."
                            />
                        </div>
                    </div>
                </div>

                {/* Context Pane (Right) */}
                {showContextPanel && hasContext && (
                    <div className="w-80 shrink-0 hidden md:flex flex-col border-l border-gray-100 pl-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="flex flex-col h-full bg-white/50 rounded-xl border border-gray-200/50 backdrop-blur-sm overflow-hidden">
                            <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Strategic Context</h4>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                                {/* Strategy */}
                                {hasStrategy && (
                                    <div className="space-y-2">
                                        <h5 className="text-sm font-medium text-gray-900 border-b border-gray-100 pb-1">Strategic Coach</h5>
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
                                            <div className="text-xs text-gray-600 bg-blue-50/50 p-3 rounded-lg border border-blue-100 space-y-2 mt-2">
                                                {brainMetadata?.audience?.role && (
                                                    <p><span className="font-semibold text-blue-800">Audience:</span> {brainMetadata.audience.role}</p>
                                                )}
                                                {brainMetadata?.outcome && (
                                                    <p><span className="font-semibold text-blue-800">Goal:</span> {brainMetadata.outcome}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Outline */}
                                {hasOutline && (
                                    <div className="space-y-2">
                                        <h5 className="text-sm font-medium text-gray-900 border-b border-gray-100 pb-1">Outline</h5>
                                        <ul className="space-y-2">
                                            {outline.map((sect, i) => (
                                                <li key={i} className="text-xs text-gray-600 pl-3 border-l-2 border-gray-200">
                                                    {sect.text}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Key Stats/Research */}
                                {hasResearch && (
                                    <div className="space-y-2">
                                        <h5 className="text-sm font-medium text-gray-900 border-b border-gray-100 pb-1">Key Findings</h5>
                                        <ul className="space-y-2">
                                            {deepDive?.research.slice(0, 5).map((r, i) => (
                                                <li key={i} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
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
