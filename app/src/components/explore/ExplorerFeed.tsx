"use client";

import { useState, useEffect } from "react";
import { Loader2, ExternalLink, Sparkles, RefreshCw } from "lucide-react";

interface FeedItem {
    title: string;
    sourceUrl: string;
    source: string;
    category: string;
    publishedAt?: string;
    relatabilityScore: number;
    relatedBeliefId?: string | null;
}

interface ExplorerFeedProps {
    onRefocus: () => void;
}

export function ExplorerFeed({ onRefocus }: ExplorerFeedProps) {
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchFeed();
    }, []);

    const fetchFeed = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/explore/feed');
            const data = await res.json();

            if (data.error) {
                setError(data.error);
            } else {
                setFeed(data.feed || []);
            }
        } catch (err) {
            setError('Failed to load feed');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Loader2 size={32} className="animate-spin mb-4" />
                <p className="text-sm">Curating your feed...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12 text-gray-500">
                <p>{error}</p>
                <button onClick={fetchFeed} className="mt-4 text-[var(--accent)] underline">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-serif text-gray-900">Your Curated Feed</h1>
                    <p className="text-sm text-gray-500 mt-1">Topics matching your interests and worldview</p>
                </div>
                <button
                    onClick={onRefocus}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--accent)] border border-[var(--accent)] rounded-lg hover:bg-[var(--accent)]/5 transition-colors"
                >
                    <RefreshCw size={16} />
                    Refocus
                </button>
            </div>

            {/* Feed List */}
            {feed.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <p>No articles found for your interests.</p>
                    <button onClick={onRefocus} className="mt-2 text-[var(--accent)] underline">
                        Adjust your focus
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {feed.map((item, idx) => (
                        <a
                            key={idx}
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-4 bg-white border border-gray-100 rounded-xl hover:border-[var(--accent)]/30 hover:shadow-sm transition-all group"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <h3 className="text-lg font-medium text-gray-900 group-hover:text-[var(--accent)] transition-colors">
                                        {item.title}
                                    </h3>
                                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                        <span className="px-2 py-0.5 bg-gray-100 rounded-full">{item.source}</span>
                                        <span className="capitalize">{item.category}</span>
                                        {item.relatabilityScore > 0 && (
                                            <span className="flex items-center gap-1 text-[var(--accent)]">
                                                <Sparkles size={12} />
                                                Relates to your beliefs
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <ExternalLink size={18} className="text-gray-300 group-hover:text-[var(--accent)] transition-colors" />
                            </div>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}
