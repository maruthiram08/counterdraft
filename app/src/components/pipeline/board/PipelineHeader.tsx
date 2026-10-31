import { Plus, Wand2 } from "lucide-react";
import { Stage } from "./types";
import { STAGE_STYLES } from "./stageStyles";

const STAGES: Stage[] = ['idea', 'developing', 'draft', 'published'];

interface PipelineHeaderProps {
    loading: boolean;
    counts: Record<Stage, number>;
    onSuggest: () => void;
    onNewDraft: () => void;
}

// Title and actions on one row, then the four stage counts in an even grid that never clips.
// Phones skip the counts: the stage tabs under the header carry them.
export function PipelineHeader({ loading, counts, onSuggest, onNewDraft }: PipelineHeaderProps) {
    return (
        <div className="bg-surface rounded-tile shadow-card p-4 sm:p-5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                <div className="min-w-0 flex-1">
                    <h1 className="text-2xl font-medium tracking-[-0.02em] text-ink leading-tight">Command Center</h1>
                    <p className="text-sm text-ink-muted mt-0.5">
                        {loading
                            ? 'Loading your pipeline…'
                            : `${counts.idea + counts.developing + counts.draft} in flight, ${counts.draft} ready to polish`}
                    </p>
                </div>

                <div className="flex gap-2 w-full sm:w-auto shrink-0">
                    <button
                        onClick={onSuggest}
                        disabled={loading}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-11 px-4 rounded-full bg-canvas text-ink text-sm font-medium hover:text-ember-600 active:bg-line transition-colors disabled:opacity-50"
                    >
                        <Wand2 size={15} className="text-ember-500" />
                        Suggest ideas
                    </button>
                    <button
                        onClick={onNewDraft}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 h-11 pl-3 pr-4 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 active:bg-ember-700 transition-colors"
                    >
                        <Plus size={16} />
                        New draft
                    </button>
                </div>
            </div>

            <dl className="hidden sm:grid grid-cols-4 gap-2 md:gap-3">
                {STAGES.map(stage => {
                    const style = STAGE_STYLES[stage];
                    return (
                        <div key={stage} className="min-w-0 rounded-2xl bg-canvas px-3 py-2.5 md:px-4 md:py-3">
                            <dt className="flex items-center gap-1.5 text-xs text-ink-muted min-w-0">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} aria-hidden />
                                <span className="truncate">{style.label}</span>
                            </dt>
                            <dd className="mt-1 text-xl md:text-2xl font-medium tracking-[-0.02em] text-ink leading-none">
                                {loading ? '–' : counts[stage]}
                            </dd>
                        </div>
                    );
                })}
            </dl>
        </div>
    );
}
