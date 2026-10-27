import { useState, useRef, useEffect } from "react";
import { MessageSquare, Edit2, Check, X, Trash2, Loader2 } from "lucide-react";
import { AnimatedIcon } from "@/components/icons/AnimatedIcon";
import { RefreshCWIcon } from "@/components/icons/animated";

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
        <div className={`group bg-surface rounded-tile shadow-card p-4 hover:shadow-float transition-all ${loading ? 'opacity-70' : ''} ${isNew ? 'ring-1 ring-ember-200 bg-ember-50/40' : ''}`}>
            {/* Content Area: on phones the actions drop to their own row so the text keeps the full width */}
            <div className="flex flex-wrap md:flex-nowrap items-start gap-x-3 gap-y-1">
                {isNew ? (
                    <span className="text-ember-500 mt-1 animate-pulse scale-110" title="New finding">✨</span>
                ) : showBullet ? (
                    <span className="text-ember-500 mt-1">•</span>
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
                                className="w-full px-3 py-2 text-sm bg-canvas shadow-well rounded-2xl text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200 resize-none overflow-hidden"
                                rows={2}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSaveEdit();
                                    }
                                }}
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setIsEditing(false)} className="p-3 md:p-1.5 rounded-full text-ink-muted hover:text-ink active:shadow-pressed transition-all">
                                    <X size={14} />
                                </button>
                                <button onClick={handleSaveEdit} className="p-3 md:p-1.5 rounded-full text-sage-700 hover:bg-sage-100 active:shadow-pressed transition-all">
                                    <Check size={14} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-ink-soft leading-relaxed">
                            {loading ? (
                                <span className="flex items-center gap-2 text-ink-muted italic">
                                    <Loader2 size={14} className="animate-spin" /> Refining...
                                </span>
                            ) : text}
                        </p>
                    )}

                    {/* Notes List */}
                    {notes && notes.length > 0 && (
                        <div className="mt-3 space-y-2 pl-2 border-l-2 border-ember-100">
                            {notes.map((note, idx) => (
                                <div key={idx} className="bg-ember-50 px-3 py-2 rounded-xl text-xs text-ink-soft flex justify-between group/note">
                                    <span>{note}</span>
                                    <button
                                        onClick={() => onDeleteNote(idx)}
                                        className="text-ink-muted hover:text-rose-500 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/note:opacity-100 transition-opacity"
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
                                className="flex-1 text-xs px-3 py-2 bg-canvas shadow-well rounded-full text-ink placeholder:text-ink-muted border-0 focus:outline-none focus:ring-2 focus:ring-ember-200"
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveNote()}
                                autoFocus
                            />
                            <button
                                onClick={handleSaveNote}
                                disabled={!noteText.trim()}
                                className="h-8 px-3 rounded-full bg-ember-100 text-ember-700 text-xs font-medium hover:bg-ember-200 disabled:opacity-50 transition-all"
                            >
                                Add
                            </button>
                        </div>
                    )}
                </div>

                {/* Actions Toolbar */}
                {!loading && (
                    <div className="w-full md:w-auto flex flex-row justify-end gap-0.5 -mb-1.5 md:mb-0 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity shrink-0">
                        {onRefine && (
                            <button
                                onClick={onRefine}
                                className="p-3 md:p-1.5 rounded-full text-ink-muted hover:text-ember-600 active:shadow-pressed transition-all"
                                title="Regenerate this point"
                            >
                                <AnimatedIcon icon={RefreshCWIcon} size={14} />
                            </button>
                        )}
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-3 md:p-1.5 rounded-full text-ink-muted hover:text-ink active:shadow-pressed transition-all"
                            title="Edit text"
                        >
                            <Edit2 size={14} />
                        </button>
                        <button
                            onClick={() => setShowNoteInput(!showNoteInput)}
                            className={`p-3 md:p-1.5 rounded-full transition-all ${showNoteInput ? 'text-ember-600 bg-canvas shadow-pressed' : 'text-ink-muted hover:text-ember-600 active:shadow-pressed'}`}
                            title="Add note"
                        >
                            <MessageSquare size={14} />
                        </button>
                        <button
                            onClick={onDelete}
                            className="p-3 md:p-1.5 rounded-full text-ink-muted hover:text-rose-500 active:shadow-pressed transition-all"
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
