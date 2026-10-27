"use client";

import { Search } from "lucide-react";
import type { Draft } from "@/types";
import { platformName } from "@/lib/posts/posted";
import { useState, useEffect, useRef } from "react";

interface DraftsSidebarProps {
    drafts: Draft[];
    selectedDraftId: string | null;
    onSelect: (draft: Draft) => void;
    onNew: () => void;
    placeholder?: string;
    emptyMessage?: string;
}

export function DraftsSidebar({
    drafts,
    selectedDraftId,
    onSelect,
    placeholder = "Search drafts...",
    emptyMessage = "No drafts"
}: DraftsSidebarProps) {
    const [search, setSearch] = useState("");
    const selectedRef = useRef<HTMLButtonElement>(null);

    // Auto-scroll to selected draft on load / change
    useEffect(() => {
        // Small timeout to ensure DOM is ready
        const timeout = setTimeout(() => {
            if (selectedDraftId && selectedRef.current) {
                selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
        return () => clearTimeout(timeout);
    }, [selectedDraftId, drafts.length]); // Scroll when selection changes OR when list populates

    const filteredDrafts = drafts.filter(d =>
        d.content.toLowerCase().includes(search.toLowerCase()) ||
        d.belief_text.toLowerCase().includes(search.toLowerCase())
    );

    const formatRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';

        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d ago`;

        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    return (
        <div className="flex flex-col h-full bg-canvas">
            {/* Header + Search Combined */}
            <div className="p-4 md:pr-14 shrink-0 flex items-center gap-2">
                <div className="relative flex-1 group">
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted group-focus-within:text-ember-600 transition-colors" />
                    <input
                        type="text"
                        placeholder={placeholder}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-11 md:h-10 pl-10 pr-4 text-sm bg-canvas shadow-well rounded-full text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 transition-all"
                    />
                </div>
            </div>

            {/* List - Clean, no borders */}
            <div className="flex-1 overflow-y-auto px-4 pt-1 pb-4 flex flex-col gap-2">
                {filteredDrafts.length === 0 ? (
                    <div className="p-8 text-center text-ink-muted text-sm">
                        {search ? "No matches" : emptyMessage}
                    </div>
                ) : (
                    (() => {
                        // If searching, show flat list
                        if (search) {
                            return filteredDrafts.map(draft => renderDraftItem(draft));
                        }

                        // Grouping Logic
                        const rootDrafts = filteredDrafts.filter(d => !d.labels?.parentId);
                        const orphanDrafts = filteredDrafts.filter(d => d.labels?.parentId && !filteredDrafts.find(p => p.id === d.labels?.parentId));

                        // Combine roots + orphans (if parent deleted/missing)
                        const topLevel = [...rootDrafts, ...orphanDrafts].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

                        return topLevel.map(parent => {
                            const children = filteredDrafts
                                .filter(d => d.labels?.parentId === parent.id)
                                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

                            return (
                                <div key={parent.id} className="shrink-0">
                                    {renderDraftItem(parent)}
                                    {children.length > 0 && (
                                        <div className="ml-4 pl-3 border-l-2 border-line mt-2 flex flex-col gap-2">
                                            {children.map(child => renderDraftItem(child, true))}
                                        </div>
                                    )}
                                </div>
                            );
                        });
                    })()
                )}
            </div>
        </div>
    );

    function renderDraftItem(draft: Draft, isChild = false) {
        const isSelected = selectedDraftId === draft.id;

        return (
            <button
                key={draft.id}
                ref={isSelected ? selectedRef : null}
                onClick={() => onSelect(draft)}
                className={`w-full text-left p-4 rounded-tile transition-all group overflow-hidden relative ${isSelected
                    ? "bg-surface shadow-float ring-2 ring-ember-200"
                    : "bg-surface shadow-card hover:shadow-float"
                    }`}
            >
                <div className="mb-1 overflow-hidden">
                    <span className={`text-[15px] font-medium tracking-[-0.01em] block truncate mb-1 transition-colors ${isSelected
                        ? "text-ink"
                        : "text-ink group-hover:text-ink"
                        }`}>
                        {draft.belief_text}
                    </span>

                    {/* Badges Row */}
                    {draft.labels && (
                        <div className="flex flex-wrap gap-1.5 items-center my-2">
                            {draft.labels.platform && (
                                <span className={`h-6 px-2.5 rounded-full text-[11px] font-medium flex items-center ${draft.labels.platform === 'medium'
                                    ? 'bg-ink text-white'
                                    : 'bg-ember-100 text-ember-700'
                                    }`}>
                                    {platformName(draft.labels.platform)}
                                </span>
                            )}
                            {draft.labels.length && (
                                <span className="h-6 px-2.5 rounded-full bg-canvas shadow-well text-ink-soft text-[11px] font-medium capitalize flex items-center">
                                    {draft.labels.length}
                                </span>
                            )}
                        </div>
                    )}

                    <p className={`text-xs line-clamp-2 leading-relaxed font-sans break-words ${isSelected
                        ? "text-ink-soft"
                        : "text-ink-muted"
                        }`}>
                        {draft.content.replace(/!\[.*?\]\(.*?\)/g, '').trim()}
                    </p>
                </div>
                {!isChild && (
                    <div className={`flex items-center gap-1 mt-1.5 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <span className="text-xs text-ink-muted">{formatRelativeTime(draft.updated_at)}</span>
                    </div>
                )}
            </button>
        );
    }
}
