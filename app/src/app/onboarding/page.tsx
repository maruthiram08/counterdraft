"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText } from "lucide-react";

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState<'intro' | 'paste' | 'analyzing'>('intro');
    const [content, setContent] = useState("");
    const [analysisText, setAnalysisText] = useState("Reading your work...");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleStart = () => setStep('paste');

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (text) {
                setContent((prev) => prev ? `${prev}\n\n---\n\n${text}` : text);
            }
        };
        reader.readAsText(file);
    };

    const handleAnalyze = async () => {
        if (!content.trim()) return;
        setStep('analyzing');

        try {
            setAnalysisText("Sending to ingestion engine...");

            // Call the ingestion API
            const response = await fetch('/api/ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    source: 'user_upload',
                    isInspiration: false
                }),
            });

            if (!response.ok) {
                throw new Error('Ingestion failed');
            }

            // Simulate the analysis steps purely for UI feedback
            // In a real async job system, we would poll for status here
            const sequence = [
                { text: "Reading your work...", delay: 0 },
                { text: "Extracting core beliefs...", delay: 1500 },
                { text: "Identifying contradictions...", delay: 3000 },
                { text: "Mapping the belief graph...", delay: 4500 },
            ];

            sequence.forEach(({ text, delay }) => {
                setTimeout(() => setAnalysisText(text), delay);
            });

            setTimeout(() => {
                router.push('/workspace');
            }, 6000);

        } catch (error) {
            console.error("Analysis failed:", error);
            setAnalysisText("Something went wrong. Please try again.");
            // Ideally reset step after a delay or show error UI
            setTimeout(() => setStep('paste'), 2000);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] p-6">

            {/* STEP 1: INTRO */}
            {step === 'intro' && (
                <div className="max-w-2xl text-center animate-fade-in">
                    <h1 className="text-4xl font-serif mb-6">
                        This is a place for serious thinking.
                    </h1>
                    <p className="text-xl text-[var(--text-muted)] mb-12">
                        Counterdraft isn't for generating content. It's for understanding what you already believe.
                        <br />
                        We need raw material to work with.
                    </p>
                    <button onClick={handleStart} className="btn btn-primary px-8 py-4 text-lg">
                        I understand. Let's begin.
                    </button>
                </div>
            )}

            {/* STEP 2: PASTE */}
            {step === 'paste' && (
                <div className="w-full max-w-3xl animate-fade-in">
                    <div className="mb-8">
                        <h2 className="text-2xl font-serif mb-2">What have you written recently?</h2>
                        <p className="text-[var(--text-muted)]">
                            Paste 3-5 recent LinkedIn posts, essays, or notes. Or upload markdown files.
                        </p>
                    </div>

                    <div className="relative mb-6">
                        <textarea
                            className="w-full h-[400px] p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] focus:ring-2 ring-[var(--accent)] outline-none text-lg resize-none font-mono text-sm leading-relaxed"
                            placeholder="Paste your texts here..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            autoFocus
                        />

                        {/* File Upload Trigger */}
                        <div className="absolute bottom-4 right-4">
                            <input
                                type="file"
                                accept=".md,.txt"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="btn btn-secondary text-xs py-2 bg-white/90 backdrop-blur"
                            >
                                <Upload size={14} /> Upload .md / .txt
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-between items-center">
                        <button onClick={() => setStep('intro')} className="btn btn-ghost">
                            Back
                        </button>
                        <button
                            onClick={handleAnalyze}
                            disabled={!content.trim()}
                            className="btn btn-primary px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Analyze my thinking
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: ANALYZING */}
            {step === 'analyzing' && (
                <div className="text-center animate-fade-in">
                    <div className="spinner w-12 h-12 mx-auto mb-8 border-4 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
                    <h3 className="text-2xl font-medium mb-2">{analysisText}</h3>
                    <p className="text-[var(--text-muted)]">This usually takes a few seconds.</p>
                </div>
            )}

        </div>
    );
}
