"use client";

import { useState } from "react";
import { X, Sparkles, Target, Users, Scale, ArrowRight, Loader2 } from "lucide-react";
import { BrainMetadata, Outcome, Stance, Audience, ContentReference } from "@/types";
import { ReferenceSection } from "../common/ReferenceSection";

interface NewDraftModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStart: (topic: string, metadata: BrainMetadata) => Promise<void>;
}

export function NewDraftModal({ isOpen, onClose, onStart }: NewDraftModalProps) {
    const [topic, setTopic] = useState("");
    const [outcome, setOutcome] = useState<Outcome>('authority');
    const [stance, setStance] = useState<Stance>('supportive');
    const [audience, setAudience] = useState<Audience>({ role: "", pain: "" });
    const [references, setReferences] = useState<ContentReference[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!topic.trim()) return;

        setIsSubmitting(true);
        try {
            const metadata: BrainMetadata = {
                outcome,
                stance,
                audience: audience.role ? audience : undefined, // Only include if filled
                confidence: 'medium', // Default to medium when explicitly filled
                inferred: {
                    outcome: false,
                    stance: false
                },
                references: references.length > 0 ? references : undefined
            };
            await onStart(topic, metadata);
            onClose();
            // Reset state
            setTopic("");
            setReferences([]);
            setAudience({ role: "", pain: "" });
        } catch (error) {
            console.error("Failed to start draft:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b flex items-start justify-between bg-gradient-to-r from-gray-50 to-white">
                    <div>
                        <h2 className="text-xl font-serif text-gray-900 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-purple-600" />
                            New Draft
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Define your intent, and the Brain will guide the rest.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* 1. Topic */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                            What are you writing about?
                        </label>
                        <textarea
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g. Why specialized AI agents will replace general chatbots..."
                            className="w-full h-24 p-4 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 resize-none text-[15px] placeholder:text-gray-400 transition-all shadow-sm"
                            autoFocus
                        />
                    </div>

                    {/* 1.5 References */}
                    <ReferenceSection
                        references={references}
                        onAdd={(ref) => setReferences([...references, ref])}
                        onRemove={(id) => setReferences(references.filter(r => r.id !== id))}
                    />

                    {/* 2. Outcome (The Decision Spine) */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <Target size={16} className="text-blue-500" />
                            What is the goal? (The Outcome)
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {(['authority', 'engagement', 'conversion', 'connection'] as Outcome[]).map((o) => (
                                <button
                                    key={o}
                                    onClick={() => setOutcome(o)}
                                    className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all capitalize border ${outcome === o
                                            ? 'bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-200'
                                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                                        }`}
                                >
                                    {o}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* 3. Audience */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <Users size={16} className="text-amber-500" />
                                Who is this for?
                            </label>
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={audience.role}
                                    onChange={(e) => setAudience({ ...audience, role: e.target.value })}
                                    placeholder="Role (e.g. Founders)"
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm transition-all"
                                />
                                <input
                                    type="text"
                                    value={audience.pain}
                                    onChange={(e) => setAudience({ ...audience, pain: e.target.value })}
                                    placeholder="Pain (e.g. Overwhelmed)"
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm transition-all"
                                />
                            </div>
                        </div>

                        {/* 4. Stance */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                <Scale size={16} className="text-green-500" />
                                What's your stance?
                            </label>
                            <div className="space-y-2">
                                {(['supportive', 'contrarian', 'exploratory'] as Stance[]).map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setStance(s)}
                                        className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-all text-left flex items-center justify-between border ${stance === s
                                                ? 'bg-green-50 border-green-200 text-green-700 ring-1 ring-green-200'
                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        <span className="capitalize">{s}</span>
                                        {stance === s && <span className="w-2 h-2 rounded-full bg-green-500" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!topic.trim() || isSubmitting}
                        className="flex items-center gap-2 px-6 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gray-200"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Starting...
                            </>
                        ) : (
                            <>
                                Begin Development
                                <ArrowRight size={16} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
