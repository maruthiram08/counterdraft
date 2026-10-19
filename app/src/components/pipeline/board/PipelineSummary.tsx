import { Stage } from "./types";
import { STAGE_STYLES } from "./stageStyles";

const TICKS = 24;

interface PipelineSummaryProps {
    counts: Record<Stage, number>;
    loading: boolean;
}

export function PipelineSummary({ counts, loading }: PipelineSummaryProps) {
    const stages: Stage[] = ['idea', 'developing', 'draft', 'published'];
    const inFlight = counts.idea + counts.developing + counts.draft;

    return (
        <div className="bg-surface rounded-card shadow-card p-6 md:p-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.4fr)]">
            <div className="flex flex-col justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink">Pipeline</h2>
                    <p className="mt-2 text-sm text-ink-soft leading-relaxed">
                        {loading
                            ? 'Counting your work in progress…'
                            : inFlight === 0
                                ? 'Nothing in flight yet. Suggest a few ideas to get started.'
                                : `${inFlight} ${inFlight === 1 ? 'piece is' : 'pieces are'} in flight, ${counts.draft} ready to polish.`}
                    </p>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-medium tracking-[-0.03em] text-ink">{loading ? '–' : counts.published}</span>
                    <span className="text-sm text-ink-muted">published so far</span>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8">
                {stages.map(stage => {
                    const style = STAGE_STYLES[stage];
                    const filled = Math.min(counts[stage], TICKS);
                    return (
                        <div key={stage} className={`pl-4 border-l-2 ${style.rule}`}>
                            <p className="text-sm text-ink-soft">{style.label}</p>
                            <p className="mt-2 text-4xl font-medium tracking-[-0.03em] text-ink">{loading ? '–' : counts[stage]}</p>
                            <div className="mt-4 flex items-end gap-[5px] h-10" aria-hidden>
                                {Array.from({ length: TICKS }).map((_, i) => (
                                    <span
                                        key={i}
                                        className={`w-[2px] rounded-full ${!loading && i < filled ? style.tick : 'bg-line'}`}
                                        style={{ height: !loading && i < filled ? '100%' : '70%' }}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
