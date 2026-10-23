"use client";

import { AlertTriangle, Merge } from "lucide-react";
import type { TidyProposal } from "@/lib/voice/rules";

interface TidyRulesPanelProps {
    proposal: TidyProposal;
    before: { rules: number; anti_patterns: number };
    saving: boolean;
    onApply: () => void;
    onCancel: () => void;
}

// What tidying would change, for the writer to accept or not. Contradictions are only flagged: they pick.
export function TidyRulesPanel({ proposal, before, saving, onApply, onCancel }: TidyRulesPanelProps) {
    const { merged, conflicts, rules, anti_patterns } = proposal;
    const nothingToDo = !merged.length && !conflicts.length && rules.length === before.rules && anti_patterns.length === before.anti_patterns;

    return (
        <div className="mb-8 bg-surface rounded-card shadow-card p-6 md:p-8 space-y-5 animate-in fade-in slide-in-from-top-4">
            <div>
                <h3 className="text-2xl font-medium tracking-[-0.02em] text-ink">Tidy up your rules</h3>
                <p className="mt-1 text-sm text-ink-soft">
                    {nothingToDo
                        ? 'Your rules are already tidy: no repeats and nothing contradicts.'
                        : `Do's go from ${before.rules} to ${rules.length}, don'ts from ${before.anti_patterns} to ${anti_patterns.length}. Nothing changes until you apply it.`}
                </p>
            </div>

            {merged.length > 0 && (
                <div className="space-y-2">
                    <p className="flex items-center gap-2 text-sm font-medium text-ink"><Merge size={14} className="text-ember-500" /> Saying the same thing, merged</p>
                    <ul className="space-y-2">
                        {merged.map((m, i) => (
                            <li key={i} className="bg-canvas shadow-well rounded-2xl p-3 text-sm">
                                <p className="text-ink">{m.into}</p>
                                <p className="mt-1 text-xs text-ink-muted">from: {m.from.map(f => `“${f}”`).join(', ')}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {conflicts.length > 0 && (
                <div className="space-y-2">
                    <p className="flex items-center gap-2 text-sm font-medium text-ink"><AlertTriangle size={14} className="text-sand-700" /> These pull in opposite directions</p>
                    <ul className="space-y-2">
                        {conflicts.map((c, i) => (
                            <li key={i} className="bg-canvas shadow-well rounded-2xl p-3 text-sm">
                                <p className="text-ink">“{c.a}” and “{c.b}”</p>
                                {c.why && <p className="mt-1 text-xs text-ink-soft">{c.why}</p>}
                            </li>
                        ))}
                    </ul>
                    <p className="text-xs text-ink-muted">Both stay for now. Remove the one you don&apos;t want with Manual Edit.</p>
                </div>
            )}

            <div className="flex gap-2">
                {!nothingToDo && (
                    <button
                        onClick={onApply}
                        disabled={saving}
                        className="h-11 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50"
                    >
                        Apply
                    </button>
                )}
                <button onClick={onCancel} className="h-11 px-5 rounded-full text-sm font-medium text-ink-soft hover:text-ink active:shadow-pressed transition-all">
                    {nothingToDo ? 'Close' : 'Cancel'}
                </button>
            </div>
        </div>
    );
}
