
import { Plus, Wand2 } from "lucide-react";

interface PipelineHeaderProps {
    loading: boolean;
    onSuggest: () => void;
    onNewDraft: () => void;
}

export function PipelineHeader({ loading, onSuggest, onNewDraft }: PipelineHeaderProps) {
    return (
        <div className="flex items-center justify-between p-6 pb-4">
            <div>
                <h1 className="text-4xl font-serif text-gray-900 mb-1">Command Center</h1>
                <p className="text-base text-gray-500 font-serif">Your content pipeline.</p>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={onSuggest}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                >
                    <Wand2 size={16} />
                    Suggest Ideas
                </button>
                <button
                    onClick={onNewDraft}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus size={16} />
                    New Draft
                </button>
            </div>
        </div>
    );
}
