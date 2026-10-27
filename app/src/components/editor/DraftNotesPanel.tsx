"use client";

import { useState } from "react";
import { Loader2, Plus, X, NotebookPen } from "lucide-react";
import type { DraftAnswer } from "@/lib/editor/draft-tools";
import { MAX_DRAFT_NOTES } from "@/lib/editor/draft-tools";

interface DraftNotesPanelProps {
    notes: DraftAnswer[];
    onChange: (notes: DraftAnswer[]) => void;
    onWorkIn: (notes: DraftAnswer[]) => void;
    working: boolean;
    disabled?: boolean;
}

// Everything the writer has told us for this post: answers before drafting, and anything they remember later.
// Every draft uses them; "Work them in" puts new ones into the draft as it stands, edits and all.
export function DraftNotesPanel({ notes, onChange, onWorkIn, working, disabled }: DraftNotesPanelProps) {
    const [text, setText] = useState('');
    const full = notes.length >= MAX_DRAFT_NOTES;

    const add = () => {
        const answer = text.trim();
        if (!answer || full) return;
        onChange([...notes, { question: '', answer }]);
        setText('');
    };

    const workIn = () => {
        const answer = text.trim();
        const next = answer && !full ? [...notes, { question: '', answer }] : notes;
        if (answer && !full) {
            onChange(next);
            setText('');
        }
        onWorkIn(next);
    };

    return (
        <div className="space-y-3">
            <p className="text-xs text-ink-muted">What you&apos;ve told me for this post. Every draft uses these. Remembered a story, a name or a number? Add it and I&apos;ll work it in.</p>
            {notes.length > 0 && (
                <ul className="space-y-2">
                    {notes.map((n, i) => (
                        <li key={i} className="flex items-start gap-2 bg-canvas shadow-well rounded-2xl px-4 py-3 text-sm">
                            <div className="flex-1 min-w-0">
                                {n.question && <p className="text-xs text-ink-muted">{n.question}</p>}
                                <p className="text-ink whitespace-pre-wrap">{n.answer}</p>
                            </div>
                            <button
                                onClick={() => onChange(notes.filter((_, j) => j !== i))}
                                disabled={disabled || working}
                                aria-label="Remove note"
                                className="shrink-0 w-8 h-8 -mr-2 -mt-1 rounded-full flex items-center justify-center text-ink-muted hover:text-ink active:shadow-pressed transition-all disabled:opacity-50"
                            >
                                <X size={14} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                disabled={disabled || full}
                aria-label="Add a note"
                placeholder={full ? `Up to ${MAX_DRAFT_NOTES} notes; remove one to add another` : 'e.g. When India won the 2011 World Cup I was in a client meeting in Pune and we all stopped to watch'}
                className="w-full resize-y bg-canvas shadow-well rounded-2xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted outline-none focus:ring-2 focus:ring-ember-200"
            />
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={workIn}
                    disabled={disabled || working || (!notes.length && !text.trim())}
                    className="flex items-center gap-1.5 h-9 px-4 rounded-full bg-ember-500 text-white text-xs font-medium hover:bg-ember-600 shadow-ember active:shadow-pressed transition-all disabled:opacity-50"
                >
                    {working ? <Loader2 size={12} className="animate-spin" /> : <NotebookPen size={12} />}
                    Work my notes into the draft
                </button>
                <button
                    onClick={add}
                    disabled={disabled || working || full || !text.trim()}
                    className="flex items-center gap-1.5 h-9 px-4 rounded-full bg-canvas shadow-raised text-xs font-medium text-ink-soft hover:text-ink active:shadow-pressed transition-all disabled:opacity-50"
                >
                    <Plus size={12} /> Save note for later
                </button>
            </div>
        </div>
    );
}
