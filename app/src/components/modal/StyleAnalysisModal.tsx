"use client";

import { useState, useRef } from "react";
import { X, PenTool, ArrowRight, Wand2, CheckCircle, AlertCircle, Link as LinkIcon, Upload, FileText } from "lucide-react";
import { Loader, Spinner } from "@/components/shared/Loading";

interface StyleAnalysisResult {
    voice_tone: string;
    rules: string[];
    anti_patterns: string[];
}

interface StyleAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (analysis: StyleAnalysisResult) => void;
}

export function StyleAnalysisModal({ isOpen, onClose, onComplete }: StyleAnalysisModalProps) {
    const [step, setStep] = useState<'input' | 'analyzing' | 'result'>('input');
    const [samples, setSamples] = useState("");
    const [result, setResult] = useState<StyleAnalysisResult | null>(null);
    const [importMethod, setImportMethod] = useState<'text' | 'url' | 'file'>('text');
    const [urlInput, setUrlInput] = useState("");
    const [importLoading, setImportLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExtractUrl = async () => {
        if (!urlInput.trim()) return;

        const urls = urlInput.split('\n').map(u => u.trim()).filter(u => u.length > 0);

        if (urls.length > 25) {
            alert("Please limit to 25 URLs at a time.");
            return;
        }

        setImportLoading(true);
        let extractedCount = 0;
        let failures = 0;

        try {
            // Process sequentially or in small batches to show progress
            // Parallel might trigger rate limits on target sites
            const results = await Promise.allSettled(urls.map(async (url) => {
                const formData = new FormData();
                formData.append('type', 'url');
                formData.append('url', url);

                const res = await fetch('/api/utils/extract', {
                    method: 'POST',
                    body: formData
                });
                if (!res.ok) throw new Error(`Failed to fetch ${url}`);
                return res.json();
            }));

            const newTextParts: string[] = [];

            results.forEach((result, idx) => {
                if (result.status === 'fulfilled') {
                    const data = result.value;
                    if (data.text) {
                        newTextParts.push(`--- Source: ${urls[idx]} ---\n${data.text}`);
                        extractedCount++;
                    } else if (data.debug) {
                        console.warn(`Extraction failed for ${urls[idx]}:`, data.debug);
                        failures++;
                    } else {
                        failures++;
                    }
                } else {
                    console.error(`Fetch failed for ${urls[idx]}:`, result.reason);
                    failures++;
                }
            });

            if (extractedCount > 0) {
                setSamples(prev => prev + (prev ? "\n\n" : "") + newTextParts.join("\n\n"));
                setUrlInput(""); // Clear input on success
                if (failures > 0) {
                    alert(`Extracted ${extractedCount} URLs. ${failures} failed. Check console for details.`);
                } else {
                    alert(`Successfully extracted content from ${extractedCount} URLs!`);
                }
            } else {
                // Determine specific error if possible
                const firstResult = results[0];
                if (firstResult.status === 'fulfilled' && firstResult.value.debug) {
                    if (typeof firstResult.value.debug === 'string') {
                        throw new Error(`Extraction blocked: ${firstResult.value.debug}`);
                    } else {
                        throw new Error(`Extraction empty. HTML: ${firstResult.value.debug.htmlLength} chars, Text: ${firstResult.value.debug.textLength} chars.`);
                    }
                }
                throw new Error("No text found in any URL. Content might be blocked or client-side rendered.");
            }

        } catch (e: unknown) {
            console.error(e);
            alert(`Failed: ${e instanceof Error ? e.message : "Unknown error"}`);
        } finally {
            setImportLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportLoading(true);
        try {
            const formData = new FormData();
            formData.append('type', 'file');
            formData.append('file', file);

            const res = await fetch('/api/utils/extract', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (data.text) {
                setSamples(prev => prev + (prev ? "\n\n---\n\n" : "") + data.text);
                alert("File text extracted successfully!");
            } else {
                throw new Error("No text found in file");
            }
        } catch (e) {
            console.error(e);
            alert("Failed to extract text from file.");
        } finally {
            setImportLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleAnalyze = async () => {
        if (!samples.trim() || samples.length < 100) {
            alert("Please provide at least 100 characters of writing.");
            return;
        }

        setStep('analyzing');

        try {
            const res = await fetch('/api/user/style/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ samples: [samples] }),
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setResult(data);
            setStep('result');
        } catch (e) {
            console.error(e);
            alert("Failed to analyze style. Please try again.");
            setStep('input');
        }
    };

    const handleSave = () => {
        if (result) {
            onComplete(result);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-canvas rounded-card max-w-2xl w-full shadow-float overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 pt-6 md:px-8 md:pt-8 pb-2 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink flex items-center gap-2">
                            <Wand2 className="text-ember-500" size={20} />
                            Train Your Writing Style
                        </h2>
                        <p className="text-sm text-ink-soft mt-1">
                            {step === 'input' && "Teach the AI how you write."}
                            {step === 'analyzing' && "Analyzing your unique fingerprint..."}
                            {step === 'result' && "Here is what we found."}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center bg-canvas shadow-raised text-ink-soft hover:text-ink active:shadow-pressed transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 md:px-8 md:pb-8 flex-1 overflow-y-auto">

                    {step === 'input' && (
                        <div className="space-y-4">
                            <div className="bg-ember-50 p-4 rounded-tile shadow-raised text-sm text-ink-soft flex gap-3">
                                <PenTool className="shrink-0 mt-0.5 text-ember-500" size={16} />
                                <div>
                                    <strong className="font-medium text-ink">How this works:</strong> Provide 3-5 of your best posts, emails, or essays.
                                    The AI will extract your tone, sentence structure, and vocabulary patterns.
                                </div>
                            </div>

                            {/* Import Tabs */}
                            <div className="flex bg-canvas shadow-well p-1 rounded-full">
                                <button
                                    onClick={() => setImportMethod('text')}
                                    className={`flex-1 h-9 text-sm font-medium rounded-full flex items-center justify-center gap-2 transition-all ${importMethod === 'text' ? 'bg-surface shadow-raised text-ink' : 'text-ink-muted hover:text-ink'}`}
                                >
                                    <PenTool size={14} /> Paste Text
                                </button>
                                <button
                                    onClick={() => setImportMethod('url')}
                                    className={`flex-1 h-9 text-sm font-medium rounded-full flex items-center justify-center gap-2 transition-all ${importMethod === 'url' ? 'bg-surface shadow-raised text-ink' : 'text-ink-muted hover:text-ink'}`}
                                >
                                    <LinkIcon size={14} /> Import URL
                                </button>
                                <button
                                    onClick={() => setImportMethod('file')}
                                    className={`flex-1 h-9 text-sm font-medium rounded-full flex items-center justify-center gap-2 transition-all ${importMethod === 'file' ? 'bg-surface shadow-raised text-ink' : 'text-ink-muted hover:text-ink'}`}
                                >
                                    <Upload size={14} /> Upload File
                                </button>
                            </div>

                            {importMethod === 'url' && (
                                <div className="flex gap-2 animate-in fade-in slide-in-from-top-2 items-start">
                                    <textarea
                                        value={urlInput}
                                        onChange={(e) => setUrlInput(e.target.value)}
                                        placeholder={`https://your-blog.com/post-1\nhttps://your-blog.com/post-2\n(Up to 25 URLs)`}
                                        className="flex-1 bg-canvas shadow-well rounded-2xl px-4 py-3 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 text-sm min-h-[100px] resize-y"
                                    />
                                    <button
                                        onClick={handleExtractUrl}
                                        disabled={!urlInput.trim() || importLoading}
                                        className="h-12 px-5 rounded-full bg-ink text-white text-sm font-medium hover:bg-ink/90 active:shadow-pressed transition-all disabled:opacity-50 min-w-[100px] flex items-center justify-center"
                                    >
                                        {importLoading ? <Spinner size={16} /> : "Fetch All"}
                                    </button>
                                </div>
                            )}

                            {importMethod === 'file' && (
                                <div className="bg-canvas shadow-pressed rounded-card p-8 flex flex-col items-center justify-center text-center hover:text-ember-600 transition-all cursor-pointer animate-in fade-in slide-in-from-top-2" onClick={() => fileInputRef.current?.click()}>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept=".txt,.md,.pdf"
                                        onChange={handleFileUpload}
                                    />
                                    {importLoading ? (
                                        <Spinner size={32} className="text-ember-500 mb-2" />
                                    ) : (
                                        <FileText size={32} className="text-ember-500 mb-2" />
                                    )}
                                    <p className="text-sm font-medium text-ink">Click to upload document</p>
                                    <p className="text-xs text-ink-muted mt-1">Supports PDF, TXT, MD</p>
                                </div>
                            )}

                            <div className="relative">
                                <textarea
                                    value={samples}
                                    onChange={(e) => setSamples(e.target.value)}
                                    placeholder={importMethod === 'text' ? "Paste your writing samples here..." : "Extracted text will appear here..."}
                                    className="w-full h-64 bg-canvas shadow-well rounded-2xl px-4 py-3 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 resize-none font-mono text-sm leading-relaxed"
                                />
                                {samples.length > 0 && (
                                    <div className="absolute bottom-4 right-4 h-7 px-3 flex items-center text-xs font-medium text-ink-soft bg-surface shadow-raised rounded-full">
                                        {samples.length} chars
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={handleAnalyze}
                                    disabled={samples.length < 100}
                                    className="h-12 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    Analyze Style <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'analyzing' && (
                        <Loader className="!py-12" label="Studying how you write…" />
                    )}

                    {step === 'result' && result && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Tone Card */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-5 bg-surface rounded-tile shadow-card">
                                    <label className="text-sm text-ink-muted mb-1 block">Your Tone</label>
                                    <div className="text-2xl font-medium tracking-[-0.02em] text-ink">{result.voice_tone}</div>
                                </div>
                                <div className="p-5 bg-surface rounded-tile shadow-card">
                                    <label className="text-sm text-ink-muted mb-1 block">Complexity</label>
                                    <div className="text-2xl font-medium tracking-[-0.02em] text-ink">Medium-High</div>
                                </div>
                            </div>

                            {/* Rules */}
                            <div>
                                <h3 className="text-[17px] font-medium tracking-[-0.01em] text-ink mb-3 flex items-center gap-2">
                                    <CheckCircle size={16} className="text-sage-500" />
                                    Do&apos;s (Your Patterns)
                                </h3>
                                <div className="space-y-2">
                                    {result.rules?.map((rule: string, i: number) => (
                                        <div key={i} className="px-4 py-3 bg-surface shadow-card text-ink-soft text-sm rounded-2xl flex gap-3">
                                            <span className="text-sage-500 font-mono text-xs mt-0.5">{i + 1}.</span>
                                            {rule}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Anti-Patterns */}
                            <div>
                                <h3 className="text-[17px] font-medium tracking-[-0.01em] text-ink mb-3 flex items-center gap-2">
                                    <AlertCircle size={16} className="text-rose-500" />
                                    Don&apos;ts (Things you avoid)
                                </h3>
                                <div className="space-y-2">
                                    {result.anti_patterns?.map((rule: string, i: number) => (
                                        <div key={i} className="px-4 py-3 bg-surface shadow-card text-ink-soft text-sm rounded-2xl flex gap-3">
                                            <span className="text-rose-500 font-mono text-xs mt-0.5">{i + 1}.</span>
                                            {rule}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                className="w-full h-12 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all"
                            >
                                Save & Use This Style
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
