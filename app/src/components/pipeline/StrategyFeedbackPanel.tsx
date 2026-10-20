import React from 'react';
import { StrategyAnalysis } from '@/lib/brain/strategy';
import { AlertTriangle, CheckCircle, Target, Lightbulb, Loader2 } from "lucide-react";
import { AnimatedIcon } from "@/components/icons/AnimatedIcon";
import { RefreshCWIcon, SparklesIcon } from "@/components/icons/animated";

interface StrategyFeedbackPanelProps {
    analysis: StrategyAnalysis | null;
    loading: boolean;
    isFixing: boolean;
    onVerify: () => void;
    onAutoFix: (instruction: string) => void;
    // Fact Checking
    factResults?: { claim: string; verdict: string; analysis: string; sourceSnippet?: string }[];
    factLoading?: boolean;
    onFactVerify?: () => void;
    onFixClaim?: (claim: string, analysis: string) => void;
}

export function StrategyFeedbackPanel({ analysis, loading, isFixing, onVerify, onAutoFix, factResults, factLoading, onFactVerify, onFixClaim }: StrategyFeedbackPanelProps) {
    if (!analysis && !loading) {
        return (
            <div className="p-6 text-center bg-canvas shadow-pressed rounded-card">
                <Target className="mx-auto mb-3 text-ember-500" size={32} />
                <h4 className="text-[17px] font-medium tracking-[-0.01em] text-ink mb-1">Check Alignment</h4>
                <p className="text-xs text-ink-soft mb-4">
                    See if your draft specifically hits your Goal and Audience targets.
                </p>
                <button
                    onClick={() => onVerify()}
                    className="h-10 px-4 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all"
                >
                    Run Strategy Check
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="p-6 flex flex-col items-center justify-center min-h-[200px] rounded-tile bg-surface shadow-card animate-pulse">
                <div className="w-8 h-8 rounded-full border-2 border-ember-500 border-t-transparent animate-spin mb-4" />
                <p className="text-sm text-ink-soft font-medium">Analyzing strategy...</p>
                <p className="text-xs text-ink-muted mt-1">Checking audience match & tone</p>
            </div>
        );
    }

    if (!analysis) return null;

    const getScoreColor = (s: number) => {
        if (s >= 80) return 'text-sage-700 bg-sage-100';
        if (s >= 60) return 'text-sand-700 bg-sand-100';
        return 'text-rose-700 bg-rose-100';
    };

    const colorClass = getScoreColor(analysis.score);

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Score Card */}
            <div className={`p-5 rounded-tile shadow-raised ${colorClass} flex items-center justify-between`}>
                <div>
                    <span className="text-sm font-medium opacity-80">Alignment Score</span>
                    <div className="text-4xl font-medium tracking-[-0.03em] mt-1">{analysis.score}/100</div>
                </div>
                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-surface/70">
                    {analysis.score >= 80 ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                </div>
            </div>

            {/* Critique */}
            <div className="bg-surface p-5 rounded-tile shadow-card">
                <h4 className="text-sm text-ink-muted mb-2">Coach&apos;s Critique</h4>
                <p className="text-sm text-ink-soft leading-relaxed">
                    &quot;{analysis.analysis}&quot;
                </p>
            </div>

            {/* Where the points went, so a change in score has a visible reason */}
            {analysis.criteria.length > 0 && (
                <div className="bg-surface p-5 rounded-tile shadow-card space-y-3">
                    <h4 className="text-sm text-ink-muted">Score breakdown</h4>
                    {analysis.criteria.map(c => (
                        <div key={c.key}>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-ink">{c.label}</span>
                                <span className={c.rating >= 4 ? 'text-sage-700' : 'text-ink-soft'}>{c.points}/{c.max}</span>
                            </div>
                            {c.note && <p className="text-xs text-ink-muted leading-snug mt-0.5">{c.note}</p>}
                        </div>
                    ))}
                </div>
            )}

            {/* Fix */}
            {analysis.criteria.length > 0 && analysis.suggestions.length === 0 && (
                <div className="bg-sage-100 p-4 rounded-tile shadow-raised text-sm text-sage-700">
                    No big gaps left. Every part of the strategy scores 4 or 5 out of 5, so there is nothing worth an auto-fix.
                </div>
            )}
            {analysis.suggestions && analysis.suggestions.length > 0 && (
                <div className="bg-ember-50 p-4 rounded-tile shadow-raised">
                    <div className="flex items-start gap-3">
                        <div className="p-1.5 bg-ember-100 rounded-full mt-0.5 shrink-0 text-ember-600">
                            <Lightbulb size={16} />
                        </div>
                        <div>
                            <h4 className="text-sm font-medium tracking-[-0.01em] text-ink mb-1">Try this improvement</h4>
                            <p className="text-sm text-ink-soft leading-snug mb-3">
                                {analysis.suggestions[0]}
                            </p>

                            <button
                                onClick={() => onAutoFix(analysis.suggestions[0])}
                                disabled={isFixing}
                                className="h-10 px-4 rounded-full bg-ember-500 hover:bg-ember-600 text-white text-sm font-medium shadow-ember active:shadow-pressed transition-all flex items-center gap-2 disabled:opacity-50 w-full justify-center"
                            >
                                {isFixing ? <Loader2 size={14} className="animate-spin" /> : <AnimatedIcon icon={SparklesIcon} size={14} />}
                                {isFixing ? 'Applying Fix...' : 'Auto-Fix Draft'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-end pt-2">
                <button
                    onClick={() => onVerify()}
                    className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 transition-colors"
                >
                    <AnimatedIcon icon={RefreshCWIcon} size={12} /> Re-check Strategy
                </button>
            </div>

            {/* FACT CHECK SECTION */}
            {onFactVerify && (
                <div className="pt-6 border-t border-line">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[17px] font-medium tracking-[-0.01em] text-ink flex items-center gap-2">
                            <ShieldCheck size={16} className="text-ember-500" />
                            Fact Check
                        </h4>
                        <button
                            onClick={onFactVerify}
                            disabled={factLoading}
                            className="h-8 px-3 rounded-full bg-canvas shadow-raised text-xs text-ink font-medium hover:text-ember-600 active:shadow-pressed transition-all disabled:opacity-50"
                        >
                            {factLoading ? 'Checking...' : 'Verify Claims'}
                        </button>
                    </div>

                    {factResults && factResults.length > 0 ? (
                        <div className="space-y-3">
                            {factResults.map((fact, i) => (
                                <div key={i} className={`p-4 rounded-tile shadow-card ${fact.verdict === 'Verified' ? 'bg-surface' : fact.verdict === 'Disputed' ? 'bg-rose-100/40' : 'bg-surface'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${fact.verdict === 'Verified' ? 'bg-sage-100 text-sage-700' : fact.verdict === 'Disputed' ? 'bg-rose-100 text-rose-700' : 'bg-canvas shadow-well text-ink-soft'}`}>
                                            {fact.verdict}
                                        </span>
                                    </div>
                                    <p className="text-xs font-medium text-ink mb-1">&quot;{fact.claim}&quot;</p>
                                    <p className="text-xs text-ink-soft">{fact.analysis}</p>
                                    {fact.verdict === 'Disputed' && onFixClaim && (
                                        <button
                                            onClick={() => onFixClaim(fact.claim, fact.analysis)}
                                            className="mt-2 h-7 px-3 text-xs font-medium bg-rose-100 text-rose-700 rounded-full hover:bg-rose-100/70 active:shadow-pressed transition-all flex items-center gap-1"
                                        >
                                            <AnimatedIcon icon={SparklesIcon} size={10} /> Auto-Correct
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-ink-muted italic">Run verification to check for accuracy.</p>
                    )}
                </div>
            )}
        </div>
    );
}

// Helper icons
import { ShieldCheck } from 'lucide-react';
