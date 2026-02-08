
import { useState, useEffect, useRef, useCallback } from "react";
import { Target, LayoutTemplate, Scale, Users, Info, Check, ChevronDown, ChevronUp, Sparkles, Loader2 } from "lucide-react";
import { Draft, BrainMetadata } from "@/types";
import { toast } from "sonner";

interface StrategyBarProps {
    draft: Draft & { title?: string; hook?: string };
    onUpdate: (metadataUpdates: Partial<Draft>) => Promise<void>;
    enableCoach?: boolean;
}

export function StrategyBar({ draft, onUpdate, enableCoach = true }: StrategyBarProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    // Explicitly type as Partial<BrainMetadata>
    const [metadata, setMetadata] = useState<Partial<BrainMetadata>>(draft.brain_metadata || {});
    const [isAutofilling, setIsAutofilling] = useState(false);

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

    const handleAutofill = useCallback(async () => {
        if (!draft.title && !draft.hook) {
            toast.error("Please enter a topic/hook first.");
            return;
        }

        setIsAutofilling(true);
        try {
            const res = await fetch('/api/content/develop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'autofill_strategy',
                    hook: draft.hook || draft.title
                })
            });

            if (res.ok) {
                const data = await res.json();
                const newMetadata = {
                    ...metadata,
                    ...data
                };
                setMetadata(newMetadata);
                await onUpdate({ brain_metadata: newMetadata });
                toast.success("Strategy generated from your Voice!");
            } else {
                throw new Error("Failed to generate strategy");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to autofill strategy.");
        } finally {
            setIsAutofilling(false);
        }
    }, [draft.hook, draft.title, metadata, onUpdate]);

    // Auto-Strategy Trigger
    const hasAutoRun = useRef(false);

    useEffect(() => {
        const hasContent = draft.title || draft.hook;
        // Trigger if:
        // 1. Coach enabled
        // 2. Strategy is NOT complete
        // 3. We have a title/hook to base it on
        // 4. We haven't run it yet this session (component mount)
        // 5. Specifically, if the GOAL is missing (proxy for "totally empty" or "needs setup")
        if (enableCoach && !isComplete && hasContent && !hasAutoRun.current && !metadata.outcome) {
            hasAutoRun.current = true;
            // Small delay to ensure smooth UI enter
            const timer = setTimeout(() => {
                handleAutofill();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [enableCoach, isComplete, draft.title, draft.hook, metadata.outcome, handleAutofill]);

    const handleUpdate = async (key: string, value: string) => {
        const newMetadata = { ...metadata };

        if (key === 'audience') {
            const existingPain = typeof metadata.audience === 'object' ? metadata.audience.pain : '';
            newMetadata.audience = { role: value, pain: existingPain };
        } else if (key === 'goal') {
            newMetadata.outcome = value as import("@/types").Outcome;
        } else {
            // @ts-expect-error - Dynamic key access on defined type
            newMetadata[key as keyof BrainMetadata] = value;
        }

        setMetadata(newMetadata);
        // Cast to BrainMetadata to satisfy Draft type (even if partial)
        await onUpdate({ brain_metadata: newMetadata as BrainMetadata });
    };

    return (
        <div className="mb-8 select-none">
            {/* Main Bar */}
            <div className={`relative bg-white border ${isComplete ? 'border-gray-200' : 'border-gray-300'} rounded-xl shadow-sm transition-all duration-300`}>

                {/* Header / Toggle */}
                <div className="absolute -top-3 left-4 z-10 flex gap-2">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="bg-white px-2 py-0.5 border border-gray-200 rounded-md text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                    >
                        <Target size={10} className={isExpanded ? "text-blue-500" : ""} />
                        Strategy Coach
                        {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    </button>

                    {isExpanded && !isComplete && draft.status !== 'published' && (
                        <button
                            onClick={handleAutofill}
                            disabled={isAutofilling}
                            className="bg-purple-50 px-2 py-0.5 border border-purple-100 rounded-md text-[10px] font-bold text-purple-600 uppercase tracking-widest flex items-center gap-1 hover:bg-purple-100 transition-all shadow-sm disabled:opacity-50"
                        >
                            {isAutofilling ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                            Auto-Strategy
                        </button>
                    )}
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
                                disabled={draft.status === 'published'}
                                className={`bg-transparent text-sm font-medium text-gray-900 focus:outline-none cursor-pointer hover:text-blue-600 transition-colors w-full appearance-none truncate ${draft.status === 'published' ? 'cursor-default opacity-70' : ''}`}
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
                                disabled={draft.status === 'published'}
                                className={`bg-transparent text-sm font-medium text-gray-900 focus:outline-none cursor-pointer hover:text-purple-600 transition-colors w-full appearance-none truncate ${draft.status === 'published' ? 'cursor-default opacity-70' : ''}`}
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
                                    readOnly={draft.status === 'published'}
                                    placeholder="e.g. Contrarian..."
                                    className={`w-full bg-transparent text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none border-b border-transparent focus:border-green-300 transition-all ${stance ? 'border-green-300/50' : ''} ${draft.status === 'published' ? 'cursor-default opacity-70' : ''}`}
                                />
                                {draft.status !== 'published' && !stance && (
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
                                    readOnly={draft.status === 'published'}
                                    placeholder="Who is this for?"
                                    className={`w-full bg-transparent text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none border-b border-transparent focus:border-amber-300 transition-all ${audience ? 'border-amber-300/50' : ''} ${draft.status === 'published' ? 'cursor-default opacity-70' : ''}`}
                                />
                                {draft.status !== 'published' && !audience && (
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
            {!isComplete && enableCoach && draft.status !== 'published' && (
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
