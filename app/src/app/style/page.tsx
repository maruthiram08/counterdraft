"use client";

import { useState, useEffect, useCallback } from "react";
import { GlobalSidebar } from "@/components/navigation/GlobalSidebar";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { StyleAnalysisModal } from "@/components/modal/StyleAnalysisModal";
import { PenTool, Wand2, RefreshCw, CheckCircle, XCircle, Plus, X, Save, Edit2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface VoiceProfile {
    id: string;
    voice_tone: string;
    rules: string[];
    anti_patterns: string[];
    name: string;
}

export default function StylePage() {
    const router = useRouter();
    const [profile, setProfile] = useState<VoiceProfile | null>(null);
    const [profiles, setProfiles] = useState<VoiceProfile[]>([]); // NEW
    const [loading, setLoading] = useState(true);
    const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editedProfile, setEditedProfile] = useState<VoiceProfile | null>(null);
    const [saving, setSaving] = useState(false);

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

    return (
        <div className="flex h-screen bg-canvas overflow-hidden">
            <GlobalSidebar
                activeSection="style"
                onNavigate={(section) => {
                    if (section === 'style') return;
                    if (section === 'settings') {
                        router.push('/settings');
                    } else {
                        router.push(`/workspace?tab=${section}`);
                    }
                }}
                onNewDraft={() => router.push('/workspace?new=true')}
                onImport={() => { }}
            />

            <main className="flex-1 flex flex-col min-h-0 min-w-0 overflow-y-auto bg-canvas">
                <div className="max-w-5xl mx-auto w-full px-4 md:px-10 pt-5 md:pt-7 pb-28 md:pb-12">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5">
                        <div>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 shrink-0 rounded-full bg-canvas shadow-raised text-ember-500 flex items-center justify-center">
                                    <PenTool size={22} />
                                </div>
                                <h1 className="text-2xl md:text-[32px] md:leading-tight font-medium tracking-[-0.02em] text-ink">Your Voice</h1>
                            </div>
                            <p className="mt-1 text-sm text-ink-soft max-w-2xl">
                                Manage the writing style Counterdraft uses to generate your content.
                            </p>
                        </div>

                        {/* Profile Selector */}
                        <div className="flex items-center gap-3 bg-canvas shadow-well rounded-full h-12 px-4">
                            <select
                                value={profile?.id || ""}
                                onChange={(e) => {
                                    if (e.target.value === "new") {
                                        setIsCreating(true);
                                    } else {
                                        handleSwitchProfile(e.target.value);
                                    }
                                }}
                                className="bg-transparent text-sm font-medium text-ink outline-none cursor-pointer min-w-[150px]"
                            >
                                <option value="" disabled>Select Profile</option>
                                {profiles.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name || "Untitled Voice"} {p.id === profile?.id ? "(Active)" : ""}
                                    </option>
                                ))}
                                <option value="new">+ Create New Voice</option>
                            </select>
                        </div>
                    </div>

                    {/* Create New Modal/Input Area (Inline for now) */}
                    {isCreating && (
                        <div className="mb-8 bg-surface rounded-card shadow-card p-6 md:p-8 animate-in fade-in slide-in-from-top-4">
                            <h3 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-4">Create New Voice Profile</h3>
                            <div className="flex flex-col md:flex-row gap-3">
                                <input
                                    value={newProfileName}
                                    onChange={(e) => setNewProfileName(e.target.value)}
                                    placeholder="e.g. LinkedIn Professional, Casual Blog..."
                                    className="flex-1 bg-canvas shadow-well rounded-2xl px-4 py-3 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200"
                                    autoFocus
                                />
                                <button
                                    onClick={handleCreateProfile}
                                    disabled={!newProfileName.trim()}
                                    className="h-12 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50"
                                >
                                    Create Profile
                                </button>
                                <button
                                    onClick={() => setIsCreating(false)}
                                    className="h-12 px-5 rounded-full text-sm font-medium text-ink-muted hover:text-ink active:shadow-pressed transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex flex-wrap justify-end gap-2.5 mb-8">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={handleCancelEdit}
                                    disabled={saving}
                                    className="h-12 px-5 rounded-full text-sm font-medium text-ink-soft hover:text-ink active:shadow-pressed transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center gap-2 h-12 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50"
                                >
                                    {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                                    Save Changes
                                </button>
                            </>
                        ) : (
                            <>
                                {profile && (
                                    <>
                                        <button
                                            onClick={handleDelete}
                                            className="w-12 h-12 rounded-full flex items-center justify-center bg-canvas shadow-raised text-rose-500 hover:text-rose-700 active:shadow-pressed transition-all"
                                            title="Delete this profile"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                        <div className="w-px bg-line mx-1"></div>
                                        <button
                                            onClick={handleStartEdit}
                                            className="flex items-center gap-2 h-12 px-5 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all"
                                        >
                                            <Edit2 size={16} className="text-ember-500" />
                                            Manual Edit
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => setIsAnalysisOpen(true)}
                                    className="flex items-center gap-2 h-12 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all"
                                >
                                    <Wand2 size={16} />
                                    {profile ? 'Re-analyze Samples' : 'Analyze My Style'}
                                </button>
                            </>
                        )}
                    </div>

                    {/* Content Area */}
                    {loading ? (
                        <div className="flex items-center justify-center py-20 text-ink-muted">
                            <RefreshCw size={24} className="animate-spin mr-3" />
                            Loading profile...
                        </div>
                    ) : !profile ? (
                        <div className="text-center py-20 px-6 bg-surface rounded-card shadow-card">
                            <PenTool size={48} className="mx-auto text-ember-200 mb-6" />
                            <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-2">No Voice Profile Selected</h2>
                            <p className="text-ink-soft mb-8 max-w-md mx-auto">
                                Create a new profile or select one from the list to get started.
                            </p>
                            <button
                                onClick={() => setIsCreating(true)}
                                className="h-12 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all"
                            >
                                Create New Profile
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up">
                            {/* Tone Card */}
                            <div className="col-span-1 lg:col-span-3 bg-surface rounded-card shadow-card p-6 md:p-8 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-3 text-ember-500 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <PenTool size={120} />
                                </div>
                                <h3 className="text-sm text-ink-muted mb-4">Voice Tone</h3>
                                {isEditing && editedProfile ? (
                                    <input
                                        type="text"
                                        value={editedProfile.voice_tone}
                                        onChange={(e) => setEditedProfile({ ...editedProfile, voice_tone: e.target.value })}
                                        className="text-4xl md:text-5xl font-medium tracking-[-0.03em] w-full bg-canvas shadow-well rounded-2xl px-4 py-3 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200"
                                        placeholder="e.g. Direct, Cynical, Warm"
                                    />
                                ) : (
                                    <div className="text-4xl md:text-5xl font-medium tracking-[-0.03em] text-ink leading-tight">
                                        {profile.voice_tone || "Neutral"}
                                    </div>
                                )}
                            </div>

                            {/* Rules Card */}
                            <div className="bg-surface rounded-card shadow-card p-6 md:p-8 flex flex-col">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-full bg-sage-100 text-sage-700 flex items-center justify-center">
                                        <CheckCircle size={20} />
                                    </div>
                                    <h3 className="text-2xl font-medium tracking-[-0.02em] text-ink">Do&apos;s (Rules)</h3>
                                </div>
                                <div className="space-y-4 flex-1">
                                    {isEditing && editedProfile ? (
                                        <>
                                            {editedProfile.rules.map((rule, i) => (
                                                <div key={i} className="flex gap-2">
                                                    <input
                                                        value={rule}
                                                        onChange={(e) => updateList('rules', i, e.target.value)}
                                                        className="flex-1 bg-canvas shadow-well rounded-2xl px-4 py-2.5 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 text-sm"
                                                        placeholder="Add a rule..."
                                                    />
                                                    <button onClick={() => removeListItem('rules', i)} className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-ink-muted hover:text-rose-500 active:shadow-pressed">
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                            <button onClick={() => addListItem('rules')} className="flex items-center gap-2 h-10 px-4 rounded-full bg-canvas shadow-raised text-sm font-medium text-ink hover:text-ember-600 active:shadow-pressed transition-all mt-2">
                                                <Plus size={14} /> Add Rule
                                            </button>
                                        </>
                                    ) : (
                                        <ul className="space-y-4">
                                            {profile.rules && profile.rules.length > 0 ? (
                                                profile.rules.map((rule, i) => (
                                                    <li key={i} className="flex gap-3 text-ink-soft text-sm leading-relaxed">
                                                        <span className="text-sage-500 font-medium">•</span>
                                                        {rule}
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="text-ink-muted italic text-sm">No specific rules defined.</li>
                                            )}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            {/* Anti-Patterns Card */}
                            <div className="bg-surface rounded-card shadow-card p-6 md:p-8 flex flex-col">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
                                        <XCircle size={20} />
                                    </div>
                                    <h3 className="text-2xl font-medium tracking-[-0.02em] text-ink">Don&apos;ts (Anti-Patterns)</h3>
                                </div>
                                <div className="space-y-4 flex-1">
                                    {isEditing && editedProfile ? (
                                        <>
                                            {editedProfile.anti_patterns.map((pattern, i) => (
                                                <div key={i} className="flex gap-2">
                                                    <input
                                                        value={pattern}
                                                        onChange={(e) => updateList('anti_patterns', i, e.target.value)}
                                                        className="flex-1 bg-canvas shadow-well rounded-2xl px-4 py-2.5 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 text-sm"
                                                        placeholder="Add an anti-pattern..."
                                                    />
                                                    <button onClick={() => removeListItem('anti_patterns', i)} className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-ink-muted hover:text-rose-500 active:shadow-pressed">
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                            <button onClick={() => addListItem('anti_patterns')} className="flex items-center gap-2 h-10 px-4 rounded-full bg-canvas shadow-raised text-sm font-medium text-ink hover:text-rose-700 active:shadow-pressed transition-all mt-2">
                                                <Plus size={14} /> Add Anti-Pattern
                                            </button>
                                        </>
                                    ) : (
                                        <ul className="space-y-4">
                                            {profile.anti_patterns && profile.anti_patterns.length > 0 ? (
                                                profile.anti_patterns.map((pattern, i) => (
                                                    <li key={i} className="flex gap-3 text-ink-soft text-sm leading-relaxed">
                                                        <span className="text-rose-500 font-medium">×</span>
                                                        {pattern}
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="text-ink-muted italic text-sm">No anti-patterns defined.</li>
                                            )}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <MobileBottomNav
                activeSection="style"
                onNavigate={(section) => {
                    if (section === 'style') return;
                    router.push(`/workspace?tab=${section}`);
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
