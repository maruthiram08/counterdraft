import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, ShieldQuestion, ExternalLink, RefreshCw, X, Search, FileCheck, Sparkles, MessageSquareX, BarChart3, Plus, Globe } from 'lucide-react';

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
    onCompetitorCheck
}: VerificationSidebarProps) {
    const [activeTab, setActiveTab] = useState<'fact' | 'plagiarism' | 'style' | 'competitor'>('fact');
    const [compUrl, setCompUrl] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-white border-l shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                <h2 className="font-serif font-medium text-lg">Quality Suite</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b bg-gray-50/50">
                <button
                    onClick={() => setActiveTab('fact')}
                    className={`flex-1 py-3 text-[9px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'fact' ? 'border-b-2 border-blue-600 text-blue-600 bg-white' : 'text-gray-400 hover:text-gray-600'
                        }`}
                >
                    <ShieldCheck size={14} /> Fact
                </button>
                <button
                    onClick={() => setActiveTab('plagiarism')}
                    className={`flex-1 py-3 text-[9px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'plagiarism' ? 'border-b-2 border-purple-600 text-purple-600 bg-white' : 'text-gray-400 hover:text-gray-600'
                        }`}
                >
                    <Search size={14} /> Uniqueness
                </button>
                <button
                    onClick={() => setActiveTab('style')}
                    className={`flex-1 py-3 text-[9px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'style' ? 'border-b-2 border-orange-600 text-orange-600 bg-white' : 'text-gray-400 hover:text-gray-600'
                        }`}
                >
                    <Sparkles size={14} /> Style
                </button>
                <button
                    onClick={() => setActiveTab('competitor')}
                    className={`flex-1 py-3 text-[9px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'competitor' ? 'border-b-2 border-emerald-600 text-emerald-600 bg-white' : 'text-gray-400 hover:text-gray-600'
                        }`}
                >
                    <BarChart3 size={14} /> Competitors
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* FACT CHECK TAB */}
                {activeTab === 'fact' && (
                    <>
                        {factLoading ? (
                            <div className="flex flex-col items-center justify-center h-48 text-gray-400 space-y-3">
                                <RefreshCw className="animate-spin text-blue-500" size={32} />
                                <p className="text-sm">Verifying claims against the web...</p>
                            </div>
                        ) : factResults.length === 0 ? (
                            <div className="text-center py-12 px-4 text-gray-500">
                                <p className="mb-4">No claims analyzed yet.</p>
                                <button
                                    onClick={onFactVerify}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-all"
                                >
                                    Run Verification
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-fade-in">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold uppercase text-gray-500 tracking-wider">
                                        {factResults.length} Claims Found
                                    </span>
                                    <button onClick={onFactVerify} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium">
                                        <RefreshCw size={12} /> Re-run
                                    </button>
                                </div>
                                {factResults.map((res, i) => (
                                    <div key={i} className={`p-3 rounded-lg border text-sm ${res.status === 'verified' ? 'bg-green-50 border-green-100' :
                                        res.status === 'disputed' ? 'bg-red-50 border-red-100' :
                                            'bg-yellow-50 border-yellow-100'
                                        }`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            {res.status === 'verified' ? <ShieldCheck size={14} className="text-green-600" /> :
                                                res.status === 'disputed' ? <ShieldAlert size={14} className="text-red-600" /> :
                                                    <ShieldQuestion size={14} className="text-yellow-600" />}
                                            <span className={`text-[10px] font-bold uppercase tracking-wide ${res.status === 'verified' ? 'text-green-700' :
                                                res.status === 'disputed' ? 'text-red-700' : 'text-yellow-700'
                                                }`}>{res.status}</span>
                                            <span className="ml-auto text-xs text-gray-400">{Math.round(res.confidence * 100)}%</span>
                                        </div>
                                        <p className="font-serif text-gray-900 mb-1">"{res.claim}"</p>
                                        <p className="text-gray-500 text-xs mb-2">{res.analysis}</p>
                                        {res.source && (
                                            <a href={res.source.url} target="_blank" className="text-[10px] text-blue-500 hover:underline flex items-center gap-1">
                                                <ExternalLink size={10} /> Source Reference
                                            </a>
                                        )}
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
                            <div className="flex flex-col items-center justify-center h-48 text-gray-400 space-y-3">
                                <RefreshCw className="animate-spin text-purple-500" size={32} />
                                <p className="text-sm">Checking uniqueness across the web...</p>
                            </div>
                        ) : !plagiarismResult ? (
                            <div className="text-center py-12 px-4 text-gray-500">
                                <FileCheck className="mx-auto mb-4 text-purple-200" size={48} />
                                <p className="mb-4">Check if this draft is original.</p>
                                <button
                                    onClick={onPlagiarismCheck}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium transition-all"
                                >
                                    Check Uniqueness
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-fade-in">
                                {/* Score Meter */}
                                <div className="text-center p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div className="text-4xl font-serif font-bold mb-1" style={{
                                        color: plagiarismResult.uniqueness_score > 80 ? '#059669' :
                                            plagiarismResult.uniqueness_score > 50 ? '#d97706' : '#dc2626'
                                    }}>
                                        {plagiarismResult.uniqueness_score}%
                                    </div>
                                    <div className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">
                                        Originality Score
                                    </div>
                                    <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full transition-all duration-1000"
                                            style={{
                                                width: `${plagiarismResult.uniqueness_score}%`,
                                                backgroundColor: plagiarismResult.uniqueness_score > 80 ? '#10b981' :
                                                    plagiarismResult.uniqueness_score > 50 ? '#f59e0b' : '#ef4444'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Matched Sources */}
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">
                                        Potential Overlaps ({plagiarismResult.matched_sources.length})
                                    </h3>

                                    {plagiarismResult.matched_sources.length === 0 ? (
                                        <p className="text-sm text-green-600 flex items-center gap-2">
                                            <ShieldCheck size={16} /> No significant matches found!
                                        </p>
                                    ) : (
                                        plagiarismResult.matched_sources.map((source, i) => (
                                            <div key={i} className="p-3 bg-white border rounded-xl hover:shadow-sm transition-shadow">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold">
                                                        Match {source.overlap_score}x
                                                    </span>
                                                    <a href={source.url} target="_blank" className="text-gray-400 hover:text-blue-500">
                                                        <ExternalLink size={14} />
                                                    </a>
                                                </div>
                                                <p className="text-xs text-gray-500 line-clamp-2 italic">
                                                    "{source.snippet}"
                                                </p>
                                                <p className="text-[10px] text-gray-400 mt-2 truncate">
                                                    {source.url}
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <button onClick={onPlagiarismCheck} className="w-full py-2 text-xs text-purple-600 font-medium hover:bg-purple-50 rounded-lg border border-purple-100 transition-colors">
                                    Re-scan Draft
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* STYLE / ANTI-SLOP TAB */}
                {activeTab === 'style' && (
                    <>
                        {slopLoading ? (
                            <div className="flex flex-col items-center justify-center h-48 text-gray-400 space-y-3">
                                <RefreshCw className="animate-spin text-orange-500" size={32} />
                                <p className="text-sm">Scanning for AI-isms...</p>
                            </div>
                        ) : slopMatches.length === 0 ? (
                            <div className="text-center py-12 px-4 text-gray-500">
                                <MessageSquareX className="mx-auto mb-4 text-orange-200" size={48} />
                                <p className="mb-4">No AI cliches found! Your writing sounds clean.</p>
                                <button
                                    onClick={onSlopScan}
                                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium transition-all"
                                >
                                    Scan for Slop
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-fade-in">
                                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex items-start gap-3">
                                    <ShieldAlert className="text-orange-500 mt-1" size={18} />
                                    <div>
                                        <p className="text-sm font-medium text-orange-800">
                                            {slopMatches.length} AI-isms detected
                                        </p>
                                        <p className="text-xs text-orange-700 mt-1">
                                            AI patterns make your writing feel generic. Try substituting these words.
                                        </p>
                                    </div>
                                </div>

                                <button onClick={onSlopScan} className="text-xs text-orange-600 hover:text-orange-800 flex items-center gap-1 font-medium ml-auto">
                                    <RefreshCw size={12} /> Re-scan
                                </button>

                                <div className="space-y-3">
                                    {slopMatches.map((match, i) => (
                                        <div key={i} className="p-3 bg-white border border-gray-100 rounded-xl hover:border-orange-200 transition-all">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-mono text-sm font-bold text-gray-900 bg-gray-100 px-1.5 rounded">
                                                    "{match.word}"
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-medium">Position: {match.startIndex}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mb-2">
                                                {match.reason}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-50">
                                                <span className="text-[10px] font-bold text-green-600 uppercase">Suggestion:</span>
                                                <span className="text-xs font-medium text-gray-700">
                                                    {match.suggestion || "Delete it"}
                                                </span>
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
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Compare Against Specific URL (Optional)</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={compUrl}
                                    onChange={(e) => setCompUrl(e.target.value)}
                                    placeholder="https://competitor.com/article"
                                    className="flex-1 text-xs p-2 rounded border focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                                <button
                                    onClick={() => onCompetitorCheck(compUrl)}
                                    disabled={competitorLoading}
                                    className="p-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>

                        {competitorLoading ? (
                            <div className="flex flex-col items-center justify-center h-48 text-gray-400 space-y-3">
                                <RefreshCw className="animate-spin text-emerald-500" size={32} />
                                <p className="text-sm">Analyzing competitors...</p>
                            </div>
                        ) : !competitorResult ? (
                            <div className="text-center py-12 px-4 text-gray-500">
                                <Globe className="mx-auto mb-4 text-emerald-200" size={48} />
                                <p className="mb-4 text-sm">See how your draft stacks up against industry leaders.</p>
                                <button
                                    onClick={() => onCompetitorCheck()}
                                    className="w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium transition-all"
                                >
                                    Find Competitor Gaps
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-fade-in">
                                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                    <p className="text-sm text-emerald-800 italic leading-relaxed">
                                        "{competitorResult.summary}"
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    {(['unique', 'missing', 'common'] as const).map(type => {
                                        const filtered = competitorResult.insights.filter(i => i.type === type);
                                        if (filtered.length === 0) return null;

                                        return (
                                            <div key={type} className="space-y-2">
                                                <h3 className={`text-[10px] font-bold uppercase tracking-widest ${type === 'unique' ? 'text-emerald-600' :
                                                    type === 'missing' ? 'text-red-500' : 'text-gray-400'
                                                    }`}>
                                                    {type === 'unique' ? '✨ Your Unique Angle' :
                                                        type === 'missing' ? '🚨 Missing Highlights' : '⚪ Common Ground'}
                                                </h3>
                                                {filtered.map((insight, idx) => (
                                                    <div key={idx} className={`p-3 border rounded-xl ${type === 'unique' ? 'bg-emerald-50/30 border-emerald-100' :
                                                        type === 'missing' ? 'bg-red-50/30 border-red-100' : 'bg-gray-50/30 border-gray-100'
                                                        }`}>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="font-bold text-sm text-gray-900">{insight.claim}</span>
                                                            {insight.sourceUrl && (
                                                                <a href={insight.sourceUrl} target="_blank" className="text-gray-400 hover:text-emerald-500">
                                                                    <ExternalLink size={12} />
                                                                </a>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-600 leading-relaxed">
                                                            {insight.description}
                                                        </p>
                                                        {type === 'missing' && (
                                                            <button
                                                                className="mt-3 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-tight flex items-center gap-1"
                                                                onClick={() => alert("AI Gap Filling coming in next update!")}
                                                            >
                                                                <Sparkles size={10} /> Fill this gap
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>

                                <button onClick={() => onCompetitorCheck()} className="w-full py-2 text-xs text-emerald-600 font-medium hover:bg-emerald-50 rounded-lg border border-emerald-100 transition-colors">
                                    Refresh Comparison
                                </button>
                            </div>
                        )}
                    </>
                )}

            </div>
        </div>
    );
}
