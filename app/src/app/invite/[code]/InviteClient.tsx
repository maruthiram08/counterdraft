'use client';

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RequestAccessModal } from "@/components/modal/RequestAccessModal";
import { inviteAuthUrl } from "@/lib/billing/invite-utils";

export type InviteView = 'valid' | 'used' | 'expired' | 'missing' | 'mine';

const primary = "w-full h-12 px-5 rounded-full bg-ember-500 hover:bg-ember-600 text-white text-sm font-medium shadow-ember active:shadow-pressed transition-all flex items-center justify-center gap-2";
const secondary = "w-full h-12 px-5 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all flex items-center justify-center";
const quiet = "h-11 px-4 inline-flex items-center justify-center text-sm font-medium text-ink-soft hover:text-ink";

// Keep the code in this browser too, in case the sign-up page drops the return link
function remember(code: string) {
    try { localStorage.setItem('pending_coupon', code); } catch { /* storage blocked: the URL carries it */ }
}

export function InviteActions({ view, code, signedIn }: { view: InviteView; code: string; signedIn: boolean }) {
    const [asking, setAsking] = useState(false);
    const [typed, setTyped] = useState('');

    const askButton = (label: string, style: string) => (
        <button type="button" onClick={() => setAsking(true)} className={style}>{label}</button>
    );
    const plans = <Link href="/pricing" className={quiet}>See plans</Link>;
    const openApp = <Link href="/workspace" className={quiet}>Open Counterdraft</Link>;
    const signIn = <Link href={`/sign-in?redirect_url=${encodeURIComponent('/workspace')}`} className={quiet}>Sign in</Link>;

    return (
        <div className="flex flex-col gap-3">
            {view === 'valid' && (signedIn ? (
                <a href={`/workspace?invite=${encodeURIComponent(code)}`} onClick={() => remember(code)} className={primary}>
                    Add Pro to my account <ArrowRight size={18} />
                </a>
            ) : (
                <>
                    <a href={inviteAuthUrl('sign-up', code)} onClick={() => remember(code)} className={primary}>
                        Create your account <ArrowRight size={18} />
                    </a>
                    <a href={inviteAuthUrl('sign-in', code)} onClick={() => remember(code)} className={secondary}>
                        I already have an account
                    </a>
                </>
            ))}

            {view === 'used' && (
                <>
                    {signedIn ? askButton('Ask for an invite', primary) : <Link href={`/sign-in?redirect_url=${encodeURIComponent('/workspace')}`} className={primary}>Sign in</Link>}
                    {signedIn ? <Link href="/pricing" className={secondary}>See plans</Link> : askButton('Ask for an invite', secondary)}
                    <div className="flex justify-center">{signedIn ? openApp : plans}</div>
                </>
            )}

            {view === 'expired' && (
                <>
                    {askButton('Ask for a new invite', primary)}
                    <Link href="/pricing" className={secondary}>See plans</Link>
                    <div className="flex justify-center">{signedIn ? openApp : signIn}</div>
                </>
            )}

            {view === 'missing' && (
                <>
                    <form
                        className="flex gap-2"
                        onSubmit={(e) => {
                            e.preventDefault();
                            const next = typed.trim().toUpperCase();
                            if (next) window.location.assign(`/invite/${encodeURIComponent(next)}`);
                        }}
                    >
                        <label htmlFor="invite-code" className="sr-only">Invite code</label>
                        <input
                            id="invite-code"
                            value={typed}
                            onChange={(e) => setTyped(e.target.value)}
                            placeholder="Invite code"
                            autoCapitalize="characters"
                            autoComplete="off"
                            spellCheck={false}
                            className="flex-1 min-w-0 h-12 bg-surface shadow-well rounded-full px-4 text-ink uppercase placeholder:normal-case placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200"
                        />
                        <button type="submit" disabled={!typed.trim()} className="h-12 px-5 rounded-full bg-ember-500 hover:bg-ember-600 text-white text-sm font-medium shadow-ember active:shadow-pressed transition-all disabled:opacity-50">
                            Check
                        </button>
                    </form>
                    {askButton('Ask for an invite', secondary)}
                    <div className="flex justify-center">{plans}</div>
                </>
            )}

            {view === 'mine' && (
                <Link href="/workspace" className={primary}>Open Counterdraft <ArrowRight size={18} /></Link>
            )}

            <RequestAccessModal isOpen={asking} onClose={() => setAsking(false)} />
        </div>
    );
}
