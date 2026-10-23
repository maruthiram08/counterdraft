import { MessageCircleQuestion } from "lucide-react";
import type { DraftQuestion } from "@/lib/editor/draft-tools";

interface DraftQuestionsStepProps {
    questions: DraftQuestion[];
    answers: string[];
    onChange: (index: number, answer: string) => void;
    dontAsk: boolean;
    onDontAskChange: (value: boolean) => void;
    onSkip: () => void;
}

// A few questions before drafting, so the draft starts from the writer's own stories instead of [placeholders]
export function DraftQuestionsStep({ questions, answers, onChange, dontAsk, onDontAskChange, onSkip }: DraftQuestionsStepProps) {
    const answered = answers.filter(a => a.trim()).length;

    return (
        <div className="space-y-5 max-w-3xl">
            <div>
                <h3 className="flex items-center gap-2 text-2xl font-medium tracking-[-0.02em] text-ink">
                    <MessageCircleQuestion size={22} className="text-ember-500" /> Before I write: {questions.length === 1 ? 'one question' : `${questions.length} quick questions`}
                </h3>
                <p className="mt-1 text-sm text-ink-soft">Only you know these. A sentence or two each is plenty; anything you leave blank becomes a [placeholder] to fill later.</p>
            </div>

            <ol className="space-y-4">
                {questions.map((q, i) => (
                    <li key={i} className="bg-surface rounded-card shadow-card p-5 space-y-2">
                        <label htmlFor={`draft-q-${i}`} className="block text-sm font-medium text-ink">{q.question}</label>
                        {q.hint && <p className="text-xs text-ink-muted">{q.hint}</p>}
                        <textarea
                            id={`draft-q-${i}`}
                            value={answers[i] || ''}
                            onChange={(e) => onChange(i, e.target.value)}
                            rows={3}
                            className="w-full resize-y bg-canvas shadow-well rounded-2xl px-4 py-3 text-sm text-ink placeholder:text-ink-muted outline-none focus:ring-2 focus:ring-ember-200"
                            placeholder="Your answer"
                        />
                    </li>
                ))}
            </ol>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs text-ink-soft cursor-pointer select-none">
                    <input type="checkbox" checked={dontAsk} onChange={(e) => onDontAskChange(e.target.checked)} className="accent-ember-500" />
                    Don&apos;t ask me before drafting
                </label>
                <button onClick={onSkip} className="h-10 px-4 rounded-full text-sm font-medium text-ink-muted hover:text-ink active:shadow-pressed transition-all">
                    {answered ? 'Write without my answers' : 'Skip and write the draft'}
                </button>
            </div>
        </div>
    );
}
