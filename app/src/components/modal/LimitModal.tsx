
import React from 'react';
import { X, Lock, Zap } from 'lucide-react';
import Link from 'next/link';
import { RequestAccessModal } from './RequestAccessModal';

interface LimitModalProps {
    isOpen: boolean;
    onClose: () => void;
    tier: string;
    usage: number;
    limit: number;
}

export function LimitModal({ isOpen, onClose }: LimitModalProps) {
    const [isRequestModalOpen, setIsRequestModalOpen] = React.useState(false);

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

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-ink/30 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-canvas rounded-card shadow-float w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 pt-8 pb-2 flex flex-col items-center text-center">
                    <div className="bg-canvas shadow-raised p-3 rounded-full mb-3">
                        <Lock size={24} className="text-ember-500" />
                    </div>
                    <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink">Private Beta Access</h2>
                    <p className="text-sm text-ink-soft mt-1">
                        CounterDraft is currently invite-only.
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <p className="text-sm text-ink-soft text-center leading-relaxed">
                        To maintain quality during our early preview, you need an <strong>Invite Code</strong> or a <strong>Pro Subscription</strong> to create content.
                    </p>


                    <div className="space-y-3 pt-2">
                        <Link href="/pricing" className="block">
                            <button className="w-full h-12 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all flex items-center justify-center gap-2">
                                <Zap size={16} />
                                Upgrade Now
                            </button>
                        </Link>

                        {/* MANUAL INVITE ENTRY */}
                        <div className="pt-4">
                            <p className="text-xs text-center text-ink-muted mb-2">Have a beta invite code?</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Enter Code (e.g. BETA-123)"
                                    className="flex-1 min-w-0 bg-canvas shadow-well rounded-full px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 transition-all uppercase"
                                    onKeyDown={async (e) => {
                                        if (e.key === 'Enter') {
                                            const code = e.currentTarget.value.trim().toUpperCase();
                                            if (!code) return;
                                            // Trigger Claim - Redirect to invite link which handles the claim logic robustly
                                            window.location.href = `/invite/${code}`;
                                        }
                                    }}
                                />
                                <button
                                    onClick={(e) => {
                                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                        const code = input.value.trim().toUpperCase();
                                        if (code) window.location.href = `/invite/${code}`;
                                    }}
                                    className="h-10 px-4 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all"
                                >
                                    Apply
                                </button>
                            </div>

                            {/* REQUEST ACCESS LINK */}
                            <div className="text-center mt-3">
                                <button
                                    onClick={() => setIsRequestModalOpen(true)}
                                    className="text-xs text-ember-600 hover:text-ember-700 underline transition-colors"
                                >
                                    No code? Request Beta Access
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full text-xs text-ink-muted hover:text-ink pt-2"
                        >
                            Close
                        </button>
                    </div>
                </div>

                {/* Close X */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center bg-canvas shadow-raised text-ink-soft hover:text-ink active:shadow-pressed transition-all"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
}
