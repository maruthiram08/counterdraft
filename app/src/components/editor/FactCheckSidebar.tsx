import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, ShieldQuestion, ExternalLink, RefreshCw, X, Search, FileCheck, MessageSquareX, BarChart3, Plus, Globe } from "lucide-react";
import { AnimatedIcon } from "@/components/icons/AnimatedIcon";
import { RefreshCWIcon, ShieldCheckIcon, SparklesIcon } from "@/components/icons/animated";

export interface VerificationResult {
    claim: string;
    original_sentence?: string;
    status: 'verified' | 'disputed' | 'unverified';
    confidence: number;
    source?: {
        url: string;
        snippet: string;
    };
    analysis: string;
}

export interface PlagiarismSource {
    url: string;
    snippet: string;
    overlap_score: number;
}

export interface PlagiarismResult {
    uniqueness_score: number;
    matched_sources: PlagiarismSource[];
}

export interface SlopMatch {
    word: string;
    suggestion: string;
    reason: string;
    startIndex: number;
    endIndex: number;
}

export interface CompetitorInsight {
    type: 'unique' | 'common' | 'missing';
    claim: string;
    description: string;
    sourceUrl?: string;
}

export interface CompetitorCheckResult {
    insights: CompetitorInsight[];
    summary: string;
}

interface VerificationSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    // Fact Check
    factResults: VerificationResult[];
    factLoading: boolean;
    onFactVerify: () => void;
    // Plagiarism
    plagiarismResult: PlagiarismResult | null;
    plagiarismLoading: boolean;
    onPlagiarismCheck: () => void;
    // Style (Anti-Slop)
    slopMatches: SlopMatch[];
    slopLoading: boolean;
    onSlopScan: () => void;
    // Competitor Check
    competitorResult: CompetitorCheckResult | null;
    competitorLoading: boolean;
    onCompetitorCheck: (url?: string) => void;
    // Quality Score Footer Props
    overallScore: number;
    metrics: {
        fact: { score: number; hasRun: boolean; loading: boolean };
        uniqueness: { score: number; hasRun: boolean; loading: boolean };
        style: { score: number; hasRun: boolean; loading: boolean };
    };
    onRunAll: () => void;
    // Actions
    onApplySlopSuggestion?: (match: SlopMatch) => void;
    onFixClaim?: (claim: string, analysis: string, sourceSnippet?: string, status?: string) => void;
}

export function VerificationSidebar({
    isOpen,
    onClose,
    factResults,
    factLoading,
    onFactVerify,
    plagiarismResult,
    plagiarismLoading,
    onPlagiarismCheck,
    slopMatches,
    slopLoading,
    onSlopScan,
    competitorResult,
    competitorLoading,
    onCompetitorCheck,
    overallScore,
    metrics,
    onRunAll,
    onApplySlopSuggestion,
    onFixClaim
}: VerificationSidebarProps) {
    const [activeTab, setActiveTab] = useState<'fact' | 'plagiarism' | 'style' | 'competitor'>('fact');
    const [compUrl, setCompUrl] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-canvas shadow-float sm:rounded-l-card z-[70] transform transition-transform duration-300 ease-in-out overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink">Quality Suite</h2>
                <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center bg-canvas shadow-raised text-ink-soft hover:text-ink active:shadow-pressed transition-all">
                    <X size={20} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mx-4 mb-2 p-1 bg-canvas shadow-well rounded-3xl">
                <button
                    onClick={() => setActiveTab('fact')}
                    className={`flex-1 h-12 rounded-2xl text-[11px] font-medium flex flex-col items-center justify-center gap-0.5 transition-all ${activeTab === 'fact' ? 'bg-canvas shadow-pressed text-ember-600' : 'text-ink-muted hover:text-ink'
                        }`}
                >
                    <AnimatedIcon icon={ShieldCheckIcon} size={14} /> Fact
                </button>
                <button
                    onClick={() => setActiveTab('plagiarism')}
                    className={`flex-1 h-12 rounded-2xl text-[11px] font-medium flex flex-col items-center justify-center gap-0.5 transition-all ${activeTab === 'plagiarism' ? 'bg-canvas shadow-pressed text-ember-600' : 'text-ink-muted hover:text-ink'
                        }`}
                >
                    <Search size={14} /> Uniqueness
                </button>
                <button
                    onClick={() => setActiveTab('style')}
                    className={`flex-1 h-12 rounded-2xl text-[11px] font-medium flex flex-col items-center justify-center gap-0.5 transition-all ${activeTab === 'style' ? 'bg-canvas shadow-pressed text-ember-600' : 'text-ink-muted hover:text-ink'
                        }`}
                >
                    <AnimatedIcon icon={SparklesIcon} size={14} /> Human
                </button>
                <button
                    onClick={() => setActiveTab('competitor')}
                    className={`flex-1 h-12 rounded-2xl text-[11px] font-medium flex flex-col items-center justify-center gap-0.5 transition-all ${activeTab === 'competitor' ? 'bg-canvas shadow-pressed text-ember-600' : 'text-ink-muted hover:text-ink'
                        }`}
                >
                    <BarChart3 size={14} /> Competitors
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">

                {/* FACT CHECK TAB */}
                {activeTab === 'fact' && (
                    <>
                        {factLoading ? (
                            <div className="flex flex-col items-center justify-center h-48 text-ink-muted space-y-3">
                                <RefreshCw className="animate-spin text-ember-500" size={32} />
                                <p className="text-sm">Verifying claims against the web...</p>
                            </div>
                        ) : factResults.length === 0 ? (
                            <div className="text-center py-12 px-4 text-ink-soft">
                                <p className="mb-4">No claims analyzed yet.</p>
                                <button
                                    onClick={onFactVerify}
                                    className="h-10 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all"
                                >
                                    Run Verification
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-fade-in">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-ink-muted">
                                        {factResults.length} Claims Found
                                    </span>
                                    <button onClick={onFactVerify} className="h-8 px-3 rounded-full bg-canvas shadow-raised text-xs text-ink hover:text-ember-600 active:shadow-pressed flex items-center gap-1 font-medium transition-all">
                                        <AnimatedIcon icon={RefreshCWIcon} size={12} /> Re-run
                                    </button>
                                </div>
                                {factResults.map((res, i) => (
                                    <div key={i} className={`p-4 rounded-tile bg-surface shadow-card text-sm border-l-4 ${res.status === 'verified' ? 'border-sage-500' :
                                        res.status === 'disputed' ? 'border-rose-500' :
                                            'border-sand-500'
                                        }`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            {res.status === 'verified' ? <ShieldCheck size={14} className="text-sage-700" /> :
                                                res.status === 'disputed' ? <ShieldAlert size={14} className="text-rose-700" /> :
                                                    <ShieldQuestion size={14} className="text-sand-700" />}
                                            <span className={`text-xs font-medium capitalize ${res.status === 'verified' ? 'text-sage-700' :
                                                res.status === 'disputed' ? 'text-rose-700' : 'text-sand-700'
                                                }`}>{res.status}</span>
                                            <span className="ml-auto text-xs text-ink-muted">{Math.round(res.confidence * 100)}%</span>
                                        </div>
                                        <p className="font-medium text-ink mb-1">&quot;{res.claim}&quot;</p>
                                        <p className="text-ink-soft text-xs mb-2">{res.analysis}</p>
                                        {res.source && (
                                            <a href={res.source.url} target="_blank" className="text-xs text-ember-600 hover:underline flex items-center gap-1">
                                                <ExternalLink size={10} /> Source Reference
                                            </a>
                                        )}
                                        {(() => {
                                            const normalizedStatus = res.status.toLowerCase();
                                            const isActionable = normalizedStatus === 'disputed' || normalizedStatus === 'unverified' || normalizedStatus === 'irrelevant';

                                            if (isActionable && onFixClaim) {
                                                return (
                                                    <button
                                                        onClick={() => onFixClaim(res.claim, res.analysis, res.source?.snippet, normalizedStatus)}
                                                        className={`mt-3 w-full flex items-center justify-center gap-1.5 h-9 px-3 text-xs font-medium rounded-full transition-all active:shadow-pressed ${normalizedStatus === 'disputed'
                                                                ? 'bg-rose-100 hover:bg-rose-100/70 text-rose-700'
                                                                : 'bg-sand-100 hover:bg-sand-100/70 text-sand-700'
                                                            }`}
                                                    >
                                                        <AnimatedIcon icon={SparklesIcon} size={12} />
                                                        {normalizedStatus === 'disputed' ? 'Auto-Correct with Fact' : 'Auto-Fix (Clarify/Delete)'}
                                                    </button>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* PLAGIARISM TAB */}
                {activeTab === 'plagiarism' && (
                    <>
                        {plagiarismLoading ? (
                            <div className="flex flex-col items-center justify-center h-48 text-ink-muted space-y-3">
                                <RefreshCw className="animate-spin text-ember-500" size={32} />
                                <p className="text-sm">Checking uniqueness across the web...</p>
                            </div>
                        ) : !plagiarismResult ? (
                            <div className="text-center py-12 px-4 text-ink-soft">
                                <FileCheck className="mx-auto mb-4 text-ember-200" size={48} />
                                <p className="mb-4">Check if this draft is original.</p>
                                <button
                                    onClick={onPlagiarismCheck}
                                    className="h-10 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all"
                                >
                                    Check Uniqueness
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-fade-in">
                                {/* Score Meter */}
                                <div className="text-center p-6 bg-surface rounded-card shadow-card">
                                    <div className="text-4xl font-medium tracking-[-0.03em] mb-1" style={{
                                        color: plagiarismResult.uniqueness_score > 80 ? 'var(--color-sage-700)' :
                                            plagiarismResult.uniqueness_score > 50 ? 'var(--color-sand-700)' : 'var(--color-rose-700)'
                                    }}>
                                        {plagiarismResult.uniqueness_score}%
                                    </div>
                                    <div className="text-sm text-ink-muted">
                                        Originality Score
                                    </div>
                                    <div className="mt-4 h-2 bg-canvas shadow-well rounded-full overflow-hidden">
                                        <div
                                            className="h-full transition-all duration-1000"
                                            style={{
                                                width: `${plagiarismResult.uniqueness_score}%`,
                                                backgroundColor: plagiarismResult.uniqueness_score > 80 ? 'var(--color-sage-500)' :
                                                    plagiarismResult.uniqueness_score > 50 ? 'var(--color-sand-500)' : 'var(--color-rose-500)'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Matched Sources */}
                                <div className="space-y-3">
                                    <h3 className="text-sm text-ink-muted">
                                        Potential Overlaps ({plagiarismResult.matched_sources.length})
                                    </h3>

                                    {plagiarismResult.matched_sources.length === 0 ? (
                                        <p className="text-sm text-sage-700 flex items-center gap-2">
                                            <ShieldCheck size={16} /> No significant matches found!
                                        </p>
                                    ) : (
                                        plagiarismResult.matched_sources.map((source, i) => (
                                            <div key={i} className="p-4 bg-surface rounded-tile shadow-card hover:shadow-float transition-all">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs bg-rose-100 text-rose-700 h-6 px-2.5 flex items-center rounded-full font-medium">
                                                        Overlap: Level {source.overlap_score}
                                                    </span>
                                                    <a href={source.url} target="_blank" className="text-ink-muted hover:text-ember-600">
                                                        <ExternalLink size={14} />
                                                    </a>
                                                </div>
                                                <p className="text-xs text-ink-soft line-clamp-2 italic">
                                                    &quot;{source.snippet}&quot;
                                                </p>
                                                <p className="text-xs text-ink-muted mt-2 truncate">
                                                    {source.url}
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <button onClick={onPlagiarismCheck} className="w-full h-10 rounded-full bg-canvas text-ink text-xs font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all">
                                    Re-scan Draft
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* HUMAN / ANTI-SLOP TAB */}
                {activeTab === 'style' && (
                    <>
                        {slopLoading ? (
                            <div className="flex flex-col items-center justify-center h-48 text-ink-muted space-y-3">
                                <RefreshCw className="animate-spin text-ember-500" size={32} />
                                <p className="text-sm">Scanning for AI-isms...</p>
                            </div>
                        ) : (!metrics.style.hasRun) ? (
                            <div className="text-center py-12 px-4 text-ink-soft">
                                <MessageSquareX className="mx-auto mb-4 text-ember-200" size={48} />
                                <p className="mb-4">Analyze if your content sounds too artificial.</p>
                                <button
                                    onClick={onSlopScan}
                                    className="h-10 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all"
                                >
                                    Run Human Audit
                                </button>
                            </div>
                        ) : slopMatches.length === 0 ? (
                            <div className="text-center py-12 px-4 text-ink-soft">
                                <MessageSquareX className="mx-auto mb-4 text-sage-500/40" size={48} />
                                <p className="mb-4 text-sage-700 font-medium">No AI cliches found!</p>
                                <p className="text-xs text-ink-muted mb-6">Your writing sounds authentic and human.</p>
                                <button
                                    onClick={onSlopScan}
                                    className="h-10 px-5 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all"
                                >
                                    Re-scan
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-fade-in">
                                <div className="bg-ember-50 p-4 rounded-tile shadow-raised flex items-start gap-3">
                                    <ShieldAlert className="text-ember-500 mt-1" size={18} />
                                    <div>
                                        <p className="text-sm font-medium text-ink">
                                            {slopMatches.length} AI-isms detected
                                        </p>
                                        <p className="text-xs text-ink-soft mt-1">
                                            AI patterns make your writing feel generic. Try substituting these words.
                                        </p>
                                    </div>
                                </div>

                                <button onClick={onSlopScan} className="h-8 px-3 rounded-full bg-canvas shadow-raised text-xs text-ink hover:text-ember-600 active:shadow-pressed flex items-center gap-1 font-medium ml-auto transition-all">
                                    <AnimatedIcon icon={RefreshCWIcon} size={12} /> Re-scan
                                </button>

                                <div className="space-y-3">
                                    {slopMatches.map((match, i) => (
                                        <div key={i} className="p-4 bg-surface rounded-tile shadow-card hover:shadow-float transition-all">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-mono text-sm font-medium text-ink bg-canvas shadow-well px-2 py-0.5 rounded-lg">
                                                    &quot;{match.word}&quot;
                                                </span>
                                                <span className="text-xs text-ink-muted">Position: {match.startIndex}</span>
                                            </div>
                                            <p className="text-xs text-ink-soft mb-2">
                                                {match.reason}
                                            </p>
                                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-line">
                                                <span className="text-xs font-medium text-sage-700">Suggestion:</span>
                                                <span className="text-xs font-medium text-ink">
                                                    {match.suggestion || "Delete it"}
                                                </span>
                                                <button
                                                    onClick={() => onApplySlopSuggestion && onApplySlopSuggestion(match)}
                                                    className="ml-auto h-7 px-3 rounded-full bg-ember-500 text-white text-xs font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all"
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* COMPETITOR CHECK TAB */}
                {activeTab === 'competitor' && (
                    <>
                        {/* URL Input */}
                        <div className="bg-surface p-4 rounded-tile shadow-card mb-4">
                            <label className="text-sm text-ink-muted block mb-2">Compare Against Specific URL (Optional)</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={compUrl}
                                    onChange={(e) => setCompUrl(e.target.value)}
                                    placeholder="https://competitor.com/article"
                                    className="flex-1 min-w-0 text-xs bg-canvas shadow-well rounded-full h-10 px-4 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200"
                                />
                                <button
                                    onClick={() => onCompetitorCheck(compUrl)}
                                    disabled={competitorLoading}
                                    className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-ember-500 text-white hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>

                        {competitorLoading ? (
                            <div className="flex flex-col items-center justify-center h-48 text-ink-muted space-y-3">
                                <RefreshCw className="animate-spin text-ember-500" size={32} />
                                <p className="text-sm">Analyzing competitors...</p>
                            </div>
                        ) : !competitorResult ? (
                            <div className="text-center py-12 px-4 text-ink-soft">
                                <Globe className="mx-auto mb-4 text-ember-200" size={48} />
                                <p className="mb-4 text-sm">See how your draft stacks up against industry leaders.</p>
                                <button
                                    onClick={() => onCompetitorCheck()}
                                    className="w-full h-10 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all"
                                >
                                    Find Competitor Gaps
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-fade-in">
                                <div className="bg-dusk-100 p-4 rounded-tile shadow-raised">
                                    <p className="text-sm text-ink-soft italic leading-relaxed">
                                        &quot;{competitorResult.summary}&quot;
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    {(['unique', 'missing', 'common'] as const).map(type => {
                                        const filtered = competitorResult.insights.filter(i => i.type === type);
                                        if (filtered.length === 0) return null;

                                        return (
                                            <div key={type} className="space-y-2">
                                                <h3 className={`text-sm font-medium ${type === 'unique' ? 'text-sage-700' :
                                                    type === 'missing' ? 'text-rose-700' : 'text-ink-muted'
                                                    }`}>
                                                    {type === 'unique' ? '✨ Your Unique Angle' :
                                                        type === 'missing' ? '🚨 Missing Highlights' : '⚪ Common Ground'}
                                                </h3>
                                                {filtered.map((insight, idx) => (
                                                    <div key={idx} className={`p-4 rounded-tile bg-surface shadow-card border-l-4 ${type === 'unique' ? 'border-sage-500' :
                                                        type === 'missing' ? 'border-rose-500' : 'border-line'
                                                        }`}>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="font-medium text-sm text-ink">{insight.claim}</span>
                                                            {insight.sourceUrl && (
                                                                <a href={insight.sourceUrl} target="_blank" className="text-ink-muted hover:text-ember-600">
                                                                    <ExternalLink size={12} />
                                                                </a>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-ink-soft leading-relaxed">
                                                            {insight.description}
                                                        </p>
                                                        {type === 'missing' && (
                                                            <button
                                                                className="mt-3 text-xs font-medium text-ember-600 hover:text-ember-700 flex items-center gap-1"
                                                                onClick={() => alert("AI Gap Filling coming in next update!")}
                                                            >
                                                                <AnimatedIcon icon={SparklesIcon} size={10} /> Fill this gap
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                                <button onClick={() => onCompetitorCheck()} className="w-full h-10 rounded-full bg-canvas text-ink text-xs font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all">
                                    Refresh Comparison
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* FIXED BOTTOM: Quality Score Footer */}
            <div className="m-3 p-4 bg-surface rounded-card shadow-card z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {/* Donut Chart (CSS Conic Gradient) */}
                        <div className="relative w-12 h-12 flex items-center justify-center rounded-full bg-canvas"
                            style={{
                                background: `conic-gradient(${overallScore > 80 ? 'var(--color-sage-500)' : overallScore > 50 ? 'var(--color-sand-500)' : 'var(--color-rose-500)'} ${overallScore}%, var(--color-line) 0)`
                            }}
                        >
                            <div className="absolute inset-[3px] bg-surface rounded-full flex items-center justify-center">
                                <span className={`text-xs font-medium ${overallScore > 80 ? 'text-sage-700' : overallScore > 50 ? 'text-sand-700' : 'text-rose-700'}`}>
                                    {overallScore}%
                                </span>
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-ink-muted">Trust Score</div>
                            <div className={`font-medium text-sm leading-tight ${overallScore > 80 ? 'text-sage-700' : overallScore > 50 ? 'text-sand-700' : 'text-rose-700'}`}>
                                {overallScore > 80 ? 'Credible' : overallScore > 50 ? 'Needs Review' : 'Unverified'}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onRunAll}
                        className="h-10 px-4 rounded-full bg-ink text-white text-xs font-medium hover:bg-ink/90 shadow-raised active:shadow-pressed transition-all flex items-center gap-2"
                    >
                        <RefreshCw size={14} className={metrics.fact.loading || metrics.uniqueness.loading ? "animate-spin" : ""} />
                        Run Audit
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    {/* Fact Metric */}
                    <button onClick={() => setActiveTab('fact')} className="flex flex-col items-center p-2.5 rounded-2xl bg-canvas shadow-raised hover:text-ink active:shadow-pressed transition-all">
                        <div className={`text-xs font-medium mb-1.5 ${metrics.fact.hasRun ? (metrics.fact.score > 80 ? 'text-sage-700' : 'text-sand-700') : 'text-ink-muted'}`}>Facts</div>
                        <div className={`w-full h-1 rounded-full ${metrics.fact.hasRun ? (metrics.fact.score > 80 ? 'bg-sage-500' : 'bg-sand-500') : 'bg-line'}`}></div>
                    </button>
                    {/* Unique Metric */}
                    <button onClick={() => setActiveTab('plagiarism')} className="flex flex-col items-center p-2.5 rounded-2xl bg-canvas shadow-raised hover:text-ink active:shadow-pressed transition-all">
                        <div className={`text-xs font-medium mb-1.5 ${metrics.uniqueness.hasRun ? (metrics.uniqueness.score > 80 ? 'text-sage-700' : 'text-sand-700') : 'text-ink-muted'}`}>Unique</div>
                        <div className={`w-full h-1 rounded-full ${metrics.uniqueness.hasRun ? (metrics.uniqueness.score > 80 ? 'bg-sage-500' : 'bg-sand-500') : 'bg-line'}`}></div>
                    </button>
                    {/* Style Metric */}
                    <button onClick={() => setActiveTab('style')} className="flex flex-col items-center p-2.5 rounded-2xl bg-canvas shadow-raised hover:text-ink active:shadow-pressed transition-all">
                        <div className={`text-xs font-medium mb-1.5 ${metrics.style.hasRun ? (metrics.style.score > 80 ? 'text-sage-700' : 'text-sand-700') : 'text-ink-muted'}`}>Human</div>
                        <div className={`w-full h-1 rounded-full ${metrics.style.hasRun ? (metrics.style.score > 80 ? 'bg-sage-500' : 'bg-sand-500') : 'bg-line'}`}></div>
                    </button>
                </div>
            </div>
        </div >
    );

}
