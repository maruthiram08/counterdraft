"use client";

import { useState } from "react";
import { X, FileText, Instagram, Image as ImageIcon, Check, Hash, ExternalLink, Sparkles, Loader2, Zap } from "lucide-react";
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
    options: PlatformOption[];
}

const PLATFORMS: PlatformConfig[] = [
    {
        id: 'medium',
        label: 'Medium Article',
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
        label: 'Instagram',
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
                    { value: 'carousel', label: 'Carousel', description: 'Multi-slide breakdown' },
                    { value: 'single', label: 'Single Image', description: 'Powerful statement' }
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
                label: 'Generate Visuals',
                type: 'checkbox',
                defaultValue: true
            }
        ]
    },
    {
        id: 'smart_studio',
        label: 'Smart Studio',
        icon: Zap,
        colorClass: 'border-purple-500',
        bgClass: 'bg-purple-50',
        textClass: 'text-purple-700',
        options: []
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

    // Auto-Generate State
    const [generatingField, setGeneratingField] = useState<string | null>(null);

    // Success State
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
                // Join tags with spaces
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
            // Strict check: we need data to proceed to design
            if (data && data.id) {
                setResultData(data);
                setIsSuccess(true);
            } else {
                console.error("Repurpose returned invalid data", data);
                // If it failed silently, the user is stuck. 
                // We assume MainEditor handles visible errors.
            }
        } catch (e) {
            console.error("Repurpose failed in modal", e);
        }
    };

    const handleDesignClick = () => {
        if (selectedPlatformId === 'instagram' && resultData) {
            // Generate PPTX
            import('@/lib/pptx-generator').then(({ PptxGenerator }) => {
                const gen = new PptxGenerator();
                let slides: any[] = [];

                // 1. Try to use structured slides from metadata (High Fidelity)
                const metadata = (resultData as any).platform_metadata;

                if (metadata && Array.isArray(metadata.slides)) {
                    slides = metadata.slides.map((s: any) => ({
                        title: s.header || "Slide",
                        body: s.body || "",
                        type: 'content',
                        visualNotes: s.visualDescription
                    }));
                } else {
                    // 2. Legacy Fallback
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

                // 3. Inject Assets (Images)
                const assets = (resultData as any).assets || [];
                const coverImage = assets.find((a: any) => a.role === 'infographic' || a.role === 'cover');

                // If found, attach to the first slide
                if (coverImage && slides.length > 0) {
                    slides[0].imageUrl = coverImage.url;
                }

                if (slides.length === 0) {
                    slides.push({ title: "Draft", body: "No content generated.", type: 'cover' });
                }

                gen.generateInstagramPost(slides);

                if (onDesign) onDesign(selectedPlatformId, resultData.content);
            });
        }
    };

    // --- RENDER SUCCESS VIEW ---
    if (isSuccess) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check size={32} className="text-green-600" />
                        </div>
                        <h2 className="font-serif text-2xl font-bold mb-2">Draft Created!</h2>
                        <p className="text-gray-500 mb-8">
                            Your content is ready.
                            {selectedPlatformId === 'instagram' && " Use the new Co-Creation Bridge to design it."}
                        </p>

                        <div className="space-y-3">
                            {selectedPlatformId === 'instagram' && (
                                <button
                                    onClick={handleDesignClick}
                                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:shadow-lg transition-all"
                                >
                                    <ImageIcon size={20} />
                                    Download Design File
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    if (resultData?.id) {
                                        window.location.href = `/workspace?draftId=${resultData.id}`;
                                    } else {
                                        onClose();
                                    }
                                }}
                                className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                            >
                                <ExternalLink size={16} />
                                Open Draft
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDER FORM VIEW ---
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="font-serif text-lg font-medium">Repurpose Content</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-900">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {/* Platform Selector */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        {PLATFORMS.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setSelectedPlatformId(p.id)}
                                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${selectedPlatformId === p.id
                                    ? `${p.colorClass} ${p.bgClass} ${p.textClass}`
                                    : 'border-gray-100 text-gray-500 hover:border-gray-200'
                                    }`}
                            >
                                <p.icon size={24} />
                                <span className="font-medium">{p.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Dynamic Options Form */}
                    <div className="space-y-5 min-h-[200px]">
                        {selectedPlatformId === 'smart_studio' ? (
                            <SmartStudioPanel content={sourceContent || ''} onDownload={() => setIsSuccess(true)} />
                        ) : (
                            currentPlatform.options.map(opt => (
                                <div key={opt.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {opt.type === 'select' && (
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 mb-2 block">{opt.label}</label>
                                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                                {(opt.choices as OptionChoice[]).map((choice) => (
                                                    <button
                                                        key={choice.value}
                                                        onClick={() => updateOption(opt.id, choice.value)}
                                                        className={`flex-1 capitalize text-sm py-1.5 rounded-md transition-all ${currentValues[opt.id] === choice.value ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'
                                                            }`}
                                                    >
                                                        {choice.label.split('(')[0]}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {opt.type === 'radio' && (
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 mb-2 block">{opt.label}</label>
                                            <div className="flex gap-4">
                                                {(opt.choices as OptionChoice[]).map((choice) => (
                                                    <label key={choice.value} className={`flex-1 cursor-pointer border-2 rounded-lg p-3 ${currentValues[opt.id] === choice.value ? `${currentPlatform.colorClass} ${currentPlatform.bgClass}` : 'border-gray-100'}`}>
                                                        <input
                                                            type="radio"
                                                            name={opt.id}
                                                            checked={currentValues[opt.id] === choice.value}
                                                            onChange={() => updateOption(opt.id, choice.value)}
                                                            className="hidden"
                                                        />
                                                        <div className="font-medium text-sm mb-1">{choice.label}</div>
                                                        <div className="text-xs text-gray-500">{choice.description}</div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {opt.type === 'text' && (
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-sm font-medium text-gray-700">{opt.label}</label>
                                                {opt.allowAutoGenerate && sourceContent && (
                                                    <button
                                                        onClick={() => handleAutoGenerate(opt.id)}
                                                        disabled={generatingField === opt.id}
                                                        className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium transition-colors disabled:opacity-50"
                                                    >
                                                        {generatingField === opt.id ? (
                                                            <Loader2 size={12} className="animate-spin" />
                                                        ) : (
                                                            <Sparkles size={12} />
                                                        )}
                                                        Auto-generate
                                                    </button>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={currentValues[opt.id] || ''}
                                                    onChange={(e) => updateOption(opt.id, e.target.value)}
                                                    placeholder={opt.placeholder}
                                                    className="w-full px-4 py-2 pl-9 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 text-sm"
                                                />
                                                <Hash size={14} className="absolute left-3 top-2.5 text-gray-400" />
                                            </div>
                                        </div>
                                    )}

                                    {opt.type === 'checkbox' && (
                                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${currentValues[opt.id] ? 'bg-gray-900 border-gray-900 text-white' : 'border-gray-300'}`}>
                                                {currentValues[opt.id] && <Check size={14} />}
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={currentValues[opt.id]}
                                                onChange={(e) => updateOption(opt.id, e.target.checked)}
                                                className="hidden"
                                            />
                                            <div className="flex-1">
                                                <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                                            </div>
                                            <ImageIcon size={18} className="text-gray-400" />
                                        </label>
                                    )}
                                </div>
                            )))}
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
                    {selectedPlatformId !== 'smart_studio' && (
                        <button
                            onClick={handleConfirm}
                            disabled={isProcessing}
                            className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                `Create ${currentPlatform.label.split(' ')[0]}`
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
