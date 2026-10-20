
import { ContentItem, Stage } from "./types";
import { STAGE_STYLES } from "./stageStyles";
import { ContentCard } from "./ContentCard";

interface ColumnProps {
    title: string;
    icon: React.ReactNode;
    items: ContentItem[];
    stage: string;
    color: string;
    onAction: (id: string, action: string) => void;
    loading?: boolean;
    className?: string;
    cols?: number;
}

function SkeletonCard() {
    return (
        <div className="bg-surface p-4 rounded-tile shadow-card flex flex-col gap-3 min-h-[120px] animate-pulse">
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    <div className="h-7 w-20 bg-surface-muted rounded-full"></div>
                    <div className="h-7 w-16 bg-surface-muted rounded-full"></div>
                </div>
                <div className="h-4 w-12 bg-surface-muted rounded-full"></div>
            </div>
            <div className="space-y-2">
                <div className="h-5 w-4/5 bg-surface-muted rounded-full"></div>
                <div className="h-3 w-full bg-surface-muted/70 rounded-full"></div>
                <div className="h-3 w-2/3 bg-surface-muted/70 rounded-full"></div>
            </div>
        </div>
    );
}

export function StatusColumn({ title, items, stage, onAction, loading, className = "", cols = 1 }: ColumnProps) {
    const dot = STAGE_STYLES[stage as Stage]?.dot ?? 'bg-ink-muted';

    return (
        <div className={`flex-1 min-w-[280px] sm:min-w-[250px] bg-canvas shadow-pressed rounded-card p-3 ${className}`}>
            <div className="flex items-center justify-between px-3 pt-1 pb-3">
                <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${dot}`} />
                    <h3 className="text-base font-medium text-ink">{title}</h3>
                </div>
                <span className="min-w-8 h-8 px-2 rounded-full bg-canvas shadow-raised text-ink text-xs font-semibold flex items-center justify-center">
                    {loading ? '–' : items.length}
                </span>
            </div>

            <div className={cols > 1 ? `grid grid-cols-1 md:grid-cols-${cols} gap-2.5` : "space-y-2.5"}>
                {loading ? (
                    <>
                        <SkeletonCard />
                        <SkeletonCard />
                        {cols > 1 && (
                            <>
                                <SkeletonCard />
                                <SkeletonCard />
                            </>
                        )}
                    </>
                ) : items.length === 0 ? (
                    <div className={`h-28 border border-dashed border-ink/15 rounded-tile flex items-center justify-center ${cols > 1 ? 'col-span-full' : ''}`}>
                        <p className="text-sm text-ink-muted">Nothing here yet</p>
                    </div>
                ) : (
                    items.map(item => (
                        <ContentCard key={item.id} item={item} onAction={onAction} />
                    ))
                )}
            </div>
        </div>
    );
}
