"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Sparkles, ExternalLink, Lightbulb, Check, X } from "lucide-react";

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    topics?: FeedItem[];
    ideas?: PostIdea[];
}

interface FeedItem {
    title: string;
    sourceUrl: string;
    source: string;
    category: string;
}

interface PostIdea {
    hook: string;
    angle: string;
    format: string;
}

const QUICK_PROMPTS = [
    { label: "Technology & AI", query: "technology AI trends" },
    { label: "Culture & Society", query: "culture society trends" },
    { label: "Business Strategy", query: "business strategy leadership" },
    { label: "Personal Growth", query: "personal development productivity" },
];

export function ExplorerChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [generatingIdeas, setGeneratingIdeas] = useState<string | null>(null);
    const [selectedTopics, setSelectedTopics] = useState<FeedItem[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendQuery = async (query: string) => {
        if (!query.trim()) return;

        const userMessage: ChatMessage = { role: 'user', content: query };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setLoading(true);
        setSelectedTopics([]); // Clear selection on new search

        try {
            const res = await fetch(`/api/explore/feed?q=${encodeURIComponent(query)}`);
            const data = await res.json();

            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: data.feed?.length > 0
                    ? `Here's what I found on "${query}":`
                    : `I couldn't find trending topics for "${query}". Try a different search.`,
                topics: data.feed || [],
            };
            setMessages(prev => [...prev, assistantMessage]);
        } catch {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "Something went wrong. Please try again.",
            }]);
        } finally {
            setLoading(false);
        }
    };

    const toggleTopicSelection = (topic: FeedItem) => {
        setSelectedTopics(prev => {
            const isSelected = prev.some(t => t.title === topic.title);
            if (isSelected) {
                return prev.filter(t => t.title !== topic.title);
            } else {
                return [...prev, topic];
            }
        });
    };

    const generatePostIdeas = async (topics: FeedItem[]) => {
        const titles = topics.map(t => t.title);
        const displayTitle = titles.length > 1
            ? `${titles.length} combined topics`
            : titles[0];

        setGeneratingIdeas(displayTitle);

        try {
            const res = await fetch('/api/explore/ideas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ titles }), // Send array of titles
            });
            const data = await res.json();

            if (data.ideas && data.ideas.length > 0) {
                const ideaMessage: ChatMessage = {
                    role: 'assistant',
                    content: titles.length > 1
                        ? `Post ideas combining ${titles.length} topics:`
                        : `Post ideas for "${titles[0]}":`,
                    ideas: data.ideas,
                };
                setMessages(prev => [...prev, ideaMessage]);
                setSelectedTopics([]); // Clear selection after generating
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `Couldn't generate ideas. Try again.`,
                }]);
            }
        } catch {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "Failed to generate ideas. Please try again.",
            }]);
        } finally {
            setGeneratingIdeas(null);
        }
    };

    const [savingIdea, setSavingIdea] = useState<string | null>(null);
    const [savedIdeas, setSavedIdeas] = useState<Set<string>>(new Set());

    const saveIdeaToPipeline = async (idea: PostIdea) => {
        setSavingIdea(idea.hook);
        try {
            const res = await fetch('/api/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hook: idea.hook,
                    angle: idea.angle,
                    format: idea.format,
                    source_type: 'explore',
                    stage: 'idea',
                }),
            });
            if (res.ok) {
                setSavedIdeas(prev => new Set([...prev, idea.hook]));
            }
        } catch (err) {
            console.error('Failed to save idea:', err);
        } finally {
            setSavingIdea(null);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendQuery(input);
    };

    const isTopicSelected = (topic: FeedItem) => selectedTopics.some(t => t.title === topic.title);

    return (
        <div className="flex flex-col h-full relative">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-32 md:pb-24">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <Sparkles size={36} className="text-[var(--accent)] mb-4 opacity-50 md:w-12 md:h-12" />
                        <h2 className="text-xl md:text-2xl font-serif text-gray-900 mb-2">What would you like to explore?</h2>
                        <p className="text-sm md:text-base text-gray-500 mb-6 md:mb-8 max-w-md px-4">
                            Ask about any topic or click a suggestion below to discover trending discussions.
                        </p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {QUICK_PROMPTS.map(prompt => (
                                <button
                                    key={prompt.label}
                                    onClick={() => sendQuery(prompt.query)}
                                    className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                                >
                                    {prompt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="max-w-3xl mx-auto space-y-6">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-[var(--accent)] text-white rounded-2xl rounded-tr-sm px-4 py-2' : ''}`}>
                                    {msg.role === 'user' ? (
                                        <p>{msg.content}</p>
                                    ) : (
                                        <div className="space-y-3">
                                            <p className="text-gray-700">{msg.content}</p>

                                            {/* Topic Results with Selection */}
                                            {msg.topics && msg.topics.length > 0 && (
                                                <div className="space-y-3">
                                                    {msg.topics.map((topic, i) => (
                                                        <div
                                                            key={i}
                                                            className={`p-4 bg-white border rounded-lg transition-all ${isTopicSelected(topic)
                                                                ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/20'
                                                                : 'border-gray-100'
                                                                }`}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                {/* Checkbox */}
                                                                <button
                                                                    onClick={() => toggleTopicSelection(topic)}
                                                                    className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${isTopicSelected(topic)
                                                                        ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                                                                        : 'border-gray-300 hover:border-[var(--accent)]'
                                                                        }`}
                                                                >
                                                                    {isTopicSelected(topic) && <Check size={12} />}
                                                                </button>

                                                                <div className="flex-1">
                                                                    <h4 className="text-sm font-medium text-gray-900 mb-1">
                                                                        {topic.title}
                                                                    </h4>
                                                                    <span className="text-xs text-gray-400 block mb-3">{topic.source}</span>

                                                                    {/* CTAs */}
                                                                    <div className="flex gap-2">
                                                                        <a
                                                                            href={topic.sourceUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                                                        >
                                                                            <ExternalLink size={12} />
                                                                            Read
                                                                        </a>
                                                                        <button
                                                                            onClick={() => generatePostIdeas([topic])}
                                                                            disabled={generatingIdeas !== null}
                                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--accent)]/10 text-[var(--accent)] rounded-lg hover:bg-[var(--accent)]/20 transition-colors disabled:opacity-50"
                                                                        >
                                                                            {generatingIdeas === topic.title ? (
                                                                                <Loader2 size={12} className="animate-spin" />
                                                                            ) : (
                                                                                <Lightbulb size={12} />
                                                                            )}
                                                                            Give me post ideas
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Post Ideas */}
                                            {msg.ideas && msg.ideas.length > 0 && (
                                                <div className="space-y-3 mt-4">
                                                    {msg.ideas.map((idea, i) => (
                                                        <div
                                                            key={i}
                                                            className="p-4 bg-gradient-to-br from-[var(--accent)]/5 to-transparent border border-[var(--accent)]/20 rounded-lg"
                                                        >
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="w-5 h-5 bg-[var(--accent)] text-white text-xs rounded-full flex items-center justify-center font-medium">
                                                                        {i + 1}
                                                                    </span>
                                                                    <span className="text-xs text-[var(--accent)] font-medium uppercase tracking-wider">
                                                                        {idea.format}
                                                                    </span>
                                                                </div>
                                                                {savedIdeas.has(idea.hook) ? (
                                                                    <span className="text-xs text-green-600 flex items-center gap-1">
                                                                        <Check size={12} /> Saved
                                                                    </span>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => saveIdeaToPipeline(idea)}
                                                                        disabled={savingIdea === idea.hook}
                                                                        className="text-xs px-2 py-1 bg-[var(--accent)] text-white rounded-md hover:bg-[var(--accent-dark)] transition-colors disabled:opacity-50"
                                                                    >
                                                                        {savingIdea === idea.hook ? (
                                                                            <Loader2 size={12} className="animate-spin" />
                                                                        ) : (
                                                                            'Save to Pipeline'
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <p className="text-gray-900 font-medium mb-1">"{idea.hook}"</p>
                                                            <p className="text-sm text-gray-600">{idea.angle}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="flex items-center gap-2 text-gray-400 text-sm">
                                    <Loader2 size={16} className="animate-spin" />
                                    Searching...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Floating Action Bar for Multi-Select */}
            {selectedTopics.length >= 2 && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-[var(--accent)] text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-4 animate-slide-up">
                    <span className="text-sm font-medium">{selectedTopics.length} topics selected</span>
                    <button
                        onClick={() => generatePostIdeas(selectedTopics)}
                        disabled={generatingIdeas !== null}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-[var(--accent)] rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                        {generatingIdeas ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Lightbulb size={14} />
                        )}
                        Generate Combined Ideas
                    </button>
                    <button
                        onClick={() => setSelectedTopics([])}
                        className="p-1 hover:bg-white/20 rounded transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Sticky Input at Bottom */}
            <div className="border-t bg-white p-4 shrink-0">
                <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about any topic..."
                        disabled={loading}
                        className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white rounded-lg disabled:opacity-30 transition-all"
                    >
                        <Send size={18} />
                    </button>
                </form>
                {messages.length > 0 && (
                    <div className="max-w-3xl mx-auto mt-3 flex flex-wrap gap-2">
                        {QUICK_PROMPTS.map(prompt => (
                            <button
                                key={prompt.label}
                                onClick={() => sendQuery(prompt.query)}
                                className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600 hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] transition-colors"
                            >
                                {prompt.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
