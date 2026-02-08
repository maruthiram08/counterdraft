
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
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-indigo-50 p-6 flex flex-col items-center text-center border-b border-indigo-100">
                    <div className="bg-indigo-100 p-3 rounded-full mb-3">
                        <Lock size={24} className="text-indigo-600" />
                    </div>
                    <h2 className="text-xl font-serif font-bold text-gray-900">Private Beta Access</h2>
                    <p className="text-sm text-indigo-800 font-medium mt-1">
                        CounterDraft is currently invite-only.
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600 text-center leading-relaxed">
                        To maintain quality during our early preview, you need an <strong>Invite Code</strong> or a <strong>Pro Subscription</strong> to create content.
                    </p>


                    <div className="space-y-3 pt-2">
                        <Link href="/pricing" className="block">
                            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors">
                                <Zap size={16} />
                                Upgrade Now
                            </button>
                        </Link>

                        {/* MANUAL INVITE ENTRY */}
                        <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs text-center text-gray-500 mb-2">Have a beta invite code?</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Enter Code (e.g. BETA-123)"
                                    className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors uppercase"
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
                                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Apply
                                </button>
                            </div>

                            {/* REQUEST ACCESS LINK */}
                            <div className="text-center mt-3">
                                <button
                                    onClick={() => setIsRequestModalOpen(true)}
                                    className="text-xs text-blue-600 hover:text-blue-800 underline transition-colors"
                                >
                                    No code? Request Beta Access
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full text-xs text-gray-400 hover:text-gray-600 pt-2"
                        >
                            Close
                        </button>
                    </div>
                </div>

                {/* Close X */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
}
