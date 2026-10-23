"use client";

import { useState } from "react";
import type { ComponentType } from "react";
import { X, FileText, Instagram, Image as ImageIcon, Check, Hash, ExternalLink, Sparkles, Loader2, Zap, LayoutTemplate, Palette } from "lucide-react";
import { SmartStudioPanel } from "./SmartStudioPanel";
import type { SlideContent } from "@/lib/pptx-generator";

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
    defaultValue?: string | boolean;
    allowAutoGenerate?: boolean;
}

interface PlatformConfig {
    id: string;
    label: string;
    icon: ComponentType<{ className?: string; size?: number | string }>;
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
        colorClass: 'ring-ink',
        bgClass: 'bg-surface-muted',
        textClass: 'text-ink',
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
        colorClass: 'ring-ember-500',
        bgClass: 'bg-ember-50',
        textClass: 'text-ember-700',
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
        colorClass: 'ring-dusk-500',
        bgClass: 'bg-dusk-100',
        textClass: 'text-dusk-700',
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
    onRepurpose: (platform: string, options: Record<string, string | boolean>) => Promise<RepurposeResult | null>;
    isProcessing: boolean;
    onDesign?: (platform: string, content: string) => void;
    sourceContent?: string;
}

type InstagramSlideData = {
    header?: string;
    body?: string;
    visualDescription?: string;
};

type RepurposeAsset = {
    role?: string;
    url?: string;
};

type RepurposeResult = {
    id: string;
    content: string;
    platform_metadata?: { slides?: InstagramSlideData[] };
    assets?: RepurposeAsset[];
};

export function RepurposeModal({ isOpen, onClose, onRepurpose, isProcessing, onDesign, sourceContent }: RepurposeModalProps) {
    const [selectedPlatformId, setSelectedPlatformId] = useState<string>('medium');
    const [optionsValues, setOptionsValues] = useState<Record<string, Record<string, string | boolean>>>({
        medium: { length: 'medium', generateCover: true },
        instagram: { format: 'carousel', labels: '', generateInfographic: true }
    });

    const [generatingField, setGeneratingField] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [resultData, setResultData] = useState<RepurposeResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const currentPlatform = PLATFORMS.find(p => p.id === selectedPlatformId)!;
    const currentValues = optionsValues[selectedPlatformId] || {};

    const updateOption = (key: string, value: string | boolean) => {
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
        setError(null);
        try {
            const data = await onRepurpose(selectedPlatformId, currentValues);
            if (data && data.id) {
                setResultData(data);
                setIsSuccess(true);
            } else {
                setError("Couldn't create the draft. Please try again.");
            }
        } catch (e) {
            console.error("Repurpose failed in modal", e);
            setError(e instanceof Error ? e.message : "Couldn't create the draft. Please try again.");
        }
    };

    const handleDesignClick = () => {
        // ... (Existing PPTX Logic preserved)
        if (selectedPlatformId === 'instagram' && resultData) {
            import('@/lib/pptx-generator').then(({ PptxGenerator }) => {
                const gen = new PptxGenerator();
                const slides: SlideContent[] = [];
                const metadata = resultData.platform_metadata;

                if (metadata && Array.isArray(metadata.slides)) {
                    const mapped = metadata.slides.map((s) => ({
                        title: s.header || "Slide",
                        body: s.body || "",
                        type: 'content' as const,
                        visualNotes: s.visualDescription
                    }));
                    slides.push(...mapped);
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

                const assets = resultData.assets || [];
                const coverImage = assets.find((a) => a.role === 'infographic' || a.role === 'cover');
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
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4">
                <div className="bg-surface rounded-card shadow-float w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check size={32} className="text-sage-700" />
                        </div>
                        <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-2">Draft Created!</h2>
                        <p className="text-ink-soft mb-8">
                            Your content is ready.{selectedPlatformId === 'instagram' && " Export to Canva to design."}
                        </p>
                        <div className="space-y-3">
                            {selectedPlatformId === 'instagram' && (
                                <button onClick={handleDesignClick} className="w-full h-12 px-5 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all flex items-center justify-center gap-2">
                                    <ImageIcon size={20} /> Download Design File
                                </button>
                            )}
                            <button onClick={() => resultData?.id ? window.location.href = `/workspace?draftId=${resultData.id}` : onClose()} className="w-full h-12 px-5 rounded-full bg-canvas text-ink text-sm font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all flex items-center justify-center gap-2">
                                <ExternalLink size={16} /> Open Draft
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm p-4 md:p-8">
            <div className="bg-canvas rounded-card shadow-float w-full max-w-6xl h-[90vh] flex overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* LEFT SIDEBAR navigation */}
                <div className="w-[300px] bg-canvas flex flex-col shrink-0">
                    <div className="px-6 pt-8 pb-2">
                        <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink">Repurpose</h2>
                        <p className="text-sm text-ink-soft mt-1">Transform content for social.</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {PLATFORM_GROUPS.map(group => (
                            <div key={group.title}>
                                <div className="px-2 mb-3">
                                    <h3 className="text-sm text-ink-muted">{group.title}</h3>
                                </div>
                                <div className="space-y-3">
                                    {group.items.map(pid => {
                                        const p = PLATFORMS.find(x => x.id === pid)!;
                                        const isSelected = selectedPlatformId === p.id;
                                        return (
                                            <button
                                                key={p.id}
                                                onClick={() => setSelectedPlatformId(p.id)}
                                                className={`w-full text-left p-4 rounded-tile flex items-start gap-3 transition-all duration-200 relative overflow-hidden group ${isSelected ? 'bg-canvas shadow-pressed' : 'bg-canvas shadow-raised hover:shadow-float'
                                                    }`}
                                            >
                                                {/* Active Indicator Line */}
                                                {isSelected && <div className={`absolute left-0 top-0 bottom-0 w-1 bg-ember-500`}></div>}

                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isSelected ? `${p.bgClass} ${p.textClass}` : 'bg-canvas shadow-well text-ink-muted group-hover:text-ink'}`}>
                                                    <p.icon size={18} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-medium text-sm tracking-[-0.01em] text-ink flex items-center gap-2">
                                                        {p.label}
                                                    </div>
                                                    <div className="text-xs text-ink-soft mt-0.5 leading-snug">
                                                        {p.description}
                                                    </div>
                                                    <div className="mt-2 flex gap-1">
                                                        {['smart_studio'].includes(p.id) ?
                                                            <span className="h-6 px-2.5 inline-block leading-6 rounded-full bg-dusk-100 text-dusk-700 text-[11px] font-medium lowercase first-letter:uppercase">VISUALS</span> :
                                                            <span className="h-6 px-2.5 inline-block leading-6 rounded-full bg-canvas shadow-well text-ink-soft text-[11px] font-medium lowercase first-letter:uppercase">TEXT</span>
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
                <div className="flex-1 flex flex-col bg-canvas min-w-0">
                    {/* Header */}
                    <div className="h-20 flex items-center justify-between px-8 pt-4 shrink-0 bg-canvas sticky top-0 z-10">
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${currentPlatform.bgClass} ${currentPlatform.textClass}`}>
                                <currentPlatform.icon size={18} />
                            </div>
                            <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink">{currentPlatform.label}</h2>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-canvas shadow-raised text-ink-soft hover:text-ink active:shadow-pressed transition-all">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-8">
                        {selectedPlatformId === 'smart_studio' ? (
                            <div className="h-full flex flex-col">
                                <SmartStudioPanel content={sourceContent || ''} onDownload={() => setIsSuccess(true)} />
                            </div>
                        ) : (
                            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Dynamic Form Generation */}
                                {currentPlatform.options.map(opt => (
                                    <div key={opt.id} className="bg-surface p-6 rounded-card shadow-card">
                                        {/* ... (Keep existing form logic for select/radio/text/checkbox) ... */}
                                        {opt.type === 'select' && (
                                            <div>
                                                <label className="text-sm font-medium text-ink mb-3 flex items-center gap-2">
                                                    <LayoutTemplate size={14} className="text-ember-500" />
                                                    {opt.label}
                                                </label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {(opt.choices as OptionChoice[]).map((choice) => (
                                                        <button
                                                            key={choice.value}
                                                            onClick={() => updateOption(opt.id, choice.value)}
                                                            className={`flex flex-col items-center justify-center py-3 px-2 rounded-2xl transition-all ${currentValues[opt.id] === choice.value ? 'bg-ink text-white' : 'bg-canvas shadow-well text-ink-soft hover:text-ink'}`}
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
                                                <label className="text-sm font-medium text-ink mb-3 flex items-center gap-2">
                                                    <LayoutTemplate size={14} className="text-ember-500" />
                                                    {opt.label}
                                                </label>
                                                <div className="grid grid-cols-2 gap-4">
                                                    {(opt.choices as OptionChoice[]).map((choice) => (
                                                        <label key={choice.value} className={`cursor-pointer rounded-tile p-4 transition-all ${currentValues[opt.id] === choice.value ? `ring-2 ${currentPlatform.colorClass} ${currentPlatform.bgClass}` : 'bg-canvas shadow-well hover:text-ink'}`}>
                                                            <input
                                                                type="radio"
                                                                name={opt.id}
                                                                checked={currentValues[opt.id] === choice.value}
                                                                onChange={() => updateOption(opt.id, choice.value)}
                                                                className="hidden"
                                                            />
                                                            <div className="font-medium text-sm text-ink mb-1">{choice.label}</div>
                                                            <div className="text-xs text-ink-soft leading-snug">{choice.description}</div>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {opt.type === 'text' && (
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="text-sm font-medium text-ink flex items-center gap-2">
                                                        <Hash size={14} className="text-ember-500" />
                                                        {opt.label}
                                                    </label>
                                                    {opt.allowAutoGenerate && sourceContent && (
                                                        <button
                                                            onClick={() => handleAutoGenerate(opt.id)}
                                                            disabled={generatingField === opt.id}
                                                            className="h-8 px-3 text-xs font-medium flex items-center gap-1.5 rounded-full bg-canvas shadow-raised text-ink hover:text-ember-600 active:shadow-pressed transition-all disabled:opacity-50"
                                                        >
                                                            {generatingField === opt.id ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                                                            Auto-Generate
                                                        </button>
                                                    )}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={(currentValues[opt.id] as string) || ''}
                                                    onChange={(e) => updateOption(opt.id, e.target.value)}
                                                    placeholder={opt.placeholder}
                                                    className="w-full bg-canvas shadow-well rounded-2xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 transition-all"
                                                />
                                            </div>
                                        )}

                                        {opt.type === 'checkbox' && (
                                            <label className="flex items-center gap-4 p-4 bg-canvas shadow-well rounded-tile cursor-pointer transition-all">
                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${currentValues[opt.id] ? 'bg-ember-500 text-white shadow-ember' : 'bg-surface shadow-raised'}`}>
                                                    {currentValues[opt.id] && <Check size={14} strokeWidth={3} />}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={(currentValues[opt.id] as boolean) || false}
                                                    onChange={(e) => updateOption(opt.id, e.target.checked)}
                                                    className="hidden"
                                                />
                                                <div className="flex-1">
                                                    <span className="text-sm font-medium text-ink block">{opt.label}</span>
                                                    <span className="text-xs text-ink-soft">Includes AI suggestions</span>
                                                </div>
                                                <Palette size={20} className="text-ink-muted" />
                                            </label>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer - Only for non-Smart Studio */}
                    {selectedPlatformId !== 'smart_studio' && (
                        <div className="px-6 pb-6 pt-2 md:px-8 flex items-center justify-end gap-3 shrink-0">
                            {error && (
                                <p role="alert" className="mr-auto text-sm text-ember-700">{error}</p>
                            )}
                            <button onClick={onClose} className="h-12 px-5 rounded-full text-sm font-medium text-ink-soft hover:text-ink transition-colors">Cancel</button>
                            <button
                                onClick={handleConfirm}
                                disabled={isProcessing}
                                className="h-12 px-6 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        Create {currentPlatform.label.split(' ')[0]} Draft
                                        <Sparkles size={16} className="text-white" />
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
