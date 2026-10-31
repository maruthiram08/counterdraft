
import { useState, useEffect, useMemo } from "react";
import { RefreshCw, Download, Palette, ChevronLeft, ChevronRight, Layers } from "lucide-react";
import { calculateCarousel } from "@/lib/smart-engine/carousel";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import Image from "next/image";
import { Spinner } from "@/components/shared/Loading";

interface SmartStudioPanelProps {
    content: string;
    onDownload: (url: string) => void;
}

export function SmartStudioPanel({ content, onDownload }: SmartStudioPanelProps) {
    const [theme, setTheme] = useState("cosmic");
    const [mode, setMode] = useState<'single' | 'carousel'>('single');
    const [isLoading, setIsLoading] = useState(false);

    // Extract a "Hook" from content automatically (First 20 words)
    const hook = content.split(' ').slice(0, 15).join(' ') + "...";
    const [text, setText] = useState(hook);

    // Semantic Shuffle Logic
    const [extractedQuotes, setExtractedQuotes] = useState<string[]>([]);
    const [quoteIndex, setQuoteIndex] = useState(0);

    // Carousel Logic
    const slides = useMemo(() => calculateCarousel(text, 150), [text]);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

    // Extract Quotes on Mount
    useEffect(() => {
        const fetchQuotes = async () => {
            try {
                const res = await fetch('/api/content/extract-quotes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content })
                });
                const data = await res.json();
                if (data.quotes && data.quotes.length > 0) {
                    setExtractedQuotes(data.quotes);
                }
            } catch (e) {
                console.error("Failed to extract quotes", e);
            }
        };
        if (content && content.length > 50) {
            fetchQuotes();
        }
    }, [content]);

    const previewUrl = useMemo(() => {
        let textToRender = text;

        if (mode === 'carousel') {
            // Ensure index is valid
            const safeIndex = Math.min(currentSlideIndex, slides.length - 1);
            const slide = slides[safeIndex] || slides[0];
            textToRender = slide.text;

            // Add visual cue for Outro
            if (slide.type === 'outro') textToRender = "👉 " + textToRender;
            if (slide.type === 'cover') textToRender = textToRender;
        }

        return `/api/generate-image?text=${encodeURIComponent(textToRender)}&theme=${theme}`;
    }, [text, theme, mode, currentSlideIndex, slides]);

    const handleDownload = async () => {
        if (mode === 'single') {
            try {
                const res = await fetch(previewUrl);
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `smart-post-${Date.now()}.png`;
                document.body.appendChild(a);
                a.click();
                onDownload(previewUrl);
            } catch (e) {
                console.error("Download failed", e);
            }
        } else {
            // Carousel Batch Download
            setIsLoading(true);
            const zip = new JSZip();
            const folder = zip.folder("carousel-slides");

            // Generate all slides
            const promises = slides.map(async (slide, i) => {
                let txt = slide.text;
                if (slide.type === 'outro') txt = "👉 " + txt;

                const url = `/api/generate-image?text=${encodeURIComponent(txt)}&theme=${theme}`;
                const res = await fetch(url);
                const blob = await res.blob();
                folder?.file(`slide-${i + 1}.png`, blob);
            });

            await Promise.all(promises);

            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `smart-carousel-${Date.now()}.zip`);
            setIsLoading(false);
            onDownload("carousel");
        }
    };

    const handleShuffle = () => {
        // Reset slide index when shuffling
        setCurrentSlideIndex(0);

        if (extractedQuotes.length > 0) {
            const nextIndex = (quoteIndex + 1) % extractedQuotes.length;
            setQuoteIndex(nextIndex);
            setText(extractedQuotes[nextIndex]);
        } else {
            const words = content.split(' ');
            const start = Math.floor(Math.random() * (words.length - 20));
            setText(words.slice(start, start + 20).join(' ') + "...");
        }
    };

    return (
        <div className="flex flex-col h-full min-h-[500px]">
            {/* Mode Toggle */}
            <div className="flex justify-center mb-4">
                <div className="bg-canvas shadow-well rounded-full p-1 flex gap-1">
                    <button
                        onClick={() => { setMode('single'); setText(hook); }}
                        className={`h-9 px-4 rounded-full text-sm font-medium transition-all ${mode === 'single' ? 'bg-surface shadow-raised text-ink' : 'text-ink-muted hover:text-ink'}`}
                    >
                        Single Post
                    </button>
                    <button
                        onClick={() => { setMode('carousel'); setText(content); }}
                        className={`h-9 px-4 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${mode === 'carousel' ? 'bg-surface shadow-raised text-ink' : 'text-ink-muted hover:text-ink'}`}
                    >
                        <Layers size={14} />
                        Auto-Carousel
                    </button>
                </div>
            </div>

            {/* Live Preview Canvas */}
            <div className="flex-1 bg-canvas shadow-pressed rounded-card flex items-center justify-center p-4 relative overflow-hidden group min-h-[320px]">
                {isLoading && (
                    <div className="absolute inset-0 bg-surface/50 backdrop-blur-sm z-10 flex items-center justify-center">
                        <Spinner size={24} className="text-ember-500" />
                    </div>
                )}

                {previewUrl && (
                    <Image
                        src={previewUrl}
                        alt="Smart Preview"
                        width={600}
                        height={300}
                        unoptimized
                        className="max-h-[300px] w-auto shadow-float rounded-tile transition-transform duration-500"
                    />
                )}

                {/* Carousel Navigation */}
                {mode === 'carousel' && (
                    <>
                        <button
                            onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                            disabled={currentSlideIndex === 0}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center bg-canvas shadow-raised text-ink-soft hover:text-ink active:shadow-pressed disabled:opacity-0 transition-all"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
                            disabled={currentSlideIndex === slides.length - 1}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center bg-canvas shadow-raised text-ink-soft hover:text-ink active:shadow-pressed disabled:opacity-0 transition-all"
                        >
                            <ChevronRight size={20} />
                        </button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-ink text-white text-xs font-medium h-7 px-3 flex items-center rounded-full">
                            Slide {currentSlideIndex + 1} / {slides.length}
                        </div>
                    </>
                )}

                {/* Remix Controls (Floating) - Only show in Single mode or corner */}
                <div className="absolute top-4 right-4 flex gap-2">
                    <button
                        onClick={() => setTheme(prev => prev === 'cosmic' ? 'minimal' : prev === 'minimal' ? 'neon' : 'cosmic')}
                        className="h-8 px-3 rounded-full bg-canvas text-ink text-xs font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all flex items-center gap-1.5"
                    >
                        <Palette size={12} className="text-ember-500" />
                        Remix Vibe
                    </button>
                    {mode === 'single' && (
                        <button
                            onClick={handleShuffle}
                            disabled={extractedQuotes.length === 0}
                            className="h-8 px-3 rounded-full bg-canvas text-ink text-xs font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all flex items-center gap-1.5 disabled:opacity-70"
                        >
                            {extractedQuotes.length === 0 ? <Spinner size={12} className="text-ink-muted" /> : <RefreshCw size={12} className="text-ember-500" />}
                            Shuffle
                        </button>
                    )}
                </div>
            </div>

            {/* Editor Controls */}
            <div className="mt-4 space-y-3">
                <div>
                    <label className="text-sm text-ink-muted mb-1.5 block">
                        {mode === 'single' ? 'Smart Text Content' : 'Full Carousel Source Text'}
                    </label>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full text-sm bg-canvas shadow-well rounded-2xl px-4 py-3 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 resize-none h-20"
                    />
                    <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-ink-muted">{text.length} chars</p>
                        {mode === 'carousel' && <p className="text-xs text-ember-600 font-medium">{slides.length} Auto-Generated Slides</p>}
                    </div>
                </div>

                <button
                    onClick={handleDownload}
                    className="w-full h-12 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all flex items-center justify-center gap-2"
                >
                    <Download size={18} />
                    {mode === 'carousel' ? `Download ${slides.length} Slides (ZIP)` : 'Download Image'}
                </button>
            </div>
        </div>
    );
}
