"use client";

import { Plus, Search } from "lucide-react";
import { Draft } from "@/hooks/useDrafts";
import { useState } from "react";

interface DraftsSidebarProps {
    drafts: Draft[];
    selectedDraftId: string | null;
    onSelect: (draft: Draft) => void;
    onNew: () => void;
}

export function DraftsSidebar({ drafts, selectedDraftId, onSelect, onNew }: DraftsSidebarProps) {
    const [search, setSearch] = useState("");

    const filteredDrafts = drafts.filter(d =>
        d.content.toLowerCase().includes(search.toLowerCase()) ||
        d.belief_text.toLowerCase().includes(search.toLowerCase())
    );

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="flex flex-col h-full bg-paper border-r border-gray-100">
            {/* Header + Search Combined */}
            <div className="p-4 shrink-0 flex items-center gap-2">
                <div className="relative flex-1 group">
                    <Search size={14} className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--accent)] transition-colors" />
                    <input
                        type="text"
                        placeholder="Search drafts..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-6 pr-2 py-1.5 text-xs bg-transparent border-0 border-b border-gray-200 focus:border-[var(--accent)] focus:ring-0 placeholder:text-gray-300 transition-all font-medium"
                    />
                </div>
                <button
                    onClick={onNew}
                    className="p-1.5 text-gray-400 hover:text-[var(--accent)] hover:bg-gray-50 rounded-md transition-all"
                    title="New Draft"
                >
                    <Plus size={16} />
                </button>
            </div>

            {/* List - Clean, no borders */}
            <div className="flex-1 overflow-y-auto px-3 md:px-2 pb-4 space-y-1">
                {filteredDrafts.length === 0 ? (
                    <div className="p-8 text-center text-[var(--text-muted)] text-xs">
                        {search ? "No matches" : "No drafts"}
                    </div>
                ) : (
                    filteredDrafts.map(draft => (
                        <button
                            key={draft.id}
                            onClick={() => onSelect(draft)}
                            className={`w-full text-left py-3 px-3 rounded-lg transition-all group overflow-hidden ${selectedDraftId === draft.id
                                ? "bg-gray-50"
                                : "hover:bg-gray-50/50"
                                }`}
                        >
                            <div className="mb-1 overflow-hidden">
                                <span className={`text-sm font-medium block truncate mb-0.5 transition-colors ${selectedDraftId === draft.id
                                    ? "text-[var(--foreground)]"
                                    : "text-gray-700 group-hover:text-gray-900"
                                    }`}>
                                    {draft.belief_text}
                                </span>
                                <p className={`text-xs line-clamp-2 leading-relaxed font-sans break-words ${selectedDraftId === draft.id
                                    ? "text-gray-500"
                                    : "text-gray-400"
                                    }`}>
                                    {draft.content}
                                </p>
                            </div>
                            <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[10px] text-gray-300 font-medium">{formatDate(draft.updated_at)}</span>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
