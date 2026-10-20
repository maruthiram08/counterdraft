
import { useState, useEffect, useRef, useCallback } from "react";
import { Target, LayoutTemplate, Scale, Users, ChevronDown, ChevronUp, Sparkles, Loader2, Flame, Megaphone, Ruler, ListChecks, Ban, HeartCrack, MessageCircleQuestion, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Draft, BrainMetadata } from "@/types";
import { formatLabel, hasStrategy, FORMAT_PRESETS, GOAL_PRESETS } from "@/lib/brain/strategy";
import { toast } from "sonner";

interface StrategyBarProps {
    draft: Draft & { title?: string; hook?: string };
    onUpdate: (metadataUpdates: Partial<Draft>) => Promise<void>;
    enableCoach?: boolean;
}

type FieldKey = 'outcome' | 'audience' | 'pain' | 'stance' | 'format' | 'toneNotes' | 'cta' | 'length' | 'include' | 'avoid';

interface FieldConfig {
    key: FieldKey;
    label: string;
    icon: LucideIcon;
    color: string;
    placeholder: string;
    presets?: string[];
}

// Every field takes free text; presets are only one-click shortcuts
const FIELDS: FieldConfig[] = [
    { key: 'outcome', label: 'Goal', icon: Target, color: 'text-dusk-500', placeholder: 'What should this post achieve?', presets: ['Authority', 'Engagement', 'Conversion', 'Connection'] },
    { key: 'audience', label: 'Audience', icon: Users, color: 'text-sand-500', placeholder: 'Who is this for?', presets: ['Founders', 'Engineers', 'Investors', 'Designers', 'Marketing Leaders'] },
    { key: 'pain', label: 'Their pain', icon: HeartCrack, color: 'text-rose-500', placeholder: 'What are they struggling with?' },
    { key: 'stance', label: 'Stance', icon: Scale, color: 'text-sage-500', placeholder: 'e.g. gently sceptical', presets: ['Supportive', 'Contrarian', 'Analytical', 'Visionary'] },
    { key: 'format', label: 'Format', icon: LayoutTemplate, color: 'text-ember-500', placeholder: 'e.g. a short story', presets: FORMAT_PRESETS.map(f => formatLabel(f)) },
    { key: 'toneNotes', label: 'Tone', icon: Flame, color: 'text-ember-600', placeholder: 'e.g. spicy but not preachy' },
    { key: 'cta', label: 'Call to action', icon: Megaphone, color: 'text-dusk-700', placeholder: 'What should readers do next?' },
    { key: 'length', label: 'Length', icon: Ruler, color: 'text-ink-muted', placeholder: 'e.g. under 200 words' },
    { key: 'include', label: 'Include', icon: ListChecks, color: 'text-sage-700', placeholder: 'Points to include, separated by ;' },
    { key: 'avoid', label: 'Avoid', icon: Ban, color: 'text-rose-500', placeholder: 'Things to avoid, separated by ;' },
];

const RECENT_KEY = 'counterdraft:strategy-recent';
const RECENT_FIELDS: FieldKey[] = ['outcome', 'audience', 'stance', 'toneNotes', 'cta'];

function getFieldValue(meta: Partial<BrainMetadata>, key: FieldKey): string {
    switch (key) {
        case 'audience': return typeof meta.audience === 'object' ? meta.audience?.role || '' : (meta.audience as string | undefined) || '';
        case 'pain': return typeof meta.audience === 'object' ? meta.audience?.pain || '' : '';
        case 'format': return formatLabel(meta.format);
        case 'include':
        case 'avoid': return (meta[key] || []).join('; ');
        default: return (meta[key] as string | undefined) || '';
    }
}

function setFieldValue(meta: Partial<BrainMetadata>, key: FieldKey, raw: string): Partial<BrainMetadata> {
    const value = raw.trim();
    const next = { ...meta };
    const audience = typeof meta.audience === 'object' ? meta.audience : { role: (meta.audience as string | undefined) || '', pain: '' };

    switch (key) {
        case 'audience':
            next.audience = { ...audience, role: value };
            break;
        case 'pain':
            next.audience = { ...audience, pain: value };
            break;
        case 'outcome':
            next.outcome = GOAL_PRESETS.includes(value.toLowerCase()) ? value.toLowerCase() : value;
            break;
        case 'format':
            next.format = FORMAT_PRESETS.find(f => formatLabel(f).toLowerCase() === value.toLowerCase()) || value || undefined;
            break;
        case 'include':
        case 'avoid': {
            const items = value.split(/[;\n]/).map(s => s.trim()).filter(Boolean);
            next[key] = items.length ? items : undefined;
            break;
        }
        default:
            next[key] = value || undefined;
    }
    return next;
}

function loadRecent(): Partial<Record<FieldKey, string[]>> {
    try {
        return JSON.parse(localStorage.getItem(RECENT_KEY) || '{}');
    } catch {
        return {};
    }
}

function rememberRecent(meta: Partial<BrainMetadata>) {
    try {
        const recent = loadRecent();
        for (const key of RECENT_FIELDS) {
            const value = getFieldValue(meta, key);
            if (!value) continue;
            recent[key] = [value, ...(recent[key] || []).filter(v => v.toLowerCase() !== value.toLowerCase())].slice(0, 6);
        }
        localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    } catch {
        // Recent suggestions are a convenience; ignore storage failures
    }
}

export function StrategyBar({ draft, onUpdate, enableCoach = true }: StrategyBarProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [metadata, setMetadata] = useState<Partial<BrainMetadata>>(draft.brain_metadata || {});
    const [brief, setBrief] = useState(draft.brain_metadata?.brief || "");
    const [isParsing, setIsParsing] = useState(false);
    const [editingField, setEditingField] = useState<FieldKey | null>(null);
    const [fieldDraft, setFieldDraft] = useState("");
    const [answer, setAnswer] = useState("");
    const [recent, setRecent] = useState<Partial<Record<FieldKey, string[]>>>({});

    const isPublished = draft.status === 'published';
    const strategySet = hasStrategy(metadata);

    useEffect(() => {
        setMetadata(draft.brain_metadata || {});
        setBrief(draft.brain_metadata?.brief || "");
    }, [draft.brain_metadata]);

    useEffect(() => {
        setRecent(loadRecent());
    }, []);

    const save = useCallback(async (next: Partial<BrainMetadata>) => {
        setMetadata(next);
        await onUpdate({ brain_metadata: next as BrainMetadata });
    }, [onUpdate]);

    // Sends the brief (possibly empty) to Claude and merges the parsed strategy over the current one
    const parseBrief = useCallback(async (briefText: string, { silent = false } = {}) => {
        if (!briefText.trim() && !draft.title && !draft.hook) {
            if (!silent) toast.error("Describe the post or add a topic first.");
            return;
        }

        setIsParsing(true);
        try {
            const res = await fetch('/api/content/develop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'parse_brief',
                    brief: briefText,
                    hook: draft.hook || draft.title,
                    draftText: draft.content,
                    brainMetadata: metadata
                })
            });
            if (!res.ok) throw new Error("Failed to parse brief");

            const parsed = await res.json();
            const next: Partial<BrainMetadata> = { ...metadata, ...parsed, brief: briefText.trim() || undefined };
            if (!parsed.clarifyingQuestion) delete next.clarifyingQuestion;
            await save(next);
            rememberRecent(next);
            setRecent(loadRecent());
            if (!silent) toast.success("Strategy updated from your brief");
        } catch (error) {
            console.error(error);
            if (!silent) toast.error("Couldn't shape the strategy. Try again.");
        } finally {
            setIsParsing(false);
        }
    }, [draft.content, draft.hook, draft.title, metadata, save]);

    // With nothing set yet, quietly infer a starting strategy from the topic. It only fills
    // empty fields, so it never overwrites what the user wrote.
    const hasAutoRun = useRef(false);
    useEffect(() => {
        const hasContent = draft.title || draft.hook;
        if (enableCoach && !isPublished && hasContent && !strategySet && !hasAutoRun.current) {
            hasAutoRun.current = true;
            const timer = setTimeout(() => parseBrief("", { silent: true }), 800);
            return () => clearTimeout(timer);
        }
    }, [enableCoach, isPublished, draft.title, draft.hook, strategySet, parseBrief]);

    const startEditing = (key: FieldKey) => {
        if (isPublished) return;
        setEditingField(key);
        setFieldDraft(getFieldValue(metadata, key));
    };

    const commitField = async (key: FieldKey, value: string) => {
        setEditingField(null);
        if (value.trim() === getFieldValue(metadata, key)) return;
        const next = setFieldValue(metadata, key, value);
        await save(next);
        rememberRecent(next);
        setRecent(loadRecent());
    };

    const answerQuestion = async () => {
        if (!answer.trim() || !metadata.clarifyingQuestion) return;
        const nextBrief = `${brief.trim()}\n${metadata.clarifyingQuestion} ${answer.trim()}`.trim();
        setBrief(nextBrief);
        setAnswer("");
        await parseBrief(nextBrief);
    };

    const dismissQuestion = async () => {
        const next = { ...metadata };
        delete next.clarifyingQuestion;
        await save(next);
    };

    const filledFields = FIELDS.filter(f => getFieldValue(metadata, f.key));
    const briefChanged = brief.trim() !== (metadata.brief || "");

    return (
        <div className="mb-8">
            <div className="relative bg-surface rounded-tile shadow-card transition-all duration-300">
                <div className="absolute -top-3 left-4 z-10 flex gap-2">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="bg-canvas h-7 px-3 rounded-full text-xs font-medium text-ink-soft flex items-center gap-1.5 hover:text-ember-600 shadow-raised active:shadow-pressed transition-all"
                    >
                        <Target size={12} className={isExpanded ? "text-ember-500" : ""} />
                        Strategy
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                </div>

                {!isExpanded && (
                    <button onClick={() => setIsExpanded(true)} className="w-full text-left px-5 pt-6 pb-4 text-xs text-ink-soft truncate">
                        {filledFields.length
                            ? filledFields.slice(0, 5).map(f => `${f.label}: ${getFieldValue(metadata, f.key)}`).join(' · ')
                            : "No strategy yet. Claude will infer one from your topic."}
                    </button>
                )}

                {isExpanded && (
                    <div className="p-5 pt-7 space-y-4">
                        {/* Brief */}
                        <div className="relative">
                            <textarea
                                value={brief}
                                onChange={(e) => setBrief(e.target.value)}
                                // Keep the brief even if it isn't parsed: generation reads it verbatim
                                onBlur={() => briefChanged && !isParsing && save({ ...metadata, brief: brief.trim() || undefined })}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                        e.preventDefault();
                                        parseBrief(brief);
                                    }
                                }}
                                readOnly={isPublished}
                                rows={3}
                                placeholder={`What's this post for, and who should it reach? Say it however you like.\ne.g. "Get founders scared of hiring their first PM to stop overthinking it. Slightly spicy, a short story from my last startup, and nudge them to DM me."`}
                                className="w-full resize-y bg-canvas shadow-well rounded-2xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 transition-all"
                            />
                            {!isPublished && (
                                <div className="flex items-center justify-between gap-3 mt-3">
                                    <span className="text-xs text-ink-muted">
                                        {strategySet && !metadata.brief
                                            ? "Claude filled these in from your topic. Describe the post to steer it, or edit any field."
                                            : "Optional. Anything you leave out, Claude infers."}
                                    </span>
                                    <button
                                        onClick={() => parseBrief(brief)}
                                        disabled={isParsing}
                                        className={`shrink-0 h-10 px-4 rounded-full text-sm font-medium flex items-center gap-1.5 active:shadow-pressed transition-all disabled:opacity-50 ${briefChanged ? 'bg-ember-500 text-white hover:bg-ember-600 shadow-ember' : 'bg-canvas text-ink shadow-raised hover:text-ember-600'}`}
                                    >
                                        {isParsing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className={briefChanged ? '' : 'text-ember-500'} />}
                                        {brief.trim() ? "Shape strategy" : "Infer strategy"}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Clarifying question */}
                        {metadata.clarifyingQuestion && !isPublished && (
                            <div className="flex items-center gap-2 bg-dusk-100 rounded-tile px-4 py-3">
                                <MessageCircleQuestion size={14} className="text-dusk-700 shrink-0" />
                                <span className="text-xs font-medium text-dusk-700 shrink-0 max-w-[50%]">{metadata.clarifyingQuestion}</span>
                                <input
                                    value={answer}
                                    onChange={(e) => setAnswer(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && answerQuestion()}
                                    placeholder="Your answer"
                                    className="flex-1 min-w-0 h-8 bg-surface shadow-well rounded-full px-3 text-xs text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200"
                                />
                                <button onClick={dismissQuestion} className="w-7 h-7 rounded-full flex items-center justify-center text-dusk-500 hover:text-dusk-700 active:shadow-pressed" aria-label="Dismiss question">
                                    <X size={12} />
                                </button>
                            </div>
                        )}

                        {/* What Claude understood: every field is editable free text */}
                        <div className="flex flex-wrap gap-2">
                            {FIELDS.map(field => {
                                const value = getFieldValue(metadata, field.key);
                                const Icon = field.icon;

                                if (editingField === field.key) {
                                    const suggestions = [...(recent[field.key] || []), ...(field.presets || [])]
                                        .filter((v, i, all) => all.findIndex(o => o.toLowerCase() === v.toLowerCase()) === i)
                                        .slice(0, 8);
                                    return (
                                        <div key={field.key} className="w-full bg-canvas shadow-pressed rounded-tile p-3 space-y-2.5">
                                            <div className="flex items-center gap-2 bg-surface shadow-well rounded-full px-3 h-9">
                                                <Icon size={12} className={field.color} />
                                                <span className="text-xs font-medium text-ink-muted shrink-0">{field.label}</span>
                                                <input
                                                    autoFocus
                                                    value={fieldDraft}
                                                    onChange={(e) => setFieldDraft(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') commitField(field.key, fieldDraft);
                                                        if (e.key === 'Escape') setEditingField(null);
                                                    }}
                                                    onBlur={() => commitField(field.key, fieldDraft)}
                                                    placeholder={field.placeholder}
                                                    className="flex-1 min-w-0 bg-transparent text-sm text-ink placeholder:text-ink-muted border-0 focus:outline-none"
                                                />
                                            </div>
                                            {suggestions.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {suggestions.map(s => (
                                                        <button
                                                            key={s}
                                                            // Commit before the input's blur fires
                                                            onMouseDown={(e) => { e.preventDefault(); commitField(field.key, s); }}
                                                            className="h-7 px-3 rounded-full bg-canvas shadow-raised text-xs font-medium text-ink-soft hover:text-ember-600 active:shadow-pressed transition-all"
                                                        >
                                                            {s}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                if (!value && isPublished) return null;

                                return (
                                    <button
                                        key={field.key}
                                        onClick={() => startEditing(field.key)}
                                        title={value ? `${field.label}: ${value}` : `Add ${field.label.toLowerCase()}`}
                                        className={`max-w-full flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-medium transition-all ${value
                                            ? 'bg-canvas shadow-well text-ink hover:text-ember-700'
                                            : 'bg-surface border border-dashed border-line text-ink-muted hover:text-ink-soft hover:border-ink-muted/40'} ${isPublished ? 'cursor-default' : ''}`}
                                    >
                                        <Icon size={11} className={value ? field.color : ''} />
                                        {value ? (
                                            <>
                                                <span className="text-ink-muted">{field.label}:</span>
                                                <span className="truncate max-w-[260px]">{value}</span>
                                            </>
                                        ) : (
                                            <span>{field.label}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
