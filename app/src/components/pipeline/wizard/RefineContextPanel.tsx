
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
        <div className="absolute bottom-[72px] left-0 right-0 z-40 bg-white border-t border-[var(--accent)] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] p-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="max-w-4xl mx-auto w-full">
                <div className="flex justify-between items-center mb-4">
                    <label className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                        <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                        Refine Research
                    </label>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
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
                        className="flex-1 text-sm p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 min-h-[80px] bg-gray-50 resize-none"
                    />
                    <div className="flex flex-col justify-end">
                        <button
                            onClick={onUpdate}
                            disabled={loading || !globalContext.trim()}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-[var(--accent)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-all shadow-sm disabled:opacity-50 h-[80px]"
                        >
                            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                            {loading ? "Updating..." : "Update"}
                        </button>
                    </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                    Findings will be appended. Existing notes preserved.
                </p>
            </div>
        </div>
    );
}
