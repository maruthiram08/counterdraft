import { useState, useRef, useEffect } from "react";
import { MessageSquare, Edit2, Check, X, Trash2, RefreshCw, Loader2 } from "lucide-react";

interface ResearchItemProps {
    text: string;
    notes?: string[];
    isNew?: boolean;
    showBullet?: boolean;
    onUpdate: (newText: string) => void;
    onAddNote: (note: string) => void;
    onDeleteNote: (index: number) => void;
    onDelete: () => void;
    onRefine?: () => void;
    loading?: boolean;
}

export function ResearchItem({ text, notes = [], isNew = false, showBullet = true, onUpdate, onAddNote, onDeleteNote, onDelete, onRefine, loading = false }: ResearchItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(text);
    const [showNoteInput, setShowNoteInput] = useState(false);
    const [noteText, setNoteText] = useState("");
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            // Adjust height
            inputRef.current.style.height = "auto";
            inputRef.current.style.height = inputRef.current.scrollHeight + "px";
        }
    }, [isEditing]);

    const handleSaveEdit = () => {
        if (editedText.trim()) {
            onUpdate(editedText);
        } else {
            setEditedText(text); // Revert if empty
        }
        setIsEditing(false);
    };

    const handleSaveNote = () => {
        if (noteText.trim()) {
            onAddNote(noteText);
            setNoteText("");
            setShowNoteInput(false);
        }
    };

    return (
        <div className={`group bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-all ${loading ? 'opacity-70' : ''} ${isNew ? 'ring-1 ring-amber-200 bg-amber-50/10' : ''}`}>
            {/* Content Area */}
            <div className="flex items-start gap-3">
                {isNew ? (
                    <span className="text-amber-500 mt-1 animate-pulse scale-110" title="New finding">✨</span>
                ) : showBullet ? (
                    <span className="text-[var(--accent)] mt-1">•</span>
                ) : null}

                <div className="flex-1 min-w-0">
                    {isEditing ? (
                        <div className="space-y-2">
                            <textarea
                                ref={inputRef}
                                value={editedText}
                                onChange={(e) => {
                                    setEditedText(e.target.value);
                                    e.target.style.height = "auto";
                                    e.target.style.height = e.target.scrollHeight + "px";
                                }}
                                className="w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none overflow-hidden"
                                rows={2}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSaveEdit();
                                    }
                                }}
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setIsEditing(false)} className="p-1 hover:bg-gray-100 rounded text-gray-400">
                                    <X size={14} />
                                </button>
                                <button onClick={handleSaveEdit} className="p-1 hover:bg-green-50 rounded text-green-600">
                                    <Check size={14} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-700 leading-relaxed">
                            {loading ? (
                                <span className="flex items-center gap-2 text-gray-400 italic">
                                    <Loader2 size={14} className="animate-spin" /> Refining...
                                </span>
                            ) : text}
                        </p>
                    )}

                    {/* Notes List */}
                    {notes && notes.length > 0 && (
                        <div className="mt-3 space-y-2 pl-2 border-l-2 border-amber-100">
                            {notes.map((note, idx) => (
                                <div key={idx} className="bg-amber-50/50 p-2 rounded text-xs text-gray-600 flex justify-between group/note">
                                    <span>{note}</span>
                                    <button
                                        onClick={() => onDeleteNote(idx)}
                                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover/note:opacity-100 transition-opacity"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Note Input */}
                    {showNoteInput && (
                        <div className="mt-3 flex gap-2">
                            <input
                                type="text"
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder="Add a note or instruction..."
                                className="flex-1 text-xs px-2 py-1.5 border rounded focus:outline-none focus:border-amber-400"
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveNote()}
                                autoFocus
                            />
                            <button
                                onClick={handleSaveNote}
                                disabled={!noteText.trim()}
                                className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs hover:bg-amber-200 disabled:opacity-50"
                            >
                                Add
                            </button>
                        </div>
                    )}
                </div>

                {/* Actions Toolbar */}
                {!loading && (
                    <div className="flex flex-row gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {onRefine && (
                            <button
                                onClick={onRefine}
                                className="p-1.5 text-gray-400 hover:text-[var(--accent)] hover:bg-indigo-50 rounded"
                                title="Regenerate this point"
                            >
                                <RefreshCw size={14} />
                            </button>
                        )}
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit text"
                        >
                            <Edit2 size={14} />
                        </button>
                        <button
                            onClick={() => setShowNoteInput(!showNoteInput)}
                            className={`p-1.5 rounded transition-colors ${showNoteInput ? 'text-amber-600 bg-amber-50' : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'}`}
                            title="Add note"
                        >
                            <MessageSquare size={14} />
                        </button>
                        <button
                            onClick={onDelete}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete item"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
