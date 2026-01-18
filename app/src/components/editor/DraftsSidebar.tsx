"use client";

import { Plus, Search, FileText, Clock } from "lucide-react";
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
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-[var(--border)] shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-sm uppercase tracking-wider text-[var(--text-muted)]">Drafts</h2>
                    <button
                        onClick={onNew}
                        className="p-1 hover:bg-gray-100 rounded text-[var(--accent)] transition-colors"
                        title="New Draft"
                    >
                        <Plus size={18} />
                    </button>
                </div>

                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        placeholder="Search drafts..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-sm border border-[var(--border)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {filteredDrafts.length === 0 ? (
                    <div className="p-8 text-center text-[var(--text-muted)] text-sm">
                        {search ? "No matches found" : "No drafts yet"}
                    </div>
                ) : (
                    <div className="divide-y divide-[var(--border)]">
                        {filteredDrafts.map(draft => (
                            <button
                                key={draft.id}
                                onClick={() => onSelect(draft)}
                                className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${selectedDraftId === draft.id ? "bg-indigo-50 border-l-4 border-[var(--accent)]" : "border-l-4 border-transparent"
                                    }`}
                            >
                                <div className="mb-1">
                                    <span className="text-xs font-medium text-[var(--accent)] block truncate mb-1">
                                        {draft.belief_text}
                                    </span>
                                    <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-2 leading-snug">
                                        {draft.content}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 mt-2 text-[10px] text-[var(--text-subtle)]">
                                    <Clock size={10} />
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
