import React, { useState } from 'react';

type AuditState = 'idle' | 'analyzing' | 'gated' | 'complete';
type AuditCritique = {
    type: string;
    message: string;
    match?: string;
};

export const LiveAuditWidget: React.FC = () => {
    const [text, setText] = useState('');
    const [state, setState] = useState<AuditState>('idle');
    const [score, setScore] = useState(0);
    const [primaryCritique, setPrimaryCritique] = useState<AuditCritique | null>(null);
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const startAudit = async () => {
        if (!text || text.length < 50) return;
        setState('analyzing');

        // Simulate API call for the public audit (using our new endpoint)
        try {
            const res = await fetch('/api/brain/audit/public', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            const data = await res.json();

            setScore(data.score);
            setPrimaryCritique(data.primary_critique);
            setState('gated');
        } catch (e) {
            console.error("Audit failed", e);
            setState('idle'); // specific error state would be better
        }
    };

    const unlockReport = async () => {
        if (!email) return;
        setLoading(true);

        try {
            // Capture Lead
            await fetch('/api/marketing/capture-lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, source: 'homepage_live_trial' })
            });

            // Redirect to Signup (or just show success for now)
            // For this sprint, we redirect to Clerk sign-up with email pre-fill if possible,
            // or just show a "Check your email" message.
            // Let's redirect to standard sign up.
            window.location.href = `/sign-up?email=${encodeURIComponent(email)}`;
        } catch (e) {
            console.error("Lead capture failed", e);
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto bg-surface rounded-card shadow-float overflow-hidden relative text-left">

            {/* HEADER */}
            <div className="px-6 pt-5 pb-2 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-ember-500 animate-pulse"></div>
                    <span className="text-sm font-medium text-ink">Try It Now</span>
                </div>
                <div className="h-7 px-3 flex items-center rounded-full bg-canvas shadow-well text-xs font-medium text-ink-soft">Public Access</div>
            </div>

            {/* CONTENT AREA */}
            <div className="p-6 min-h-[300px] flex flex-col relative">

                {state === 'idle' && (
                    <div className="flex-1 flex flex-col">
                        <textarea
                            className="w-full flex-1 min-h-[180px] resize-none bg-canvas shadow-well rounded-2xl px-4 py-3 border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 text-base text-ink placeholder:text-ink-muted leading-relaxed"
                            placeholder="Paste a paragraph from your latest LinkedIn post or blog draft..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                        />
                        <div className="flex justify-between items-center mt-4">
                            <span className="text-xs text-ink-muted">{text.length} chars</span>
                            <button
                                onClick={startAudit}
                                disabled={text.length < 50}
                                className="h-12 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                Run Audit
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            </button>
                        </div>
                    </div>
                )}

                {state === 'analyzing' && (
                    <div className="absolute inset-0 bg-surface flex flex-col items-center justify-center z-10">
                        <div className="w-full max-w-sm h-1.5 bg-canvas shadow-well rounded-full overflow-hidden mb-4">
                            <div className="h-full bg-ember-500 rounded-full w-1/3 animate-[shimmer_1s_infinite]"></div>
                        </div>
                        <div className="text-sm font-medium text-ink-soft animate-pulse">Deconstructing Syntax...</div>
                    </div>
                )}

                {state === 'gated' && (
                    <div className="flex-1 flex flex-col pt-4">
                        {/* LAYER 1: SURFACE (Unlocked) */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-sage-100 flex items-center justify-center">
                                        <svg className="w-3 h-3 text-sage-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                    </div>
                                    <span className="text-sm font-medium text-ink">Layer 1: Syntax Scan</span>
                                </div>
                                <span className="text-xs font-medium text-sage-700 bg-sage-100 h-7 px-3 flex items-center rounded-full">COMPLETE</span>
                            </div>

                            <div className="bg-canvas shadow-well p-4 rounded-tile flex items-start gap-4">
                                <div className="flex-1">
                                    <div className="text-xs text-ink-muted mb-1">Detected Pattern</div>
                                    <div className="text-sm font-medium text-ink">&quot;{primaryCritique?.match || 'Generic Phrasing'}&quot;</div>
                                    <p className="text-xs text-ink-soft mt-1">{primaryCritique?.message || "Sentence structure lacks rhythmic variation."}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-4xl font-medium tracking-[-0.03em] text-ink">{score}</div>
                                    <div className="text-xs text-ink-muted">Surface Score</div>
                                </div>
                            </div>
                        </div>

                        {/* LAYER 2: STRATEGY (Locked) */}
                        <div className="relative flex-1 bg-ink rounded-tile p-5 overflow-hidden text-white">
                            {/* Background Pattern */}
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>

                            <div className="relative z-10 flex flex-col h-full justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <svg className="w-4 h-4 text-ember-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                        <span className="text-sm font-medium text-white/80">Layer 2: Strategic Resonance</span>
                                    </div>

                                    <div className="space-y-3 opacity-50 blur-[1px]">
                                        <div className="flex justify-between border-b border-white/10 pb-2">
                                            <span className="text-sm font-medium">Audience Pain-Point Alignment</span>
                                            <span className="text-sm font-mono">--/100</span>
                                        </div>
                                        <div className="flex justify-between border-b border-white/10 pb-2">
                                            <span className="text-sm font-medium">Unique Belief Consistency</span>
                                            <span className="text-sm font-mono">--/100</span>
                                        </div>
                                        <div className="flex justify-between border-b border-white/10 pb-2">
                                            <span className="text-sm font-medium">Competitor Differentiation</span>
                                            <span className="text-sm font-mono">--/100</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-white/10 text-center">
                                    <h3 className="font-medium text-lg tracking-[-0.01em] mb-1">See what&apos;s really holding your writing back.</h3>
                                    <p className="text-white/60 text-xs mb-4">Get the full breakdown—free.</p>

                                    <div className="flex gap-2">
                                        <input
                                            type="email"
                                            placeholder="your@email.com"
                                            className="flex-1 h-10 bg-white/10 border-0 rounded-full px-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-ember-200/60 focus:bg-white/15 transition-all"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                        <button
                                            onClick={unlockReport}
                                            disabled={loading || !email}
                                            className="h-10 px-4 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 transition-colors disabled:opacity-50"
                                        >
                                            {loading ? '...' : 'Unlock Audit'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

            </div>
        </div>
    );
};
