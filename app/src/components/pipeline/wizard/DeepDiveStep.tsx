
import { DeepDiveData, ResearchPoint } from "./types";
import { ResearchItem } from "../ResearchItem";
import { Download, RefreshCw, Search } from "lucide-react";

interface DeepDiveStepProps {
    deepDive: DeepDiveData | null;
    loading: boolean;
    refiningItems: { type: 'research' | 'insights', index: number }[];
    onRunDeepDive: (mode: 'initial' | 'reset' | 'append') => void;
    strategyChanged?: boolean;
    onExport: () => void;
    onRefinePoint: (type: 'research' | 'insights', index: number, manualNote?: string) => void;
    onUpdateItem: (type: 'research' | 'insights', index: number, updates: Partial<ResearchPoint>) => void;
    onAddNote: (type: 'research' | 'insights', index: number, note: string) => void;
    onDeleteNote: (type: 'research' | 'insights', index: number, noteIndex: number) => void;
    onDelete: (type: 'research' | 'insights', index: number) => void;
}

export function DeepDiveStep({
    deepDive,
    loading,
    refiningItems,
    onRunDeepDive,
    strategyChanged,
    onExport,
    onRefinePoint,
    onUpdateItem,
    onAddNote,
    onDeleteNote,
    onDelete
}: DeepDiveStepProps) {

    if (!deepDive && !loading) {
        return (
            <div className="flex flex-col items-center text-center py-12 gap-3">
                <p className="text-sm text-gray-600 max-w-md">
                    Describe the post in the strategy box above first, if you like. Research will focus on your audience, stance and anything you asked to include.
                </p>
                <button
                    onClick={() => onRunDeepDive('initial')}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                    <Search size={14} /> Start research
                </button>
            </div>
        );
    }

    if (!deepDive) return null; // Should be handled by parent showing loader if loading is true, but for safety

    return (
        <div className="space-y-6">
            {strategyChanged && (
                <div className="flex items-center justify-between gap-3 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-900">
                    <span>Your strategy has changed since this research ran, so it may not reflect it.</span>
                    <button
                        onClick={() => onRunDeepDive('reset')}
                        className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 bg-white border border-amber-200 rounded-md font-medium hover:bg-amber-100 transition-colors"
                    >
                        <RefreshCw size={12} /> Redo research
                    </button>
                </div>
            )}
            <div className="flex justify-between items-center px-2">
                <p className="text-xs text-gray-500 italic">
                    Tip: You can also refresh individual cards below to apply this context granularly.
                </p>
                <div className="flex gap-2">
                    <button
                        onClick={() => onRunDeepDive('reset')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded text-xs transition-colors"
                        title="Clear and restart research"
                    >
                        <RefreshCw size={14} /> Reset
                    </button>
                    <button
                        onClick={onExport}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded text-xs transition-colors"
                    >
                        <Download size={14} /> Export
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        Research Findings
                        <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Facts</span>
                    </h3>
                    <div className="space-y-3">
                        {deepDive.research.map((r, i) => (
                            <ResearchItem
                                key={`res-${i}`}
                                text={r.text}
                                notes={r.notes}
                                isNew={r.isNew}
                                loading={refiningItems.some(item => item.type === 'research' && item.index === i)}
                                onRefine={() => onRefinePoint('research', i)}
                                onUpdate={(txt) => onUpdateItem('research', i, { text: txt })}
                                onAddNote={(note) => onAddNote('research', i, note)}
                                onDeleteNote={(nIdx) => onDeleteNote('research', i, nIdx)}
                                onDelete={() => onDelete('research', i)}
                            />
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        Key Insights
                        <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Angles</span>
                    </h3>
                    <div className="space-y-3">
                        {deepDive.insights.map((r, i) => (
                            <ResearchItem
                                key={`ins-${i}`}
                                text={r.text}
                                notes={r.notes}
                                isNew={r.isNew}
                                loading={refiningItems.some(item => item.type === 'insights' && item.index === i)}
                                onRefine={() => onRefinePoint('insights', i)}
                                onUpdate={(txt) => onUpdateItem('insights', i, { text: txt })}
                                onAddNote={(note) => onAddNote('insights', i, note)}
                                onDeleteNote={(nIdx) => onDeleteNote('insights', i, nIdx)}
                                onDelete={() => onDelete('insights', i)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
