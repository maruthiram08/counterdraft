
import { ContentItem } from "./types";
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
        <div className="bg-white p-4 rounded-xl border border-gray-100/80 shadow-sm flex flex-col gap-3 h-auto min-h-[140px] animate-pulse">
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    <div className="h-5 w-16 bg-gray-100 rounded"></div>
                    <div className="h-5 w-12 bg-gray-100 rounded"></div>
                </div>
                <div className="h-4 w-12 bg-gray-100 rounded"></div>
            </div>

            <div className="space-y-2 mt-1">
                <div className="h-5 w-3/4 bg-gray-100 rounded"></div>
                <div className="space-y-1">
                    <div className="h-3 w-full bg-gray-50 rounded"></div>
                    <div className="h-3 w-5/6 bg-gray-50 rounded"></div>
                </div>
            </div>

            <div className="mt-auto pt-3 flex items-center justify-between border-t border-gray-50">
                <div className="flex gap-2">
                    <div className="h-8 w-12 bg-gray-50 rounded-lg"></div>
                    <div className="h-8 w-12 bg-gray-50 rounded-lg"></div>
                </div>
                <div className="flex gap-1">
                    <div className="h-7 w-7 bg-gray-50 rounded-md"></div>
                    <div className="h-7 w-7 bg-gray-50 rounded-md"></div>
                </div>
            </div>
        </div>
    );
}

export function StatusColumn({ title, items, onAction, loading, className = "", cols = 1 }: ColumnProps) {
    return (
        <div className={`flex-1 min-w-[280px] sm:min-w-[250px] bg-transparent rounded-xl p-3 ${className}`}>
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-serif font-medium text-gray-900">{title}</h3>
                    <span className="text-xs font-medium text-gray-500 bg-gray-200/60 px-2 py-0.5 rounded-full">
                        {loading ? '-' : items.length}
                    </span>
                </div>
            </div>

            <div className={cols > 1 ? `grid grid-cols-1 md:grid-cols-${cols} gap-3` : "space-y-3"}>
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
                    <div className={`h-32 border-2 border-dashed border-gray-100 rounded-xl flex items-center justify-center ${cols > 1 ? 'col-span-full' : ''}`}>
                        <p className="text-sm text-gray-400">Empty</p>
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
