
import { Archive, ArrowRight, FileText, Trash2, Wand2 } from "lucide-react";
import { ContentItem } from "./types";

interface ContentCardProps {
    item: ContentItem;
    onAction: (id: string, action: string) => void;
}

export function ContentCard({ item, onAction }: ContentCardProps) {
    const stage = item.stage;

    return (
        <div className="bg-white p-4 rounded-xl border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group flex flex-col gap-3 h-auto min-h-[140px]">
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    {item.format && (
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-semibold uppercase tracking-wider">
                            {item.format}
                        </span>
                    )}
                    {item.platform && (
                        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 text-[10px] font-semibold uppercase tracking-wider">
                            {item.platform}
                        </span>
                    )}
                    {item.brain_metadata?.confidence && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 ${item.brain_metadata.confidence === 'high' ? 'bg-green-50 text-green-700' :
                            item.brain_metadata.confidence === 'medium' ? 'bg-amber-50 text-amber-700' :
                                'bg-gray-100 text-gray-500'
                            }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${item.brain_metadata.confidence === 'high' ? 'bg-green-500' :
                                item.brain_metadata.confidence === 'medium' ? 'bg-amber-500' :
                                    'bg-gray-400'
                                }`} />
                            {item.brain_metadata.confidence}
                        </span>
                    )}
                </div>
                <span className="text-[10px] font-medium text-gray-400">
                    {new Date(item.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
            </div>

            <div className="space-y-1.5">
                <h3 className="text-[17px] font-serif font-medium text-gray-900 leading-snug text-balance">
                    {item.hook || 'Untitled Idea'}
                </h3>
                <p className="text-[13px] text-gray-500 line-clamp-3 leading-relaxed font-sans">
                    {item.draft_content || item.angle || "No content yet..."}
                </p>
            </div>

            <div className="mt-auto pt-3 flex items-center justify-between border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="flex gap-2">
                    {stage === 'idea' && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); onAction(item.id, 'develop'); }}
                                className="flex flex-col items-center gap-1 p-2 hover:bg-amber-50 text-gray-400 hover:text-amber-700 rounded-lg transition-colors group/btn min-w-[50px]"
                                title="Develop"
                            >
                                <Wand2 size={14} className="group-hover/btn:scale-110 transition-transform mb-0.5" />
                                <span className="text-[10px] font-medium leading-none">Develop</span>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onAction(item.id, 'start_draft'); }}
                                className="flex flex-col items-center gap-1 p-2 hover:bg-blue-50 text-gray-400 hover:text-blue-700 rounded-lg transition-colors group/btn min-w-[50px]"
                                title="Quick Draft"
                            >
                                <ArrowRight size={14} className="group-hover/btn:scale-110 transition-transform mb-0.5" />
                                <span className="text-[10px] font-medium leading-none">Draft</span>
                            </button>
                        </>
                    )}
                    {stage === 'developing' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onAction(item.id, 'develop'); }}
                            className="flex flex-col items-center gap-1 p-2 hover:bg-amber-50 text-gray-400 hover:text-amber-700 rounded-lg transition-colors group/btn min-w-[50px]"
                            title="Continue Development"
                        >
                            <Wand2 size={14} className="group-hover/btn:scale-110 transition-transform mb-0.5" />
                            <span className="text-[10px] font-medium leading-none">Continue</span>
                        </button>
                    )}
                    {stage === 'draft' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onAction(item.id, 'edit'); }}
                            className="flex flex-col items-center gap-1 p-2 hover:bg-blue-50 text-gray-400 hover:text-blue-700 rounded-lg transition-colors group/btn min-w-[50px]"
                        >
                            <FileText size={14} className="group-hover/btn:scale-110 transition-transform mb-0.5" />
                            <span className="text-[10px] font-medium leading-none">Open</span>
                        </button>
                    )}
                    {stage === 'published' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onAction(item.id, 'edit'); }}
                            className="flex flex-col items-center gap-1 p-2 hover:bg-green-50 text-gray-400 hover:text-green-700 rounded-lg transition-colors group/btn min-w-[50px]"
                            title="View/Edit"
                        >
                            <FileText size={14} className="group-hover/btn:scale-110 transition-transform mb-0.5" />
                            <span className="text-[10px] font-medium leading-none">Open</span>
                        </button>
                    )}
                </div>

                <div className="flex gap-1 items-center">
                    <button
                        onClick={(e) => { e.stopPropagation(); onAction(item.id, 'archive'); }}
                        className="p-1.5 hover:bg-gray-100 text-gray-300 hover:text-gray-500 rounded-md transition-colors"
                        title="Archive"
                    >
                        <Archive size={14} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onAction(item.id, 'delete'); }}
                        className="p-1.5 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-md transition-colors"
                        title="Delete"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
