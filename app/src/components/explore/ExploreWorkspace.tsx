"use client";

import { useState, useEffect } from "react";
import {
    Search, Loader2, ExternalLink, Lightbulb, Check, X,
    ChevronRight, ChevronLeft, RotateCcw, Layers, Bookmark, ThumbsUp, ThumbsDown,
} from "lucide-react";
import { AnimatedIcon } from "@/components/icons/AnimatedIcon";
import { CompassIcon, RefreshCWIcon, SparklesIcon } from "@/components/icons/animated";
import { toast } from "sonner";
import type { ExploreOrigin } from "@/types";
import { FOR_YOU, shuffle } from "@/lib/explore/trends";
import type { WatchedTopic } from "@/lib/explore/watch";
import type { ChatTurn } from "@/lib/explore/story-chat";
import { monthLabel, type TopicHistory } from "@/lib/explore/history";
import { EMPTY_TASTE, addToTaste, cleanTaste, tasteKey, type Taste, type TasteKind } from "@/lib/explore/taste";
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
    // Whether the writer has written on this before, and what moved since
    history?: TopicHistory | null;
    // Why this search was suggested, from "Surprise me" or a watched topic
    banner?: { label: string; text: string };
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
const TASTE_KEY = 'cd-explore-taste';
// The stance and platform last picked for post ideas
const IDEA_PREFS_KEY = 'cd-explore-idea-prefs';

const STANCES = [
    { value: 'any', label: 'Any' },
    { value: 'agree', label: 'Agree' },
    { value: 'push_back', label: 'Push back' },
    { value: 'nuance', label: 'Add nuance' },
] as const;
type Stance = typeof STANCES[number]['value'];

const PLATFORMS = [
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'twitter', label: 'X' },
    { value: 'newsletter', label: 'Newsletter' },
    { value: 'blog', label: 'Blog' },
    { value: 'medium', label: 'Medium' },
] as const;
type Platform = typeof PLATFORMS[number]['value'];

// When the writer last opened each watched topic from Explore, by Pipeline item id
const WATCH_SEEN_KEY = 'cd-explore-watch-seen';
const TRENDS_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_TRAIL = 8;
// Tabs shown beside "For you"; each visit picks a random few from the writer's saved set
const TABS_SHOWN = 4;
const COMBINED_KEY = 'combined';
const GAP_KEY = 'gap';
const FOLLOW_UP_KEY = 'follow-up';

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
    // "More like this" and "Not for me", sent with every topics request
    const [taste, setTaste] = useState<Taste>(EMPTY_TASTE);
    const [surprising, setSurprising] = useState(false);
    const [watched, setWatched] = useState<WatchedTopic[]>([]);
    // Follow-up questions and answers about each story, by its link
    const [chatsByKey, setChatsByKey] = useState<Record<string, ChatTurn[]>>({});
    const [askingKey, setAskingKey] = useState<string | null>(null);
    const [ideaPrefs, setIdeaPrefs] = useState<{ stance: Stance; platform: Platform }>({ stance: 'any', platform: 'linkedin' });
    const [chatInput, setChatInput] = useState("");
    const [surprisesSeen, setSurprisesSeen] = useState<string[]>([]);

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
    const showingFollowUp = focusKey === FOLLOW_UP_KEY && Boolean(step?.history?.before);

    useEffect(() => {
        const fetchRealTrends = async () => {
            const savedTaste = cleanTaste(readStorage(TASTE_KEY));
            setTaste(savedTaste);
            const cached = readStorage<{ groups: TrendGroup[]; savedAt: number; taste?: string }>(TRENDS_KEY);
            // Topics fetched before the latest "More like this" or "Not for me" are fetched again
            if (cached && Date.now() - cached.savedAt < TRENDS_TTL_MS && (cached.taste ?? '') === tasteKey(savedTaste)) {
                const rotated = rotateTrendGroups(cached.groups);
                if (rotated.length > 0) setTrendCategories(rotated);
                return;
            }

            setFetchingTrends(true);
            try {
                const res = await fetch('/api/explore/trends', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode: 'discover', taste: savedTaste })
                });
                const data = await res.json();
                if (Array.isArray(data.groups)) {
                    const rotated = rotateTrendGroups(data.groups);
                    if (rotated.length > 0) {
                        setTrendCategories(rotated);
                        writeStorage(TRENDS_KEY, { groups: data.groups, savedAt: Date.now(), taste: tasteKey(savedTaste) });
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

    useEffect(() => {
        const saved = readStorage<{ stance?: string; platform?: string }>(IDEA_PREFS_KEY);
        const stance = STANCES.find(s => s.value === saved?.stance)?.value;
        const platform = PLATFORMS.find(p => p.value === saved?.platform)?.value;
        if (stance || platform) setIdeaPrefs(prev => ({ stance: stance ?? prev.stance, platform: platform ?? prev.platform }));
    }, []);

    const updateIdeaPrefs = (patch: Partial<typeof ideaPrefs>) => {
        const next = { ...ideaPrefs, ...patch };
        setIdeaPrefs(next);
        writeStorage(IDEA_PREFS_KEY, next);
    };

    // Saved topics, with what has been published on each since the writer last looked
    useEffect(() => {
        fetch('/api/explore/watch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seen: readStorage<Record<string, string>>(WATCH_SEEN_KEY) ?? {} }),
        })
            .then(res => res.ok ? res.json() : null)
            .then(data => { if (Array.isArray(data?.topics)) setWatched(data.topics); })
            .catch(() => { /* Explore works without it */ });
    }, []);

    const openWatched = (topic: WatchedTopic) => {
        writeStorage(WATCH_SEEN_KEY, { ...(readStorage<Record<string, string>>(WATCH_SEEN_KEY) ?? {}), [topic.id]: new Date().toISOString() });
        setWatched(prev => prev.map(t => t.id === topic.id ? { ...t, newCount: 0, latest: [] } : t));
        runSearch(topic.query, {
            banner: {
                label: 'Watching.',
                text: topic.newCount > 0
                    ? `${topic.newCount} new ${topic.newCount === 1 ? 'story' : 'stories'} on "${topic.title}" since you last looked.`
                    : `Nothing new on "${topic.title}" since you last looked. Here's the latest coverage.`,
            },
        });
    };

    const tellTaste = (kind: TasteKind, signal: string) => {
        const next = addToTaste(taste, kind, signal);
        setTaste(next);
        writeStorage(TASTE_KEY, next);
    };

    // A topic the writer doesn't want leaves now, and steers every later set of topics
    const dismissTopic = (category: string, label: string) => {
        tellTaste('less', label);
        setTrendCategories(prev => prev.map(c => c.label === category ? { ...c, trends: c.trends.filter(t => t.label !== label) } : c));
        toast.success("Got it. Fewer topics like this.");
    };

    const rateStory = (story: Story, kind: TasteKind) => {
        tellTaste(kind, story.title);
        if (kind === 'more') {
            toast.success("Got it. You'll see more like this under For you.");
            return;
        }
        if (step) {
            const drop = (items?: Story[]) => items?.filter(s => s.sourceUrl !== story.sourceUrl);
            const remaining = allItems.filter(s => s.sourceUrl !== story.sourceUrl);
            updateStep(step, { stories: drop(step.stories) ?? [], questions: drop(step.questions) });
            setSelectedKeys(prev => prev.filter(k => k !== story.sourceUrl));
            if (focusKey === story.sourceUrl) setFocusKey(remaining[0]?.sourceUrl ?? null);
        }
        toast.success("Got it. Fewer stories like this.");
    };

    // One story from outside the writer's usual areas, searched straight away
    const surpriseMe = async () => {
        if (surprising || loading) return;
        setSurprising(true);
        try {
            const res = await fetch('/api/explore/trends', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'surprise', taste, exclude: surprisesSeen }),
            });
            const data = await res.json();
            if (!res.ok || !data.pick?.query) {
                toast.error(data.error || "Couldn't find a surprise right now. Try again.");
                return;
            }
            setSurprisesSeen(prev => [data.pick.label, ...prev].slice(0, 10));
            await runSearch(data.pick.query, { banner: { label: 'Surprise pick.', text: data.pick.why } });
        } catch {
            toast.error("Couldn't find a surprise right now. Try again.");
        } finally {
            setSurprising(false);
        }
    };

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
                    taste,
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
            writeStorage(TRENDS_KEY, { groups: data.groups, savedAt: Date.now(), taste: tasteKey(taste) });
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
            focusKey: focusKey === COMBINED_KEY || focusKey === GAP_KEY || focusKey === FOLLOW_UP_KEY ? null : focusKey,
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

    const runSearch = async (query: string, extra?: Pick<ExploreStep, 'banner'>) => {
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
                ...extra,
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
        if (next.stories.length > 0) loadHistory(next);
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

    // Checks the writer's own posts and drafts for this topic once the stories are on screen
    const loadHistory = async (target: ExploreStep) => {
        try {
            const res = await fetch('/api/explore/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: target.query, stories: target.stories.slice(0, 10).map(s => s.title) }),
            });
            const data = await res.json();
            if (res.ok && data.history) updateStep(target, { history: data.history });
        } catch {
            // History is extra; the stories stand on their own
        }
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
                    platform: ideaPrefs.platform,
                    ...(ideaPrefs.stance !== 'any' && { stance: ideaPrefs.stance }),
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

                <div className="mb-3 space-y-2">
                    <div role="radiogroup" aria-label="Your stance" className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-ink-muted mr-1">Your stance</span>
                        {STANCES.map(option => (
                            <button
                                key={option.value}
                                role="radio"
                                aria-checked={ideaPrefs.stance === option.value}
                                onClick={() => updateIdeaPrefs({ stance: option.value })}
                                className={`h-7 px-2.5 rounded-full text-xs transition-all ${ideaPrefs.stance === option.value ? 'bg-surface shadow-raised text-ink font-medium' : 'text-ink-muted hover:text-ink'}`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                    <div role="radiogroup" aria-label="Write for" className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-ink-muted mr-1">Write for</span>
                        {PLATFORMS.map(option => (
                            <button
                                key={option.value}
                                role="radio"
                                aria-checked={ideaPrefs.platform === option.value}
                                onClick={() => updateIdeaPrefs({ platform: option.value })}
                                className={`h-7 px-2.5 rounded-full text-xs transition-all ${ideaPrefs.platform === option.value ? 'bg-surface shadow-raised text-ink font-medium' : 'text-ink-muted hover:text-ink'}`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
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
    // A half-typed question belongs to the story it was typed for
    useEffect(() => setChatInput(""), [focusKey]);

    const askAboutStory = async (story: Story, question: string) => {
        const key = story.sourceUrl;
        if (!question.trim() || askingKey) return;
        const history = chatsByKey[key] ?? [];
        setChatsByKey(prev => ({ ...prev, [key]: [...history, { role: 'user', text: question.trim() }] }));
        setChatInput("");
        setAskingKey(key);
        try {
            const res = await fetch('/api/explore/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: story.sourceUrl, title: story.title, question: question.trim(), history, query: step?.query }),
            });
            const data = await res.json();
            if (!res.ok || !data.answer) throw new Error(data.error || 'No answer');
            setChatsByKey(prev => ({ ...prev, [key]: [...(prev[key] ?? []), { role: 'assistant', text: data.answer }] }));
        } catch (err) {
            // The question goes back in the box so it can be asked again
            setChatsByKey(prev => ({ ...prev, [key]: history }));
            setChatInput(question);
            toast.error(err instanceof Error && err.message !== 'No answer' ? err.message : "Couldn't answer that right now. Try again.");
        } finally {
            setAskingKey(null);
        }
    };

    // A short conversation about the open story, answered from its own text
    const renderStoryChat = (story: Story) => {
        const turns = chatsByKey[story.sourceUrl] ?? [];
        const asking = askingKey === story.sourceUrl;
        return (
            <section aria-label="Ask about this story" className="mt-5">
                <h4 className="text-xs font-medium text-ink-muted mb-2">Ask about this story</h4>
                {turns.length > 0 && (
                    <ul className="space-y-2 mb-3">
                        {turns.map((turn, i) => (
                            <li
                                key={i}
                                className={turn.role === 'user'
                                    ? 'text-sm font-medium text-ink'
                                    : 'text-sm text-ink-soft leading-relaxed p-3 rounded-tile bg-canvas shadow-well'}
                            >
                                {turn.text}
                            </li>
                        ))}
                    </ul>
                )}
                {asking && (
                    <p className="mb-2 text-xs text-ink-muted flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Checking the piece...</p>
                )}
                <form
                    onSubmit={(e) => { e.preventDefault(); askAboutStory(story, chatInput); }}
                    className="flex items-center gap-2 p-1 pl-3 rounded-full bg-canvas shadow-well"
                >
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        aria-label="Your question about this story"
                        placeholder={turns.length ? 'Ask a follow-up...' : 'e.g. What evidence do they give?'}
                        className="flex-1 min-w-0 bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
                    />
                    <button
                        type="submit"
                        disabled={!chatInput.trim() || Boolean(askingKey)}
                        className="h-8 px-4 rounded-full bg-ember-500 text-white text-xs font-medium hover:bg-ember-600 transition-colors disabled:opacity-50"
                    >
                        Ask
                    </button>
                </form>
            </section>
        );
    };

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
        if (showingFollowUp && step?.history?.before) {
            const before = step.history.before;
            return (
                <div>
                    <span className="inline-flex items-center h-6 px-2.5 mb-2 rounded-full bg-sage-100 text-sage-700 text-xs font-medium">A follow-up post</span>
                    <h3 className="text-xl font-medium tracking-[-0.01em] text-ink leading-snug">{before.changed}</h3>
                    <div className="mt-4 p-4 bg-canvas shadow-well rounded-tile">
                        <span className="text-xs font-medium text-ink-muted">What you wrote in {monthLabel(before.date)}</span>
                        <p className="text-sm text-ink-soft mt-1">{before.gist}</p>
                    </div>
                    {renderIdeas(FOLLOW_UP_KEY, stories.slice(0, 6), `${step.query}. A follow-up to the writer's earlier ${before.kind} (${before.gist}), built on what has changed since: ${before.changed}`)}
                </div>
            );
        }

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
        const likedStory = taste.more.some(t => t.toLowerCase() === focusedStory.title.toLowerCase());

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
                {renderStoryChat(focusedStory)}
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
                    <span className="inline-flex items-center gap-1 ml-auto">
                        <button
                            onClick={() => rateStory(focusedStory, 'more')}
                            aria-pressed={likedStory}
                            className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs transition-colors ${likedStory ? 'text-ember-700 bg-ember-50' : 'text-ink-muted hover:text-ink'}`}
                        >
                            <ThumbsUp size={12} /> More like this
                        </button>
                        <button
                            onClick={() => rateStory(focusedStory, 'less')}
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs text-ink-muted hover:text-ink transition-colors"
                        >
                            <ThumbsDown size={12} /> Not for me
                        </button>
                    </span>
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
                /* Starting point: the search sits right under the question, with ready-made starting topics below it.
                   pb-32 on phones keeps Surprise me clear of the bottom nav; my-auto centres without clipping the top when it overflows */
                <div className="flex-1 overflow-y-auto flex flex-col items-center p-4 pb-32 md:p-6">
                    <div className="my-auto w-full max-w-2xl flex flex-col items-center text-center">
                        <div className="w-12 h-12 mb-4 rounded-full bg-canvas shadow-raised flex items-center justify-center"><AnimatedIcon icon={SparklesIcon} size={20} trigger="mount" className="text-ember-500" /></div>
                        <h2 className="text-2xl md:text-[32px] md:leading-tight font-medium tracking-[-0.02em] text-ink mb-2">What would you like to explore?</h2>
                        <p className="text-sm md:text-base text-ink-soft mb-6 max-w-md">
                            Ask a question or name a topic. Each search suggests where to go next, so you can follow a thread to something worth writing.
                        </p>
                        {renderSearch('large')}
                        <div className="w-full mt-8">
                            <div className="flex items-center gap-1 justify-start md:justify-center">
                                <div role="tablist" aria-label="Starting topics" className="flex gap-1 min-w-0 overflow-x-auto scrollbar-none pb-1 -ml-4 pl-4 md:ml-0 md:pl-0">
                                    {visibleCategories.map(cat => (
                                        <button
                                            key={cat.label}
                                            role="tab"
                                            aria-selected={activeCategory === cat.label}
                                            onClick={() => setSelectedCategory(cat.label)}
                                            className={`h-10 md:h-8 px-3 shrink-0 rounded-full text-sm md:text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-200 ${activeCategory === cat.label
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
                                    className="w-10 h-10 md:w-8 md:h-8 shrink-0 mb-1 flex items-center justify-center rounded-full text-ink-muted hover:text-ink hover:bg-canvas hover:shadow-raised active:shadow-pressed transition-all disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-200"
                                >
                                    <AnimatedIcon icon={RefreshCWIcon} size={14} className={refreshingTopics ? 'animate-spin' : ''} />
                                </button>
                            </div>
                            <div role="tabpanel" aria-label={`Trending in ${activeCategory}`} className={`flex flex-wrap justify-center gap-2 mt-3 ${refreshingTopics ? 'opacity-50' : ''}`}>
                                {trendCategories.find(c => c.label === activeCategory)?.trends.map(trend => (
                                    <span key={trend.label} className="h-10 md:h-9 inline-flex items-center bg-canvas shadow-raised rounded-full">
                                        <button
                                            onClick={() => runSearch(trend.query)}
                                            disabled={loading}
                                            className="h-full pl-4 pr-1.5 text-ink-soft rounded-l-full text-sm hover:text-ember-600 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-200"
                                        >
                                            {trend.label}
                                        </button>
                                        <button
                                            onClick={() => dismissTopic(activeCategory!, trend.label)}
                                            aria-label={`Not for me: ${trend.label}`}
                                            title="Not for me"
                                            className="h-full pl-1 pr-3 text-ink-muted rounded-r-full hover:text-ink transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-200"
                                        >
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            {fetchingTrends && <p className="text-xs text-ink-muted mt-2">Finding topics for you...</p>}
                            <button
                                onClick={surpriseMe}
                                disabled={surprising || loading}
                                className={`mt-6 inline-flex items-center gap-2 h-11 md:h-9 px-5 md:px-4 rounded-full text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ember-200 ${surprising
                                    ? 'bg-ember-50 text-ember-700 shadow-pressed'
                                    : 'bg-canvas text-ember-700 shadow-raised hover:text-ember-600 active:shadow-pressed active:bg-ember-50 disabled:opacity-50'}`}
                            >
                                {surprising ? <Loader2 size={16} className="animate-spin" /> : <AnimatedIcon icon={SparklesIcon} size={16} />}
                                {surprising ? 'Finding something new...' : 'Surprise me'}
                            </button>
                            {watched.length > 0 && (
                                <section aria-label="Topics you're watching" className="mt-6 w-full max-w-xl mx-auto text-left">
                                    <h3 className="text-xs font-medium text-ink-muted mb-2">Topics you&apos;re watching</h3>
                                    <ul className="space-y-1.5">
                                        {watched.map(topic => (
                                            <li key={topic.id}>
                                                <button
                                                    onClick={() => openWatched(topic)}
                                                    disabled={loading}
                                                    className="w-full flex items-center gap-3 p-2.5 rounded-tile bg-surface shadow-card hover:shadow-float text-left transition-all disabled:opacity-50"
                                                >
                                                    <span className="flex-1 min-w-0">
                                                        <span className="block text-sm text-ink line-clamp-1">{topic.title}</span>
                                                        {topic.latest[0] && (
                                                            <span className="block text-xs text-ink-muted line-clamp-1">Latest: {topic.latest[0].title}</span>
                                                        )}
                                                    </span>
                                                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium ${topic.newCount > 0 ? 'bg-ember-50 text-ember-700' : 'text-ink-muted'}`}>
                                                        {topic.newCount > 0 ? `${topic.newCount} new` : 'Nothing new'}
                                                    </span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}
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
                            className={`w-full md:w-[45%] overflow-y-auto p-4 md:p-4 ${selectedStories.length >= 2 ? 'pb-48' : 'pb-28'} md:pb-4 md:bg-canvas md:shadow-pressed md:rounded-card ${showDetailOnMobile ? 'hidden md:block' : ''}`}
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

                            {step?.banner && (
                                <p className="mb-3 p-3 rounded-tile bg-ember-50 text-xs text-ember-700">
                                    <span className="font-medium">{step.banner.label}</span> {step.banner.text}
                                </p>
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
                                    {step?.history?.before ? (
                                        <button
                                            onClick={() => { setFocusKey(FOLLOW_UP_KEY); setShowDetailOnMobile(true); }}
                                            className={`mb-4 w-full text-left p-3.5 rounded-tile bg-sage-100 hover:ring-2 hover:ring-sage-500/30 transition-all ${focusKey === FOLLOW_UP_KEY ? 'ring-2 ring-sage-500/30' : ''}`}
                                        >
                                            <span className="block text-xs font-medium text-sage-700">You wrote on this in {monthLabel(step.history.before.date)}</span>
                                            <span className="block text-sm text-ink mt-0.5">{step.history.before.gist}</span>
                                            <span className="block text-xs text-ink-soft mt-1">What&apos;s changed: {step.history.before.changed}</span>
                                            <span className="mt-1 text-xs font-medium text-sage-700 flex items-center gap-0.5">Get follow-up ideas <ChevronRight size={12} /></span>
                                        </button>
                                    ) : step?.history?.newGround && (
                                        <p className="text-xs text-ink-muted mb-3">New ground: you haven&apos;t written on this yet.</p>
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

            {/* Combine several stories into one set of angles. On phones it is a full-width bar docked above the bottom nav; on desktop a centred pill */}
            {selectedStories.length >= 2 && !showingCombined && (
                <div className="absolute z-20 bottom-28 md:bottom-10 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 bg-surface shadow-float rounded-full h-14 pl-2 pr-2 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <button onClick={() => setSelectedKeys([])} aria-label="Clear selection" className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full text-ink-muted hover:text-ink active:shadow-pressed transition-all">
                        <X size={18} />
                    </button>
                    <span className="flex-1 md:flex-none min-w-0 text-sm font-medium text-ink whitespace-nowrap md:pr-2">{selectedStories.length} selected</span>
                    <button
                        onClick={combineSelected}
                        disabled={generatingKey !== null}
                        className="shrink-0 whitespace-nowrap flex items-center gap-1.5 h-10 px-5 bg-ember-500 text-white rounded-full text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50"
                    >
                        <Layers size={16} /> Combine into ideas
                    </button>
                </div>
            )}
        </div>
    );
}
