import { useState, useEffect } from "react";
import { ArrowRight, Clock, Plus, Wand2 } from "lucide-react";
import { BrainMetadata } from "@/types";

interface ContentItem {
    id: string;
    hook: string;
    stage: 'idea' | 'developing' | 'draft' | 'published';
    updated_at: string;
    brain_metadata?: BrainMetadata;
    status: string;
}

interface DashboardViewProps {
    items: ContentItem[];
    onAction: (id: string, action: string) => void;
    onNewDraft: () => void;
    userFirstName?: string;
}

export function DashboardView({ items, onAction, onNewDraft, userFirstName = "Writer" }: DashboardViewProps) {
    // Determine the "Active" journal item (last updated item in 'developing' stage)
    // If none in developing, take the latest 'idea'
    const activeItem = items
        .filter(i => i.stage === 'developing' || i.stage === 'idea')
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];

    const stories = items
        .filter(i => i.id !== activeItem?.id)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5); // Show top 5 recent

    const getTimeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return "Today";
        if (days === 1) return "Yesterday";
        return `${days} days ago`;
    };

    return (
        <div className="h-full overflow-y-auto p-8 md:p-12">
            <div className="container max-w-5xl mx-auto">
                {/* Header Greeting */}
                <div className="mb-12">
                    <h1 className="text-5xl font-serif text-gray-900 mb-4 animate-fade-in">
                        Hey, {userFirstName}.
                    </h1>
                    <p className="text-xl text-gray-500 font-serif opacity-0 animate-fade-in" style={{ animationDelay: '100ms' }}>
                        It looks like you've already started writing a story, keep up the good work.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 opacity-0 animate-fade-in" style={{ animationDelay: '200ms' }}>

                    {/* Active Journal Card (The "So far" card) */}
                    <div>
                        {activeItem ? (
                            <div className="card card-active h-full flex flex-col justify-between group cursor-pointer hover:bg-green-50/10 transition-colors"
                                onClick={() => onAction(activeItem.id, 'develop')}>
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-green-600 font-medium text-lg font-sans">Journal: So far</h3>
                                        {activeItem.stage === 'developing' && (
                                            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">Developing</span>
                                        )}
                                    </div>
                                    <p className="text-xl text-gray-800 leading-relaxed font-serif line-clamp-4">
                                        {activeItem.hook}
                                    </p>
                                </div>
                                <div className="mt-8 pt-6 border-t border-dashed border-gray-200 flex items-center justify-between">
                                    <span className="text-sm text-gray-400 font-sans">
                                        Last edited {getTimeAgo(activeItem.updated_at)}
                                    </span>
                                    <button
                                        className="text-green-600 font-medium flex items-center gap-2 group-hover:translate-x-1 transition-transform"
                                        onClick={(e) => { e.stopPropagation(); onAction(activeItem.id, 'develop'); }}
                                    >
                                        Continue writing <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="card h-full flex flex-col items-center justify-center text-center p-8 bg-gray-50 border-dashed">
                                <Wand2 size={48} className="text-gray-300 mb-4" />
                                <h3 className="text-xl font-serif text-gray-900 mb-2">Start your first story</h3>
                                <p className="text-gray-500 mb-6">Capture an idea to begin your journey.</p>
                                <button onClick={onNewDraft} className="btn btn-primary">
                                    <Plus size={16} /> New Entry
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Stories List (Recent drafts) */}
                    <div>
                        <div className="card h-full">
                            <h3 className="text-xl font-serif text-gray-900 mb-6 px-2">The Designer, The Company and the Disconnect.</h3>

                            <div className="space-y-1">
                                {stories.length > 0 ? (
                                    stories.map(item => (
                                        <div
                                            key={item.id}
                                            onClick={() => onAction(item.id, item.stage === 'draft' ? 'edit' : 'develop')}
                                            className="p-4 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
                                        >
                                            <h4 className="text-base font-medium text-gray-800 mb-1 group-hover:text-green-700 transition-colors">
                                                {item.hook || "Untitled Draft"}
                                            </h4>
                                            <div className="flex items-center gap-3 text-sm text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} /> {getTimeAgo(item.updated_at)}
                                                </span>
                                                {item.stage === 'published' && (
                                                    <span className="text-green-600 font-medium">Published</span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 text-gray-400 italic">
                                        No more stories yet.
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-100 px-2">
                                <button onClick={onNewDraft} className="text-gray-500 hover:text-gray-900 text-sm font-medium flex items-center gap-2">
                                    <Plus size={14} /> Create new story
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
