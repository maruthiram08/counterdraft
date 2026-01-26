"use client";


import { useState } from "react";
import { X, FileText, Instagram, Image as ImageIcon, Check, Hash, ExternalLink, Sparkles, Loader2, Zap, LayoutTemplate, Palette } from "lucide-react";
import { SmartStudioPanel } from "./SmartStudioPanel";

interface OptionChoice {
    value: string;
    label: string;
    description?: string;
}

interface PlatformOption {
    id: string;
    label: string;
    type: 'select' | 'radio' | 'text' | 'checkbox';
    choices?: OptionChoice[] | string[];
    placeholder?: string;
    defaultValue?: any;
    allowAutoGenerate?: boolean;
}

interface PlatformConfig {
    id: string;
    label: string;
    icon: any;
    colorClass: string;
    bgClass: string;
    textClass: string;
    description: string;
    options: PlatformOption[];
}

const PLATFORMS: PlatformConfig[] = [
    {
        id: 'medium',
        label: 'Medium Article',
        description: 'SEO-optimized drafts & structure',
        icon: FileText,
        colorClass: 'border-gray-900',
        bgClass: 'bg-gray-50',
        textClass: 'text-gray-900',
        options: [
            {
                id: 'length',
                label: 'Article Length',
                type: 'select',
                defaultValue: 'medium',
                choices: [
                    { value: 'short', label: 'Short (~400 words)' },
                    { value: 'medium', label: 'Standard (~800 words)' },
                    { value: 'long', label: 'Deep Dive (~1500 words)' }
                ]
            },
            {
                id: 'generateCover',
                label: 'Generate Cover Art',
                type: 'checkbox',
                defaultValue: true
            }
        ]
    },
    {
        id: 'instagram',
        label: 'Instagram Strategy',
        description: 'Captions, hashtags & carousel scripts',
        icon: Instagram,
        colorClass: 'border-pink-500',
        bgClass: 'bg-pink-50',
        textClass: 'text-pink-700',
        options: [
            {
                id: 'format',
                label: 'Post Format',
                type: 'radio',
                defaultValue: 'carousel',
                choices: [
                    { value: 'carousel', label: 'Carousel Script', description: 'Multi-slide text breakdown' },
                    { value: 'single', label: 'Caption Only', description: 'Powerful caption & hooks' }
                ]
            },
            {
                id: 'labels',
                label: 'Context Labels',
                type: 'text',
                placeholder: 'e.g. "Startup Advice", "Tech Trends"',
                defaultValue: '',
                allowAutoGenerate: true
            },
            {
                id: 'generateInfographic',
                label: 'Suggest Visuals',
                type: 'checkbox',
                defaultValue: true
            }
        ]
    },
    {
        id: 'smart_studio',
        label: 'Smart Studio',
        description: 'Instant ready-to-post visuals',
        icon: Zap,
        colorClass: 'border-purple-500',
        bgClass: 'bg-purple-50',
        textClass: 'text-purple-700',
        options: []
    }
];

const PLATFORM_GROUPS = [
    {
        title: "Strategy & Text",
        items: ['medium', 'instagram']
    },
    {
        title: "Visual Production",
        items: ['smart_studio']
    }
];

interface RepurposeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRepurpose: (platform: string, options: any) => Promise<any>;
    isProcessing: boolean;
    onDesign?: (platform: string, content: any) => void;
    sourceContent?: string;
}

export function RepurposeModal({ isOpen, onClose, onRepurpose, isProcessing, onDesign, sourceContent }: RepurposeModalProps) {
    const [selectedPlatformId, setSelectedPlatformId] = useState<string>('medium');
    const [optionsValues, setOptionsValues] = useState<Record<string, any>>({
        medium: { length: 'medium', generateCover: true },
        instagram: { format: 'carousel', labels: '', generateInfographic: true }
    });

    const [generatingField, setGeneratingField] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [resultData, setResultData] = useState<{ id: string; content: string; platform_metadata?: any; assets?: any[] } | null>(null);

    if (!isOpen) return null;

    const currentPlatform = PLATFORMS.find(p => p.id === selectedPlatformId)!;
    const currentValues = optionsValues[selectedPlatformId] || {};

    const updateOption = (key: string, value: any) => {
        setOptionsValues(prev => ({
            ...prev,
            [selectedPlatformId]: {
                ...prev[selectedPlatformId],
                [key]: value
            }
        }));
    };

    const handleAutoGenerate = async (fieldId: string) => {
        if (!sourceContent) return;
        setGeneratingField(fieldId);
        try {
            const res = await fetch('/api/content/suggest-tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: sourceContent })
            });
            const data = await res.json();
            if (data.tags && Array.isArray(data.tags)) {
                updateOption(fieldId, data.tags.join(' '));
            }
        } catch (e) {
            console.error("Auto-generate failed", e);
        } finally {
            setGeneratingField(null);
        }
    };

    const handleConfirm = async () => {
        try {
            const data = await onRepurpose(selectedPlatformId, currentValues);
            if (data && data.id) {
                setResultData(data);
                setIsSuccess(true);
            }
        } catch (e) {
            console.error("Repurpose failed in modal", e);
        }
    };

    const handleDesignClick = () => {
        // ... (Existing PPTX Logic preserved)
        if (selectedPlatformId === 'instagram' && resultData) {
            import('@/lib/pptx-generator').then(({ PptxGenerator }) => {
                const gen = new PptxGenerator();
                let slides: any[] = [];
                const metadata = (resultData as any).platform_metadata;

                if (metadata && Array.isArray(metadata.slides)) {
                    slides = metadata.slides.map((s: any) => ({
                        title: s.header || "Slide",
                        body: s.body || "",
                        type: 'content',
                        visualNotes: s.visualDescription
                    }));
                } else {
                    const content = resultData.content;
                    if (content) {
                        const parts = content.split('\n\n').filter((p: string) => p.trim().length > 0);
                        const title = parts[0]?.replace(/^#+\s*/, '') || "Untitled";
                        const bodyParts = parts.slice(1);

                        if (currentValues.format === 'carousel') {
                            bodyParts.forEach((part: string) => {
                                slides.push({ title: title, body: part, type: 'content' });
                            });
                        } else {
                            slides.push({ title: title, body: bodyParts.join('\n\n'), type: 'content' });
                        }
                    }
                }

                const assets = (resultData as any).assets || [];
                const coverImage = assets.find((a: any) => a.role === 'infographic' || a.role === 'cover');
                if (coverImage && slides.length > 0) slides[0].imageUrl = coverImage.url;
                if (slides.length === 0) slides.push({ title: "Draft", body: "No content generated.", type: 'cover' });

                gen.generateInstagramPost(slides);
                if (onDesign) onDesign(selectedPlatformId, resultData.content);
            });
        }
    };

    // --- SUCCESS VIEW (Modal Overlay on top of Redesigned Layout) ---
    if (isSuccess) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check size={32} className="text-green-600" />
                        </div>
                        <h2 className="font-serif text-2xl font-bold mb-2">Draft Created!</h2>
                        <p className="text-gray-500 mb-8">
                            Your content is ready.{selectedPlatformId === 'instagram' && " Export to Canva to design."}
                        </p>
                        <div className="space-y-3">
                            {selectedPlatformId === 'instagram' && (
                                <button onClick={handleDesignClick} className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:shadow-lg transition-all">
                                    <ImageIcon size={20} /> Download Design File
                                </button>
                            )}
                            <button onClick={() => resultData?.id ? window.location.href = `/workspace?draftId=${resultData.id}` : onClose()} className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                                <ExternalLink size={16} /> Open Draft
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-8">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-200">

                {/* LEFT SIDEBAR navigation */}
                <div className="w-[300px] bg-gray-50 border-r border-gray-200 flex flex-col shrink-0">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="font-serif text-xl font-bold text-gray-900">Repurpose</h2>
                        <p className="text-xs text-gray-500 mt-1">Transform content for social.</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-8">
                        {PLATFORM_GROUPS.map(group => (
                            <div key={group.title}>
                                <div className="px-2 mb-3">
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{group.title}</h3>
                                </div>
                                <div className="space-y-2">
                                    {group.items.map(pid => {
                                        const p = PLATFORMS.find(x => x.id === pid)!;
                                        const isSelected = selectedPlatformId === p.id;
                                        return (
                                            <button
                                                key={p.id}
                                                onClick={() => setSelectedPlatformId(p.id)}
                                                className={`w-full text-left p-3 rounded-xl flex items-start gap-3 transition-all duration-200 relative overflow-hidden group ${isSelected ? 'bg-white shadow-md ring-1 ring-gray-200/50' : 'hover:bg-gray-200/50'
                                                    }`}
                                            >
                                                {/* Active Indicator Line */}
                                                {isSelected && <div className={`absolute left-0 top-0 bottom-0 w-1 ${p.bgClass.replace('bg-', 'bg-').replace('50', '500')}`}></div>}

                                                <div className={`p-2 rounded-lg shrink-0 ${isSelected ? `${p.bgClass} ${p.textClass}` : 'bg-gray-100 text-gray-400 group-hover:text-gray-600'}`}>
                                                    <p.icon size={18} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                                        {p.label}
                                                    </div>
                                                    <div className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                                                        {p.description}
                                                    </div>
                                                    <div className="mt-2 flex gap-1">
                                                        {['smart_studio'].includes(p.id) ?
                                                            <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold tracking-wide border border-purple-200">VISUALS</span> :
                                                            <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-bold tracking-wide border border-gray-200">TEXT</span>
                                                        }
                                                    </div>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT CONTENT AREA */}
                <div className="flex-1 flex flex-col bg-white min-w-0">
                    {/* Header */}
                    <div className="h-16 border-b border-gray-100 flex items-center justify-between px-8 shrink-0 bg-white/80 backdrop-blur sticky top-0 z-10">
                        <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-md ${currentPlatform.bgClass} ${currentPlatform.textClass}`}>
                                <currentPlatform.icon size={18} />
                            </div>
                            <h2 className="font-bold text-gray-900 text-lg">{currentPlatform.label}</h2>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto p-8 bg-gray-50/10">
                        {selectedPlatformId === 'smart_studio' ? (
                            <div className="h-full flex flex-col">
                                <SmartStudioPanel content={sourceContent || ''} onDownload={() => setIsSuccess(true)} />
                            </div>
                        ) : (
                            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Dynamic Form Generation */}
                                {currentPlatform.options.map(opt => (
                                    <div key={opt.id} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                                        {/* ... (Keep existing form logic for select/radio/text/checkbox) ... */}
                                        {opt.type === 'select' && (
                                            <div>
                                                <label className="text-sm font-bold text-gray-900 mb-3 block flex items-center gap-2">
                                                    <LayoutTemplate size={14} className="text-gray-400" />
                                                    {opt.label}
                                                </label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {(opt.choices as OptionChoice[]).map((choice) => (
                                                        <button
                                                            key={choice.value}
                                                            onClick={() => updateOption(opt.id, choice.value)}
                                                            className={`flex flex-col items-center justify-center py-3 px-2 rounded-lg border transition-all ${currentValues[opt.id] === choice.value ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                                        >
                                                            <div className="font-medium text-sm">{choice.label.split('(')[0]}</div>
                                                            {choice.label.includes('(') && <div className="text-[10px] opacity-70 mt-0.5">{choice.label.split('(')[1].replace(')', '')}</div>}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {opt.type === 'radio' && (
                                            <div>
                                                <label className="text-sm font-bold text-gray-900 mb-3 block flex items-center gap-2">
                                                    <LayoutTemplate size={14} className="text-gray-400" />
                                                    {opt.label}
                                                </label>
                                                <div className="grid grid-cols-2 gap-4">
                                                    {(opt.choices as OptionChoice[]).map((choice) => (
                                                        <label key={choice.value} className={`cursor-pointer border-2 rounded-xl p-4 transition-all ${currentValues[opt.id] === choice.value ? `${currentPlatform.colorClass} ${currentPlatform.bgClass}` : 'border-gray-100 hover:border-gray-200'}`}>
                                                            <input
                                                                type="radio"
                                                                name={opt.id}
                                                                checked={currentValues[opt.id] === choice.value}
                                                                onChange={() => updateOption(opt.id, choice.value)}
                                                                className="hidden"
                                                            />
                                                            <div className="font-bold text-sm mb-1">{choice.label}</div>
                                                            <div className="text-xs text-gray-500 leading-snug">{choice.description}</div>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {opt.type === 'text' && (
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                                        <Hash size={14} className="text-gray-400" />
                                                        {opt.label}
                                                    </label>
                                                    {opt.allowAutoGenerate && sourceContent && (
                                                        <button
                                                            onClick={() => handleAutoGenerate(opt.id)}
                                                            disabled={generatingField === opt.id}
                                                            className="text-xs flex items-center gap-1.5 bg-purple-50 text-purple-700 px-2 py-1 rounded-md hover:bg-purple-100 transition-colors disabled:opacity-50"
                                                        >
                                                            {generatingField === opt.id ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                                                            Auto-Generate
                                                        </button>
                                                    )}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={currentValues[opt.id] || ''}
                                                    onChange={(e) => updateOption(opt.id, e.target.value)}
                                                    placeholder={opt.placeholder}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 text-sm font-medium transition-all"
                                                />
                                            </div>
                                        )}

                                        {opt.type === 'checkbox' && (
                                            <label className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                                                <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${currentValues[opt.id] ? 'bg-gray-900 border-gray-900 text-white' : 'border-gray-300 bg-white'}`}>
                                                    {currentValues[opt.id] && <Check size={14} strokeWidth={3} />}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={currentValues[opt.id]}
                                                    onChange={(e) => updateOption(opt.id, e.target.checked)}
                                                    className="hidden"
                                                />
                                                <div className="flex-1">
                                                    <span className="text-sm font-bold text-gray-900 block">{opt.label}</span>
                                                    <span className="text-xs text-gray-500">Includes AI suggestions</span>
                                                </div>
                                                <Palette size={20} className="text-gray-300" />
                                            </label>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer - Only for non-Smart Studio */}
                    {selectedPlatformId !== 'smart_studio' && (
                        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
                            <button onClick={onClose} className="px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Cancel</button>
                            <button
                                onClick={handleConfirm}
                                disabled={isProcessing}
                                className="px-8 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black disabled:opacity-50 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        Create {currentPlatform.label.split(' ')[0]} Draft
                                        <Sparkles size={16} className="text-yellow-300" />
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
