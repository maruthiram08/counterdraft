import React from 'react';
import { ShieldCheck, Sparkles, Info, Search, RefreshCw } from 'lucide-react';

interface MetricState {
    score: number;
    hasRun: boolean;
    loading: boolean;
}

interface QualityScoreFooterProps {
    score: number;
    metrics: {
        fact: MetricState;
        uniqueness: MetricState;
        style: MetricState;
    };
    onRunMetric: (type: 'fact' | 'uniqueness' | 'style') => void;
    onOpenSidebar: () => void;
    isVisible: boolean;
}

export function QualityScoreFooter({
    score,
    metrics,
    onRunMetric,
    onOpenSidebar,
    isVisible
}: QualityScoreFooterProps) {
    if (!isVisible) return null;

    const getColor = (s: number, hasRun: boolean) => {
        if (!hasRun) return 'text-gray-300';
        if (s >= 90) return 'text-emerald-500';
        if (s >= 65) return 'text-amber-500';
        return 'text-red-500';
    };

    const getBgColor = (s: number, hasRun: boolean) => {
        if (!hasRun) return 'bg-gray-100';
        if (s >= 90) return 'bg-emerald-500';
        if (s >= 65) return 'bg-amber-500';
        return 'bg-red-500';
    };

    const getStatusText = (s: number) => {
        const anyLoading = metrics.fact.loading || metrics.uniqueness.loading || metrics.style.loading;
        if (anyLoading) return 'Analyzing draft...';

        const allRun = metrics.fact.hasRun && metrics.uniqueness.hasRun && metrics.style.hasRun;
        if (!allRun) return 'Draft Unverified';

        if (s >= 90) return 'Ready to Publish';
        if (s >= 65) return 'Needs Review';
        return 'Action Required';
    };

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-bottom-4 duration-500">
            <div className="group flex items-center gap-2 px-6 py-3 bg-white/95 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 rounded-full hover:border-[var(--accent)]/30 transition-all">

                {/* Main Score Gauge */}
                <button onClick={onOpenSidebar} className="flex items-center gap-4 pr-6 border-r border-gray-100 transition-opacity hover:opacity-80">
                    <div className="relative w-11 h-11 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90">
                            <circle cx="22" cy="22" r="20" fill="none" stroke="currentColor" strokeWidth="3.5" className="text-gray-100" />
                            <circle cx="22" cy="22" r="20" fill="none" stroke="currentColor" strokeWidth="3.5" strokeDasharray={125.6} strokeDashoffset={125.6 - (125.6 * score) / 100} className={`${getColor(score, true).replace('text-', 'stroke-')} transition-all duration-1000 ease-out`} strokeLinecap="round" />
                        </svg>
                        <span className="absolute text-[11px] font-bold font-sans">{score}%</span>
                    </div>
                    <div className="text-left">
                        <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-gray-400">Trust Score</div>
                        <div className={`text-[13px] font-extrabold tracking-tight ${getColor(score, true)}`}>
                            {getStatusText(score)}
                        </div>
                    </div>
                </button>

                {/* Sub-metrics */}
                <div className="flex items-center gap-8 px-4">
                    {/* Facts */}
                    <button
                        onClick={() => onRunMetric('fact')}
                        className="flex flex-col items-center gap-0.5 group/item transition-transform active:scale-90"
                    >
                        <ShieldCheck size={16} className={`${getColor(metrics.fact.score, metrics.fact.hasRun)} ${metrics.fact.loading ? 'animate-pulse' : ''}`} />
                        <span className="text-[10px] font-bold text-gray-800">Facts</span>
                        <span className={`text-[9px] font-medium ${metrics.fact.hasRun ? 'text-gray-500' : 'text-emerald-600 font-bold'}`}>
                            {metrics.fact.loading ? '...' : metrics.fact.hasRun ? `${Math.round(metrics.fact.score)}%` : 'Run'}
                        </span>
                        <div className={`h-0.5 w-4 rounded-full ${getBgColor(metrics.fact.score, metrics.fact.hasRun)} opacity-40 mt-0.5`} />
                    </button>

                    {/* Uniqueness */}
                    <button
                        onClick={() => onRunMetric('uniqueness')}
                        className="flex flex-col items-center gap-0.5 group/item transition-transform active:scale-90"
                    >
                        <Search size={16} className={`${getColor(metrics.uniqueness.score, metrics.uniqueness.hasRun)} ${metrics.uniqueness.loading ? 'animate-pulse' : ''}`} />
                        <span className="text-[10px] font-bold text-gray-800">Unique</span>
                        <span className={`text-[9px] font-medium ${metrics.uniqueness.hasRun ? 'text-gray-500' : 'text-emerald-600 font-bold'}`}>
                            {metrics.uniqueness.loading ? '...' : metrics.uniqueness.hasRun ? `${Math.round(metrics.uniqueness.score)}%` : 'Run'}
                        </span>
                        <div className={`h-0.5 w-4 rounded-full ${getBgColor(metrics.uniqueness.score, metrics.uniqueness.hasRun)} opacity-40 mt-0.5`} />
                    </button>

                    {/* Style/Humanity */}
                    <button
                        onClick={() => onRunMetric('style')}
                        className="flex flex-col items-center gap-0.5 group/item transition-transform active:scale-90"
                    >
                        <Sparkles size={16} className={`${getColor(metrics.style.score, metrics.style.hasRun)} ${metrics.style.loading ? 'animate-pulse' : ''}`} />
                        <span className="text-[10px] font-bold text-gray-800">Human</span>
                        <span className={`text-[9px] font-medium ${metrics.style.hasRun ? 'text-gray-500' : 'text-emerald-600 font-bold'}`}>
                            {metrics.style.loading ? '...' : metrics.style.hasRun ? `${Math.round(metrics.style.score)}%` : 'Run'}
                        </span>
                        <div className={`h-0.5 w-4 rounded-full ${getBgColor(metrics.style.score, metrics.style.hasRun)} opacity-40 mt-0.5`} />
                    </button>
                </div>

                {/* Action Button: Run Comprehensive Audit or Open Sidebar */}
                <button
                    onClick={() => {
                        const anyMissing = !metrics.fact.hasRun || !metrics.uniqueness.hasRun || !metrics.style.hasRun;
                        if (anyMissing) onRunMetric('run-all' as any);
                        else onOpenSidebar();
                    }}
                    className={`ml-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 group/audit ${(!metrics.fact.hasRun || !metrics.uniqueness.hasRun || !metrics.style.hasRun)
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200'
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                        }`}
                >
                    {(!metrics.fact.hasRun || !metrics.uniqueness.hasRun || !metrics.style.hasRun) ? (
                        <>
                            <RefreshCw size={14} className="group-hover/audit:rotate-180 transition-transform duration-500" />
                            Run Audit
                        </>
                    ) : (
                        <>
                            <Info size={14} />
                            Details
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
