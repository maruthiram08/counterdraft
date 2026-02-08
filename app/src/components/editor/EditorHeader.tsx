import { Edit2, Eye, Check, Copy, Save, RefreshCw, BrainCircuit, ShieldCheck, Image as ImageIcon } from "lucide-react";
import { Draft } from "@/hooks/useDrafts";

interface EditorHeaderProps {
    draft: Draft;
    saving: boolean;
    saved: boolean;
    extracting: boolean;
    isPreview: boolean;
    setIsPreview: (v: boolean) => void;
    handleCopy: () => void;
    handleSave: () => void;
    setShowRepurposeModal: (v: boolean) => void;
    handleFinalize: () => void;
    learning: boolean;
    setShowFactCheck: (v: boolean) => void;
    handleDownloadDesign: () => void;
    setShowPublishModal: (v: boolean) => void;
    copied: boolean;
}

export function EditorHeader({
    draft,
    saving,
    saved,
    extracting,
    isPreview,
    setIsPreview,
    handleCopy,
    handleSave,
    setShowRepurposeModal,
    handleFinalize,
    learning,
    setShowFactCheck,
    handleDownloadDesign,
    setShowPublishModal,
    copied
}: EditorHeaderProps) {
    return (
        <div className="sticky top-6 flex flex-row items-center justify-end gap-2 z-20 pointer-events-none mb-4 -mt-10 mr-[-20px] xl:mr-[-60px]">
            {/* View Mode Switcher */}
            <div className="flex items-center p-1 bg-gray-100/50 backdrop-blur-sm border border-gray-200 rounded-lg pointer-events-auto transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                <button
                    onClick={() => setIsPreview(false)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${!isPreview
                        ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                        }`}
                >
                    <Edit2 size={12} />
                    <span>Edit</span>
                </button>
                <button
                    onClick={() => setIsPreview(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${isPreview
                        ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                        }`}
                >
                    <Eye size={12} />
                    <span>Preview</span>
                </button>
            </div>

            {/* Actions Bar + Status */}
            <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm shadow-sm border border-gray-100 rounded-xl px-3 py-1.5 pointer-events-auto transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                <div className="flex items-center gap-1.5 mr-2 pl-1 pr-3 border-r border-gray-100 select-none">
                    <div className={`w-1.5 h-1.5 rounded-full ${saving ? 'bg-amber-400 animate-pulse' : extracting ? 'bg-blue-400 animate-pulse' : saved ? 'bg-green-500' : draft.status === 'published' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                        {saving ? "Saving" : extracting ? "Analyzing" : saved ? "Saved" : draft.status === 'published' ? "Published" : "Draft"}
                    </span>
                </div>

                <button
                    onClick={handleCopy}
                    title="Copy to Clipboard"
                    className="text-gray-400 hover:text-gray-700 p-1.5 hover:bg-gray-50 rounded-lg transition-all"
                >
                    {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                </button>

                {draft.status !== 'published' && (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        title="Save Draft (Cmd+S)"
                        className="text-gray-400 hover:text-[var(--accent)] p-1.5 hover:bg-gray-50 rounded-lg transition-all"
                    >
                        <Save size={14} />
                    </button>
                )}

                <div className="w-px h-3 bg-gray-200 mx-0.5"></div>

                <button
                    onClick={() => setShowRepurposeModal(true)}
                    title="Repurpose / Rewrite"
                    className="text-indigo-500 hover:text-indigo-600 p-1.5 hover:bg-indigo-50 rounded-lg transition-all"
                >
                    <RefreshCw size={14} />
                </button>

                <div className="w-px h-3 bg-gray-200 mx-0.5"></div>

                {draft.status !== 'published' && (
                    <button
                        onClick={handleFinalize}
                        disabled={learning}
                        title="Finalize & Learn (Updates Voice)"
                        className="text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
                    >
                        <BrainCircuit size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Finalize</span>
                    </button>
                )}

                <button
                    onClick={() => setShowFactCheck(true)}
                    title="Verify Claims & Plagiarism"
                    className="text-teal-600 hover:text-teal-700 p-1.5 hover:bg-teal-50 rounded-lg transition-all"
                >
                    <ShieldCheck size={14} />
                </button>

                {draft.platform === 'instagram' && (
                    <button
                        onClick={handleDownloadDesign}
                        title="Download Design (PPTX)"
                        className="text-pink-500 hover:text-pink-600 p-1.5 hover:bg-pink-50 rounded-lg transition-all"
                    >
                        <ImageIcon size={14} />
                    </button>
                )}

                {draft.status !== 'published' && (
                    <button
                        onClick={() => setShowPublishModal(true)}
                        className="ml-2 px-3 py-1 bg-gray-900 hover:bg-black text-white text-xs font-medium rounded-lg shadow-sm transition-all"
                    >
                        Publish
                    </button>
                )}
            </div>
        </div>
    );
}
