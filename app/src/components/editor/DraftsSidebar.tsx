"use client";

import { Plus, Search, Clock } from "lucide-react";
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
        <div className="flex flex-col h-full bg-gray-50/50">
            {/* Minimal Header */}
            <div className="p-3 border-b border-[var(--border)] shrink-0 flex items-center gap-2 bg-white/50 backdrop-blur-sm">
                <div className="relative flex-1 group">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--accent)] transition-colors" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[var(--border)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
                    />
                </div>
                <button
                    onClick={onNew}
                    className="p-1.5 hover:bg-white hover:shadow-sm border border-transparent hover:border-[var(--border)] rounded text-[var(--accent)] transition-all"
                    title="New Draft"
                >
                    <Plus size={16} />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {filteredDrafts.length === 0 ? (
                    <div className="p-8 text-center text-[var(--text-muted)] text-xs">
                        {search ? "No matches" : "No drafts"}
                    </div>
                ) : (
                    <div className="space-y-px">
                        {filteredDrafts.map(draft => (
                            <button
                                key={draft.id}
                                onClick={() => onSelect(draft)}
                                className={`w-full text-left py-3 px-4 hover:bg-white transition-all group relative ${selectedDraftId === draft.id
                                    ? "bg-white shadow-sm z-10"
                                    : "hover:shadow-sm"
                                    }`}
                            >
                                {selectedDraftId === draft.id && (
                                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--accent)]" />
                                )}
                                <div className="mb-1">
                                    <span className={`text-[11px] font-medium block truncate mb-1 transition-colors ${selectedDraftId === draft.id
                                        ? "text-[var(--accent)]"
                                        : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
                                        }`}>
                                        {draft.belief_text}
                                    </span>
                                    <p className={`text-sm line-clamp-2 leading-relaxed font-serif ${selectedDraftId === draft.id
                                        ? "text-[var(--text-primary)]"
                                        : "text-[var(--text-secondary)]"
                                        }`}>
                                        {draft.content}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 mt-2 text-[10px] text-[var(--text-subtle)] opacity-70 group-hover:opacity-100 transition-opacity">
                                    {formatDate(draft.updated_at)}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
