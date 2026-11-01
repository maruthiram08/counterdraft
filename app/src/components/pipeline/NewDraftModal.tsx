"use client";

import { useState } from "react";
import { X, Sparkles, Target, Users, Scale, ArrowRight } from "lucide-react";
import { BrainMetadata, Outcome, Stance, Audience, ContentReference } from "@/types";
import { ReferenceSection } from "../common/ReferenceSection";
import { Spinner } from "@/components/shared/Loading";

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
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-canvas rounded-card w-full max-w-2xl shadow-float overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 pt-6 md:px-8 md:pt-8 pb-2 flex items-start justify-between">
                    <div>
                        <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-ember-500" />
                            New Draft
                        </h2>
                        <p className="text-sm text-ink-soft mt-1">
                            Define your intent, and the Brain will guide the rest.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-canvas shadow-raised text-ink-soft hover:text-ink active:shadow-pressed transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 md:px-8 space-y-8">
                    {/* 1. Topic */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-ink">
                            What are you writing about?
                        </label>
                        <textarea
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g. Why specialized AI agents will replace general chatbots..."
                            className="w-full h-24 bg-canvas shadow-well rounded-2xl px-4 py-3 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 resize-none text-[15px] transition-all"
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
                        <label className="flex items-center gap-2 text-sm font-medium text-ink">
                            <Target size={16} className="text-ember-500" />
                            What is the goal? (The Outcome)
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {(['authority', 'engagement', 'conversion', 'connection'] as Outcome[]).map((o) => (
                                <button
                                    key={o}
                                    onClick={() => setOutcome(o)}
                                    className={`h-10 px-3 rounded-full text-sm font-medium transition-all capitalize ${outcome === o
                                            ? 'bg-canvas shadow-pressed text-ember-600'
                                            : 'bg-canvas shadow-raised text-ink-soft hover:text-ink'
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
                            <label className="flex items-center gap-2 text-sm font-medium text-ink">
                                <Users size={16} className="text-ember-500" />
                                Who is this for?
                            </label>
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={audience.role}
                                    onChange={(e) => setAudience({ ...audience, role: e.target.value })}
                                    placeholder="Role (e.g. Founders)"
                                    className="w-full bg-canvas shadow-well rounded-2xl px-4 py-3 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 text-sm transition-all"
                                />
                                <input
                                    type="text"
                                    value={audience.pain}
                                    onChange={(e) => setAudience({ ...audience, pain: e.target.value })}
                                    placeholder="Pain (e.g. Overwhelmed)"
                                    className="w-full bg-canvas shadow-well rounded-2xl px-4 py-3 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 text-sm transition-all"
                                />
                            </div>
                        </div>

                        {/* 4. Stance */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-sm font-medium text-ink">
                                <Scale size={16} className="text-ember-500" />
                                What&apos;s your stance?
                            </label>
                            <div className="space-y-2">
                                {(['supportive', 'contrarian', 'exploratory'] as Stance[]).map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setStance(s)}
                                        className={`w-full h-10 px-4 rounded-full text-sm font-medium transition-all text-left flex items-center justify-between ${stance === s
                                                ? 'bg-canvas shadow-pressed text-ember-600'
                                                : 'bg-canvas shadow-raised text-ink-soft hover:text-ink'
                                            }`}
                                    >
                                        <span className="capitalize">{s}</span>
                                        {stance === s && <span className="w-2 h-2 rounded-full bg-ember-500" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 pt-2 md:px-8 md:pb-8 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="h-12 px-5 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!topic.trim() || isSubmitting}
                        className="flex items-center gap-2 h-12 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <Spinner size={16} />
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
