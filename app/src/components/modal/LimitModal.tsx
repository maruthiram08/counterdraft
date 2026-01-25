
import React from 'react';
import { X, Lock, Zap } from 'lucide-react';
import Link from 'next/link';

interface LimitModalProps {
    isOpen: boolean;
    onClose: () => void;
    tier: string;
    usage: number;
    limit: number;
}

export function LimitModal({ isOpen, onClose, tier, usage, limit }: LimitModalProps) {
    if (!isOpen) return null;

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
                <div className="bg-red-50 p-6 flex flex-col items-center text-center border-b border-red-100">
                    <div className="bg-red-100 p-3 rounded-full mb-3">
                        <Lock size={24} className="text-red-600" />
                    </div>
                    <h2 className="text-xl font-serif font-bold text-gray-900">Limit Reached</h2>
                    <p className="text-sm text-red-600 font-medium mt-1">
                        You have hit the {tier.toUpperCase()} plan limit.
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between border border-gray-100">
                        <span className="text-sm text-gray-500 font-medium">Monthly Drafts</span>
                        <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-gray-900">{usage}</span>
                            <span className="text-gray-400">/</span>
                            <span className="text-sm text-gray-500">{limit}</span>
                        </div>
                    </div>

                    <p className="text-sm text-gray-600 text-center leading-relaxed">
                        Upgrade to <span className="font-bold text-gray-900">Pro</span> to unlock unlimited drafts, AI brainstorming, and more.
                    </p>

                    <div className="space-y-3 pt-2">
                        <Link href="/pricing" className="block">
                            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors">
                                <Zap size={16} />
                                Upgrade Now
                            </button>
                        </Link>
                        <button
                            onClick={onClose}
                            className="w-full bg-white hover:bg-gray-50 text-gray-600 font-medium py-2.5 rounded-lg border border-gray-200 transition-colors"
                        >
                            Maybe Later
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
