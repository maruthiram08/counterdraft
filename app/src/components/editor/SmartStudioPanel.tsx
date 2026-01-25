
import { useState, useEffect, useMemo } from "react";
import { Sparkles, RefreshCw, Download, Palette, ChevronLeft, ChevronRight, Layers } from "lucide-react";
import { calculateCarousel } from "@/lib/smart-engine/carousel";
import JSZip from "jszip";
import { saveAs } from "file-saver";

interface SmartStudioPanelProps {
    content: string;
    onDownload: (url: string) => void;
}

export function SmartStudioPanel({ content, onDownload }: SmartStudioPanelProps) {
    const [theme, setTheme] = useState("cosmic");
    const [mode, setMode] = useState<'single' | 'carousel'>('single');
    const [previewUrl, setPreviewUrl] = useState("");
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

    useEffect(() => {
        generatePreview();
    }, [text, theme, mode, currentSlideIndex]);

    const generatePreview = async () => {
        setIsLoading(true);
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

        const url = `/api/generate-image?text=${encodeURIComponent(textToRender)}&theme=${theme}&t=${Date.now()}`;
        setPreviewUrl(url);
        setIsLoading(false);
    };

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
                <div className="bg-gray-100 p-1 rounded-lg flex gap-1">
                    <button
                        onClick={() => { setMode('single'); setText(hook); }}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${mode === 'single' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Single Post
                    </button>
                    <button
                        onClick={() => { setMode('carousel'); setText(content); }}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-1.5 ${mode === 'carousel' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Layers size={14} />
                        Auto-Carousel
                    </button>
                </div>
            </div>

            {/* Live Preview Canvas */}
            <div className="flex-1 bg-gray-100 rounded-lg flex items-center justify-center p-4 relative overflow-hidden group min-h-[320px]">
                {isLoading && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
                        <Sparkles className="animate-spin text-purple-600" />
                    </div>
                )}

                {previewUrl && (
                    <img
                        src={previewUrl}
                        alt="Smart Preview"
                        className="max-h-[300px] w-auto shadow-2xl rounded-sm transition-transform duration-500"
                    />
                )}

                {/* Carousel Navigation */}
                {mode === 'carousel' && (
                    <>
                        <button
                            onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                            disabled={currentSlideIndex === 0}
                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow-lg hover:bg-white disabled:opacity-0 transition-all"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
                            disabled={currentSlideIndex === slides.length - 1}
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow-lg hover:bg-white disabled:opacity-0 transition-all"
                        >
                            <ChevronRight size={20} />
                        </button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                            Slide {currentSlideIndex + 1} / {slides.length}
                        </div>
                    </>
                )}

                {/* Remix Controls (Floating) - Only show in Single mode or corner */}
                <div className="absolute top-4 right-4 flex gap-2">
                    <button
                        onClick={() => setTheme(prev => prev === 'cosmic' ? 'minimal' : prev === 'minimal' ? 'neon' : 'cosmic')}
                        className="bg-white/90 backdrop-blur text-xs font-bold px-3 py-1.5 rounded-full shadow-lg hover:scale-105 transition-all flex items-center gap-1.5"
                    >
                        <Palette size={12} className="text-purple-600" />
                        Remix Vibe
                    </button>
                    {mode === 'single' && (
                        <button
                            onClick={handleShuffle}
                            disabled={extractedQuotes.length === 0}
                            className="bg-white/90 backdrop-blur text-xs font-bold px-3 py-1.5 rounded-full shadow-lg hover:scale-105 transition-all flex items-center gap-1.5 disabled:opacity-70"
                        >
                            <RefreshCw size={12} className={extractedQuotes.length === 0 ? "animate-spin text-gray-400" : "text-blue-600"} />
                            Shuffle
                        </button>
                    )}
                </div>
            </div>

            {/* Editor Controls */}
            <div className="mt-4 space-y-3">
                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                        {mode === 'single' ? 'Smart Text Content' : 'Full Carousel Source Text'}
                    </label>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full text-sm font-medium p-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-100 outline-none resize-none h-20"
                    />
                    <div className="flex justify-between items-center mt-1">
                        <p className="text-[10px] text-gray-400">{text.length} chars</p>
                        {mode === 'carousel' && <p className="text-[10px] text-purple-600 font-bold">{slides.length} Auto-Generated Slides</p>}
                    </div>
                </div>

                <button
                    onClick={handleDownload}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-200 transition-all"
                >
                    <Download size={18} />
                    {mode === 'carousel' ? `Download ${slides.length} Slides (ZIP)` : 'Download Image'}
                </button>
            </div>
        </div>
    );
}
