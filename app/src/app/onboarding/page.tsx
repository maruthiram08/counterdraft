"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { BeliefExtractionResult } from "@/types";
import { ArrowRight, Upload, FileText, Zap, Check, Loader2 } from "lucide-react";

type Step = 'screening' | 'ingest' | 'analyzing' | 'complete';

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>('screening');
    const [loading, setLoading] = useState(false);

    // Ingest State
    const [text, setText] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Analysis State
    const [analysisResult, setAnalysisResult] = useState<BeliefExtractionResult | null>(null);

    // --- Actions ---

    const handleSkip = async () => {
        setLoading(true);
        try {
            await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ onboarding_completed: true }),
            });
            router.push('/workspace');
        } catch (e) {
            console.error("Skip failed", e);
            setLoading(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const runIngest = async () => {
        if (!text && files.length === 0) return;
        setStep('analyzing');

        // Combined content
        let fullContent = text;

        // Read files (Client Side)
        for (const file of files) {
            const content = await file.text(); // Browser File API
            fullContent += `\n\n--- Source: ${file.name} ---\n${content}`;
        }

        try {
            const res = await fetch("/api/ingest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: fullContent,
                    source: "onboarding_upload",
                    isInspiration: false,
                }),
            });

            if (!res.ok) throw new Error("Ingest failed");

            const data = await res.json();
            setAnalysisResult(data.debug); // Assuming debug contains the beliefs for display

            // Mark complete in background
            await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ onboarding_completed: true }),
            });

            setTimeout(() => setStep('complete'), 1500);

        } catch (e) {
            console.error("Analysis failed", e);
            // Even if fail, we let them through? Or show error?
            // Let's show error logic or just push through to workspace with empty state?
            // Showing error is better UX
            alert("Analysis failed, but you can still enter.");
            handleSkip();
        }
    };

    return (
        <div className="min-h-screen bg-canvas flex items-center justify-center p-4 md:p-6 font-sans text-ink">
            <div className="w-full max-w-2xl animate-fade-in">

                {/* --- Step 1: Screening --- */}
                {step === 'screening' && (
                    <div className="space-y-8">
                        <div className="text-center space-y-4">
                            <h1 className="text-4xl md:text-[56px] md:leading-[1.05] font-medium tracking-[-0.03em] text-ink">How do you want to start?</h1>
                            <p className="text-ink-soft text-lg">We can build your Strategic Brain instantly if you have existing work.</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <button
                                onClick={() => setStep('ingest')}
                                className="group relative p-6 md:p-8 rounded-card bg-surface shadow-card hover:shadow-float hover:-translate-y-0.5 transition-all text-left"
                            >
                                <div className="w-12 h-12 bg-canvas shadow-raised text-ember-500 rounded-full flex items-center justify-center mb-6 group-hover:bg-ink group-hover:text-white transition-colors">
                                    <FileText size={24} />
                                </div>
                                <h3 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-2">Import my Context</h3>
                                <p className="text-ink-soft text-sm leading-relaxed">
                                    I have articles, essays, or notes I can paste/upload to extract my beliefs.
                                </p>
                            </button>

                            <button
                                onClick={handleSkip}
                                className="group relative p-6 md:p-8 rounded-card bg-surface shadow-card hover:shadow-float hover:-translate-y-0.5 transition-all text-left"
                            >
                                <div className="w-12 h-12 bg-canvas shadow-raised text-ember-500 rounded-full flex items-center justify-center mb-6 group-hover:bg-ember-500 group-hover:text-white transition-colors">
                                    <Zap size={24} />
                                </div>
                                {loading ? (
                                    <Loader2 className="animate-spin text-ink-muted" />
                                ) : (
                                    <>
                                        <h3 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-2">Start Fresh</h3>
                                        <p className="text-ink-soft text-sm leading-relaxed">
                                            I want to jump straight into the editor and build from scratch.
                                        </p>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* --- Step 2: Ingest --- */}
                {step === 'ingest' && (
                    <div className="animate-slide-up bg-surface p-6 md:p-8 rounded-card shadow-card">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-1">Upload your brain.</h2>
                                <p className="text-ink-soft text-sm">Paste text or upload .txt/.md files.</p>
                            </div>
                            <button onClick={handleSkip} className="h-10 px-4 rounded-full text-sm font-medium text-ink-muted hover:text-ink active:shadow-pressed transition-all">
                                Skip
                            </button>
                        </div>

                        <div className="space-y-4 mb-8">
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Paste your best essays, LinkedIn posts, or manifestos here..."
                                className="w-full h-48 bg-canvas shadow-well rounded-2xl px-4 py-3 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 resize-none text-sm font-mono leading-relaxed"
                            />

                            <div className="flex items-center gap-4">
                                <div className="h-px bg-line flex-1"></div>
                                <span className="text-sm text-ink-muted">OR</span>
                                <div className="h-px bg-line flex-1"></div>
                            </div>

                            <input
                                type="file"
                                accept=".txt,.md"
                                multiple
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-14 rounded-full bg-canvas shadow-raised active:shadow-pressed hover:text-ink transition-all flex items-center justify-center gap-2 text-ink-soft text-sm font-medium"
                            >
                                <Upload size={18} />
                                {files.length > 0 ? `${files.length} file(s) selected` : "Upload .txt or .md files"}
                            </button>
                        </div>

                        <button
                            onClick={runIngest}
                            disabled={!text && files.length === 0}
                            className="w-full h-12 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            Analyze & Extract
                            <ArrowRight size={18} />
                        </button>
                    </div>
                )}

                {/* --- Step 3: Analyzing --- */}
                {step === 'analyzing' && (
                    <div className="text-center py-20 animate-fade-in">
                        <div className="relative w-20 h-20 mx-auto mb-8">
                            <div className="absolute inset-0 border-4 border-line rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-ember-500 rounded-full border-t-transparent animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Zap className="text-ember-500 fill-ember-500" size={24} />
                            </div>
                        </div>
                        <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-2">Deconstructing your expertise...</h2>
                        <p className="text-ink-soft">Extracting core beliefs and strategic tensions.</p>
                    </div>
                )}

                {/* --- Step 4: Complete --- */}
                {step === 'complete' && (
                    <div className="animate-slide-up bg-surface p-6 md:p-8 rounded-card shadow-card text-center">
                        <div className="w-16 h-16 bg-sage-100 text-sage-700 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check size={32} />
                        </div>
                        <h2 className="text-3xl font-medium tracking-[-0.03em] text-ink mb-4">You&apos;re ready.</h2>
                        <p className="text-ink-soft mb-8 max-w-md mx-auto">
                            We&apos;ve extracted {analysisResult?.coreBeliefs?.length || 'several'} potential beliefs from your work.
                            Review them in your workspace.
                        </p>

                        <button
                            onClick={handleSkip} // Re-use handleSkip to redirect since it pushes to workspace
                            className="w-full h-12 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all"
                        >
                            Enter Command Center
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
