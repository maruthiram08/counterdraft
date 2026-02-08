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
        <div className="flex h-screen bg-[var(--background)] overflow-hidden">
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

            <main className="flex-1 flex flex-col min-h-0 min-w-0 overflow-y-auto bg-zinc-50/50">
                <div className="max-w-5xl mx-auto w-full p-6 md:p-12">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                                    <PenTool size={24} />
                                </div>
                                <h1 className="text-3xl font-serif text-zinc-900">Your Voice</h1>
                            </div>
                            <p className="text-zinc-500 max-w-2xl">
                                Manage the writing style Counterdraft uses to generate your content.
                            </p>
                        </div>

                        {/* Profile Selector */}
                        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-zinc-200 shadow-sm">
                            <select
                                value={profile?.id || ""}
                                onChange={(e) => {
                                    if (e.target.value === "new") {
                                        setIsCreating(true);
                                    } else {
                                        handleSwitchProfile(e.target.value);
                                    }
                                }}
                                className="bg-transparent font-medium text-zinc-700 outline-none cursor-pointer min-w-[150px]"
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
                        <div className="mb-8 p-6 bg-white rounded-xl border border-purple-100 shadow-lg animate-in fade-in slide-in-from-top-4">
                            <h3 className="text-lg font-bold mb-4">Create New Voice Profile</h3>
                            <div className="flex gap-4">
                                <input
                                    value={newProfileName}
                                    onChange={(e) => setNewProfileName(e.target.value)}
                                    placeholder="e.g. LinkedIn Professional, Casual Blog..."
                                    className="flex-1 p-3 border border-zinc-200 rounded-lg focus:border-purple-500 outline-none"
                                    autoFocus
                                />
                                <button
                                    onClick={handleCreateProfile}
                                    disabled={!newProfileName.trim()}
                                    className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50"
                                >
                                    Create Profile
                                </button>
                                <button
                                    onClick={() => setIsCreating(false)}
                                    className="px-6 py-3 text-zinc-500 hover:text-zinc-700 font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex justify-end gap-2 mb-8">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={handleCancelEdit}
                                    disabled={saving}
                                    className="px-4 py-2 text-zinc-600 hover:text-zinc-900 font-medium disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-5 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50"
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
                                            className="flex items-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-all"
                                            title="Delete this profile"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                        <div className="w-px bg-zinc-200 mx-2"></div>
                                        <button
                                            onClick={handleStartEdit}
                                            className="flex items-center gap-2 px-5 py-3 bg-white border border-zinc-200 text-zinc-700 rounded-xl font-bold hover:bg-zinc-50 transition-all"
                                        >
                                            <Edit2 size={18} />
                                            Manual Edit
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => setIsAnalysisOpen(true)}
                                    className="flex items-center gap-2 px-5 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg shadow-zinc-900/10"
                                >
                                    <Wand2 size={18} />
                                    {profile ? 'Re-analyze Samples' : 'Analyze My Style'}
                                </button>
                            </>
                        )}
                    </div>

                    {/* Content Area */}
                    {loading ? (
                        <div className="flex items-center justify-center py-20 text-zinc-400">
                            <RefreshCw size={24} className="animate-spin mr-3" />
                            Loading profile...
                        </div>
                    ) : !profile ? (
                        <div className="text-center py-20 border-2 border-dashed border-zinc-200 rounded-2xl bg-white">
                            <PenTool size={48} className="mx-auto text-zinc-200 mb-6" />
                            <h2 className="text-xl font-bold text-zinc-900 mb-2">No Voice Profile Selected</h2>
                            <p className="text-zinc-500 mb-8 max-w-md mx-auto">
                                Create a new profile or select one from the list to get started.
                            </p>
                            <button
                                onClick={() => setIsCreating(true)}
                                className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-colors"
                            >
                                Create New Profile
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up">
                            {/* Tone Card */}
                            <div className="col-span-1 lg:col-span-3 bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <PenTool size={120} />
                                </div>
                                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Voice Tone</h3>
                                {isEditing && editedProfile ? (
                                    <input
                                        type="text"
                                        value={editedProfile.voice_tone}
                                        onChange={(e) => setEditedProfile({ ...editedProfile, voice_tone: e.target.value })}
                                        className="text-4xl md:text-5xl font-serif text-zinc-900 w-full border-b-2 border-zinc-200 focus:border-purple-500 outline-none bg-transparent placeholder-zinc-300"
                                        placeholder="e.g. Direct, Cynical, Warm"
                                    />
                                ) : (
                                    <div className="text-4xl md:text-5xl font-serif text-zinc-900 leading-tight">
                                        {profile.voice_tone || "Neutral"}
                                    </div>
                                )}
                            </div>

                            {/* Rules Card */}
                            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                        <CheckCircle size={20} />
                                    </div>
                                    <h3 className="text-lg font-bold text-zinc-900">Do&apos;s (Rules)</h3>
                                </div>
                                <div className="space-y-4 flex-1">
                                    {isEditing && editedProfile ? (
                                        <>
                                            {editedProfile.rules.map((rule, i) => (
                                                <div key={i} className="flex gap-2">
                                                    <input
                                                        value={rule}
                                                        onChange={(e) => updateList('rules', i, e.target.value)}
                                                        className="flex-1 p-2 border border-zinc-200 rounded-lg text-sm focus:border-green-500 outline-none"
                                                        placeholder="Add a rule..."
                                                    />
                                                    <button onClick={() => removeListItem('rules', i)} className="text-zinc-400 hover:text-red-500">
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                            <button onClick={() => addListItem('rules')} className="flex items-center gap-2 text-sm font-bold text-green-600 hover:text-green-700 mt-2">
                                                <Plus size={14} /> Add Rule
                                            </button>
                                        </>
                                    ) : (
                                        <ul className="space-y-4">
                                            {profile.rules && profile.rules.length > 0 ? (
                                                profile.rules.map((rule, i) => (
                                                    <li key={i} className="flex gap-3 text-zinc-600 text-sm leading-relaxed">
                                                        <span className="text-green-500 font-bold">•</span>
                                                        {rule}
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="text-zinc-400 italic text-sm">No specific rules defined.</li>
                                            )}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            {/* Anti-Patterns Card */}
                            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                                        <XCircle size={20} />
                                    </div>
                                    <h3 className="text-lg font-bold text-zinc-900">Don&apos;ts (Anti-Patterns)</h3>
                                </div>
                                <div className="space-y-4 flex-1">
                                    {isEditing && editedProfile ? (
                                        <>
                                            {editedProfile.anti_patterns.map((pattern, i) => (
                                                <div key={i} className="flex gap-2">
                                                    <input
                                                        value={pattern}
                                                        onChange={(e) => updateList('anti_patterns', i, e.target.value)}
                                                        className="flex-1 p-2 border border-zinc-200 rounded-lg text-sm focus:border-red-500 outline-none"
                                                        placeholder="Add an anti-pattern..."
                                                    />
                                                    <button onClick={() => removeListItem('anti_patterns', i)} className="text-zinc-400 hover:text-red-500">
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                            <button onClick={() => addListItem('anti_patterns')} className="flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700 mt-2">
                                                <Plus size={14} /> Add Anti-Pattern
                                            </button>
                                        </>
                                    ) : (
                                        <ul className="space-y-4">
                                            {profile.anti_patterns && profile.anti_patterns.length > 0 ? (
                                                profile.anti_patterns.map((pattern, i) => (
                                                    <li key={i} className="flex gap-3 text-zinc-600 text-sm leading-relaxed">
                                                        <span className="text-red-500 font-bold">×</span>
                                                        {pattern}
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="text-zinc-400 italic text-sm">No anti-patterns defined.</li>
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
