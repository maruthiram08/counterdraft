"use client";

import { useState } from "react";
import { X, User, Briefcase, PenTool, Wand2 } from "lucide-react";
import { StyleAnalysisModal } from "./StyleAnalysisModal";
import { Spinner } from "@/components/shared/Loading";

interface ProfileSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

export function ProfileSetupModal({ isOpen, onClose, onComplete }: ProfileSetupModalProps) {
    const [loading, setLoading] = useState(false);
    const [role, setRole] = useState("");
    const [context, setContext] = useState("");
    const [voice, setVoice] = useState("");
    const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    role,
                    context,
                    voice_tone: voice,
                }),
            });

            if (!res.ok) throw new Error("Failed");

            onComplete();
            onClose();
        } catch (e) {
            console.error(e);
            alert("Failed to save profile.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-canvas rounded-card max-w-lg w-full shadow-float p-6 md:p-8 relative">
                <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center bg-canvas shadow-raised text-ink-soft hover:text-ink active:shadow-pressed transition-all">
                    <X size={20} />
                </button>

                <div className="mb-8">
                    <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-2">Complete your Profile</h2>
                    <p className="text-ink-soft text-sm">Help the Brain understand who you are for better suggestions.</p>
                </div>

                <div className="space-y-6">
                    {/* Role */}
                    <div>
                        <label className="text-sm font-medium text-ink mb-2 block flex items-center gap-2">
                            <User size={16} /> Role
                        </label>
                        <input
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            placeholder="e.g. Founder, Creator, VC..."
                            className="w-full bg-canvas shadow-well rounded-2xl px-4 py-3 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 transition-all"
                        />
                    </div>

                    {/* Context */}
                    <div>
                        <label className="text-sm font-medium text-ink mb-2 block flex items-center gap-2">
                            <Briefcase size={16} /> What are you building?
                        </label>
                        <textarea
                            value={context}
                            onChange={(e) => setContext(e.target.value)}
                            placeholder="One line pitch..."
                            className="w-full bg-canvas shadow-well rounded-2xl px-4 py-3 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 transition-all resize-none h-24"
                        />
                    </div>

                    {/* Writing Style */}
                    <div>
                        <label className="text-sm font-medium text-ink mb-2 block flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <PenTool size={16} /> Writing Style
                            </div>
                            <button
                                onClick={() => setIsAnalysisOpen(true)}
                                className="h-8 px-3 text-xs font-medium text-ink hover:text-ember-600 bg-canvas shadow-raised active:shadow-pressed rounded-full flex items-center gap-1 transition-all"
                            >
                                <Wand2 size={12} className="text-ember-500" /> Analyze My Style
                            </button>
                        </label>

                        <div className="grid grid-cols-2 gap-2">
                            {['Neutral', 'Academic', 'Direct', 'Storyteller'].map(v => (
                                <button
                                    key={v}
                                    onClick={() => setVoice(v)}
                                    className={`h-11 px-3 text-xs font-medium rounded-full transition-all text-center ${voice === v ? 'bg-canvas shadow-pressed text-ember-600' : 'bg-canvas shadow-raised text-ink-soft hover:text-ink'}`}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-ink-muted mt-2 ml-1">
                            {voice && !['Neutral', 'Academic', 'Direct', 'Storyteller'].includes(voice)
                                ? "✨ Using Custom Analyzed Style"
                                : "Choose a preset or analyze your writing."}
                        </p>
                    </div>

                    <StyleAnalysisModal
                        isOpen={isAnalysisOpen}
                        onClose={() => setIsAnalysisOpen(false)}
                        onComplete={(result) => {
                            setVoice(result.voice_tone);
                            // Ideally store the rules too, but for MVP Profile Setup we just lock the tone.
                            // The rules are saved in the background if we enhanced the analysis API to save.
                            // But current API just analyzes. 
                            // TODO: Auto-save profile on complete.
                        }}
                    />

                    <button
                        onClick={handleSubmit}
                        disabled={!role || !context || !voice || loading}
                        className="w-full h-12 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading && <Spinner size={16} />}
                        Save Profile
                    </button>

                </div>
            </div>
        </div>
    );
}
