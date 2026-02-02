
import { useState, useEffect } from "react";
import { Target, LayoutTemplate, Scale, Users, Info, X, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Draft } from "@/hooks/useDrafts";

interface StrategyBarProps {
    draft: Draft;
    onUpdate: (metadataUpdates: any) => Promise<void>;
    enableCoach?: boolean;
}

export function StrategyBar({ draft, onUpdate, enableCoach = true }: StrategyBarProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [metadata, setMetadata] = useState(draft.brain_metadata || {});

    // Sync specific fields
    const goal = metadata.outcome || ""; // Mapped from 'outcome'
    const format = metadata.format || "";
    const stance = metadata.stance || "";

    // Audience might be object { role, pain } or string (legacy)
    const rawAudience = metadata.audience;
    const audience = typeof rawAudience === 'object' ? rawAudience?.role || "" : rawAudience || "";

    // Derived State
    const isComplete = goal && format && stance && audience;
    const missingFields = [
        !goal && "Goal",
        // !format && "Format", // Format is optional often?
        !stance && "Stance",
        !audience && "Audience"
    ].filter(Boolean);

    useEffect(() => {
        setMetadata(draft.brain_metadata || {});
    }, [draft.brain_metadata]);

    const handleUpdate = async (key: string, value: string) => {
        const newMetadata = { ...metadata };

        if (key === 'audience') {
            // Preserve existing pain if present, otherwise just role
            const existingPain = typeof metadata.audience === 'object' ? metadata.audience.pain : '';
            newMetadata.audience = { role: value, pain: existingPain };
        } else if (key === 'goal') {
            newMetadata.outcome = value; // Map 'goal' UI to 'outcome' data
        } else {
            newMetadata[key] = value;
        }

        setMetadata(newMetadata); // Optimistic update
        await onUpdate({ brain_metadata: newMetadata });
    };

    return (
        <div className="mb-8 select-none">
            {/* Main Bar */}
            <div className={`relative bg-white border ${isComplete ? 'border-gray-200' : 'border-gray-300'} rounded-xl shadow-sm transition-all duration-300`}>

                {/* Header / Toggle */}
                <div className="absolute -top-3 left-4 z-10">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="bg-white px-2 py-0.5 border border-gray-200 rounded-md text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                    >
                        <Target size={10} className={isExpanded ? "text-blue-500" : ""} />
                        Strategy Coach
                        {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    </button>
                </div>

                {isExpanded && (
                    <div className="flex flex-col xl:flex-row items-stretch divide-y xl:divide-y-0 xl:divide-x divide-gray-100 overflow-x-auto hide-scrollbar">
                        {/* 1. GOAL */}
                        <div className="p-3 flex flex-col justify-center min-w-[140px] xl:flex-1">
                            <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                <Target size={12} className="text-blue-400" />
                                <span>Goal</span>
                            </div>
                            <select
                                value={goal}
                                onChange={(e) => handleUpdate('goal', e.target.value)}
                                className="bg-transparent text-sm font-medium text-gray-900 focus:outline-none cursor-pointer hover:text-blue-600 transition-colors w-full appearance-none truncate"
                            >
                                <option value="" disabled>Select Goal</option>
                                <option value="authority">Authority</option>
                                <option value="engagement">Engagement</option>
                                <option value="conversion">Conversion</option>
                                <option value="connection">Connection</option>
                            </select>
                        </div>

                        {/* 2. FORMAT */}
                        <div className="p-3 flex flex-col justify-center min-w-[140px] xl:flex-1">
                            <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                <LayoutTemplate size={12} className="text-purple-400" />
                                <span>Format</span>
                            </div>
                            <select
                                value={format}
                                onChange={(e) => handleUpdate('format', e.target.value)}
                                className="bg-transparent text-sm font-medium text-gray-900 focus:outline-none cursor-pointer hover:text-purple-600 transition-colors w-full appearance-none truncate"
                            >
                                <option value="" disabled>Select Format</option>
                                <option value="thought_leadership">Thought Leadership</option>
                                <option value="tactical_guide">Tactical Guide</option>
                                <option value="story">Personal Story</option>
                                <option value="listicle">Listicle</option>
                            </select>
                        </div>

                        {/* 3. STANCE */}
                        <div className="p-3 flex flex-col justify-center min-w-[180px] xl:flex-[1.5] group/stance">
                            <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                <Scale size={12} className="text-green-400" />
                                <span>Stance</span>
                                {stance && <Check size={10} className="text-green-500 ml-auto" />}
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={stance}
                                    onChange={(e) => handleUpdate('stance', e.target.value)}
                                    placeholder="e.g. Contrarian..."
                                    className={`w-full bg-transparent text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none border-b border-transparent focus:border-green-300 transition-all ${stance ? 'border-green-300/50' : ''}`}
                                />
                                {!stance && (
                                    <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div className="text-[10px] font-medium text-gray-400 mb-1 px-1 uppercase tracking-wider">Suggestions</div>
                                        <div className="flex flex-wrap gap-1">
                                            {['Supportive', 'Contrarian', 'Analytical', 'Visionary'].map(s => (
                                                <button
                                                    key={s}
                                                    onClick={() => handleUpdate('stance', s)}
                                                    className="text-left px-2 py-1 text-xs text-gray-600 bg-gray-50 hover:bg-green-50 hover:text-green-700 hover:border-green-200 border border-transparent rounded-md transition-colors"
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 4. AUDIENCE */}
                        <div className="p-3 flex flex-col justify-center min-w-[180px] xl:flex-[1.5] group/audience lg:border-r-0">
                            <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                <Users size={12} className="text-amber-400" />
                                <span>Audience</span>
                                {!audience && <div className="w-1.5 h-1.5 rounded-full bg-red-400 ml-1 animate-pulse" />}
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={audience}
                                    onChange={(e) => handleUpdate('audience', e.target.value)}
                                    placeholder="Who is this for?"
                                    className={`w-full bg-transparent text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none border-b border-transparent focus:border-amber-300 transition-all ${audience ? 'border-amber-300/50' : ''}`}
                                />
                                {!audience && (
                                    <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div className="text-[10px] font-medium text-gray-400 mb-1 px-1 uppercase tracking-wider">Common Audiences</div>
                                        <div className="flex flex-col gap-1">
                                            {['Founders', 'Engineers', 'Investors', 'Designers', 'Marketing Leaders'].map(a => (
                                                <button
                                                    key={a}
                                                    onClick={() => handleUpdate('audience', a)}
                                                    className="block w-full text-left px-2 py-1.5 text-xs text-gray-600 hover:bg-amber-50 hover:text-amber-700 rounded-md transition-colors"
                                                >
                                                    {a}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 5. VAGUE STRATEGY INDICATOR */}
                        {!isComplete && enableCoach && (
                            <div className="p-3 hidden xl:flex items-center justify-center bg-red-50/30 min-w-[140px]">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-500/80 bg-red-100/50 px-2 py-1 rounded-full whitespace-nowrap">
                                    <Info size={10} className="stroke-[3]" />
                                    <span>Define Strategy</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Coach Alert (Logic: If strategy is blocked/incomplete) */}
            {!isComplete && enableCoach && (
                <div className="mt-2 text-xs font-medium text-red-500 flex items-center gap-2 animate-in slide-in-from-top-1 duration-300 px-1">
                    <Info size={12} />
                    <span>
                        STRATEGY COACH: To avoid generic AI results, you should define your <strong className="font-bold underline decoration-red-200 underline-offset-2">{(missingFields[0] || "Strategy") as string}</strong>.
                    </span>
                </div>
            )}
        </div>
    );
}
