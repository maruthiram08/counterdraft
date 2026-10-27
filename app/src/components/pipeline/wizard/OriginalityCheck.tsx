import { useMemo } from "react";
import { ShieldCheck, AlertTriangle, ExternalLink, Plus } from "lucide-react";
import type { ReframeSettings } from "@/types";
import { checkOriginality, creditLine, hasCredit, whosePost } from "@/lib/brain/reframe";

interface OriginalityCheckProps {
    draft: string;
    reframe: ReframeSettings;
    domain?: string;
    onAddCredit: (line: string) => void;
}

// A reframe checked against the post it reacts to: copied lines, and an optional credit line
export function OriginalityCheck({ draft, reframe, domain, onAddCredit }: OriginalityCheckProps) {
    const { copied } = useMemo(() => checkOriginality(draft, reframe.original), [draft, reframe.original]);
    const credit = creditLine(reframe, domain);
    const credited = hasCredit(draft, credit);
    const whose = whosePost(reframe.author, domain);

    return (
        <section aria-label="Originality" className="mt-4 bg-surface rounded-tile shadow-card p-4 md:p-5 flex flex-col gap-3">
            <div className="flex items-start gap-3">
                {copied.length ? (
                    <AlertTriangle size={18} className="text-ember-600 shrink-0 mt-0.5" />
                ) : (
                    <ShieldCheck size={18} className="text-sage-700 shrink-0 mt-0.5" />
                )}
                <div className="flex flex-col gap-1 min-w-0">
                    <p className="text-sm font-medium text-ink">
                        {copied.length
                            ? `${copied.length} ${copied.length === 1 ? 'line repeats' : 'lines repeat'} ${whose}`
                            : `Your own words: nothing copied from ${whose}`}
                    </p>
                    {copied.length > 0 && (
                        <p className="text-xs text-ink-muted">Put these in your own words, or keep a short quote in quotation marks and credit it.</p>
                    )}
                </div>
            </div>

            {copied.length > 0 && (
                <ul className="flex flex-col gap-2">
                    {copied.slice(0, 5).map(line => (
                        <li key={line} className="text-sm text-ink-soft bg-ember-50 rounded-2xl px-3 py-2 line-clamp-3">{line}</li>
                    ))}
                </ul>
            )}

            <div className="flex flex-wrap items-center gap-2">
                {!credited && (
                    <button
                        type="button"
                        onClick={() => onAddCredit(credit)}
                        className="h-11 px-4 rounded-full bg-canvas shadow-raised text-sm font-medium text-ink hover:text-ember-600 active:shadow-pressed transition-all flex items-center gap-2"
                        title={credit}
                    >
                        <Plus size={14} /> Add credit line
                    </button>
                )}
                {credited && <span className="text-xs text-ink-muted">Credit line added.</span>}
                {reframe.postUrl && (
                    <a
                        href={reframe.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-11 px-3 rounded-full text-sm text-ink-soft hover:text-ember-600 flex items-center gap-1.5"
                    >
                        <ExternalLink size={14} /> Original post
                    </a>
                )}
            </div>
        </section>
    );
}
