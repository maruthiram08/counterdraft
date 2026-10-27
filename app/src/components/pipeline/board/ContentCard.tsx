import { Archive, ArrowRight, FileText, Trash2, Wand2 } from "lucide-react";
import { ContentItem } from "./types";

interface ContentCardProps {
    item: ContentItem;
    onAction: (id: string, action: string) => void;
}

const CONFIDENCE_STYLES: Record<string, string> = {
    high: 'bg-ink text-white',
    medium: 'bg-ember-100 text-ember-700',
    low: 'bg-canvas shadow-well text-ink-muted',
};

const PLATFORM_LABELS: Record<string, string> = { linkedin: 'LinkedIn', twitter: 'X', x: 'X', substack: 'Substack', medium: 'Medium', instagram: 'Instagram' };

const sentenceCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function PrimaryAction({ label, icon, onClick, title }: { label: string; icon: React.ReactNode; onClick: () => void; title?: string }) {
    return (
        <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="flex items-center gap-1.5 h-9 pl-3 pr-3.5 rounded-full bg-canvas text-ink text-xs font-medium shadow-raised hover:text-ember-600 active:shadow-pressed transition-all"
            title={title}
        >
            {icon}
            {label}
        </button>
    );
}

export function ContentCard({ item, onAction }: ContentCardProps) {
    const stage = item.stage;
    const confidence = item.brain_metadata?.confidence;
    const isTopic = item.brain_metadata?.explore?.savedAs === 'topic';
    const fromCaptures = item.brain_metadata?.explore?.from === 'captures';

    return (
        <div className="bg-surface p-4 rounded-tile shadow-card hover:shadow-float hover:-translate-y-0.5 transition-all duration-200 group flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                    {isTopic && (
                        <span className="h-7 px-3 rounded-full bg-ember-50 text-ember-700 text-xs font-medium flex items-center" title="Saved from Explore before picking a post idea">
                            Topic
                        </span>
                    )}
                    {fromCaptures && (
                        <span className="h-7 px-3 rounded-full bg-dusk-100 text-dusk-700 text-xs font-medium flex items-center" title="Found from your Lens captures">
                            From captures
                        </span>
                    )}
                    {item.format && (
                        <span className="h-7 px-3 rounded-full bg-canvas shadow-well text-ink-soft text-xs font-medium flex items-center">
                            {sentenceCase(item.format)}
                        </span>
                    )}
                    {item.platform && (
                        <span className="h-7 px-3 rounded-full bg-canvas shadow-well text-ink-soft text-xs font-medium flex items-center">
                            {PLATFORM_LABELS[item.platform.toLowerCase()] ?? sentenceCase(item.platform)}
                        </span>
                    )}
                    {confidence && (
                        <span className={`h-7 px-3 rounded-full text-xs font-medium flex items-center ${CONFIDENCE_STYLES[confidence] ?? CONFIDENCE_STYLES.low}`}>
                            {sentenceCase(confidence)} confidence
                        </span>
                    )}
                </div>
                <span className="text-xs text-ink-muted whitespace-nowrap pt-1.5">
                    {new Date(item.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
            </div>

            <div className="space-y-2">
                <h3 className="text-[17px] font-medium tracking-[-0.01em] text-ink leading-snug text-balance">
                    {item.hook || 'Untitled idea'}
                </h3>
                <p className="text-sm text-ink-soft line-clamp-3 leading-relaxed">
                    {item.draft_content || item.angle || "No content yet."}
                </p>
            </div>

            <div className="mt-auto pt-1 flex items-center justify-between md:hidden md:group-hover:flex md:group-focus-within:flex">
                <div className="flex gap-1.5">
                    {stage === 'idea' && (
                        <>
                            <PrimaryAction label="Develop" icon={<Wand2 size={14} />} onClick={() => onAction(item.id, 'develop')} />
                            <PrimaryAction label="Draft" icon={<ArrowRight size={14} />} onClick={() => onAction(item.id, 'start_draft')} title="Quick Draft" />
                        </>
                    )}
                    {stage === 'developing' && (
                        <PrimaryAction label="Continue" icon={<Wand2 size={14} />} onClick={() => onAction(item.id, 'develop')} title="Continue Development" />
                    )}
                    {(stage === 'draft' || stage === 'published') && (
                        <PrimaryAction label="Open" icon={<FileText size={14} />} onClick={() => onAction(item.id, 'edit')} title={stage === 'published' ? 'View/Edit' : undefined} />
                    )}
                </div>

                <div className="flex gap-1 items-center">
                    <button
                        onClick={(e) => { e.stopPropagation(); onAction(item.id, 'archive'); }}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-ink-muted hover:text-ink active:shadow-pressed transition-all"
                        title="Archive"
                    >
                        <Archive size={15} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onAction(item.id, 'delete'); }}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-ink-muted hover:text-ember-600 active:shadow-pressed transition-all"
                        title="Delete"
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>
        </div>
    );
}
