
import { X, RefreshCw } from "lucide-react";

interface RefineContextPanelProps {
    isOpen: boolean;
    loading: boolean;
    globalContext: string;
    onClose: () => void;
    onChangeContext: (context: string) => void;
    onUpdate: () => void;
}

export function RefineContextPanel({
    isOpen,
    loading,
    globalContext,
    onClose,
    onChangeContext,
    onUpdate
}: RefineContextPanelProps) {
    if (!isOpen) return null;

    return (
        <div className="absolute bottom-[72px] left-0 right-0 z-40 bg-canvas rounded-t-card shadow-float p-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="max-w-4xl mx-auto w-full">
                <div className="flex justify-between items-center mb-4">
                    <label className="flex items-center gap-2 text-sm font-medium tracking-[-0.01em] text-ink">
                        <span className="w-2 h-2 rounded-full bg-ember-500 animate-pulse" />
                        Refine Research
                    </label>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-canvas shadow-raised text-ink-soft hover:text-ink active:shadow-pressed transition-all"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="flex gap-4">
                    <textarea
                        value={globalContext}
                        onChange={(e) => onChangeContext(e.target.value)}
                        disabled={loading}
                        autoFocus
                        placeholder="Paste a URL or describe missing angles (e.g., 'Include statistics about Gen Z usage')..."
                        className="flex-1 text-sm px-4 py-3 bg-canvas shadow-well rounded-2xl text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 min-h-[80px] resize-none"
                    />
                    <div className="flex flex-col justify-end">
                        <button
                            onClick={onUpdate}
                            disabled={loading || !globalContext.trim()}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-ember-500 text-white text-sm font-medium rounded-full hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50 h-12"
                        >
                            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                            {loading ? "Updating..." : "Update"}
                        </button>
                    </div>
                </div>
                <p className="mt-2 text-xs text-ink-muted">
                    Findings will be appended. Existing notes preserved.
                </p>
            </div>
        </div>
    );
}
