"use client";

import { useState, useEffect } from "react";
import {
    Search, Loader2, ExternalLink, Lightbulb, Check, X,
    ChevronRight, ChevronLeft, RotateCcw, Layers, Bookmark,
} from "lucide-react";
import { AnimatedIcon } from "@/components/icons/AnimatedIcon";
import { CompassIcon, RefreshCWIcon, SparklesIcon } from "@/components/icons/animated";
import { toast } from "sonner";
import type { ExploreOrigin } from "@/types";
import { FOR_YOU, shuffle } from "@/lib/explore/trends";
import { MOMENTUM_HINTS, MOMENTUM_LABELS, storyMomentum, topicMomentum, type Momentum } from "@/lib/explore/momentum";

// One step of the user's exploration path: a search and what it found
interface ExploreStep {
    id?: string; // Lets results that arrive later find their step
    query: string;
    label?: string; // Short name from the search planner, shown in the path
    intent?: 'learn' | 'news';
    stories: Story[];
    related: RelatedTopic[];
    message?: string;
    // What people are asking about the search, loaded after the stories
    questions?: Story[];
    questionsLoading?: boolean;
    // The takes the stories make, and the one nobody is making
    debate?: Debate | null;
    debateLoading?: boolean;
}

interface Debate {
    takes: { take: string; stories: number[] }[];
    gap: { take: string; why: string } | null;
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
    kind?: string;
    takeaway?: string;
}

interface AudienceQuestion {
    question: string;
    theme: string;
    url: string;
    source: string;
    detail?: string;
}

interface DeepDive {
    summary: string;
    keyPoints: string[];
    viewpoints: { who: string; view: string }[];
    openQuestions: string[];
    readFrom?: string;
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
    divesByKey?: Record<string, DeepDive>;
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

const SESSION_KEY = 'cd-explore-workspace';
const TRENDS_KEY = 'cd-explore-trends-v3';
const TRENDS_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_TRAIL = 8;
// Tabs shown beside "For you"; each visit picks a random few from the writer's saved set
const TABS_SHOWN = 4;
const COMBINED_KEY = 'combined';
const GAP_KEY = 'gap';

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

// "For you" first, then a random few of the other categories that have topics
function rotateTrendGroups(groups: TrendGroup[]) {
    const withTopics = groups.filter(g => g.trends?.length > 0);
    const forYou = withTopics.filter(g => g.category === FOR_YOU);
    const others = shuffle(withTopics.filter(g => g.category !== FOR_YOU)).slice(0, TABS_SHOWN);
    return [...forYou, ...others].map(g => ({ label: g.category, trends: g.trends }));
}

function timeAgo(iso?: string): string | null {
    if (!iso) return null;
    const ms = Date.now() - Date.parse(iso);
    if (Number.isNaN(ms) || ms < 0) return null;
    const hours = Math.floor(ms / 3_600_000);
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return months < 12 ? `${months}mo ago` : `${Math.floor(days / 365)}y ago`;
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

const MOMENTUM_STYLES: Record<Momentum, string> = {
    rising: 'bg-ember-50 text-ember-700',
    crowded: 'bg-sand-100 text-sand-700',
    evergreen: 'bg-sage-100 text-sage-700',
};

function MomentumTag({ tag }: { tag: Momentum }) {
    return (
        <span title={MOMENTUM_HINTS[tag]} className={`inline-block px-1.5 py-px rounded-full text-[11px] font-medium mr-1.5 ${MOMENTUM_STYLES[tag]}`}>
            {MOMENTUM_LABELS[tag]}
        </span>
    );
}

// Questions open in the same panel as stories, so ideas, combining and saving work on them too
function questionToStory(q: AudienceQuestion): Story {
    return {
        title: q.question,
        sourceUrl: q.url,
        source: q.source,
        category: q.theme,
        kind: 'question',
        summary: q.detail,
    };
}

// Questions in the order of their first theme, grouped under it
function groupByTheme(questions: Story[]): [string, Story[]][] {
    const groups = new Map<string, Story[]>();
    for (const q of questions) groups.set(q.category, [...(groups.get(q.category) ?? []), q]);
    return [...groups.entries()];
}

// Saved topics share the saved set with idea hooks, so they persist with the session
function topicKey(story: Story): string {
    return `topic:${story.sourceUrl}`;
}

function hostOf(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
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
    const [divesByKey, setDivesByKey] = useState<Record<string, DeepDive | 'loading' | 'failed'>>({});
    const [savedIdeas, setSavedIdeas] = useState<Set<string>>(new Set());
    const [restored, setRestored] = useState(false);

    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [generatingKey, setGeneratingKey] = useState<string | null>(null);
    const [savingIdea, setSavingIdea] = useState<string | null>(null);
    // The story whose "Save topic" note box is open, and what has been typed in it
    const [noteFor, setNoteFor] = useState<string | null>(null);
    const [note, setNote] = useState("");
    const [paneView, setPaneView] = useState<'stories' | 'questions'>('stories');

    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    // "For you" is filled from the writer's profile and only shows once it has topics
    const [trendCategories, setTrendCategories] = useState([{ label: FOR_YOU, trends: [] as TrendGroup['trends'] }, ...DEFAULT_CATEGORIES]);
    const [fetchingTrends, setFetchingTrends] = useState(false);
    const [refreshingTopics, setRefreshingTopics] = useState(false);

    const visibleCategories = trendCategories.filter(c => c.trends.length > 0);
    const activeCategory = visibleCategories.some(c => c.label === selectedCategory)
        ? selectedCategory!
        : visibleCategories[0]?.label;
    const step = trail[activeStep];
    const stories = step?.stories ?? [];
    const questions = step?.questions ?? [];
    const topic = topicMomentum(stories);
    const allItems = [...stories, ...questions.filter(q => !stories.some(s => s.sourceUrl === q.sourceUrl))];
    const selectedStories = allItems.filter(s => selectedKeys.includes(s.sourceUrl));
    const focusedStory = allItems.find(s => s.sourceUrl === focusKey) ?? null;
    const focusedMomentum = focusedStory && focusedStory.kind !== 'question' ? storyMomentum(focusedStory) : null;
    const showingCombined = focusKey === COMBINED_KEY && selectedStories.length >= 2;
    const showingGap = focusKey === GAP_KEY && Boolean(step?.debate?.gap);

    useEffect(() => {
        const fetchRealTrends = async () => {
            const cached = readStorage<{ groups: TrendGroup[]; savedAt: number }>(TRENDS_KEY);
            if (cached && Date.now() - cached.savedAt < TRENDS_TTL_MS) {
                const rotated = rotateTrendGroups(cached.groups);
                if (rotated.length > 0) setTrendCategories(rotated);
                return;
            }

            setFetchingTrends(true);
            try {
                const res = await fetch('/api/explore/trends', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode: 'discover' })
                });
                const data = await res.json();
                if (Array.isArray(data.groups)) {
                    const rotated = rotateTrendGroups(data.groups);
                    if (rotated.length > 0) {
                        setTrendCategories(rotated);
                        writeStorage(TRENDS_KEY, { groups: data.groups, savedAt: Date.now() });
                    }
                }
            } catch (e) {
                console.warn("Failed to fetch real-time trends, using defaults", e);
            } finally {
                setFetchingTrends(false);
            }
        };

        fetchRealTrends();
    }, []);

    // A new set of categories and topics, skipping the categories the writer has just seen
    const refreshTopics = async () => {
        if (refreshingTopics) return;
        setRefreshingTopics(true);
        try {
            const res = await fetch('/api/explore/trends', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: 'discover',
                    refresh: true,
                    exclude: trendCategories.map(c => c.label).filter(label => label !== FOR_YOU),
                }),
            });
            const data = await res.json();
            const rotated = Array.isArray(data.groups) ? rotateTrendGroups(data.groups) : [];
            if (!res.ok || rotated.length === 0) {
                toast.error(data.error || "Couldn't find new topics right now. Try again in a bit.");
                return;
            }
            setTrendCategories(rotated);
            setSelectedCategory(null);
            writeStorage(TRENDS_KEY, { groups: data.groups, savedAt: Date.now() });
        } catch {
            toast.error("Couldn't refresh topics. Try again.");
        } finally {
            setRefreshingTopics(false);
        }
    };

    // Restore the last exploration so a refresh or tab switch doesn't lose it
    useEffect(() => {
        const saved = readStorage<SavedSession>(SESSION_KEY);
        if (saved?.trail?.length) {
            setTrail(saved.trail.map(s => ({ ...s, questionsLoading: false, debateLoading: false })));
            setActiveStep(Math.min(saved.activeStep ?? 0, saved.trail.length - 1));
            setFocusKey(saved.focusKey ?? null);
            setIdeasByKey(saved.ideasByKey ?? {});
            setSavedIdeas(new Set(saved.savedIdeas ?? []));
            setDivesByKey(saved.divesByKey ?? {});
        }
        setRestored(true);
    }, []);

    useEffect(() => {
        if (!restored) return;
        const session: SavedSession = {
            trail,
            activeStep,
            focusKey: focusKey === COMBINED_KEY || focusKey === GAP_KEY ? null : focusKey,
            ideasByKey,
            savedIdeas: [...savedIdeas],
            divesByKey: Object.fromEntries(Object.entries(divesByKey).filter(([, d]) => typeof d === 'object')) as Record<string, DeepDive>,
        };
        writeStorage(SESSION_KEY, session);
    }, [trail, activeStep, focusKey, ideasByKey, savedIdeas, divesByKey, restored]);

    // Read the open story once, so the panel can brief the writer on what it actually says
    const focusedUrl = focusedStory?.sourceUrl;
    useEffect(() => {
        if (!restored || !focusedStory || divesByKey[focusedStory.sourceUrl]) return;
        const story = focusedStory;
        setDivesByKey(prev => ({ ...prev, [story.sourceUrl]: 'loading' }));
        (async () => {
            let result: DeepDive | 'failed' = 'failed';
            try {
                const res = await fetch('/api/explore/deep-dive', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: story.sourceUrl, title: story.title, query: step?.query, kind: story.kind }),
                });
                const data = await res.json();
                if (res.ok && data.dive?.summary) result = data.dive;
            } catch {
                // The snippet still shows; the deep dive is extra
            }
            setDivesByKey(prev => ({ ...prev, [story.sourceUrl]: result }));
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusedUrl, restored]);

    const runSearch = async (query: string) => {
        if (!query.trim() || loading) return;
        setInput("");
        setLoading(true);
        setSelectedKeys([]);

        let next: ExploreStep;
        try {
            const res = await fetch(`/api/explore/feed?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            next = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                query,
                label: data.label,
                intent: data.intent,
                stories: data.feed || [],
                related: data.related || [],
                message: data.feed?.length ? undefined : (data.message || data.error || `Nothing found for "${query}". Try a broader search.`),
                questionsLoading: true,
                debateLoading: (data.feed?.length ?? 0) >= 3,
            };
        } catch {
            next = { query, stories: [], related: [], message: "Something went wrong. Please try again.", questionsLoading: true };
        }

        // A new search branches from the step being viewed, so going back and searching again replaces what came after
        const kept = trail.slice(0, activeStep + 1);
        const updated = [...kept, next].slice(-MAX_TRAIL);
        setTrail(updated);
        setActiveStep(updated.length - 1);
        setFocusKey(next.stories[0]?.sourceUrl ?? null);
        setShowDetailOnMobile(false);
        setPaneView('stories');
        setLoading(false);
        loadQuestions(next);
        if (next.debateLoading) loadDebate(next);
    };

    const updateStep = (target: ExploreStep, patch: Partial<ExploreStep>) =>
        setTrail(prev => prev.map(s => (s.id ? s.id === target.id : s === target) ? { ...s, ...patch } : s));

    // Maps the takes the stories already make, once they are on screen
    const loadDebate = async (target: ExploreStep) => {
        let debate: Debate | null = null;
        try {
            const res = await fetch('/api/explore/debate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: target.query,
                    stories: target.stories.map(s => ({ title: s.title, summary: s.takeaway || s.summary, source: s.source })),
                }),
            });
            const data = await res.json();
            if (res.ok && data.debate) debate = data.debate;
        } catch {
            // The map is extra; the stories stand on their own
        }
        updateStep(target, { debate, debateLoading: false });
    };

    // Fills in what people are asking once the stories are on screen
    const loadQuestions = async (target: ExploreStep) => {
        let found: Story[] = [];
        try {
            const res = await fetch(`/api/explore/questions?q=${encodeURIComponent(target.query)}`);
            const data = await res.json();
            if (res.ok && Array.isArray(data.questions)) found = data.questions.map(questionToStory);
        } catch {
            // Questions are extra; the stories stand on their own
        }
        updateStep(target, { questions: found, questionsLoading: false });
    };

    const goToStep = (index: number) => {
        setActiveStep(index);
        setSelectedKeys([]);
        setFocusKey(trail[index]?.stories[0]?.sourceUrl ?? null);
        setShowDetailOnMobile(false);
        setPaneView('stories');
    };

    const startOver = () => {
        setTrail([]);
        setActiveStep(0);
        setFocusKey(null);
        setSelectedKeys([]);
        setIdeasByKey({});
        setSavedIdeas(new Set());
        setDivesByKey({});
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

    const diveOf = (story: Story): DeepDive | null => {
        const dive = divesByKey[story.sourceUrl];
        return typeof dive === 'object' ? dive : null;
    };

    // The fullest account of a story available: the deep dive when it has been read, else the snippet
    const briefing = (story: Story): string | undefined => {
        const dive = diveOf(story);
        return dive ? [dive.summary, ...dive.keyPoints].join(' ') : story.summary;
    };

    const generateIdeas = async (key: string, sources: Story[], context = step?.query) => {
        setGeneratingKey(key);
        try {
            const res = await fetch('/api/explore/ideas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    titles: sources.map(s => s.title),
                    sources: sources.map(s => ({ title: s.title, summary: briefing(s), takeaway: s.takeaway })),
                    context,
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

    // Everything the Development Wizard needs about where an idea or topic came from
    const buildSourceContext = async (sources: Story[]): Promise<string> => {
        let sourceContext = "";
        if (step?.query) sourceContext += `Original Search Query: "${step.query}"\n\n`;

        if (sources.length > 0) {
            sourceContext += `Source Topics:\n${sources.map(t => `- ${t.title} (${t.sourceUrl})${t.takeaway ? `\n  Takeaway: ${t.takeaway}` : ''}${diveOf(t) ? `\n  Deep dive: ${briefing(t)}` : ''}`).join('\n')}\n\n`;

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
        return sourceContext;
    };

    const saveIdeaToPipeline = async (idea: PostIdea, sources: Story[]) => {
        setSavingIdea(idea.hook);
        const sourceContext = await buildSourceContext(sources);

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
                    brain_metadata: { sourceContext, explore: exploreOrigin(idea, sources) }
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

    // Everything the idea came from, saved with it so research and drafting stay on the same topic
    // A topic worth keeping before there is a post idea for it; it lands in the Pipeline's Ideas, marked Topic
    const saveTopic = async (story: Story, note: string) => {
        const key = topicKey(story);
        setSavingIdea(key);
        const sourceContext = await buildSourceContext([story]);
        const dive = diveOf(story);
        try {
            const res = await fetch('/api/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hook: story.title,
                    angle: note.trim() || dive?.summary || story.takeaway || story.summary || '',
                    source_type: 'explore',
                    stage: 'idea',
                    brain_metadata: {
                        sourceContext,
                        explore: { ...exploreOrigin(null, [story]), savedAs: 'topic', note: note.trim() || undefined },
                    },
                }),
            });
            if (!res.ok) throw new Error(`Save failed: ${res.status}`);
            setSavedIdeas(prev => new Set([...prev, key]));
            setNoteFor(null);
            toast.success("Topic saved to Pipeline", {
                action: { label: "View Pipeline", onClick: () => window.location.href = "/workspace?tab=pipeline" },
            });
        } catch (err) {
            console.error('Failed to save topic:', err);
            toast.error("Couldn't save the topic. Try again.");
        } finally {
            setSavingIdea(null);
        }
    };

    const exploreOrigin = (idea: PostIdea | null, sources: Story[]): ExploreOrigin => ({
        query: step?.query ?? '',
        label: step?.label,
        intent: step?.intent,
        sources: sources.map(s => ({
            title: s.title,
            url: s.sourceUrl,
            source: s.source,
            summary: s.summary,
            takeaway: s.takeaway,
            kind: s.kind,
            keyPoints: diveOf(s)?.keyPoints,
        })),
        ...(idea ? { idea: { hook: idea.hook, angle: idea.angle, format: idea.format, belief: idea.belief }, savedAs: 'idea' as const } : {}),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        runSearch(input);
    };

    const renderIdeas = (key: string, sources: Story[], context?: string) => {
        const ideas = ideasByKey[key];
        const generating = generatingKey === key;

        return (
            <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-ink">Post angles</h4>
                    {ideas && (
                        <button
                            onClick={() => generateIdeas(key, sources, context ?? step?.query)}
                            disabled={generatingKey !== null}
                            className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 disabled:opacity-50"
                        >
                            <RotateCcw size={12} /> Regenerate
                        </button>
                    )}
                </div>

                {!ideas && (
                    <button
                        onClick={() => generateIdeas(key, sources, context ?? step?.query)}
                        disabled={generatingKey !== null}
                        className="btn btn-primary w-full disabled:opacity-50"
                    >
                        {generating ? <Loader2 size={16} className="animate-spin" /> : <Lightbulb size={16} />}
                        {generating ? 'Finding angles...' : 'Get post ideas'}
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

    const renderItem = (story: Story) => {
        const focused = story.sourceUrl === focusKey;
        const selected = selectedKeys.includes(story.sourceUrl);
        const momentum = story.kind === 'question' ? null : storyMomentum(story);
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
                        {story.takeaway && (
                            <span className="block text-xs text-ink-soft mt-1 line-clamp-2">{story.takeaway}</span>
                        )}
                        <span className="block text-xs text-ink-muted mt-1">
                            {momentum && <MomentumTag tag={momentum} />}
                            {story.kind && <span className="text-ember-700 font-medium capitalize">{story.kind} · </span>}
                            {storyMeta(story)}
                        </span>
                        {story.relatedBelief && (
                            <span className="block text-xs text-ember-700 mt-1 line-clamp-1">
                                {beliefLabel(story)}
                            </span>
                        )}
                    </button>
                </div>
            </li>
        );
    };

    // What the piece says, read in full: summary, key points, who thinks what, and what it leaves open
    const renderDeepDive = (story: Story) => {
        const dive = divesByKey[story.sourceUrl];
        if (dive === 'loading') {
            return (
                <div className="mt-4" aria-live="polite">
                    {story.summary && <p className="text-sm text-ink-soft leading-relaxed">{story.summary}</p>}
                    <div className="mt-4 space-y-4 animate-pulse" aria-label={`Reading the full ${story.kind === 'question' ? 'discussion' : 'piece'}`}>
                        {[['w-16', ['w-full', 'w-11/12', 'w-2/3']], ['w-20', ['w-full', 'w-5/6', 'w-3/4']]].map(([heading, lines], i) => (
                            <div key={i} className="space-y-2">
                                <div className={`h-3 ${heading} rounded-full bg-canvas shadow-well`} />
                                {(lines as string[]).map(w => <div key={w} className={`h-3.5 ${w} rounded-full bg-canvas shadow-well`} />)}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        if (typeof dive !== 'object') {
            return story.summary ? <p className="text-sm text-ink-soft leading-relaxed mt-3">{story.summary}</p> : null;
        }

        return (
            <div className="mt-4 space-y-4">
                <div>
                    <h4 className="text-xs font-medium text-ink-muted mb-1">{story.kind === 'question' ? 'The discussion' : 'In short'}</h4>
                    <p className="text-sm text-ink leading-relaxed">{dive.summary}</p>
                </div>
                {dive.keyPoints.length > 0 && (
                    <div>
                        <h4 className="text-xs font-medium text-ink-muted mb-1">{story.kind === 'question' ? 'What people suggest' : 'Key points'}</h4>
                        <ul className="space-y-1.5">
                            {dive.keyPoints.map(point => (
                                <li key={point} className="text-sm text-ink-soft leading-relaxed flex gap-2">
                                    <span className="mt-2 w-1 h-1 rounded-full bg-ember-500 shrink-0" />{point}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {dive.viewpoints.length > 0 && (
                    <div>
                        <h4 className="text-xs font-medium text-ink-muted mb-1">Viewpoints</h4>
                        <ul className="space-y-2">
                            {dive.viewpoints.map(v => (
                                <li key={v.who + v.view} className="text-sm leading-relaxed">
                                    <span className="font-medium text-ink">{v.who}:</span> <span className="text-ink-soft">{v.view}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {dive.openQuestions.length > 0 && (
                    <div>
                        <h4 className="text-xs font-medium text-ink-muted mb-1.5">Left open</h4>
                        <div className="flex flex-col items-start gap-2">
                            {dive.openQuestions.map(q => (
                                <button
                                    key={q}
                                    onClick={() => runSearch(q)}
                                    disabled={loading}
                                    title="Explore this question"
                                    className="text-left text-sm px-3 py-2 rounded-tile bg-canvas shadow-raised text-ink-soft hover:text-ember-600 active:shadow-pressed transition-all disabled:opacity-50 flex items-start gap-2"
                                >
                                    <AnimatedIcon icon={CompassIcon} size={14} className="mt-0.5 shrink-0" />{q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {dive.readFrom && (
                    <p className="text-xs text-ink-muted">Read from <a href={dive.readFrom} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">{hostOf(dive.readFrom)}</a>, which carries the same story.</p>
                )}
            </div>
        );
    };

    const renderDetail = () => {
        if (showingGap && step?.debate?.gap) {
            const { gap, takes } = step.debate;
            return (
                <div>
                    <span className="inline-flex items-center h-6 px-2.5 mb-2 rounded-full bg-ember-50 text-ember-700 text-xs font-medium">The missing take</span>
                    <h3 className="text-xl font-medium tracking-[-0.01em] text-ink leading-snug">{gap.take}</h3>
                    {gap.why && <p className="text-sm text-ink-soft leading-relaxed mt-2">{gap.why}</p>}
                    {takes.length > 0 && (
                        <div className="mt-4 p-4 bg-canvas shadow-well rounded-tile">
                            <span className="text-xs font-medium text-ink-muted">What the coverage already says</span>
                            <ul className="mt-1.5 space-y-1">
                                {takes.map(t => <li key={t.take} className="text-sm text-ink-soft">{t.take}</li>)}
                            </ul>
                        </div>
                    )}
                    {renderIdeas(GAP_KEY, stories.slice(0, 6), `${step.query}. The angle to take, which the coverage is missing: ${gap.take}`)}
                </div>
            );
        }

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
                {focusedStory.kind && (
                    <span className="inline-flex items-center h-6 px-2.5 mb-2 rounded-full bg-ember-50 text-ember-700 text-xs font-medium capitalize">
                        {focusedStory.kind}
                    </span>
                )}
                <h3 className="text-xl font-medium tracking-[-0.01em] text-ink leading-snug">{focusedStory.title}</h3>
                <p className="text-xs text-ink-muted mt-1">{storyMeta(focusedStory)}</p>
                {focusedStory.otherSources && focusedStory.otherSources.length > 0 && (
                    <p className="text-xs text-ink-muted mt-1">Also covered by {focusedStory.otherSources.join(', ')}</p>
                )}
                {focusedMomentum && (
                    <p className="text-xs text-ink-soft mt-2">
                        <MomentumTag tag={focusedMomentum} />
                        {MOMENTUM_HINTS[focusedMomentum]}
                    </p>
                )}
                {focusedStory.takeaway && (
                    <div className="mt-4 p-4 bg-canvas shadow-well rounded-tile">
                        <span className="text-xs font-medium text-ink-muted">What you can use</span>
                        <p className="text-sm text-ink mt-1 leading-relaxed">{focusedStory.takeaway}</p>
                    </div>
                )}
                {renderDeepDive(focusedStory)}
                {focusedStory.relatedBelief && (
                    <p className="text-sm text-ember-700 mt-3">
                        {beliefLabel(focusedStory)}: &ldquo;{focusedStory.relatedBelief}&rdquo;
                    </p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-4">
                    <a
                        href={focusedStory.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-canvas shadow-raised text-xs text-ink-soft hover:text-ink active:shadow-pressed transition-shadow"
                    >
                        <ExternalLink size={12} /> {focusedStory.kind === 'question'
                            ? `Read the discussion on ${focusedStory.source}`
                            : focusedStory.kind && focusedStory.kind !== 'news' ? 'Read the full piece' : 'Read the full story'}
                    </a>
                    {savedIdeas.has(topicKey(focusedStory)) ? (
                        <span className="inline-flex items-center gap-1.5 h-8 px-3 text-xs text-sage-700"><Check size={12} /> Topic saved</span>
                    ) : noteFor !== focusedStory.sourceUrl && (
                        <button
                            onClick={() => { setNoteFor(focusedStory.sourceUrl); setNote(""); }}
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-canvas shadow-raised text-xs text-ink-soft hover:text-ember-600 active:shadow-pressed transition-shadow"
                        >
                            <Bookmark size={12} /> Save topic
                        </button>
                    )}
                </div>
                {noteFor === focusedStory.sourceUrl && !savedIdeas.has(topicKey(focusedStory)) && (
                    <form
                        onSubmit={(e) => { e.preventDefault(); saveTopic(focusedStory, note); }}
                        className="mt-3 p-3 rounded-tile bg-canvas shadow-well"
                    >
                        <label htmlFor="topic-note" className="text-xs font-medium text-ink-muted">Why keep this? (optional)</label>
                        <textarea
                            id="topic-note"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={2}
                            autoFocus
                            placeholder="e.g. Could pair this with my take on hiring juniors"
                            className="mt-1 w-full bg-transparent text-sm text-ink placeholder:text-ink-muted resize-none focus:outline-none"
                        />
                        <div className="flex justify-end gap-2 mt-1">
                            <button type="button" onClick={() => setNoteFor(null)} className="h-8 px-3 text-xs text-ink-muted hover:text-ink">Cancel</button>
                            <button
                                type="submit"
                                disabled={savingIdea === topicKey(focusedStory)}
                                className="h-8 px-4 rounded-full bg-ember-500 text-white text-xs font-medium hover:bg-ember-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                            >
                                {savingIdea === topicKey(focusedStory) && <Loader2 size={12} className="animate-spin" />} Save to Pipeline
                            </button>
                        </div>
                    </form>
                )}
                {renderIdeas(focusedStory.sourceUrl, [focusedStory])}
            </div>
        );
    };

    // Large: the centred starting composer. Compact: the bar above results, with New beside it.
    const renderSearch = (size: 'large' | 'compact') => (
        <div className="w-full">
            <form onSubmit={handleSubmit} className="relative">
                <Search size={size === 'large' ? 18 : 16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Search a topic to explore..."
                    disabled={loading}
                    autoFocus={size === 'large'}
                    className={`w-full ${size === 'large' ? 'h-14 pl-12 pr-16 text-base' : 'h-12 pl-11 pr-14'} bg-canvas shadow-well rounded-full text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 transition-all`}
                />
                <button
                    type="submit"
                    aria-label="Search"
                    disabled={!input.trim() || loading}
                    className={`absolute right-1.5 top-1/2 -translate-y-1/2 ${size === 'large' ? 'w-11 h-11' : 'w-9 h-9'} flex items-center justify-center rounded-full bg-ember-500 text-white shadow-ember hover:bg-ember-600 disabled:opacity-30 disabled:shadow-none transition-all`}
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
                </button>
            </form>
            {size === 'compact' && (
                <div className="mt-2 flex items-center justify-end">
                    <button
                        onClick={startOver}
                        className="flex items-center gap-1 h-8 text-xs text-ink-muted hover:text-ink px-2"
                    >
                        <RotateCcw size={12} /> New
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col h-full relative">
            {trail.length === 0 ? (
                /* Starting point: the search sits right under the question, with ready-made starting topics below it */
                <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-4 md:p-6">
                    <div className="w-full max-w-2xl flex flex-col items-center text-center">
                        <div className="w-12 h-12 mb-4 rounded-full bg-canvas shadow-raised flex items-center justify-center"><AnimatedIcon icon={SparklesIcon} size={20} trigger="mount" className="text-ember-500" /></div>
                        <h2 className="text-2xl md:text-[32px] md:leading-tight font-medium tracking-[-0.02em] text-ink mb-2">What would you like to explore?</h2>
                        <p className="text-sm md:text-base text-ink-soft mb-6 max-w-md">
                            Ask a question or name a topic. Each search suggests where to go next, so you can follow a thread to something worth writing.
                        </p>
                        {renderSearch('large')}
                        <div className="w-full mt-8">
                            <div className="flex items-center gap-1 justify-start md:justify-center">
                                <div role="tablist" aria-label="Starting topics" className="flex gap-1 overflow-x-auto pb-1 -ml-4 pl-4 md:ml-0 md:pl-0">
                                    {visibleCategories.map(cat => (
                                        <button
                                            key={cat.label}
                                            role="tab"
                                            aria-selected={activeCategory === cat.label}
                                            onClick={() => setSelectedCategory(cat.label)}
                                            className={`h-8 px-3 shrink-0 rounded-full text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-200 ${activeCategory === cat.label
                                                ? 'bg-surface shadow-raised text-ink'
                                                : 'text-ink-muted hover:text-ink'
                                                }`}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={refreshTopics}
                                    disabled={refreshingTopics || fetchingTrends}
                                    aria-label="Show different topics"
                                    title="Show different topics"
                                    className="w-8 h-8 shrink-0 mb-1 flex items-center justify-center rounded-full text-ink-muted hover:text-ink hover:bg-canvas hover:shadow-raised active:shadow-pressed transition-all disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-200"
                                >
                                    <AnimatedIcon icon={RefreshCWIcon} size={14} className={refreshingTopics ? 'animate-spin' : ''} />
                                </button>
                            </div>
                            <div role="tabpanel" aria-label={`Trending in ${activeCategory}`} className={`flex flex-wrap justify-center gap-2 mt-3 ${refreshingTopics ? 'opacity-50' : ''}`}>
                                {trendCategories.find(c => c.label === activeCategory)?.trends.map(trend => (
                                    <button
                                        key={trend.label}
                                        onClick={() => runSearch(trend.query)}
                                        disabled={loading}
                                        className="h-9 px-4 bg-canvas shadow-raised text-ink-soft rounded-full text-sm hover:text-ember-600 active:shadow-pressed transition-all disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-200"
                                    >
                                        {trend.label}
                                    </button>
                                ))}
                            </div>
                            {fetchingTrends && <p className="text-xs text-ink-muted mt-2">Finding topics for you...</p>}
                        </div>
                        {loading && (
                            <div className="mt-6 flex items-center gap-2 text-ink-muted text-sm">
                                <Loader2 size={16} className="animate-spin" /> Searching...
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    {/* Once there are results the search docks to the top, next to the path it adds to */}
                    <div className="px-4 md:px-6 pt-4 md:pt-6 pb-3 shrink-0">
                        <div className="max-w-5xl mx-auto">{renderSearch('compact')}</div>
                    </div>

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
                                        {s.label || s.query}
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
                                        <AnimatedIcon icon={CompassIcon} size={12} /> Explore next
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

                            {(questions.length > 0 || step?.questionsLoading) && (
                                <div role="tablist" aria-label="Results" className="flex gap-1 mb-3 p-1 bg-canvas shadow-pressed rounded-full w-fit">
                                    {(['stories', 'questions'] as const).map(view => (
                                        <button
                                            key={view}
                                            role="tab"
                                            aria-selected={paneView === view}
                                            onClick={() => setPaneView(view)}
                                            className={`h-7 px-3 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-200 ${paneView === view ? 'bg-surface shadow-raised text-ink' : 'text-ink-muted hover:text-ink'}`}
                                        >
                                            {view === 'stories' ? `Stories (${stories.length})` : 'Questions people ask'}
                                            {view === 'questions' && (step?.questionsLoading
                                                ? <Loader2 size={12} className="animate-spin" />
                                                : <span>({questions.length})</span>)}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {paneView === 'questions' ? (
                                step?.questionsLoading ? (
                                    <p className="text-sm text-ink-muted flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Finding what people ask on Reddit, Quora and Hacker News...</p>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-xs text-ink-muted">Real questions from community threads. Open one to get post ideas that answer it.</p>
                                        {groupByTheme(questions).map(([theme, items]) => (
                                            <div key={theme}>
                                                <h4 className="text-xs font-medium text-ink-soft mb-2">{theme}</h4>
                                                <ul className="space-y-2">{items.map(renderItem)}</ul>
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : (
                                <>
                                    {topic && (
                                        <p className="text-xs text-ink-muted mb-3" title={MOMENTUM_HINTS[topic.tag]}>
                                            <MomentumTag tag={topic.tag} />
                                            {topic.reason}
                                        </p>
                                    )}
                                    {step?.debateLoading && (
                                        <div className="mb-4 p-3.5 rounded-tile bg-surface shadow-card animate-pulse" aria-label="Mapping the takes">
                                            <span className="text-xs font-medium text-ink-muted">The takes so far</span>
                                            <div className="mt-2.5 space-y-3">
                                                {['w-5/6', 'w-3/4'].map(w => <div key={w} className={`h-3.5 ${w} rounded-full bg-canvas shadow-well`} />)}
                                            </div>
                                            <div className="mt-3 h-10 w-full rounded-tile bg-canvas shadow-well" />
                                        </div>
                                    )}
                                    {step?.debate && (
                                        <div className="mb-4 p-3.5 rounded-tile bg-surface shadow-card">
                                            <span className="text-xs font-medium text-ink-muted">The takes so far</span>
                                            <ul className="mt-1.5 space-y-1">
                                                {step.debate.takes.map(t => (
                                                    <li key={t.take}>
                                                        <button
                                                            onClick={() => { const first = stories[t.stories[0]]; if (first) openStory(first); }}
                                                            className="w-full text-left text-sm leading-snug py-1 text-ink hover:text-ember-600 flex items-start justify-between gap-3"
                                                        >
                                                            <span>{t.take}</span>
                                                            <span className="text-xs text-ink-muted whitespace-nowrap pt-0.5">{t.stories.length} {t.stories.length === 1 ? 'story' : 'stories'}</span>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                            {step.debate.gap && (
                                                <button
                                                    onClick={() => { setFocusKey(GAP_KEY); setShowDetailOnMobile(true); }}
                                                    className={`mt-2 w-full text-left p-3 rounded-tile bg-ember-50 hover:ring-2 hover:ring-ember-200 transition-all ${focusKey === GAP_KEY ? 'ring-2 ring-ember-200' : ''}`}
                                                >
                                                    <span className="block text-xs font-medium text-ember-700">Nobody&apos;s saying</span>
                                                    <span className="block text-sm text-ink mt-0.5">{step.debate.gap.take}</span>
                                                    <span className="mt-1 text-xs font-medium text-ember-700 flex items-center gap-0.5">Get ideas for this angle <ChevronRight size={12} /></span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    {step?.questionsLoading && (
                                        <div className="mb-4 p-3.5 rounded-tile bg-surface shadow-card animate-pulse" aria-label="Finding what people ask">
                                            <span className="text-xs font-medium text-ink-muted">People are asking</span>
                                            <div className="mt-2.5 space-y-3">
                                                {['w-11/12', 'w-4/5', 'w-2/3'].map(w => <div key={w} className={`h-3.5 ${w} rounded-full bg-canvas shadow-well`} />)}
                                            </div>
                                            <div className="mt-3 h-3 w-28 rounded-full bg-canvas shadow-well" />
                                        </div>
                                    )}
                                    {questions.length > 0 && (
                                        <div className="mb-4 p-3.5 rounded-tile bg-surface shadow-card">
                                            <span className="text-xs font-medium text-ink-muted">People are asking</span>
                                            <ul className="mt-1.5 space-y-1">
                                                {questions.slice(0, 3).map(q => (
                                                    <li key={q.sourceUrl}>
                                                        <button
                                                            onClick={() => openStory(q)}
                                                            className={`w-full text-left text-sm leading-snug py-1 hover:text-ember-600 ${q.sourceUrl === focusKey ? 'text-ember-700 font-medium' : 'text-ink'}`}
                                                        >
                                                            {q.title}
                                                            <span className="text-xs text-ink-muted"> · {q.source}</span>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                            <button
                                                onClick={() => setPaneView('questions')}
                                                className="mt-1.5 text-xs font-medium text-ember-700 hover:text-ember-600 flex items-center gap-0.5"
                                            >
                                                See all {questions.length} questions <ChevronRight size={12} />
                                            </button>
                                        </div>
                                    )}
                                    <ul className="space-y-2">{stories.map(renderItem)}</ul>
                                </>
                            )}
                        </section>

                        {/* The story being looked at, with its angles */}
                        <section
                            aria-label="Story details"
                            className={`flex-1 overflow-y-auto p-4 md:p-6 pb-28 md:pb-6 md:self-start md:max-h-full md:bg-surface md:shadow-card md:rounded-card ${showDetailOnMobile ? 'block' : 'hidden md:block'}`}
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
