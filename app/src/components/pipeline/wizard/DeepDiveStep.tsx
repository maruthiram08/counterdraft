
import { DeepDiveData, ResearchPoint } from "./types";
import { ResearchItem } from "../ResearchItem";
import { Download, RefreshCw } from "lucide-react";

interface DeepDiveStepProps {
    deepDive: DeepDiveData | null;
    loading: boolean;
    refiningItems: { type: 'research' | 'insights', index: number }[];
    onRunDeepDive: (mode: 'initial' | 'reset' | 'append') => void;
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
    onExport,
    onRefinePoint,
    onUpdateItem,
    onAddNote,
    onDeleteNote,
    onDelete
}: DeepDiveStepProps) {

    if (!deepDive && !loading) {
        return <p className="text-gray-500 text-center py-12">Starting research...</p>;
    }

    if (!deepDive) return null; // Should be handled by parent showing loader if loading is true, but for safety

    return (
        <div className="space-y-6">
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
