import React from 'react';
import { AlertTriangle, CheckCircle, Target, Lightbulb, Sparkles, Loader2 } from 'lucide-react';

interface StrategyFeedbackPanelProps {
    analysis: {
        score: number;
        critique: string;
        strengths: string[];
        weaknesses: string[];
        actionable_fix: string;
    } | null;
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
            <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                <Target className="mx-auto mb-3 text-gray-400" size={32} />
                <h4 className="text-sm font-medium text-gray-900 mb-1">Check Alignment</h4>
                <p className="text-xs text-gray-500 mb-4">
                    See if your draft specifically hits your Goal and Audience targets.
                </p>
                <button
                    onClick={onVerify}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm transition-all"
                >
                    Run Strategy Check
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="p-6 flex flex-col items-center justify-center min-h-[200px] border rounded-xl bg-white shadow-sm animate-pulse">
                <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin mb-4" />
                <p className="text-sm text-gray-500 font-medium">Analyzing strategy...</p>
                <p className="text-xs text-gray-400 mt-1">Checking audience match & tone</p>
            </div>
        );
    }

    if (!analysis) return null;

    const getScoreColor = (s: number) => {
        if (s >= 80) return 'text-green-600 bg-green-50 border-green-200';
        if (s >= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    const colorClass = getScoreColor(analysis.score);

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Score Card */}
            <div className={`p-5 rounded-xl border ${colorClass} flex items-center justify-between`}>
                <div>
                    <span className="text-xs font-bold uppercase tracking-wider opacity-80">Alignment Score</span>
                    <div className="text-3xl font-bold mt-1">{analysis.score}/100</div>
                </div>
                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-white/60">
                    {analysis.score >= 80 ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                </div>
            </div>

            {/* Critique */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-tight mb-2">Coach&apos;s Critique</h4>
                <p className="text-sm text-gray-800 leading-relaxed">
                    &quot;{analysis.critique}&quot;
                </p>
            </div>

            {/* Fix */}
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-blue-100 rounded-md mt-0.5 shrink-0 text-blue-600">
                        <Lightbulb size={16} />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-blue-900 mb-1">Try this improvement</h4>
                        <p className="text-sm text-blue-800 leading-snug mb-3">
                            {analysis.actionable_fix}
                        </p>

                        <button
                            onClick={() => onAutoFix(analysis.actionable_fix)}
                            disabled={isFixing}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 w-full justify-center"
                        >
                            {isFixing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            {isFixing ? 'Applying Fix...' : 'Auto-Fix Draft'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-2">
                <button
                    onClick={onVerify}
                    className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
                >
                    <RefreshCw size={12} /> Re-check Strategy
                </button>
            </div>

            {/* FACT CHECK SECTION */}
            {onFactVerify && (
                <div className="pt-6 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <ShieldCheck size={16} className="text-gray-500" />
                            Fact Check
                        </h4>
                        <button
                            onClick={onFactVerify}
                            disabled={factLoading}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                        >
                            {factLoading ? 'Checking...' : 'Verify Claims'}
                        </button>
                    </div>

                    {factResults && factResults.length > 0 ? (
                        <div className="space-y-3">
                            {factResults.map((fact, i) => (
                                <div key={i} className={`p-3 rounded-lg border ${fact.verdict === 'Verified' ? 'bg-green-50 border-green-100' : fact.verdict === 'Disputed' ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${fact.verdict === 'Verified' ? 'bg-green-100 text-green-700' : fact.verdict === 'Disputed' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-700'}`}>
                                            {fact.verdict}
                                        </span>
                                    </div>
                                    <p className="text-xs font-medium text-gray-900 mb-1">&quot;{fact.claim}&quot;</p>
                                    <p className="text-xs text-gray-600">{fact.analysis}</p>
                                    {fact.verdict === 'Disputed' && onFixClaim && (
                                        <button
                                            onClick={() => onFixClaim(fact.claim, fact.analysis)}
                                            className="mt-2 text-xs bg-white border border-red-200 text-red-600 px-2 py-1 rounded hover:bg-red-50 flex items-center gap-1"
                                        >
                                            <Sparkles size={10} /> Auto-Correct
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400 italic">Run verification to check for accuracy.</p>
                    )}
                </div>
            )}
        </div>
    );
}

// Helper icons
import { RefreshCw, ShieldCheck } from 'lucide-react';
