import { useState, useEffect } from "react";
import { BrainMetadata, Outcome, Stance, ConfidenceLevel, PostFormat } from "@/types";
import { Target, Scale, Users, CheckCircle, AlertCircle, HelpCircle, Info, Edit2, Check, X as CloseIcon, Layout, ChevronRight } from "lucide-react";

// Accept a generic item with either snake_case or camelCase brain metadata
interface BrainHeaderPanelProps {
    item: {
        brain_metadata?: BrainMetadata;
        brainMetadata?: BrainMetadata;
        deepDive?: { research: string[]; insights?: string[] };
        deep_dive?: { research: string[]; insights?: string[] };
    };
    onUpdate?: (metadata: BrainMetadata) => void;
}

// Local evaluator 
function evaluateConfidence(meta: BrainMetadata | undefined, hasResearch: boolean): { score: number; label: string; missing: string[] } {
    if (!meta) return { score: 0, label: "Vague Strategy", missing: ["No Strategy Data"] };

    let score = 0;
    const missing: string[] = [];

    // Audience is the heaviest weight (Fundamental)
    if (meta.audience?.role && meta.audience?.pain) score += 35;
    else missing.push("Who are you targetting? (Audience)");

    // Goal (Outcome)
    if (meta.outcome) score += 20;
    else missing.push("What's the goal? (Goal)");

    // Format (Structure)
    if (meta.format) score += 20;
    else missing.push("Shape of post (Format)");

    // Stance (Persuasiveness)
    if (meta.stance) score += 15;
    else missing.push("Editorial edge (Stance)");

    // Research Depth
    if (hasResearch) score += 10;
    else missing.push("Broad research foundational facts");

    let label = "Vague Strategy";
    if (score >= 85) label = "Precise";
    else if (score >= 60) label = "Sharpening";

    return { score, label, missing };
}

function getConfidenceLevel(score: number): 'low' | 'medium' | 'high' {
    if (score >= 80) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
}

const FORMAT_DATA: Record<PostFormat, { label: string, description: string, skeleton: string }> = {
    thought_leadership: {
        label: "Thought Leadership",
        description: "Visionary ideas that challenge status quo and build authority.",
        skeleton: "Hook → The Tension → The Shift → Proof/Logic → Visionary CTA"
    },
    personal_story: {
        label: "Personal Story",
        description: "Relatable experiences that build trust and connection.",
        skeleton: "Vulnerable Hook → The Struggle → The Lesson → Transformation → Connection CTA"
    },
    tactical_guide: {
        label: "Tactical Guide",
        description: "Actionable, step-by-step advice to solve a specific problem.",
        skeleton: "Problem Hook → Why it's hard → Step-by-Step Solution → Quick Win → Action CTA"
    },
    listicle: {
        label: "Listicle",
        description: "Curated points or resources for high engagement and readability.",
        skeleton: "Benefit Hook → Numbered Items (1-5) → Summary → Engagement CTA"
    }
};

const DEFAULT_METADATA: BrainMetadata = {
    outcome: 'authority' as Outcome,
    confidence: 'low' as ConfidenceLevel,
    format: 'thought_leadership' as PostFormat,
} as BrainMetadata;

export function BrainHeaderPanel({ item, onUpdate }: BrainHeaderPanelProps) {
    const [editingField, setEditingField] = useState<'outcome' | 'stance' | 'audience' | 'format' | null>(null);
    const [localMetadata, setLocalMetadata] = useState<Partial<BrainMetadata>>({});
    const [showFormatHelp, setShowFormatHelp] = useState(false);

    // Derived metadata
    const metadata = item.brain_metadata || item.brainMetadata || DEFAULT_METADATA;

    useEffect(() => {
        setLocalMetadata(metadata);
    }, [item.brain_metadata, item.brainMetadata]);

    const hasResearch = !!(item.deep_dive?.research?.length || item.deepDive?.research?.length);

    const handleSave = () => {
        if (onUpdate) {
            onUpdate({ ...metadata, ...localMetadata } as BrainMetadata);
        }
        setEditingField(null);
    };

    const handleCancel = () => {
        setLocalMetadata(metadata);
        setEditingField(null);
    };

    // Evaluate confidence
    const brainResult = evaluateConfidence(metadata, hasResearch);
    const confidenceLevel = getConfidenceLevel(brainResult.score);

    const confidenceColor =
        confidenceLevel === 'high' ? 'text-green-600 bg-green-50 border-green-200' :
            confidenceLevel === 'medium' ? 'text-amber-600 bg-amber-50 border-amber-200' :
                'text-red-600 bg-red-50 border-red-200';

    const ConfidenceIcon =
        confidenceLevel === 'high' ? CheckCircle :
            confidenceLevel === 'medium' ? HelpCircle :
                AlertCircle;

    return (
        <div className="relative">
            <div className="bg-white border rounded-lg p-3 sm:p-4 mb-6 shadow-sm flex flex-col sm:flex-row gap-4 sm:items-center justify-between group/panel">
                <div className="flex flex-wrap gap-4 flex-1">
                    {/* Outcome */}
                    <div className="flex items-center gap-2 group cursor-pointer relative" onClick={() => !editingField && setEditingField('outcome')}>
                        <div className="p-1.5 bg-blue-50 rounded-md text-blue-600">
                            <Target size={14} />
                        </div>
                        <div>
                            <div className="flex items-center gap-1">
                                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Goal</p>
                                {!metadata.outcome && <div className="w-1 h-1 rounded-full bg-red-400 animate-pulse" title="Required for precision" />}
                            </div>
                            {editingField === 'outcome' ? (
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        value={localMetadata.outcome || ''}
                                        onChange={(e) => setLocalMetadata({ ...localMetadata, outcome: e.target.value as any })}
                                        className="text-sm font-semibold text-gray-900 border-b border-blue-300 focus:outline-none bg-transparent min-w-[120px]"
                                        placeholder="Goal (e.g. Authority)"
                                        autoFocus
                                    />
                                    <button onClick={handleSave} className="p-0.5 text-green-600 hover:bg-green-50 rounded"><Check size={12} /></button>
                                    <button onClick={handleCancel} className="p-0.5 text-gray-400 hover:bg-gray-50 rounded"><CloseIcon size={12} /></button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1">
                                    <p className="text-sm font-semibold text-gray-900 capitalize">{metadata.outcome || 'Select Goal'}</p>
                                    <Edit2 size={10} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Format */}
                    <div className="flex items-center gap-2 group cursor-pointer relative" onClick={() => !editingField && setEditingField('format')}>
                        <div className="p-1.5 bg-purple-50 rounded-md text-purple-600">
                            <Layout size={14} />
                        </div>
                        <div>
                            <div className="flex items-center gap-1">
                                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Format</p>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowFormatHelp(!showFormatHelp); }}
                                    className="p-0.5 text-gray-300 hover:text-purple-600 rounded transition-colors"
                                >
                                    <HelpCircle size={10} />
                                </button>
                            </div>
                            {editingField === 'format' ? (
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                    <select
                                        value={localMetadata.format || ''}
                                        onChange={(e) => setLocalMetadata({ ...localMetadata, format: e.target.value as PostFormat })}
                                        className="text-sm font-semibold text-gray-900 border-b border-purple-300 focus:outline-none bg-transparent"
                                        autoFocus
                                    >
                                        <option value="thought_leadership">Thought Leadership</option>
                                        <option value="personal_story">Personal Story</option>
                                        <option value="tactical_guide">Tactical Guide</option>
                                        <option value="listicle">Listicle</option>
                                    </select>
                                    <button onClick={handleSave} className="p-0.5 text-green-600 hover:bg-green-50 rounded"><Check size={12} /></button>
                                    <button onClick={handleCancel} className="p-0.5 text-gray-400 hover:bg-gray-50 rounded"><CloseIcon size={12} /></button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1">
                                    <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                                        {metadata.format ? FORMAT_DATA[metadata.format]?.label : 'Select Format'}
                                    </p>
                                    <Edit2 size={10} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stance */}
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => !editingField && setEditingField('stance')}>
                        <div className="p-1.5 bg-emerald-50 rounded-md text-emerald-600">
                            <Scale size={14} />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Stance</p>
                            {editingField === 'stance' ? (
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        value={localMetadata.stance || ''}
                                        onChange={(e) => setLocalMetadata({ ...localMetadata, stance: e.target.value as any })}
                                        className="text-sm font-semibold text-gray-900 border-b border-emerald-300 focus:outline-none bg-transparent min-w-[120px]"
                                        placeholder="Stance (e.g. Contrarian)"
                                        autoFocus
                                    />
                                    <button onClick={handleSave} className="p-0.5 text-green-600 hover:bg-green-50 rounded"><Check size={12} /></button>
                                    <button onClick={handleCancel} className="p-0.5 text-gray-400 hover:bg-gray-50 rounded"><CloseIcon size={12} /></button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1">
                                    <p className="text-sm font-semibold text-gray-900 capitalize">{metadata.stance || 'Select Stance'}</p>
                                    <Edit2 size={10} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Audience */}
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => !editingField && setEditingField('audience')}>
                        <div className="p-1.5 bg-amber-50 rounded-md text-amber-600">
                            <Users size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Audience</p>
                                {(!metadata.audience?.role || !metadata.audience?.pain) && <div className="w-1 h-1 rounded-full bg-red-400 animate-pulse" title="Critical for relevancy" />}
                            </div>
                            {editingField === 'audience' ? (
                                <div className="flex flex-col gap-1 max-w-[200px]" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        value={localMetadata.audience?.role || ''}
                                        placeholder="Role (e.g. CMOs)"
                                        onChange={(e) => setLocalMetadata({
                                            ...localMetadata,
                                            audience: { ...localMetadata.audience, role: e.target.value, pain: localMetadata.audience?.pain || '' }
                                        })}
                                        className="text-sm font-semibold text-gray-900 border-b border-amber-300 focus:outline-none bg-transparent w-full"
                                        autoFocus
                                    />
                                    <input
                                        value={localMetadata.audience?.pain || ''}
                                        placeholder="Pain point (e.g. ROI)"
                                        onChange={(e) => setLocalMetadata({
                                            ...localMetadata,
                                            audience: { ...localMetadata.audience, role: localMetadata.audience?.role || '', pain: e.target.value }
                                        })}
                                        className="text-xs text-gray-500 border-b border-amber-100 focus:outline-none bg-transparent w-full mt-0.5"
                                    />
                                    <div className="flex justify-end gap-1 mt-1">
                                        <button onClick={handleSave} className="p-0.5 text-green-600 hover:bg-green-50 rounded"><Check size={12} /></button>
                                        <button onClick={handleCancel} className="p-0.5 text-gray-400 hover:bg-gray-50 rounded"><CloseIcon size={12} /></button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 line-clamp-1 max-w-[120px]" title={`${metadata.audience?.role || 'Not set'} - ${metadata.audience?.pain || ''}`}>
                                        {metadata.audience?.role || 'Select Audience'}
                                    </p>
                                    <Edit2 size={10} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Confidence Badge with Tooltip */}
                <div className="flex items-center gap-2 shrink-0">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${confidenceColor}`}>
                        <ConfidenceIcon size={14} />
                        <div className="flex flex-col leading-tight">
                            <span className="text-[10px] uppercase font-bold opacity-70 tracking-tighter">Strategy</span>
                            <span className="text-xs font-bold uppercase tracking-wide">
                                {brainResult.label}
                            </span>
                        </div>
                    </div>
                    {brainResult.missing.length > 0 && (
                        <div className="relative group">
                            <Info size={16} className="text-gray-400 cursor-help" />
                            <div className="absolute right-0 top-full mt-1 w-48 bg-gray-900 text-white text-xs rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                <p className="font-semibold mb-1">Missing:</p>
                                <ul className="list-disc list-inside">
                                    {brainResult.missing.map((ctx: string, i: number) => (
                                        <li key={i}>{ctx}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Strategy Coach Line - Very Visible UX */}
            {brainResult.missing.length > 0 && brainResult.score < 85 && (
                <div className={`mt-[-20px] mb-6 px-4 py-2 border rounded-b-lg border-t-0 shadow-sm animate-in slide-in-from-top-2 duration-300 ${confidenceLevel === 'low' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                    <p className="text-xs font-medium flex items-center gap-2">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>
                            <span className="font-bold uppercase text-[10px] mr-2">Strategy Coach:</span>
                            To avoid generic AI results, you should define your **{brainResult.missing[0].includes('Audience') ? 'Audience' : brainResult.missing[0].includes('Goal') ? 'Goal' : 'Strategic Posture'}**.
                        </span>
                    </p>
                </div>
            )}

            {/* Format Help Drawer/Modal */}
            {showFormatHelp && (
                <div className="absolute top-full left-0 right-0 z-50 mt-[-16px] bg-white border rounded-b-lg shadow-xl p-6 animate-in slide-in-from-top-4 duration-200 border-t-0 ring-1 ring-purple-100">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="font-bold text-gray-900 flex items-center gap-2">
                            <Layout size={18} className="text-purple-600" />
                            Post Formats Explorer
                        </h4>
                        <button onClick={() => setShowFormatHelp(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
                            <CloseIcon size={18} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {(Object.keys(FORMAT_DATA) as PostFormat[]).map((f) => (
                            <div key={f} className={`p-4 rounded-xl border transition-all cursor-pointer group ${metadata.format === f ? 'bg-purple-50 border-purple-200' : 'hover:bg-gray-50 border-gray-100'}`}
                                onClick={() => {
                                    setLocalMetadata({ ...localMetadata, format: f });
                                    onUpdate?.({ ...metadata, format: f } as BrainMetadata);
                                }}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-sm text-gray-900">{FORMAT_DATA[f].label}</span>
                                    {metadata.format === f && <div className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />}
                                </div>
                                <p className="text-xs text-gray-500 mb-4 line-clamp-2">{FORMAT_DATA[f].description}</p>

                                <div className="bg-white/60 p-3 rounded-lg border border-purple-50 flex items-center gap-3 overflow-hidden">
                                    <div className="shrink-0 scale-75 rotate-[-90deg]">
                                        <Layout size={14} className="text-purple-300" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] uppercase font-bold text-purple-400 tracking-tighter mb-1">Skeleton Structure</p>
                                        <p className="text-[11px] text-gray-600 italic truncate">{FORMAT_DATA[f].skeleton}</p>
                                    </div>
                                    <ChevronRight size={14} className="ml-auto text-purple-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                        <p className="text-[10px] text-gray-400 max-w-sm">
                            Changing format affects how the AI suggests your **Outline** and **Draft** length/tone.
                        </p>
                        <button
                            onClick={() => setShowFormatHelp(false)}
                            className="text-xs font-bold text-purple-600 hover:text-purple-700 underline underline-offset-4"
                        >
                            I understand
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

