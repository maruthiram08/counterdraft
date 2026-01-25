import React, { useState } from 'react';

type AuditState = 'idle' | 'analyzing' | 'gated' | 'complete';

export const LiveAuditWidget: React.FC = () => {
    const [text, setText] = useState('');
    const [state, setState] = useState<AuditState>('idle');
    const [score, setScore] = useState(0);
    const [primaryCritique, setPrimaryCritique] = useState<any>(null);
    const [hiddenCount, setHiddenCount] = useState(0);
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
            setHiddenCount(data.hidden_issues_count);
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
        <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden relative">

            {/* HEADER */}
            <div className="bg-zinc-50 border-b border-zinc-100 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Live Engine v2.5</span>
                </div>
                <div className="text-xs font-bold text-zinc-400">Public Access</div>
            </div>

            {/* CONTENT AREA */}
            <div className="p-6 min-h-[300px] flex flex-col relative">

                {state === 'idle' && (
                    <div className="flex-1 flex flex-col">
                        <textarea
                            className="w-full flex-1 resize-none bg-transparent border-none focus:ring-0 text-lg text-zinc-800 placeholder:text-zinc-300 font-serif leading-relaxed"
                            placeholder="Paste a paragraph here to test your 'Voice Authority'..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                        />
                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-100">
                            <span className="text-xs text-zinc-400 font-bold">{text.length} chars</span>
                            <button
                                onClick={startAudit}
                                disabled={text.length < 50}
                                className="bg-zinc-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                Run Audit
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            </button>
                        </div>
                    </div>
                )}

                {state === 'analyzing' && (
                    <div className="absolute inset-0 bg-white flex flex-col items-center justify-center z-10">
                        <div className="w-full max-w-sm h-1 bg-zinc-100 rounded-full overflow-hidden mb-4">
                            <div className="h-full bg-green-500 w-1/3 animate-[shimmer_1s_infinite]"></div>
                        </div>
                        <div className="text-sm font-bold text-zinc-500 animate-pulse">Deconstructing Syntax...</div>
                    </div>
                )}

                {state === 'gated' && (
                    <div className="flex-1 flex flex-col pt-4">
                        {/* LAYER 1: SURFACE (Unlocked) */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                                        <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                    </div>
                                    <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Layer 1: Syntax Scan</span>
                                </div>
                                <span className="text-[10px] font-mono text-green-600 bg-green-50 px-2 py-0.5 rounded">COMPLETE</span>
                            </div>

                            <div className="bg-zinc-50 border border-zinc-100 p-4 rounded-xl flex items-start gap-4">
                                <div className="flex-1">
                                    <div className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Detected Pattern</div>
                                    <div className="text-sm font-medium text-zinc-900">"{primaryCritique?.match || 'Generic Phrasing'}"</div>
                                    <p className="text-xs text-zinc-500 mt-1">{primaryCritique?.message || "Sentence structure lacks rhythmic variation."}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-zinc-900">{score}</div>
                                    <div className="text-[9px] font-bold text-zinc-400 uppercase">Surface Score</div>
                                </div>
                            </div>
                        </div>

                        {/* LAYER 2: STRATEGY (Locked) */}
                        <div className="relative flex-1 bg-zinc-900 rounded-xl p-5 overflow-hidden text-white">
                            {/* Background Pattern */}
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>

                            <div className="relative z-10 flex flex-col h-full justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                        <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Layer 2: Strategic Resonance</span>
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
                                    <h3 className="font-bold text-lg mb-1">Fix the thinking, not just the words.</h3>
                                    <p className="text-zinc-400 text-xs mb-4">Unlock the deep strategic audit used by industry leaders.</p>

                                    <div className="flex gap-2">
                                        <input
                                            type="email"
                                            placeholder="your@email.com"
                                            className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:bg-white/20 transition-all"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                        <button
                                            onClick={unlockReport}
                                            disabled={loading || !email}
                                            className="bg-white text-zinc-900 px-4 py-2 rounded-lg text-xs font-bold hover:bg-zinc-100 transition-colors uppercase tracking-wide"
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
