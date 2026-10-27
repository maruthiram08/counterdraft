import React, { useState } from 'react';

type AuditState = 'idle' | 'analyzing' | 'done' | 'error';
type AuditIssue = {
    type: string;
    match: string;
    message: string;
    suggestion?: string;
};

// What a paid account gets, as the app does it today (craft score, strategy check, voice)
const IN_APP = [
    'A craft score out of 100 for hook, specifics, readability and rhythm, with a Fix for each weak part',
    'A strategy check: does the post fit your reader, your stance and your goal',
    'Drafts that start from your angle, with your own past posts as examples',
];

export const LiveAuditWidget: React.FC = () => {
    const [text, setText] = useState('');
    const [state, setState] = useState<AuditState>('idle');
    const [issues, setIssues] = useState<AuditIssue[]>([]);
    const [total, setTotal] = useState(0);
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const startAudit = async () => {
        if (!text || text.length < 50) return;
        setState('analyzing');

        try {
            const res = await fetch('/api/brain/audit/public', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            if (!res.ok) throw new Error(`Audit returned ${res.status}`);
            const data = await res.json();
            setIssues(Array.isArray(data.issues) ? data.issues : []);
            setTotal(typeof data.total === 'number' ? data.total : 0);
            setState('done');
        } catch (e) {
            console.error("Audit failed", e);
            setState('error');
        }
    };

    const reset = () => {
        setState('idle');
        setIssues([]);
        setTotal(0);
    };

    const signUp = async () => {
        if (!email) return;
        setLoading(true);

        try {
            await fetch('/api/marketing/capture-lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, source: 'homepage_live_trial' })
            });
        } catch (e) {
            console.error("Lead capture failed", e);
        }
        window.location.href = `/sign-up?email=${encodeURIComponent(email)}`;
    };

    return (
        <div className="w-full max-w-2xl mx-auto bg-surface rounded-card shadow-float overflow-hidden relative text-left">

            {/* HEADER */}
            <div className="px-6 pt-5 pb-2 flex justify-between items-center gap-3">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-ember-500 animate-pulse"></div>
                    <span className="text-sm font-medium text-ink">Try it now</span>
                </div>
                <div className="h-7 px-3 flex items-center rounded-full bg-canvas shadow-well text-xs font-medium text-ink-soft">Free, no account</div>
            </div>

            {/* CONTENT AREA */}
            <div className="p-6 min-h-[300px] flex flex-col relative">

                {state === 'idle' && (
                    <div className="flex-1 flex flex-col">
                        <textarea
                            className="w-full flex-1 min-h-[180px] resize-none bg-canvas shadow-well rounded-2xl px-4 py-3 border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 text-base text-ink placeholder:text-ink-muted leading-relaxed"
                            placeholder="Paste a paragraph from your latest LinkedIn post or article..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                        />
                        <div className="flex justify-between items-center gap-3 mt-4">
                            <span className="text-xs text-ink-muted">{text.length < 50 ? `${50 - text.length} more characters to go` : `${text.length} chars`}</span>
                            <button
                                onClick={startAudit}
                                disabled={text.length < 50}
                                className="h-12 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                Check My Writing
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
                        <div className="text-sm font-medium text-ink-soft animate-pulse">Checking phrases...</div>
                    </div>
                )}

                {state === 'error' && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
                        <p className="text-sm text-ink-soft">The check didn&apos;t run. Please try again.</p>
                        <button onClick={reset} className="h-11 px-5 rounded-full bg-canvas shadow-raised text-ink text-sm font-medium hover:text-ember-600 active:shadow-pressed transition-all">
                            Try again
                        </button>
                    </div>
                )}

                {state === 'done' && (
                    <div className="flex-1 flex flex-col pt-2">
                        {/* What the quick check found */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <span className="text-sm font-medium text-ink">Quick check: stock phrases</span>
                                <button onClick={reset} className="h-10 px-3 text-xs font-medium text-ink-soft hover:text-ember-600 transition-colors">
                                    Check another
                                </button>
                            </div>

                            {issues.length === 0 ? (
                                <div className="bg-canvas shadow-well p-4 rounded-tile">
                                    <div className="text-sm font-medium text-ink">No stock phrases found.</div>
                                    <p className="text-xs text-ink-soft mt-1">This quick check only looks for overused words and phrases. It can&apos;t judge your hook, your argument or your voice.</p>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {issues.map((issue, i) => (
                                        <div key={i} className="bg-canvas shadow-well p-4 rounded-tile">
                                            <div className="text-sm font-medium text-ink">&quot;{issue.match}&quot;</div>
                                            <p className="text-xs text-ink-soft mt-1">
                                                {issue.message}{issue.suggestion ? ` Try: ${issue.suggestion}.` : ''}
                                            </p>
                                        </div>
                                    ))}
                                    {total > issues.length && (
                                        <p className="text-xs text-ink-muted px-1">And {total - issues.length} more.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* What the app does beyond this check */}
                        <div className="relative flex-1 bg-ink rounded-tile p-5 overflow-hidden text-white">
                            <div className="relative z-10 flex flex-col h-full justify-between">
                                <div>
                                    <div className="text-sm font-medium text-white/80 mb-4">Inside Counterdraft you also get</div>
                                    <ul className="space-y-3">
                                        {IN_APP.map(item => (
                                            <li key={item} className="flex gap-3 text-sm text-white/90">
                                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-ember-500 shrink-0"></span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="mt-6 pt-6 border-t border-white/10">
                                    <p className="text-white/60 text-xs mb-4">
                                        Create your account to get started. Drafting needs a <a href="/pricing" className="underline underline-offset-2 hover:text-white">Pro plan</a>.
                                    </p>

                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <input
                                            type="email"
                                            placeholder="your@email.com"
                                            className="flex-1 min-w-0 h-11 bg-white/10 border-0 rounded-full px-4 text-base md:text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-ember-200/60 focus:bg-white/15 transition-all"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                        <button
                                            onClick={signUp}
                                            disabled={loading || !email}
                                            className="h-11 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 transition-colors disabled:opacity-50"
                                        >
                                            {loading ? '...' : 'Get Started'}
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
