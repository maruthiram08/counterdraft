"use client";

import { useMemo } from "react";
import type { Draft } from "@/types";
import { platformName, postPlatforms, postUrl, postedDate } from "@/lib/posts/posted";
import { ExternalLink, Calendar, Layers, ChevronRight } from "lucide-react";

interface PublishedPostsListProps {
    drafts: Draft[];
    onOpen?: (draftId: string) => void;
}

export function PublishedPostsList({ drafts, onOpen }: PublishedPostsListProps) {
    // Newest first; a post counts as posted by status or by having a post record
    const publishedItems = useMemo(() => {
        return drafts
            .filter(d => d.status === 'published' || (d.published_posts && d.published_posts.length > 0))
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }, [drafts]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (publishedItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-ink-soft">
                <Layers size={48} className="mb-4 text-ink-muted/40" />
                <p>Nothing posted yet.</p>
                <p className="text-sm mt-2 text-ink-muted px-6 text-center">When a draft goes out, tap Post and mark it as posted. It lands here.</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 w-full">
            <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-4 md:mb-6">Posted</h2>

            <div className="bg-surface rounded-card shadow-card overflow-hidden">
                {/* Desktop Table Header - Hidden on mobile */}
                <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_auto] gap-4 px-6 py-4 border-b border-line text-sm text-ink-muted">
                    <div>Content</div>
                    <div>Platforms</div>
                    <div>Date</div>
                    <div>Link</div>
                </div>

                <div className="divide-y divide-line">
                    {publishedItems.map((item) => {
                        const platforms = postPlatforms(item);
                        const links = (item.published_posts || [])
                            .map(p => ({ id: p.id, platform: platformName(p.platform), url: postUrl(p) }))
                            .filter((l): l is { id: string; platform: string; url: string } => !!l.url);
                        const date = postedDate(item);

                        return (
                            <div
                                key={item.id}
                                role={onOpen ? "button" : undefined}
                                tabIndex={onOpen ? 0 : undefined}
                                aria-label={onOpen ? `Open ${item.belief_text || 'post'}` : undefined}
                                onClick={() => onOpen?.(item.id)}
                                onKeyDown={(e) => {
                                    if (onOpen && (e.key === 'Enter' || e.key === ' ')) {
                                        e.preventDefault();
                                        onOpen(item.id);
                                    }
                                }}
                                className={`relative flex flex-col md:grid md:grid-cols-[2fr_1fr_1fr_auto] gap-2 md:gap-4 p-4 pr-10 md:px-6 md:pr-6 md:items-center transition-colors overflow-hidden ${onOpen ? 'cursor-pointer hover:bg-surface-muted active:bg-surface-muted focus-visible:outline-none focus-visible:bg-surface-muted' : ''}`}
                            >
                                {/* Content Preview */}
                                <div className="overflow-hidden min-w-0">
                                    <h3 className="font-medium tracking-[-0.01em] text-ink mb-1 line-clamp-2 md:truncate text-sm md:text-base">{item.belief_text}</h3>
                                    <p className="text-xs md:text-sm text-ink-soft line-clamp-2 leading-relaxed font-sans break-words">
                                        {item.content}
                                    </p>
                                </div>

                                {/* Platforms: hidden entirely when we don't know, instead of "Unknown platform" */}
                                <div className="flex flex-wrap gap-2 md:block empty:hidden">
                                    {platforms.map((name) => (
                                        <span key={name} className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-medium bg-dusk-100 text-dusk-700 md:mr-1">
                                            {name}
                                        </span>
                                    ))}
                                </div>

                                {/* Date */}
                                <div className="text-sm text-ink-muted flex items-center gap-1.5">
                                    <Calendar size={14} className="opacity-50" />
                                    {formatDate(date)}
                                </div>

                                {/* Live post links */}
                                <div className="flex items-center gap-1 -ml-3 md:ml-0 empty:hidden">
                                    {links.map((l) => (
                                        <a
                                            key={l.id}
                                            href={l.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-11 h-11 md:w-10 md:h-10 rounded-full inline-flex items-center justify-center text-ink-muted hover:text-ember-600 active:shadow-pressed transition-all"
                                            title={`View on ${l.platform}`}
                                            aria-label={`View on ${l.platform}`}
                                        >
                                            <ExternalLink size={18} />
                                        </a>
                                    ))}
                                </div>

                                {onOpen && (
                                    <ChevronRight size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted/60 md:hidden" aria-hidden />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
