"use client";

import { useState, useEffect } from "react";
import {
    Search, Loader2, Sparkles, ExternalLink, Lightbulb, Check, X, ChevronDown, ChevronUp,
    ChevronRight, ChevronLeft, Compass, RotateCcw, Layers,
} from "lucide-react";
import { toast } from "sonner";

// One step of the user's exploration path: a search and what it found
interface ExploreStep {
    query: string;
    stories: Story[];
    related: RelatedTopic[];
    message?: string;
}

interface RelatedTopic {
    label: string;
    query: string;
}

interface Story {
    title: string;
    sourceUrl: string;
    source: string;
    category: string;
    type?: 'article' | 'question';
    publishedAt?: string;
    summary?: string;
    sourceCount?: number;
    otherSources?: string[];
    relatedBeliefId?: string | null;
    relatedBelief?: string | null;
    beliefStance?: 'supports' | 'challenges' | null;
}

interface PostIdea {
    hook: string;
    angle: string;
    format: string;
    belief?: string; // The user's belief this idea builds on, if any
}

interface TrendGroup {
    category: string;
    trends: { label: string; query: string }[];
}

interface SavedSession {
    trail: ExploreStep[];
    activeStep: number;
    focusKey: string | null;
    ideasByKey: Record<string, PostIdea[]>;
    savedIdeas: string[];
}

const DEFAULT_CATEGORIES = [
    {
        label: "Technology & AI",
        trends: [
            { label: "Generative AI", query: "generative ai trends" },
            { label: "Tech Policy", query: "technology regulation and policy" },
            { label: "Startups", query: "emerging tech startups" }
        ]
    },
    {
        label: "Culture & Society",
        trends: [
            { label: "Digital Culture", query: "internet culture trends" },
            { label: "Future of Work", query: "remote work and office trends" }
        ]
    },
    {
        label: "Business Strategy",
        trends: [
            { label: "Leadership", query: "modern leadership trends" },
            { label: "Market Shifts", query: "global market shifts analysis" },
            { label: "Sustainability", query: "corporate sustainability trends" }
        ]
    },
    {
        label: "Personal Growth",
        trends: [
            { label: "Productivity", query: "productivity science news" },
            { label: "Psychology", query: "psychology and mindset research" },
            { label: "Learning", query: "accelerated learning techniques" }
        ]
    },
];

const PLATFORMS = [
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'twitter', label: 'X' },
    { value: 'newsletter', label: 'Newsletter' },
    { value: 'blog', label: 'Blog' },
];

const TONES = [
    { value: 'provocative', label: 'Provocative' },
    { value: 'educational', label: 'Educational' },
    { value: 'balanced', label: 'Balanced' },
    { value: 'storytelling', label: 'Storytelling' },
];

const SESSION_KEY = 'cd-explore-workspace';
const TRENDS_KEY = 'cd-explore-trends';
const TRENDS_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_TRAIL = 8;
const COMBINED_KEY = 'combined';

// Storage can be unavailable (private mode, blocked site data); Explore still works without it.
function readStorage<T>(key: string): T | null {
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) as T : null;
    } catch {
        return null;
    }
}

function writeStorage(key: string, value: unknown) {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Ignore quota or access errors
    }
}

function timeAgo(iso?: string): string | null {
    if (!iso) return null;
    const ms = Date.now() - Date.parse(iso);
    if (Number.isNaN(ms) || ms < 0) return null;
    const hours = Math.floor(ms / 3_600_000);
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return days < 30 ? `${days}d ago` : new Date(iso).toLocaleDateString();
}

function storyMeta(story: Story): string {
    return [
        story.source,
        story.sourceCount && story.sourceCount > 1
            ? `${story.sourceCount - 1} more outlet${story.sourceCount > 2 ? 's' : ''}`
            : null,
        timeAgo(story.publishedAt),
    ].filter(Boolean).join(' · ');
}

function beliefLabel(story: Story): string {
    if (story.beliefStance === 'supports') return 'Supports your belief';
    if (story.beliefStance === 'challenges') return 'Challenges your belief';
    return 'Touches your belief';
}

export function ExploreWorkspace() {
    const [trail, setTrail] = useState<ExploreStep[]>([]);
    const [activeStep, setActiveStep] = useState(0);
    const [focusKey, setFocusKey] = useState<string | null>(null);
    const [showDetailOnMobile, setShowDetailOnMobile] = useState(false);
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [ideasByKey, setIdeasByKey] = useState<Record<string, PostIdea[]>>({});
    const [savedIdeas, setSavedIdeas] = useState<Set<string>>(new Set());
    const [restored, setRestored] = useState(false);

    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [generatingKey, setGeneratingKey] = useState<string | null>(null);
    const [savingIdea, setSavingIdea] = useState<string | null>(null);
    const [lens, setLens] = useState<'default' | 'beginner'>('default');
    const [platform, setPlatform] = useState('linkedin');
    const [tone, setTone] = useState('provocative');

    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [trendCategories, setTrendCategories] = useState(DEFAULT_CATEGORIES);
    const [fetchingTrends, setFetchingTrends] = useState(false);

    const step = trail[activeStep];
    const stories = step?.stories ?? [];
    const selectedStories = stories.filter(s => selectedKeys.includes(s.sourceUrl));
    const focusedStory = stories.find(s => s.sourceUrl === focusKey) ?? null;
    const showingCombined = focusKey === COMBINED_KEY && selectedStories.length >= 2;

    useEffect(() => {
        // Merge fetched trends with existing structure
        const applyTrendGroups = (groups: TrendGroup[]) => {
            setTrendCategories(prev => prev.map(cat => {
                const newGroup = groups.find(g => g.category === cat.label);
                return newGroup && newGroup.trends.length > 0
                    ? { ...cat, trends: newGroup.trends }
                    : cat;
            }));
        };

        const fetchRealTrends = async () => {
            const cached = readStorage<{ groups: TrendGroup[]; savedAt: number }>(TRENDS_KEY);
            if (cached && Date.now() - cached.savedAt < TRENDS_TTL_MS) {
                applyTrendGroups(cached.groups);
                return;
            }

            setFetchingTrends(true);
            try {
                const res = await fetch('/api/explore/trends', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ categories: DEFAULT_CATEGORIES.map(c => c.label) })
                });
                const data = await res.json();
                if (data.groups && Array.isArray(data.groups)) {
                    applyTrendGroups(data.groups);
                    writeStorage(TRENDS_KEY, { groups: data.groups, savedAt: Date.now() });
                }
            } catch (e) {
                console.warn("Failed to fetch real-time trends, using defaults", e);
            } finally {
                setFetchingTrends(false);
            }
        };

        fetchRealTrends();
    }, []);

    // Restore the last exploration so a refresh or tab switch doesn't lose it
    useEffect(() => {
        const saved = readStorage<SavedSession>(SESSION_KEY);
        if (saved?.trail?.length) {
            setTrail(saved.trail);
            setActiveStep(Math.min(saved.activeStep ?? 0, saved.trail.length - 1));
            setFocusKey(saved.focusKey ?? null);
            setIdeasByKey(saved.ideasByKey ?? {});
            setSavedIdeas(new Set(saved.savedIdeas ?? []));
        }
        setRestored(true);
    }, []);

    useEffect(() => {
        if (!restored) return;
        const session: SavedSession = {
            trail,
            activeStep,
            focusKey: focusKey === COMBINED_KEY ? null : focusKey,
            ideasByKey,
            savedIdeas: [...savedIdeas],
        };
        writeStorage(SESSION_KEY, session);
    }, [trail, activeStep, focusKey, ideasByKey, savedIdeas, restored]);

    const runSearch = async (query: string) => {
        if (!query.trim() || loading) return;
        setInput("");
        setLoading(true);
        setSelectedKeys([]);

        let next: ExploreStep;
        try {
            const res = await fetch(`/api/explore/feed?q=${encodeURIComponent(query)}&lens=${lens}`);
            const data = await res.json();
            next = {
                query,
                stories: data.feed || [],
                related: data.related || [],
                message: data.feed?.length ? undefined : (data.message || data.error || `Nothing recent found for "${query}". Try a broader search.`),
            };
        } catch {
            next = { query, stories: [], related: [], message: "Something went wrong. Please try again." };
        }

        // A new search branches from the step being viewed, so going back and searching again replaces what came after
        const kept = trail.slice(0, activeStep + 1);
        const updated = [...kept, next].slice(-MAX_TRAIL);
        setTrail(updated);
        setActiveStep(updated.length - 1);
        setFocusKey(next.stories[0]?.sourceUrl ?? null);
        setShowDetailOnMobile(false);
        setLoading(false);
    };

    const goToStep = (index: number) => {
        setActiveStep(index);
        setSelectedKeys([]);
        setFocusKey(trail[index]?.stories[0]?.sourceUrl ?? null);
        setShowDetailOnMobile(false);
    };

    const startOver = () => {
        setTrail([]);
        setActiveStep(0);
        setFocusKey(null);
        setSelectedKeys([]);
        setIdeasByKey({});
        setSavedIdeas(new Set());
    };

    const openStory = (story: Story) => {
        setFocusKey(story.sourceUrl);
        setShowDetailOnMobile(true);
    };

    const toggleSelected = (story: Story) => {
        setSelectedKeys(prev => prev.includes(story.sourceUrl)
            ? prev.filter(k => k !== story.sourceUrl)
            : [...prev, story.sourceUrl]);
    };

    const generateIdeas = async (key: string, sources: Story[]) => {
        setGeneratingKey(key);
        try {
            const res = await fetch('/api/explore/ideas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    titles: sources.map(s => s.title),
                    context: step?.query,
                    platform,
                    tone,
                    relatedBeliefIds: sources.map(s => s.relatedBeliefId).filter(Boolean),
                }),
            });
            const data = await res.json();
            if (data.ideas?.length) {
                setIdeasByKey(prev => ({ ...prev, [key]: data.ideas }));
            } else {
                toast.error(data.message || "Couldn't generate ideas. Try again.");
            }
        } catch {
            toast.error("Failed to generate ideas. Please try again.");
        } finally {
            setGeneratingKey(null);
        }
    };

    const combineSelected = () => {
        setFocusKey(COMBINED_KEY);
        setShowDetailOnMobile(true);
        generateIdeas(COMBINED_KEY, selectedStories);
    };

    const saveIdeaToPipeline = async (idea: PostIdea, sources: Story[]) => {
        setSavingIdea(idea.hook);

        // Construct rich context for the Development Wizard
        let sourceContext = "";
        if (step?.query) sourceContext += `Original Search Query: "${step.query}"\n\n`;

        if (sources.length > 0) {
            sourceContext += `Source Topics:\n${sources.map(t => `- ${t.title} (${t.sourceUrl})`).join('\n')}\n\n`;

            // Fetch Full Content for the primary source
            const primarySource = sources[0];
            try {
                const scrapeRes = await fetch('/api/brain/read-url', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: primarySource.sourceUrl })
                });

                if (scrapeRes.ok) {
                    const scrapeData = await scrapeRes.json();
                    if (scrapeData.content) {
                        sourceContext += `--- PRIMARY SOURCE CONTENT ---\nTitle: ${scrapeData.title}\nURL: ${primarySource.sourceUrl}\n\n${scrapeData.content.substring(0, 15000)}\n------------------------------\n`;
                    }
                }
            } catch (e) {
                console.warn("Failed to scrape source context", e);
            }
        }

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
                    brain_metadata: { sourceContext }
                }),
            });
            if (res.ok) {
                setSavedIdeas(prev => new Set([...prev, idea.hook]));
                toast.success("Idea saved to Pipeline", {
                    action: {
                        label: "View Pipeline",
                        onClick: () => window.location.href = "/workspace?tab=pipeline"
                    }
                });
            }
        } catch (err) {
            console.error('Failed to save idea:', err);
        } finally {
            setSavingIdea(null);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        runSearch(input);
    };

    const renderIdeas = (key: string, sources: Story[]) => {
        const ideas = ideasByKey[key];
        const generating = generatingKey === key;

        return (
            <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-ink">Post angles</h4>
                    {ideas && (
                        <button
                            onClick={() => generateIdeas(key, sources)}
                            disabled={generatingKey !== null}
                            className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 disabled:opacity-50"
                        >
                            <RotateCcw size={12} /> Regenerate
                        </button>
                    )}
                </div>

                {!ideas && (
                    <button
                        onClick={() => generateIdeas(key, sources)}
                        disabled={generatingKey !== null}
                        className="btn btn-primary w-full disabled:opacity-50"
                    >
                        {generating ? <Loader2 size={16} className="animate-spin" /> : <Lightbulb size={16} />}
                        {generating ? 'Finding angles...' : `Get ${PLATFORMS.find(p => p.value === platform)?.label} post ideas`}
                    </button>
                )}

                {ideas && (
                    <div className={`space-y-3 ${generating ? 'opacity-50' : ''}`}>
                        {ideas.map((idea, i) => (
                            <div key={i} className="p-4 bg-surface rounded-tile shadow-card">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs h-6 px-2.5 inline-flex items-center rounded-full bg-ember-50 text-ember-700 font-medium">
                                        {idea.format}
                                    </span>
                                    {savedIdeas.has(idea.hook) ? (
                                        <span className="text-xs text-sage-700 flex items-center gap-1">
                                            <Check size={12} /> Saved
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => saveIdeaToPipeline(idea, sources)}
                                            disabled={savingIdea === idea.hook}
                                            className="text-xs h-7 px-3 rounded-full bg-ember-500 text-white font-medium hover:bg-ember-600 transition-colors disabled:opacity-50"
                                        >
                                            {savingIdea === idea.hook ? <Loader2 size={12} className="animate-spin" /> : 'Save to Pipeline'}
                                        </button>
                                    )}
                                </div>
                                <p className="text-ink font-medium mb-1">&ldquo;{idea.hook}&rdquo;</p>
                                <p className="text-sm text-ink-soft">{idea.angle}</p>
                                {idea.belief && (
                                    <p className="text-xs text-ink-muted mt-2">Builds on your belief: &ldquo;{idea.belief}&rdquo;</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderDetail = () => {
        if (showingCombined) {
            return (
                <div>
                    <span className="text-xs font-medium text-ink-muted flex items-center gap-1 mb-2">
                        <Layers size={12} /> Combining {selectedStories.length} stories
                    </span>
                    <ul className="space-y-2">
                        {selectedStories.map(s => (
                            <li key={s.sourceUrl} className="text-sm text-ink">
                                {s.title}
                                <span className="block text-xs text-ink-muted">{storyMeta(s)}</span>
                            </li>
                        ))}
                    </ul>
                    {renderIdeas(COMBINED_KEY, selectedStories)}
                </div>
            );
        }

        if (!focusedStory) {
            return (
                <div className="h-full flex flex-col items-center justify-center text-center text-sm text-ink-muted px-6">
                    <Lightbulb size={24} className="mb-2" />
                    Pick a story to see what it&apos;s about and get post angles.
                </div>
            );
        }

        return (
            <div>
                <h3 className="text-xl font-medium tracking-[-0.01em] text-ink leading-snug">{focusedStory.title}</h3>
                <p className="text-xs text-ink-muted mt-1">{storyMeta(focusedStory)}</p>
                {focusedStory.otherSources && focusedStory.otherSources.length > 0 && (
                    <p className="text-xs text-ink-muted mt-1">Also covered by {focusedStory.otherSources.join(', ')}</p>
                )}
                {focusedStory.summary && (
                    <p className="text-sm text-ink-soft leading-relaxed mt-3">{focusedStory.summary}</p>
                )}
                {focusedStory.relatedBelief && (
                    <p className="text-sm text-ember-700 mt-3">
                        {beliefLabel(focusedStory)}: &ldquo;{focusedStory.relatedBelief}&rdquo;
                    </p>
                )}
                <a
                    href={focusedStory.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-4 h-8 px-3 rounded-full bg-canvas shadow-raised text-xs text-ink-soft hover:text-ink active:shadow-pressed transition-shadow"
                >
                    <ExternalLink size={12} /> Read the full story
                </a>
                {renderIdeas(focusedStory.sourceUrl, [focusedStory])}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full relative">
            {/* Search and settings */}
            <div className="px-4 md:px-6 pt-4 md:pt-6 pb-3 shrink-0">
                <form onSubmit={handleSubmit} className="max-w-5xl mx-auto relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Search a topic to explore..."
                        disabled={loading}
                        className="w-full h-12 pl-11 pr-14 bg-canvas shadow-well rounded-full text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 transition-all"
                    />
                    <button
                        type="submit"
                        aria-label="Search"
                        disabled={!input.trim() || loading}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-ember-500 text-white shadow-ember hover:bg-ember-600 disabled:opacity-30 disabled:shadow-none transition-all"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
                    </button>
                </form>
                <div className="max-w-5xl mx-auto mt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex bg-canvas shadow-pressed p-1 rounded-full">
                        <button
                            onClick={() => setLens('default')}
                            className={`h-7 px-3 rounded-full text-xs font-medium transition-all ${lens === 'default' ? 'bg-surface shadow-raised text-ink' : 'text-ink-muted hover:text-ink'}`}
                        >
                            Professional
                        </button>
                        <button
                            onClick={() => setLens('beginner')}
                            className={`h-7 px-3 rounded-full text-xs font-medium transition-all ${lens === 'beginner' ? 'bg-ember-500 text-white shadow-ember' : 'text-ink-muted hover:text-ink'}`}
                        >
                            Beginner&apos;s Lens
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={platform}
                            onChange={(e) => setPlatform(e.target.value)}
                            aria-label="Platform for post ideas"
                            className="h-8 text-xs text-ink-soft bg-canvas shadow-raised rounded-full px-3 border-0 focus:outline-none focus:ring-2 focus:ring-ember-200"
                        >
                            {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                        <select
                            value={tone}
                            onChange={(e) => setTone(e.target.value)}
                            aria-label="Tone for post ideas"
                            className="h-8 text-xs text-ink-soft bg-canvas shadow-raised rounded-full px-3 border-0 focus:outline-none focus:ring-2 focus:ring-ember-200"
                        >
                            {TONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        {trail.length > 0 && (
                            <button
                                onClick={startOver}
                                className="flex items-center gap-1 h-8 text-xs text-ink-muted hover:text-ink px-2"
                            >
                                <RotateCcw size={12} /> New
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {trail.length === 0 ? (
                /* Starting point */
                <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center text-center p-6">
                    <div className="w-14 h-14 mb-5 rounded-full bg-canvas shadow-raised flex items-center justify-center"><Sparkles size={24} className="text-ember-500" /></div>
                    <h2 className="text-2xl md:text-[32px] md:leading-tight font-medium tracking-[-0.02em] text-ink mb-2">What would you like to explore?</h2>
                    <p className="text-sm md:text-base text-ink-soft mb-6 max-w-md">
                        Search a topic or pick a trend. Each search suggests where to go next, so you can follow a thread to something worth writing.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {trendCategories.map(cat => (
                            <button
                                key={cat.label}
                                onClick={() => setSelectedCategory(prev => prev === cat.label ? null : cat.label)}
                                className={`h-10 px-4 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${selectedCategory === cat.label
                                    ? 'bg-ember-500 text-white shadow-ember'
                                    : 'bg-canvas shadow-raised text-ink-soft hover:text-ink active:shadow-pressed'
                                    }`}
                            >
                                {cat.label}
                                {selectedCategory === cat.label ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                        ))}
                    </div>
                    {selectedCategory && (
                        <div className="flex flex-wrap justify-center gap-2 max-w-lg mt-5 p-4 bg-canvas shadow-pressed rounded-tile">
                            <span className="w-full text-center text-xs font-medium text-ink-muted mb-1">
                                {fetchingTrends ? "Updating trends..." : `Trending in ${selectedCategory}`}
                            </span>
                            {trendCategories.find(c => c.label === selectedCategory)?.trends.map(trend => (
                                <button
                                    key={trend.label}
                                    onClick={() => runSearch(trend.query)}
                                    className="h-8 px-3 bg-surface shadow-raised text-ink-soft rounded-full text-xs font-medium hover:text-ember-600 active:shadow-pressed transition-all"
                                >
                                    {trend.label}
                                </button>
                            ))}
                        </div>
                    )}
                    {loading && (
                        <div className="mt-6 flex items-center gap-2 text-ink-muted text-sm">
                            <Loader2 size={16} className="animate-spin" /> Searching...
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {/* Exploration path */}
                    <nav aria-label="Exploration path" className="px-4 md:px-6 pb-3 shrink-0 overflow-x-auto">
                        <ol className="max-w-5xl mx-auto flex items-center gap-1 text-xs whitespace-nowrap">
                            {trail.map((s, i) => (
                                <li key={`${s.query}-${i}`} className="flex items-center gap-1">
                                    {i > 0 && <ChevronRight size={12} className="text-ink-muted/60" />}
                                    <button
                                        onClick={() => goToStep(i)}
                                        aria-current={i === activeStep ? 'step' : undefined}
                                        className={`h-7 px-3 rounded-full ${i === activeStep ? 'bg-canvas shadow-pressed text-ink font-medium' : 'text-ink-muted hover:text-ink'}`}
                                    >
                                        {s.query}
                                    </button>
                                </li>
                            ))}
                            {loading && <li className="flex items-center gap-1 text-ink-muted"><ChevronRight size={12} /><Loader2 size={12} className="animate-spin" /></li>}
                        </ol>
                    </nav>

                    <div className="flex-1 min-h-0 max-w-5xl md:max-w-[67rem] w-full mx-auto flex md:gap-4 md:px-6 md:pb-6">
                        {/* Stories for the current step */}
                        <section
                            aria-label="Stories"
                            className={`w-full md:w-[45%] overflow-y-auto p-4 md:p-4 pb-28 md:pb-4 md:bg-canvas md:shadow-pressed md:rounded-card ${showDetailOnMobile ? 'hidden md:block' : ''}`}
                        >
                            {step?.related && step.related.length > 0 && (
                                <div className="mb-4">
                                    <span className="text-xs font-medium text-ink-muted flex items-center gap-1 mb-2">
                                        <Compass size={12} /> Explore next
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                        {step.related.map(r => (
                                            <button
                                                key={r.label}
                                                onClick={() => runSearch(r.query)}
                                                disabled={loading}
                                                className="h-8 px-3 text-xs font-medium bg-canvas shadow-raised text-ink-soft rounded-full hover:text-ember-600 active:shadow-pressed transition-all disabled:opacity-50"
                                            >
                                                {r.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {step?.message && <p className="text-sm text-ink-muted">{step.message}</p>}

                            <ul className="space-y-2">
                                {stories.map(story => {
                                    const focused = story.sourceUrl === focusKey;
                                    const selected = selectedKeys.includes(story.sourceUrl);
                                    return (
                                        <li key={story.sourceUrl}>
                                            <div
                                                className={`flex items-start gap-3 p-3.5 rounded-tile bg-surface transition-all ${focused
                                                    ? 'shadow-card ring-2 ring-ember-200'
                                                    : 'shadow-card hover:shadow-float'
                                                    }`}
                                            >
                                                <button
                                                    onClick={() => toggleSelected(story)}
                                                    aria-label={selected ? 'Remove from combination' : 'Add to combination'}
                                                    className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all ${selected
                                                        ? 'bg-ember-500 text-white shadow-ember'
                                                        : 'bg-canvas shadow-well hover:ring-2 hover:ring-ember-200'
                                                        }`}
                                                >
                                                    {selected && <Check size={10} />}
                                                </button>
                                                <button onClick={() => openStory(story)} className="flex-1 text-left">
                                                    {story.type === 'question' && (
                                                        <span className="text-xs font-medium text-sand-700">Question · </span>
                                                    )}
                                                    <span className="text-sm font-medium text-ink">{story.title}</span>
                                                    <span className="block text-xs text-ink-muted mt-0.5">{storyMeta(story)}</span>
                                                    {story.relatedBelief && (
                                                        <span className="block text-xs text-ember-700 mt-1 line-clamp-1">
                                                            {beliefLabel(story)}
                                                        </span>
                                                    )}
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>

                        {/* The story being looked at, with its angles */}
                        <section
                            aria-label="Story details"
                            className={`flex-1 overflow-y-auto p-4 md:p-6 pb-28 md:pb-6 md:bg-surface md:shadow-card md:rounded-card ${showDetailOnMobile ? 'block' : 'hidden md:block'}`}
                        >
                            <button
                                onClick={() => setShowDetailOnMobile(false)}
                                className="md:hidden flex items-center gap-1 text-xs text-ink-muted mb-3"
                            >
                                <ChevronLeft size={14} /> All stories
                            </button>
                            {renderDetail()}
                        </section>
                    </div>
                </>
            )}

            {/* Combine several stories into one set of angles */}
            {selectedStories.length >= 2 && !showingCombined && (
                <div className="absolute bottom-28 md:bottom-10 left-1/2 -translate-x-1/2 bg-ink text-white pl-5 pr-2 h-12 rounded-full shadow-float flex items-center gap-3">
                    <span className="text-sm">{selectedStories.length} stories selected</span>
                    <button
                        onClick={combineSelected}
                        disabled={generatingKey !== null}
                        className="flex items-center gap-1.5 h-9 px-4 bg-ember-500 text-white rounded-full text-sm font-medium hover:bg-ember-600 transition-colors disabled:opacity-50"
                    >
                        <Layers size={14} /> Combine into ideas
                    </button>
                    <button onClick={() => setSelectedKeys([])} aria-label="Clear selection" className="w-8 h-8 flex items-center justify-center hover:bg-white/15 rounded-full">
                        <X size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}
