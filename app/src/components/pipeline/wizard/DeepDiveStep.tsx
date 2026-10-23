
import { DeepDiveData, ResearchPoint } from "./types";
import { ResearchItem } from "../ResearchItem";
import { Download, Search } from "lucide-react";
import { AnimatedIcon } from "@/components/icons/AnimatedIcon";
import { RefreshCWIcon } from "@/components/icons/animated";
import { StrategyChangedBanner } from "./StrategyChangedBanner";

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
                <p className="text-sm text-ink-soft max-w-md">
                    Describe the post in the strategy box above first, if you like. Research will focus on your audience, stance and anything you asked to include.
                </p>
                <button
                    onClick={() => onRunDeepDive('initial')}
                    className="flex items-center gap-2 h-12 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all"
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
                <StrategyChangedBanner
                    message="Your strategy has changed since this research ran, so it may not reflect it."
                    action="Redo research"
                    onClick={() => onRunDeepDive('reset')}
                />
            )}
            <div className="flex flex-wrap justify-between items-center gap-3 px-1">
                <p className="text-sm text-ink-muted">
                    Tip: You can also refresh individual cards below to apply this context granularly.
                </p>
                <div className="flex gap-2">
                    <button
                        onClick={() => onRunDeepDive('reset')}
                        className="flex items-center gap-1.5 h-10 px-4 rounded-full bg-canvas text-rose-700 text-sm font-medium shadow-raised hover:text-rose-500 active:shadow-pressed transition-all"
                        title="Clear and restart research"
                    >
                        <AnimatedIcon icon={RefreshCWIcon} size={14} /> Reset
                    </button>
                    <button
                        onClick={onExport}
                        className="flex items-center gap-1.5 h-10 px-4 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all"
                    >
                        <Download size={14} className="text-ember-500" /> Export
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-4 flex items-center gap-3">
                        Research Findings
                        <span className="h-7 px-3 inline-flex items-center rounded-full bg-canvas shadow-well text-ink-soft text-xs font-medium tracking-normal">Facts</span>
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
                    <h3 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-4 flex items-center gap-3">
                        Key Insights
                        <span className="h-7 px-3 inline-flex items-center rounded-full bg-canvas shadow-well text-ink-soft text-xs font-medium tracking-normal">Angles</span>
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
