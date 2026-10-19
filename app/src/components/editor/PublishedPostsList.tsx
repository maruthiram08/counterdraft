"use client";

import { useMemo } from "react";
import type { Draft } from "@/types";
import { ExternalLink, Calendar, Layers } from "lucide-react";

interface PublishedPostsListProps {
    drafts: Draft[];
}

export function PublishedPostsList({ drafts }: PublishedPostsListProps) {
    // Filter only published drafts and flatten if necessary, 
    // but the requirement is to show the *post* with its publishing history.
    // UseMemo to safeguard against expensive calcs if list grows large.
    const publishedItems = useMemo(() => {
        return drafts
            .filter(d => d.status === 'published' || (d.published_posts && d.published_posts.length > 0))
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }, [drafts]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric', // Add year
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
                <p>No published posts yet.</p>
                <p className="text-sm mt-2 text-ink-muted">Drafts you publish will appear here.</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 w-full">
            <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-4 md:mb-6">Published History</h2>

            <div className="bg-surface rounded-card shadow-card overflow-hidden">
                {/* Desktop Table Header - Hidden on mobile */}
                <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_auto] gap-4 px-6 py-4 border-b border-line text-sm text-ink-muted">
                    <div>Content</div>
                    <div>Platforms</div>
                    <div>Date</div>
                    <div>Link</div>
                </div>

                <div className="divide-y divide-line">
                    {publishedItems.map((item) => (
                        <div key={item.id} className="flex flex-col md:grid md:grid-cols-[2fr_1fr_1fr_auto] gap-3 md:gap-4 p-4 md:px-6 md:items-center hover:bg-surface-muted transition-colors overflow-hidden">
                            {/* Content Preview */}
                            <div className="overflow-hidden min-w-0">
                                <h3 className="font-medium tracking-[-0.01em] text-ink mb-1 truncate text-sm md:text-base">{item.belief_text}</h3>
                                <p className="text-xs md:text-sm text-ink-soft line-clamp-2 leading-relaxed font-sans break-words">
                                    {item.content}
                                </p>
                            </div>

                            {/* Platforms + Date Row on Mobile */}
                            <div className="flex flex-wrap gap-2 md:block">
                                {item.published_posts?.map((p) => (
                                    <span key={p.id} className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-medium bg-dusk-100 text-dusk-700">
                                        {p.platform === 'linkedin' ? 'LinkedIn' : p.platform}
                                    </span>
                                ))}
                                {(!item.published_posts || item.published_posts.length === 0) && (
                                    <span className="text-xs text-ink-muted italic">Unknown platform</span>
                                )}
                            </div>

                            {/* Date */}
                            <div className="text-sm text-ink-muted flex items-center gap-1.5">
                                <Calendar size={14} className="opacity-50" />
                                {item.published_posts && item.published_posts[0]
                                    ? formatDate(item.published_posts[0].published_at)
                                    : formatDate(item.updated_at)
                                }
                            </div>

                            {/* Actions */}
                            <div>
                                {/* Primary Link (e.g. LinkedIn) */}
                                {item.published_posts?.map((p) => {
                                    // LinkedIn URL builder if not stored (though backfill should have it)
                                    const url = p.url || (p.platform === 'linkedin' && p.platform_post_id.includes('urn:li')
                                        ? `https://www.linkedin.com/feed/update/urn:li:activity:${p.platform_post_id.split(':').pop()}`
                                        : '#');

                                    return (
                                        <a
                                            key={p.id}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-10 h-10 rounded-full inline-flex items-center justify-center text-ink-muted hover:text-ember-600 active:shadow-pressed transition-all"
                                            title={`View on ${p.platform}`}
                                        >
                                            <ExternalLink size={18} />
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
