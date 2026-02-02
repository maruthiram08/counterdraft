"use client";

import { useState, useEffect } from "react";
import { X, ExternalLink, FileText, ArrowRight, Loader2, RefreshCw, Sparkles } from "lucide-react";

interface UrlPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    artifact: {
        id: string;
        source_url?: string;
        source_title?: string;
        user_note?: string;
        ocr_text?: string;
    } | null;
    onCreateDraft: (content: string, title: string, url?: string) => void;
}

type Step = 'preview' | 'content' | 'ready';

export function UrlPreviewModal({ isOpen, onClose, artifact, onCreateDraft }: UrlPreviewModalProps) {
    const [step, setStep] = useState<Step>('preview');
    const [fetchedContent, setFetchedContent] = useState<string>('');
    const [fetchedTitle, setFetchedTitle] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset state when modal opens/closes or artifact changes
    useEffect(() => {
        if (isOpen && artifact) {
            setStep('preview');
            setFetchedContent('');
            setFetchedTitle('');
            setError(null);
        }
    }, [isOpen, artifact?.id]);

    const fetchUrlContent = async () => {
        if (!artifact?.source_url) return;

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/brain/read-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: artifact.source_url })
            });

            if (!res.ok) {
                throw new Error('Failed to fetch content');
            }

            const data = await res.json();
            setFetchedContent(data.content || '');
            setFetchedTitle(data.title || artifact.source_title || 'Untitled');
            setStep('content');
        } catch (err) {
            console.error('Error fetching URL:', err);
            setError('Could not fetch content from this URL. The site may be blocking requests.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateDraft = () => {
        onCreateDraft(fetchedContent, fetchedTitle, artifact?.source_url);
        onClose();
    };

    const getDomainFromUrl = (url: string) => {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return url;
        }
    };

    if (!isOpen || !artifact) return null;

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/50 z-40"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">

                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-blue-50 to-purple-50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <ExternalLink className="text-blue-600" size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">URL Artifact</h2>
                                <p className="text-sm text-gray-500">
                                    {step === 'preview' && 'Review before fetching'}
                                    {step === 'content' && 'Content extracted'}
                                    {step === 'ready' && 'Ready to create draft'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/50 rounded-lg transition"
                        >
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>

                    {/* Step Indicator */}
                    <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-b">
                        <div className={`flex items-center gap-2 text-sm ${step === 'preview' ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>1</span>
                            Preview
                        </div>
                        <ArrowRight size={16} className="text-gray-300" />
                        <div className={`flex items-center gap-2 text-sm ${step === 'content' ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 'content' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>2</span>
                            Content
                        </div>
                        <ArrowRight size={16} className="text-gray-300" />
                        <div className={`flex items-center gap-2 text-sm ${step === 'ready' ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 'ready' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>3</span>
                            Draft
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-5">

                        {/* Step 1: Preview */}
                        {step === 'preview' && (
                            <div className="space-y-4">
                                {/* URL Card */}
                                <div className="border rounded-xl p-4 bg-gray-50">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-white rounded-lg border flex items-center justify-center text-gray-400">
                                            <ExternalLink size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-gray-900 truncate">
                                                {artifact.source_title || 'Saved URL'}
                                            </h3>
                                            <a
                                                href={artifact.source_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-500 hover:underline truncate block"
                                            >
                                                {getDomainFromUrl(artifact.source_url || '')}
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                {/* User Note */}
                                {artifact.user_note && (
                                    <div className="border rounded-xl p-4">
                                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Your Note</p>
                                        <p className="text-gray-700">{artifact.user_note}</p>
                                    </div>
                                )}

                                {/* Existing OCR Text Preview */}
                                {artifact.ocr_text && (
                                    <div className="border rounded-xl p-4">
                                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Saved Content</p>
                                        <p className="text-gray-600 text-sm line-clamp-4">{artifact.ocr_text}</p>
                                    </div>
                                )}

                                {/* Error State */}
                                {error && (
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                                        {error}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 2: Fetched Content */}
                        {step === 'content' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-gray-900">{fetchedTitle}</h3>
                                    <button
                                        onClick={fetchUrlContent}
                                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                    >
                                        <RefreshCw size={14} />
                                        Refetch
                                    </button>
                                </div>

                                <div className="bg-gray-50 border rounded-xl p-4 max-h-[400px] overflow-y-auto">
                                    <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                                        {fetchedContent || 'No content could be extracted.'}
                                    </p>
                                </div>

                                <div className="text-xs text-gray-400 text-right">
                                    {fetchedContent.length.toLocaleString()} characters extracted
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between p-5 border-t bg-gray-50">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition"
                        >
                            Cancel
                        </button>

                        {step === 'preview' && (
                            <button
                                onClick={fetchUrlContent}
                                disabled={isLoading || !artifact.source_url}
                                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Fetching...
                                    </>
                                ) : (
                                    <>
                                        Fetch Content
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        )}

                        {step === 'content' && (
                            <button
                                onClick={handleCreateDraft}
                                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition flex items-center gap-2 font-medium"
                            >
                                <Sparkles size={16} />
                                Create Draft from This
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
