import { useState, useRef } from 'react';
import { Link, FileText, Plus, Trash2, Upload } from 'lucide-react';
import { ContentReference } from '@/types';

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
            <h3 className="text-sm font-medium text-ink flex items-center gap-2">
                <FileText size={16} className="text-ember-500" />
                References
                {references.length > 0 ? (
                    <span className="px-2.5 py-0.5 bg-sage-100 text-sage-700 rounded-full text-xs font-medium">
                        {references.length} attached ✓
                    </span>
                ) : (
                    <span className="text-xs font-normal text-ink-muted">(Optional)</span>
                )}
            </h3>

            {/* Input Area */}
            <div className="bg-surface rounded-tile shadow-card p-4">
                {/* Tabs */}
                <div className="flex gap-1 bg-canvas shadow-well rounded-full p-1 mb-3">
                    <button
                        onClick={() => setActiveTab('link')}
                        className={`flex-1 h-8 px-3 rounded-full text-xs font-medium transition-all ${activeTab === 'link'
                            ? 'bg-surface shadow-raised text-ink'
                            : 'text-ink-muted hover:text-ink'
                            }`}
                    >
                        Link URL
                    </button>
                    <button
                        onClick={() => setActiveTab('text')}
                        className={`flex-1 h-8 px-3 rounded-full text-xs font-medium transition-all ${activeTab === 'text'
                            ? 'bg-surface shadow-raised text-ink'
                            : 'text-ink-muted hover:text-ink'
                            }`}
                    >
                        Paste Text
                    </button>
                    <button
                        onClick={() => setActiveTab('file')}
                        className={`flex-1 h-8 px-3 rounded-full text-xs font-medium transition-all ${activeTab === 'file'
                            ? 'bg-surface shadow-raised text-ink'
                            : 'text-ink-muted hover:text-ink'
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
                                className="flex-1 min-w-0 bg-canvas shadow-well rounded-2xl px-4 py-2.5 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 text-sm"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                            />
                            <button
                                onClick={handleAdd}
                                disabled={!inputValue.trim()}
                                className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-ember-500 text-white hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                                className="w-full bg-canvas shadow-well rounded-2xl px-4 py-2.5 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 text-sm"
                                value={titleValue}
                                onChange={(e) => setTitleValue(e.target.value)}
                            />
                            <textarea
                                placeholder="Paste relevant text, quotes, or context..."
                                className="w-full bg-canvas shadow-well rounded-2xl px-4 py-2.5 text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 text-sm min-h-[80px]"
                                value={textBody}
                                onChange={(e) => setTextBody(e.target.value)}
                            />
                            <div className="flex justify-end">
                                <button
                                    onClick={handleAdd}
                                    disabled={!textBody.trim()}
                                    className="h-10 px-4 rounded-full bg-ember-500 text-white text-sm font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Add Text
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'file' && (
                        <div className="space-y-2">
                            <label className="flex flex-col items-center justify-center w-full h-24 rounded-tile cursor-pointer bg-canvas shadow-pressed transition-all">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload size={24} className="text-ember-500 mb-2" />
                                    <p className="text-sm text-ink-soft">
                                        <span className="font-medium text-ember-600">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-ink-muted mt-1">.md, .txt, .docx files</p>
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
                        <div key={ref.id} className="flex items-center justify-between p-3 bg-surface rounded-2xl shadow-card group hover:shadow-float transition-all">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-9 h-9 shrink-0 flex items-center justify-center bg-canvas shadow-well rounded-full text-ember-500">
                                    {ref.referenceType === 'link' ? <Link size={16} /> : <FileText size={16} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium text-ink truncate">
                                        {ref.title || (ref.referenceType === 'link' ? ref.url : 'Text Snippet')}
                                    </h4>
                                    {ref.referenceType === 'link' && (
                                        <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-xs text-ember-600 hover:underline truncate block">
                                            {ref.url}
                                        </a>
                                    )}
                                    {ref.referenceType === 'text' && (
                                        <p className="text-xs text-ink-muted truncate">
                                            {ref.content}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => onRemove(ref.id)}
                                className="p-1.5 text-ink-muted hover:text-rose-500 rounded-full active:shadow-pressed opacity-0 group-hover:opacity-100 transition-all"
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
