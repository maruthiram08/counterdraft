"use client";

import { useState, useEffect, useCallback } from "react";
import { GlobalSidebar } from "@/components/navigation/GlobalSidebar";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { StyleAnalysisModal } from "@/components/modal/StyleAnalysisModal";
import { PenTool, Wand2, RefreshCw, CheckCircle, XCircle, Plus, X, Save, Edit2, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { TidyRulesPanel } from "@/components/voice/TidyRulesPanel";
import { cleanOrigins, MAX_RULES, TidyProposal } from "@/lib/voice/rules";
import { useNavigate } from "@/components/shared/NavProgress";

interface VoiceProfile {
    id: string;
    voice_tone: string;
    rules: string[];
    anti_patterns: string[];
    name: string;
    workflow_preferences?: { rule_origins?: unknown };
}

export default function StylePage() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<VoiceProfile | null>(null);
    const [profiles, setProfiles] = useState<VoiceProfile[]>([]); // NEW
    const [loading, setLoading] = useState(true);
    const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editedProfile, setEditedProfile] = useState<VoiceProfile | null>(null);
    const [saving, setSaving] = useState(false);

    // Tidy-up proposal, shown for review before anything is saved
    const [tidying, setTidying] = useState(false);
    const [tidy, setTidy] = useState<TidyProposal | null>(null);

    // New Profile State
    const [isCreating, setIsCreating] = useState(false);
    const [newProfileName, setNewProfileName] = useState("");

    const fetchActiveProfile = useCallback(async () => {
        try {
            const res = await fetch('/api/user/style');
            if (res.ok) {
                const data = await res.json();
                setProfile(data.profile);
            } else {
                setProfile(null);
            }
        } catch (error) {
            console.error("Failed to fetch active profile", error);
        }
    }, []);

    const fetchProfiles = useCallback(async () => {
        try {
            const res = await fetch('/api/user/style/profiles');
            if (res.ok) {
                const data = await res.json();
                setProfiles(data.profiles || []);
            }
        } catch (error) {
            console.error("Failed to fetch profiles", error);
        }
    }, []);

    const refreshAll = useCallback(async () => {
        setLoading(true);
        await Promise.all([fetchActiveProfile(), fetchProfiles()]);
        setLoading(false);
    }, [fetchActiveProfile, fetchProfiles]);

    useEffect(() => {
        refreshAll();
    }, [refreshAll]);

    const handleSwitchProfile = async (profileId: string) => {
        try {
            const res = await fetch('/api/user/style/activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: profileId })
            });
            if (res.ok) {
                refreshAll();
            }
        } catch (error) {
            console.error("Failed to switch profile", error);
        }
    };

    const handleCreateProfile = async () => {
        if (!newProfileName.trim()) return;
        try {
            const res = await fetch('/api/user/style/profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newProfileName })
            });
            if (res.ok) {
                setNewProfileName("");
                setIsCreating(false);
                refreshAll();
            }
        } catch (error) {
            console.error("Failed to create profile", error);
        }
    };

    type StyleAnalysis = {
        voice_tone?: string;
        rules?: string[];
        anti_patterns?: string[];
    };

    const handleAnalysisComplete = async (analysis: StyleAnalysis) => {
        if (!analysis) return;

        try {
            setLoading(true);
            const res = await fetch('/api/user/style', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    voice_tone: analysis.voice_tone,
                    rules: analysis.rules,
                    anti_patterns: analysis.anti_patterns
                }),
            });

            if (res.ok) {
                await refreshAll();
            }
        } catch (error) {
            console.error("Failed to save analysis results", error);
        } finally {
            setLoading(false);
            setIsAnalysisOpen(false);
        }
    };

    const handleSave = async () => {
        if (!editedProfile || !profile) return;
        setSaving(true);
        try {
            const res = await fetch('/api/user/style', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    voice_tone: editedProfile.voice_tone,
                    rules: editedProfile.rules,
                    anti_patterns: editedProfile.anti_patterns
                }),
            });

            if (res.ok) {
                setProfile(await res.json().then(d => d.profile));
                setIsEditing(false);
            }
        } catch (error) {
            console.error("Failed to save profile", error);
        } finally {
            setSaving(false);
        }
    };

    const handleTidy = async () => {
        setTidying(true);
        try {
            const res = await fetch('/api/user/style/tidy', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Could not tidy your rules');
            setTidy(data);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Could not tidy your rules');
        } finally {
            setTidying(false);
        }
    };

    const handleApplyTidy = async () => {
        if (!tidy) return;
        setSaving(true);
        try {
            const res = await fetch('/api/user/style', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rules: tidy.rules, anti_patterns: tidy.anti_patterns }),
            });
            if (!res.ok) throw new Error('Could not save');
            setProfile(await res.json().then(d => d.profile));
            setTidy(null);
            toast.success('Rules tidied');
        } catch {
            toast.error('Could not save the tidied rules');
        } finally {
            setSaving(false);
        }
    };

    const ruleOrigins = cleanOrigins(profile?.workflow_preferences?.rule_origins);
    const learnedOn = (rule: string) => {
        const origin = ruleOrigins[rule];
        if (origin?.source !== 'edit') return null;
        return new Date(origin.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this voice profile?")) return;

        try {
            setLoading(true);
            const res = await fetch('/api/user/style', { method: 'DELETE' }); // Deletes ACTIVE
            if (res.ok) {
                await refreshAll();
            }
        } catch (error) {
            console.error("Failed to delete profile", error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartEdit = () => {
        setEditedProfile(JSON.parse(JSON.stringify(profile)));
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setEditedProfile(null);
        setIsEditing(false);
    };

    // Helper to update array fields
    const updateList = (field: 'rules' | 'anti_patterns', index: number, value: string) => {
        if (!editedProfile) return;
        const newList = [...editedProfile[field]];
        newList[index] = value;
        setEditedProfile({ ...editedProfile, [field]: newList });
    };

    const addListItem = (field: 'rules' | 'anti_patterns') => {
        if (!editedProfile) return;
        setEditedProfile({ ...editedProfile, [field]: [...editedProfile[field], ""] });
    };

    const removeListItem = (field: 'rules' | 'anti_patterns', index: number) => {
        if (!editedProfile) return;
        const newList = [...editedProfile[field]];
        newList.splice(index, 1);
        setEditedProfile({ ...editedProfile, [field]: newList });
    };

    // Open edit mode with an empty row ready in one list
    const startEditAdding = (field: 'rules' | 'anti_patterns') => {
        if (!profile) return;
        const copy: VoiceProfile = JSON.parse(JSON.stringify(profile));
        copy[field] = [...(copy[field] || []), ""];
        setEditedProfile(copy);
        setIsEditing(true);
    };

    const ruleCount = profile?.rules?.length || 0;
    const antiCount = profile?.anti_patterns?.length || 0;
    const learnedCount = (profile?.rules || []).filter(r => learnedOn(r)).length;

    return (
        <div className="flex h-dvh bg-canvas overflow-hidden">
            <GlobalSidebar
                activeSection="style"
                onNavigate={(section) => {
                    if (section === 'style') return;
                    if (section === 'settings') {
                        navigate('/settings');
                    } else {
                        navigate(`/workspace?tab=${section}`);
                    }
                }}
                onNewDraft={() => navigate('/workspace?new=true')}
                onImport={() => { }}
            />

            <main className="flex-1 flex flex-col min-h-0 min-w-0 overflow-y-auto bg-canvas">
                <div className="max-w-[1440px] mx-auto w-full px-4 md:px-10 pt-5 md:pt-7 pb-28 md:pb-12 flex flex-col gap-5">

                    {/* Header: title on the left, voice picker on the right */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                        <div className="min-w-0">
                            <h1 className="text-2xl md:text-[32px] md:leading-tight font-medium tracking-[-0.02em] text-ink flex items-center gap-3">
                                <PenTool size={24} className="text-ember-500 shrink-0" />
                                Your Voice
                            </h1>
                            <p className="mt-1 text-sm text-ink-soft">
                                How Counterdraft writes as you: your tone, what to do and what to avoid.
                            </p>
                        </div>

                        <label className="flex items-center gap-2 bg-canvas shadow-well rounded-full h-11 md:h-10 pl-4 pr-3 self-start md:self-auto">
                            <span className="text-xs text-ink-muted shrink-0">Voice</span>
                            <select
                                value={profile?.id || ""}
                                onChange={(e) => {
                                    if (e.target.value === "new") {
                                        setIsCreating(true);
                                    } else {
                                        handleSwitchProfile(e.target.value);
                                    }
                                }}
                                className="bg-transparent text-sm font-medium text-ink outline-none cursor-pointer min-w-[140px] max-w-[220px]"
                                aria-label="Voice profile"
                            >
                                <option value="" disabled>Select a voice</option>
                                {profiles.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name || "Untitled Voice"} {p.id === profile?.id ? "(Active)" : ""}
                                    </option>
                                ))}
                                <option value="new">+ Create New Voice</option>
                            </select>
                        </label>
                    </div>

                    {/* Create new voice (inline) */}
                    {isCreating && (
                        <div className="bg-surface rounded-tile shadow-card p-5 animate-in fade-in slide-in-from-top-4">
                            <h3 className="text-[17px] font-medium tracking-[-0.01em] text-ink mb-3">Create a new voice</h3>
                            <div className="flex flex-col md:flex-row gap-3">
                                <input
                                    value={newProfileName}
                                    onChange={(e) => setNewProfileName(e.target.value)}
                                    placeholder="e.g. LinkedIn Professional, Casual Blog..."
                                    className="flex-1 bg-canvas shadow-well rounded-2xl px-4 py-2.5 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200"
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCreateProfile}
                                        disabled={!newProfileName.trim()}
                                        className="flex-1 md:flex-none h-11 md:h-10 px-4 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50"
                                    >
                                        Create voice
                                    </button>
                                    <button
                                        onClick={() => setIsCreating(false)}
                                        className="h-11 md:h-10 px-4 rounded-full text-sm font-medium text-ink-muted hover:text-ink active:shadow-pressed transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center py-20 text-ink-muted">
                            <RefreshCw size={24} className="animate-spin mr-3" />
                            Loading profile...
                        </div>
                    ) : !profile ? (
                        <div className="text-center py-16 px-6 bg-surface rounded-card shadow-card">
                            <PenTool size={40} className="mx-auto text-ember-200 mb-5" />
                            <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-2">No voice yet</h2>
                            <p className="text-sm text-ink-soft mb-6 max-w-md mx-auto">
                                Analyze a few of your posts so Counterdraft learns how you write, or create an empty voice and add rules yourself.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2 justify-center">
                                <button
                                    onClick={() => setIsAnalysisOpen(true)}
                                    className="flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all"
                                >
                                    <Wand2 size={16} />
                                    Analyze my style
                                </button>
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="h-11 px-5 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all"
                                >
                                    Create empty voice
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Summary strip: tone + counts + actions, one slim row */}
                            <div className="bg-surface rounded-tile shadow-card p-4 md:px-5 flex flex-col lg:flex-row lg:items-center gap-4 animate-fade-in-up">
                                <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-x-5 gap-y-3">
                                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                        <span className="text-sm text-ink-muted shrink-0">Tone</span>
                                        {isEditing && editedProfile ? (
                                            <input
                                                type="text"
                                                value={editedProfile.voice_tone}
                                                onChange={(e) => setEditedProfile({ ...editedProfile, voice_tone: e.target.value })}
                                                className="flex-1 min-w-[200px] h-10 bg-canvas shadow-well rounded-full px-4 text-sm text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200"
                                                placeholder="e.g. Direct, Cynical, Warm"
                                            />
                                        ) : (
                                            toneChips(profile.voice_tone).map(t => (
                                                <span key={t} className="h-7 px-3 inline-flex items-center rounded-full bg-ember-100 text-ember-700 text-xs font-medium">
                                                    {t}
                                                </span>
                                            ))
                                        )}
                                        {!isEditing && (
                                            <button
                                                onClick={handleDelete}
                                                className="lg:hidden ml-auto w-11 h-11 -my-2 -mr-2 rounded-full flex items-center justify-center text-ink-muted hover:text-rose-600 active:shadow-pressed transition-all"
                                                title="Delete this voice"
                                                aria-label="Delete this voice"
                                            >
                                                <Trash2 size={17} />
                                            </button>
                                        )}
                                    </div>
                                    {!isEditing && (
                                        <p className="text-xs text-ink-muted sm:border-l sm:border-line sm:pl-5">
                                            {ruleCount} {ruleCount === 1 ? 'do' : "do's"} · {antiCount} {antiCount === 1 ? "don't" : "don'ts"}
                                            {learnedCount > 0 && <> · {learnedCount} learned from your edits</>}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    {isEditing ? (
                                        <>
                                            <button
                                                onClick={handleCancelEdit}
                                                disabled={saving}
                                                className="flex-1 lg:flex-none h-11 md:h-10 px-4 rounded-full text-sm font-medium text-ink-soft hover:text-ink active:shadow-pressed transition-all disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSave}
                                                disabled={saving}
                                                className="flex-1 lg:flex-none justify-center flex items-center gap-1.5 h-11 md:h-10 px-4 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50"
                                            >
                                                {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                                                Save changes
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={handleDelete}
                                                className="hidden lg:flex w-10 h-10 rounded-full items-center justify-center text-ink-muted hover:text-rose-600 hover:bg-rose-100 active:shadow-pressed transition-all"
                                                title="Delete this voice"
                                                aria-label="Delete this voice"
                                            >
                                                <Trash2 size={17} />
                                            </button>
                                            {ruleCount + antiCount >= 2 && (
                                                <button
                                                    onClick={handleTidy}
                                                    disabled={tidying}
                                                    className="flex-1 lg:flex-none justify-center flex items-center gap-1.5 whitespace-nowrap h-11 md:h-10 px-3 lg:px-4 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all disabled:opacity-50"
                                                    title="Merge repeated rules and find ones that contradict each other"
                                                >
                                                    {tidying ? <RefreshCw size={15} className="animate-spin text-ember-500" /> : <Sparkles size={15} className="hidden sm:block text-ember-500" />}
                                                    Tidy up
                                                </button>
                                            )}
                                            <button
                                                onClick={handleStartEdit}
                                                className="flex-1 lg:flex-none justify-center flex items-center gap-1.5 whitespace-nowrap h-11 md:h-10 px-3 lg:px-4 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all"
                                            >
                                                <Edit2 size={15} className="hidden sm:block text-ember-500" />
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => setIsAnalysisOpen(true)}
                                                className="flex-1 lg:flex-none justify-center flex items-center gap-1.5 whitespace-nowrap h-11 md:h-10 px-3 lg:px-4 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all"
                                            >
                                                <Wand2 size={15} className="hidden sm:block" />
                                                Re-analyze
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {tidy && !isEditing && (
                                <TidyRulesPanel
                                    proposal={tidy}
                                    before={{ rules: ruleCount, anti_patterns: antiCount }}
                                    saving={saving}
                                    onApply={handleApplyTidy}
                                    onCancel={() => setTidy(null)}
                                />
                            )}

                            {/* Do's and Don'ts side by side, filling the width */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start animate-fade-in-up">
                                <RuleCard
                                    tone="do"
                                    title="Do's"
                                    hint="Rules Counterdraft follows when it writes as you."
                                    items={profile.rules || []}
                                    note={ruleCount >= MAX_RULES - 2 ? `${ruleCount} of ${MAX_RULES}. New rules learned from your edits replace the oldest learned ones.` : undefined}
                                    editing={isEditing && !!editedProfile}
                                    editItems={editedProfile?.rules || []}
                                    onChange={(i, v) => updateList('rules', i, v)}
                                    onRemove={(i) => removeListItem('rules', i)}
                                    onAdd={() => addListItem('rules')}
                                    onStartAdd={() => startEditAdding('rules')}
                                    addLabel="Add a do"
                                    emptyText="No rules yet."
                                    meta={(rule) => learnedOn(rule) ? { text: `Learned from your edits, ${learnedOn(rule)}`, title: ruleOrigins[rule]?.why } : null}
                                />
                                <RuleCard
                                    tone="dont"
                                    title="Don'ts"
                                    hint="Things Counterdraft avoids in your drafts."
                                    items={profile.anti_patterns || []}
                                    editing={isEditing && !!editedProfile}
                                    editItems={editedProfile?.anti_patterns || []}
                                    onChange={(i, v) => updateList('anti_patterns', i, v)}
                                    onRemove={(i) => removeListItem('anti_patterns', i)}
                                    onAdd={() => addListItem('anti_patterns')}
                                    onStartAdd={() => startEditAdding('anti_patterns')}
                                    addLabel="Add a don't"
                                    emptyText="Nothing to avoid yet. Add phrases or habits you never want in your posts, like hashtags or 'In today's fast-paced world'."
                                />
                            </div>
                        </>
                    )}
                </div>
            </main>

            <MobileBottomNav
                activeSection="style"
                onNavigate={(section) => {
                    if (section === 'style') return;
                    navigate(`/workspace?tab=${section}`);
                }}
            />

            <StyleAnalysisModal
                isOpen={isAnalysisOpen}
                onClose={() => setIsAnalysisOpen(false)}
                onComplete={handleAnalysisComplete}
            />
        </div>
    );
}

// "Direct, warm and a bit cynical" -> ["Direct", "warm", "a bit cynical"]
function toneChips(tone: string | undefined): string[] {
    const parts = (tone || '')
        .split(/,|;|\/|\band\b|&/i)
        .map(t => t.trim())
        .filter(Boolean);
    const unique = Array.from(new Set(parts)).slice(0, 6);
    return unique.length ? unique.map(t => t[0].toUpperCase() + t.slice(1)) : ['Neutral'];
}

interface RuleCardProps {
    tone: 'do' | 'dont';
    title: string;
    hint: string;
    items: string[];
    note?: string;
    editing: boolean;
    editItems: string[];
    onChange: (index: number, value: string) => void;
    onRemove: (index: number) => void;
    onAdd: () => void;
    onStartAdd: () => void;
    addLabel: string;
    emptyText: string;
    meta?: (item: string) => { text: string; title?: string } | null;
}

function RuleCard({ tone, title, hint, items, note, editing, editItems, onChange, onRemove, onAdd, onStartAdd, addLabel, emptyText, meta }: RuleCardProps) {
    const isDo = tone === 'do';
    const Icon = isDo ? CheckCircle : XCircle;
    const count = editing ? editItems.length : items.length;
    return (
        <section className="bg-surface rounded-card shadow-card p-5 md:p-6">
            <div className="flex items-start gap-3">
                <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${isDo ? 'bg-sage-100 text-sage-700' : 'bg-rose-100 text-rose-700'}`}>
                    <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-medium tracking-[-0.02em] text-ink">{title}</h2>
                        <span className="min-w-6 h-6 px-2 inline-flex items-center justify-center rounded-full bg-canvas shadow-well text-xs font-medium text-ink-soft">{count}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-ink-muted">{hint}</p>
                </div>
            </div>
            {note && !editing && <p className="mt-3 text-xs text-ink-muted">{note}</p>}

            {editing ? (
                <div className="mt-4 space-y-2">
                    {editItems.map((item, i) => (
                        <div key={i} className="flex items-start gap-2">
                            <textarea
                                rows={1}
                                value={item}
                                onChange={(e) => onChange(i, e.target.value)}
                                className="flex-1 min-w-0 resize-none [field-sizing:content] bg-canvas shadow-well rounded-2xl px-4 py-2.5 leading-relaxed text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 text-sm"
                                placeholder={isDo ? 'Add a rule...' : 'Add something to avoid...'}
                                autoFocus={item === '' && i === editItems.length - 1}
                            />
                            <button
                                onClick={() => onRemove(i)}
                                className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-ink-muted hover:text-rose-500 active:shadow-pressed"
                                aria-label="Remove"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={onAdd}
                        className="flex items-center gap-1.5 h-10 px-4 rounded-full bg-canvas shadow-raised text-sm font-medium text-ink hover:text-ember-600 active:shadow-pressed transition-all"
                    >
                        <Plus size={14} /> {addLabel}
                    </button>
                </div>
            ) : items.length > 0 ? (
                <ul className="mt-3 divide-y divide-line">
                    {items.map((item, i) => {
                        const m = meta?.(item);
                        return (
                            <li key={i} className="flex gap-3 py-3 last:pb-0 text-sm leading-relaxed text-ink-soft">
                                <span className={`mt-[7px] w-1.5 h-1.5 shrink-0 rounded-full ${isDo ? 'bg-sage-500' : 'bg-rose-500'}`} />
                                <span className="min-w-0">
                                    {item}
                                    {m && (
                                        <span className="block text-xs text-ink-muted" title={m.title}>{m.text}</span>
                                    )}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <div className="mt-4 rounded-tile bg-surface-muted p-4">
                    <p className="text-sm text-ink-soft">{emptyText}</p>
                    <button
                        onClick={onStartAdd}
                        className="mt-3 flex items-center gap-1.5 h-10 px-4 rounded-full bg-canvas shadow-raised text-sm font-medium text-ink hover:text-ember-600 active:shadow-pressed transition-all"
                    >
                        <Plus size={14} /> {addLabel}
                    </button>
                </div>
            )}
        </section>
    );
}
