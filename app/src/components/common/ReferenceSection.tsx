import { useState, useRef } from 'react';
import { Link, FileText, X, Plus, Trash2, Upload } from 'lucide-react';
import { ContentReference, ReferenceType } from '@/types';

interface ReferenceSectionProps {
    references: ContentReference[];
    onAdd: (ref: ContentReference) => void;
    onRemove: (id: string) => void;
}

export function ReferenceSection({ references, onAdd, onRemove }: ReferenceSectionProps) {
    const [activeTab, setActiveTab] = useState<'link' | 'text' | 'file'>('link');
    const [inputValue, setInputValue] = useState('');
    const [titleValue, setTitleValue] = useState('');
    const [textBody, setTextBody] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAdd = () => {
        if (activeTab === 'link') {
            if (!inputValue.trim()) return;

            const newRef: ContentReference = {
                id: crypto.randomUUID(),
                contentItemId: '',
                referenceType: 'link',
                title: titleValue || inputValue,
                url: inputValue,
                createdAt: new Date()
            };
            onAdd(newRef);
            setInputValue('');
            setTitleValue('');
        } else if (activeTab === 'text') {
            if (!textBody.trim()) return;

            const newRef: ContentReference = {
                id: crypto.randomUUID(),
                contentItemId: '',
                referenceType: 'text',
                title: titleValue || 'Text Snippet',
                content: textBody,
                createdAt: new Date()
            };
            onAdd(newRef);
            setTextBody('');
            setTitleValue('');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const fileName = file.name;
        const fileExt = fileName.split('.').pop()?.toLowerCase();

        // Read file content
        const text = await file.text();

        const newRef: ContentReference & { file?: File } = {
            id: crypto.randomUUID(),
            contentItemId: '',
            referenceType: 'file',
            title: fileName,
            content: text, // Store extracted text
            filePath: fileName, // Store filename for reference
            createdAt: new Date(),
            file: file // Pass raw file for upload
        };
        onAdd(newRef);

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <FileText size={16} />
                References
                <span className="text-xs font-normal text-gray-400">(Optional)</span>
            </h3>

            {/* Input Area */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                {/* Tabs */}
                <div className="flex gap-4 border-b border-gray-200 pb-2 mb-3">
                    <button
                        onClick={() => setActiveTab('link')}
                        className={`text-xs font-semibold uppercase tracking-wide pb-1 -mb-2.5 border-b-2 transition-colors ${activeTab === 'link'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        Link URL
                    </button>
                    <button
                        onClick={() => setActiveTab('text')}
                        className={`text-xs font-semibold uppercase tracking-wide pb-1 -mb-2.5 border-b-2 transition-colors ${activeTab === 'text'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        Paste Text
                    </button>
                    <button
                        onClick={() => setActiveTab('file')}
                        className={`text-xs font-semibold uppercase tracking-wide pb-1 -mb-2.5 border-b-2 transition-colors ${activeTab === 'file'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        Upload File
                    </button>
                </div>

                <div className="space-y-3">
                    {activeTab === 'link' && (
                        <div className="flex gap-2">
                            <input
                                type="url"
                                placeholder="Paste URL here..."
                                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                            />
                            <button
                                onClick={handleAdd}
                                disabled={!inputValue.trim()}
                                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    )}

                    {activeTab === 'text' && (
                        <div className="space-y-2">
                            <input
                                type="text"
                                placeholder="Title (optional)"
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                value={titleValue}
                                onChange={(e) => setTitleValue(e.target.value)}
                            />
                            <textarea
                                placeholder="Paste relevant text, quotes, or context..."
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[80px]"
                                value={textBody}
                                onChange={(e) => setTextBody(e.target.value)}
                            />
                            <div className="flex justify-end">
                                <button
                                    onClick={handleAdd}
                                    disabled={!textBody.trim()}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Add Text
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'file' && (
                        <div className="space-y-2">
                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-white hover:bg-gray-50 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload size={24} className="text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-500">
                                        <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">.md, .txt, .docx files</p>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    accept=".md,.txt,.docx"
                                    onChange={handleFileUpload}
                                />
                            </label>
                        </div>
                    )}
                </div>
            </div>

            {/* List of References */}
            {references.length > 0 && (
                <div className="space-y-2">
                    {references.map((ref) => (
                        <div key={ref.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg group hover:border-blue-200 transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
                                    {ref.referenceType === 'link' ? <Link size={16} /> : <FileText size={16} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium text-gray-900 truncate">
                                        {ref.title || (ref.referenceType === 'link' ? ref.url : 'Text Snippet')}
                                    </h4>
                                    {ref.referenceType === 'link' && (
                                        <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline truncate block">
                                            {ref.url}
                                        </a>
                                    )}
                                    {ref.referenceType === 'text' && (
                                        <p className="text-xs text-gray-500 truncate">
                                            {ref.content}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => onRemove(ref.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
