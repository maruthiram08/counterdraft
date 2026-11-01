import React from 'react';
import { X, Lock } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { RequestAccessModal } from './RequestAccessModal';
import { formatInviteDate } from '@/lib/billing/invite-utils';
import { Spinner } from "@/components/shared/Loading";

interface LimitModalProps {
    isOpen: boolean;
    onClose: () => void;
    tier: string;
    usage: number;
    limit: number;
}

export function LimitModal({ isOpen, onClose }: LimitModalProps) {
    const [isRequestModalOpen, setIsRequestModalOpen] = React.useState(false);
    const [code, setCode] = React.useState('');
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState('');

    if (!isOpen && !isRequestModalOpen) return null;

    if (isRequestModalOpen) {
        return (
            <RequestAccessModal
                isOpen={true}
                onClose={() => {
                    setIsRequestModalOpen(false);
                    onClose();
                }}
            />
        );
    }

    // Use the code right here instead of sending them off to the invite page
    const useCode = async (e: React.FormEvent) => {
        e.preventDefault();
        const value = code.trim().toUpperCase();
        if (!value || busy) return;
        setBusy(true);
        setError('');
        try {
            const res = await fetch('/api/billing/claim-coupon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: value }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                toast.success(`Invite accepted. You're on Pro until ${formatInviteDate(data.period_end)}.`, { duration: 8000 });
                setTimeout(() => window.location.reload(), 1200);
                return;
            }
            if (data.code === 'discount') {
                window.location.assign(`/pricing?coupon=${encodeURIComponent(value)}`);
                return;
            }
            setError(data.error || "That code didn't work.");
            setBusy(false);
        } catch {
            setError("We couldn't check that code. Check your connection and try again.");
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
            <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />

            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="limit-title"
                className="relative w-full md:max-w-sm md:mx-4 bg-surface rounded-t-card md:rounded-card shadow-float max-h-[92dvh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
            >
                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute top-3 right-3 w-11 h-11 rounded-full flex items-center justify-center text-ink-muted hover:text-ink active:shadow-pressed transition-all"
                >
                    <X size={20} />
                </button>

                <div className="px-5 pt-6 md:px-7 md:pt-7 pb-5 md:pb-7 safe-area-pb flex flex-col gap-5">
                    <div>
                        <div className="w-11 h-11 rounded-full bg-canvas shadow-raised text-ember-500 flex items-center justify-center mb-4">
                            <Lock size={20} />
                        </div>
                        <h2 id="limit-title" className="text-2xl font-medium tracking-[-0.02em] text-ink">Writing drafts needs Pro</h2>
                        <p className="text-sm text-ink-soft mt-2 leading-relaxed">
                            Counterdraft is in beta. Your free account can look around, and drafting opens up with Pro: buy a plan, or use an invite code if someone sent you one.
                        </p>
                    </div>

                    <Link
                        href="/pricing"
                        className="w-full h-12 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all flex items-center justify-center"
                    >
                        See plans
                    </Link>

                    <form onSubmit={useCode} className="flex flex-col gap-2">
                        <label htmlFor="limit-code" className="text-sm font-medium text-ink">Have an invite code?</label>
                        <div className="flex gap-2">
                            <input
                                id="limit-code"
                                type="text"
                                value={code}
                                onChange={(e) => { setCode(e.target.value); setError(''); }}
                                placeholder="BETA-…"
                                autoCapitalize="characters"
                                autoComplete="off"
                                spellCheck={false}
                                className="flex-1 min-w-0 h-12 bg-canvas shadow-well rounded-full px-4 text-ink uppercase placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={!code.trim() || busy}
                                className="h-12 px-5 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {busy && <Spinner size={16} />}
                                Use code
                            </button>
                        </div>
                        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
                    </form>

                    <button
                        onClick={() => setIsRequestModalOpen(true)}
                        className="h-11 text-sm font-medium text-ember-600 hover:text-ember-700"
                    >
                        No code? Ask for an invite
                    </button>
                </div>
            </div>
        </div>
    );
}
