"use client";

import { useState, useRef } from "react";
import { X, Loader2, PenTool, ArrowRight, Wand2, CheckCircle, AlertCircle, Link as LinkIcon, Upload, FileText } from "lucide-react";

interface StyleAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (analysis: any) => void;
}

export function StyleAnalysisModal({ isOpen, onClose, onComplete }: StyleAnalysisModalProps) {
    const [step, setStep] = useState<'input' | 'analyzing' | 'result'>('input');
    const [samples, setSamples] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
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

        } catch (e: any) {
            console.error(e);
            alert(`Failed: ${e.message}`);
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

        setLoading(true);
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
        } finally {
            setLoading(false);
        }
    };

    const handleSave = () => {
        onComplete(result);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-serif font-bold text-gray-900 flex items-center gap-2">
                            <Wand2 className="text-purple-600" size={20} />
                            Train Your Writing Style
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {step === 'input' && "Teach the AI how you write."}
                            {step === 'analyzing' && "Analyzing your unique fingerprint..."}
                            {step === 'result' && "Here is what we found."}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto">

                    {step === 'input' && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800 flex gap-3">
                                <PenTool className="shrink-0 mt-0.5" size={16} />
                                <div>
                                    <strong>How this works:</strong> Provide 3-5 of your best posts, emails, or essays.
                                    The AI will extract your tone, sentence structure, and vocabulary patterns.
                                </div>
                            </div>

                            {/* Import Tabs */}
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setImportMethod('text')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all ${importMethod === 'text' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    <PenTool size={14} /> Paste Text
                                </button>
                                <button
                                    onClick={() => setImportMethod('url')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all ${importMethod === 'url' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    <LinkIcon size={14} /> Import URL
                                </button>
                                <button
                                    onClick={() => setImportMethod('file')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all ${importMethod === 'file' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
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
                                        className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm min-h-[100px] resize-y"
                                    />
                                    <button
                                        onClick={handleExtractUrl}
                                        disabled={!urlInput.trim() || importLoading}
                                        className="px-4 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black disabled:opacity-50 min-w-[100px] flex items-center justify-center h-[100px]"
                                    >
                                        {importLoading ? <Loader2 size={16} className="animate-spin" /> : "Fetch All"}
                                    </button>
                                </div>
                            )}

                            {importMethod === 'file' && (
                                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer animate-in fade-in slide-in-from-top-2" onClick={() => fileInputRef.current?.click()}>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept=".txt,.md,.pdf"
                                        onChange={handleFileUpload}
                                    />
                                    {importLoading ? (
                                        <Loader2 size={32} className="text-purple-600 animate-spin mb-2" />
                                    ) : (
                                        <FileText size={32} className="text-gray-400 mb-2" />
                                    )}
                                    <p className="text-sm font-medium text-gray-900">Click to upload document</p>
                                    <p className="text-xs text-gray-500 mt-1">Supports PDF, TXT, MD</p>
                                </div>
                            )}

                            <div className="relative">
                                <textarea
                                    value={samples}
                                    onChange={(e) => setSamples(e.target.value)}
                                    placeholder={importMethod === 'text' ? "Paste your writing samples here..." : "Extracted text will appear here..."}
                                    className="w-full h-64 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none font-mono text-sm leading-relaxed"
                                />
                                {samples.length > 0 && (
                                    <div className="absolute bottom-4 right-4 text-xs font-medium text-gray-400 bg-white/80 px-2 py-1 rounded-md backdrop-blur-sm border border-gray-100">
                                        {samples.length} chars
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={handleAnalyze}
                                    disabled={samples.length < 100}
                                    className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    Analyze Style <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'analyzing' && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-6 text-center">
                            <div className="relative">
                                <div className="absolute inset-0 bg-purple-200 rounded-full animate-ping opacity-20"></div>
                                <div className="relative bg-white p-4 rounded-full shadow-lg border border-purple-100">
                                    <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-medium text-gray-900">Studying your syntax...</h3>
                                <div className="flex gap-1 justify-center">
                                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></span>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'result' && result && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Tone Card */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Your Tone</label>
                                    <div className="text-lg font-serif font-medium text-gray-900">{result.voice_tone}</div>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Complexity</label>
                                    <div className="text-lg font-serif font-medium text-gray-900">Medium-High</div>
                                </div>
                            </div>

                            {/* Rules */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <CheckCircle size={16} className="text-green-600" />
                                    Do's (Your Patterns)
                                </h3>
                                <div className="space-y-2">
                                    {result.rules?.map((rule: string, i: number) => (
                                        <div key={i} className="p-3 bg-green-50/50 border border-green-100 text-green-900 text-sm rounded-lg flex gap-3">
                                            <span className="text-green-400 font-mono text-xs mt-0.5">{i + 1}.</span>
                                            {rule}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Anti-Patterns */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <AlertCircle size={16} className="text-red-600" />
                                    Don'ts (Things you avoid)
                                </h3>
                                <div className="space-y-2">
                                    {result.anti_patterns?.map((rule: string, i: number) => (
                                        <div key={i} className="p-3 bg-red-50/50 border border-red-100 text-red-900 text-sm rounded-lg flex gap-3">
                                            <span className="text-red-400 font-mono text-xs mt-0.5">{i + 1}.</span>
                                            {rule}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                className="w-full py-4 bg-black text-white rounded-xl font-bold hover:bg-gray-900 transition-all shadow-lg hover:shadow-xl translate-y-0 hover:-translate-y-0.5"
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
