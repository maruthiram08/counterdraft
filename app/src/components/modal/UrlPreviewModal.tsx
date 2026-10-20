"use client";

import { useState, useEffect } from "react";
import { X, ExternalLink, ArrowRight, Loader2 } from "lucide-react";
import { AnimatedIcon } from "@/components/icons/AnimatedIcon";
import { RefreshCWIcon, SparklesIcon } from "@/components/icons/animated";

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
    }, [isOpen, artifact]);

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
                className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-40"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="bg-canvas rounded-card shadow-float w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 pt-6 pb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-canvas shadow-raised rounded-full flex items-center justify-center">
                                <ExternalLink className="text-ember-500" size={18} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink">URL Artifact</h2>
                                <p className="text-sm text-ink-soft">
                                    {step === 'preview' && 'Review before fetching'}
                                    {step === 'content' && 'Content extracted'}
                                    {step === 'ready' && 'Ready to create draft'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-canvas shadow-raised text-ink-soft hover:text-ink active:shadow-pressed transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Step Indicator */}
                    <div className="flex items-center gap-2 mx-6 my-2 px-2 py-1.5 bg-canvas shadow-well rounded-full w-fit">
                        <div className={`flex items-center gap-2 text-sm font-medium pr-2 ${step === 'preview' ? 'text-ink' : 'text-ink-muted'}`}>
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 'preview' ? 'bg-ember-500 text-white' : 'bg-canvas shadow-raised'}`}>1</span>
                            Preview
                        </div>
                        <ArrowRight size={16} className="text-ink-muted/60" />
                        <div className={`flex items-center gap-2 text-sm font-medium pr-2 ${step === 'content' ? 'text-ink' : 'text-ink-muted'}`}>
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 'content' ? 'bg-ember-500 text-white' : 'bg-canvas shadow-raised'}`}>2</span>
                            Content
                        </div>
                        <ArrowRight size={16} className="text-ink-muted/60" />
                        <div className={`flex items-center gap-2 text-sm font-medium pr-2 ${step === 'ready' ? 'text-ink' : 'text-ink-muted'}`}>
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 'ready' ? 'bg-ember-500 text-white' : 'bg-canvas shadow-raised'}`}>3</span>
                            Draft
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto px-6 py-4">

                        {/* Step 1: Preview */}
                        {step === 'preview' && (
                            <div className="space-y-4">
                                {/* URL Card */}
                                <div className="bg-surface rounded-tile shadow-card p-5">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-canvas shadow-well rounded-full flex items-center justify-center text-ember-500">
                                            <ExternalLink size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-[17px] font-medium tracking-[-0.01em] text-ink truncate">
                                                {artifact.source_title || 'Saved URL'}
                                            </h3>
                                            <a
                                                href={artifact.source_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-ember-600 hover:underline truncate block"
                                            >
                                                {getDomainFromUrl(artifact.source_url || '')}
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                {/* User Note */}
                                {artifact.user_note && (
                                    <div className="bg-surface rounded-tile shadow-card p-5">
                                        <p className="text-sm text-ink-muted mb-2">Your Note</p>
                                        <p className="text-ink-soft">{artifact.user_note}</p>
                                    </div>
                                )}

                                {/* Existing OCR Text Preview */}
                                {artifact.ocr_text && (
                                    <div className="bg-surface rounded-tile shadow-card p-5">
                                        <p className="text-sm text-ink-muted mb-2">Saved Content</p>
                                        <p className="text-ink-soft text-sm line-clamp-4">{artifact.ocr_text}</p>
                                    </div>
                                )}

                                {/* Error State */}
                                {error && (
                                    <div className="bg-rose-100 rounded-tile p-4 text-rose-700 text-sm">
                                        {error}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 2: Fetched Content */}
                        {step === 'content' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[17px] font-medium tracking-[-0.01em] text-ink">{fetchedTitle}</h3>
                                    <button
                                        onClick={fetchUrlContent}
                                        className="h-8 px-3 rounded-full bg-canvas shadow-raised text-xs font-medium text-ink hover:text-ember-600 active:shadow-pressed transition-all flex items-center gap-1 shrink-0"
                                    >
                                        <AnimatedIcon icon={RefreshCWIcon} size={14} />
                                        Refetch
                                    </button>
                                </div>

                                <div className="bg-surface rounded-tile shadow-card p-5 max-h-[400px] overflow-y-auto">
                                    <p className="text-ink-soft text-sm whitespace-pre-wrap leading-relaxed">
                                        {fetchedContent || 'No content could be extracted.'}
                                    </p>
                                </div>

                                <div className="text-xs text-ink-muted text-right">
                                    {fetchedContent.length.toLocaleString()} characters extracted
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-6 pb-6 pt-3">
                        <button
                            onClick={onClose}
                            className="h-10 px-4 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all"
                        >
                            Cancel
                        </button>

                        {step === 'preview' && (
                            <button
                                onClick={fetchUrlContent}
                                disabled={isLoading || !artifact.source_url}
                                className="h-10 px-4 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50 flex items-center gap-2"
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
                                className="h-10 px-4 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all flex items-center gap-2"
                            >
                                <AnimatedIcon icon={SparklesIcon} size={16} />
                                Create Draft from This
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
