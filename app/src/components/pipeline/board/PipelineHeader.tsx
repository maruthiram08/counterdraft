import { Plus, Wand2 } from "lucide-react";
import { Stage } from "./types";
import { STAGE_STYLES } from "./stageStyles";

const STAGES: Stage[] = ['idea', 'developing', 'draft', 'published'];
const TICKS = 12;

interface PipelineHeaderProps {
    loading: boolean;
    counts: Record<Stage, number>;
    onSuggest: () => void;
    onNewDraft: () => void;
}

// One compact band: title, per-stage counts and the two actions, so the board starts near the top.
export function PipelineHeader({ loading, counts, onSuggest, onNewDraft }: PipelineHeaderProps) {
    return (
        <div className="bg-surface rounded-tile shadow-card px-5 py-4 flex flex-wrap items-center gap-x-8 gap-y-4">
            <div className="min-w-0">
                <h1 className="text-2xl font-medium tracking-[-0.02em] text-ink leading-tight">Command Center</h1>
                <p className="text-sm text-ink-muted">
                    {loading
                        ? 'Loading your pipeline…'
                        : `${counts.idea + counts.developing + counts.draft} in flight, ${counts.draft} ready to polish`}
                </p>
            </div>

            {/* Phones show these counts on the stage tabs instead */}
            <div className="hidden sm:flex items-center gap-6 md:gap-8 order-3 lg:order-none w-full lg:w-auto lg:flex-1 lg:justify-center overflow-x-auto scrollbar-none">
                {STAGES.map(stage => {
                    const style = STAGE_STYLES[stage];
                    const filled = Math.min(counts[stage], TICKS);
                    return (
                        <div key={stage} className={`pl-3 border-l-2 ${style.rule} shrink-0`}>
                            <p className="text-xs text-ink-muted whitespace-nowrap">{style.label}</p>
                            <div className="flex items-end gap-2.5">
                                <span className="text-xl font-medium tracking-[-0.02em] text-ink leading-none">{loading ? '–' : counts[stage]}</span>
                                <div className="hidden sm:flex items-end gap-[3px] h-4" aria-hidden>
                                    {Array.from({ length: TICKS }).map((_, i) => (
                                        <span
                                            key={i}
                                            className={`w-[2px] rounded-full ${!loading && i < filled ? style.tick : 'bg-line'}`}
                                            style={{ height: !loading && i < filled ? '100%' : '65%' }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex gap-2 ml-auto">
                <button
                    onClick={onSuggest}
                    disabled={loading}
                    className="flex items-center gap-2 h-10 px-4 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all disabled:opacity-50"
                >
                    <Wand2 size={15} className="text-ember-500" />
                    Suggest ideas
                </button>
                <button
                    onClick={onNewDraft}
                    className="flex items-center gap-1.5 h-10 pl-3 pr-4 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all"
                >
                    <Plus size={16} />
                    New draft
                </button>
            </div>
        </div>
    );
}
