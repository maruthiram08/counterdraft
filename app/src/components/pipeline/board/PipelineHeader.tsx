import { Plus, Wand2 } from "lucide-react";

interface PipelineHeaderProps {
    loading: boolean;
    onSuggest: () => void;
    onNewDraft: () => void;
}

export function PipelineHeader({ loading, onSuggest, onNewDraft }: PipelineHeaderProps) {
    return (
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
                <h1 className="text-4xl md:text-[56px] md:leading-[1.05] font-medium tracking-[-0.03em] text-ink">Command Center</h1>
                <p className="mt-3 text-base text-ink-soft max-w-md">
                    Every idea, draft and published post in one pipeline. Pick up where you left off.
                </p>
            </div>
            <div className="flex gap-2.5">
                <button
                    onClick={onSuggest}
                    disabled={loading}
                    className="flex items-center gap-2 h-12 px-5 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all disabled:opacity-50"
                >
                    <Wand2 size={16} className="text-ember-500" />
                    Suggest ideas
                </button>
                <button
                    onClick={onNewDraft}
                    className="flex items-center gap-2 h-12 pl-4 pr-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all"
                >
                    <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                        <Plus size={16} />
                    </span>
                    New draft
                </button>
            </div>
        </div>
    );
}
