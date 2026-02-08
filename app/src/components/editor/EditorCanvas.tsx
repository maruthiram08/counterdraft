import { RefObject, useEffect, useRef } from "react";

interface EditorCanvasProps {
    content: string;
    setContent: (v: string) => void;
    beliefText: string;
    setBeliefText: (v: string) => void;
    isPreview: boolean;
    parseMarkdown: (t: string) => string;
    renderHighlights: () => string | null;
    textareaRef: RefObject<HTMLTextAreaElement | null>;
    draftStatus: string;
}

export function EditorCanvas({
    content,
    setContent,
    beliefText,
    setBeliefText,
    isPreview,
    parseMarkdown,
    renderHighlights,
    textareaRef,
    draftStatus
}: EditorCanvasProps) {
    const titleRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize title on mount and change
    useEffect(() => {
        if (titleRef.current) {
            titleRef.current.style.height = 'auto';
            titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
        }
    }, [beliefText]);

    return (
        <>
            {/* Title / Context */}
            <div className={`mb-6 md:mb-12 group/title ${draftStatus === 'published' ? 'select-none' : ''}`}>
                <textarea
                    ref={titleRef}
                    value={beliefText}
                    readOnly={draftStatus === 'published'}
                    onChange={(e) => {
                        if (draftStatus === 'published') return;
                        setBeliefText(e.target.value);
                    }}
                    placeholder="Draft Title..."
                    rows={1}
                    className={`w-full resize-none text-xl md:text-3xl font-serif font-medium leading-tight mb-4 md:mb-6 break-words bg-transparent border-none outline-none overflow-hidden placeholder:text-gray-300 transition-colors ${draftStatus === 'published' ? 'text-gray-500' : 'text-gray-800 focus:text-black'}`}
                    style={{ height: 'auto' }}
                />
                <div className="flex justify-center">
                    <div className="w-8 h-1 bg-[var(--accent)]/10 rounded-full mb-4 md:mb-8 group-focus-within/title:bg-[var(--accent)]/30 transition-colors"></div>
                </div>
            </div>

            {/* Editor / Preview Switch */}
            {isPreview ? (
                <div
                    className="w-full min-h-[40vh] md:min-h-[60vh] text-base md:text-lg leading-relaxed md:leading-loose text-gray-700 font-sans focus:outline-none animate-in fade-in duration-200"
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
                />
            ) : (
                <div className="relative w-full">
                    {/* Highlighting Backdrop */}
                    <div
                        className="absolute inset-0 pointer-events-none text-base md:text-lg leading-relaxed md:leading-loose text-transparent font-sans break-words whitespace-pre-wrap select-none p-0 bg-transparent z-0 overflow-hidden"
                        aria-hidden="true"
                        style={{
                            whiteSpace: 'pre-wrap',
                            overflowWrap: 'break-word',
                        }}
                        dangerouslySetInnerHTML={{ __html: renderHighlights() || '' }}
                    />

                    <textarea
                        ref={textareaRef}
                        value={content}
                        readOnly={draftStatus === 'published'}
                        onChange={(e) => {
                            if (draftStatus === 'published') return;
                            setContent(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        className="w-full min-h-[40vh] md:min-h-[60vh] resize-none text-base md:text-lg leading-relaxed md:leading-loose text-gray-700 font-sans placeholder:text-gray-300 bg-transparent selection:bg-[var(--accent)]/30 overflow-hidden break-words relative z-10"
                        spellCheck={false}
                        style={{
                            outline: 'none',
                            border: 'none',
                            boxShadow: 'none',
                            backgroundColor: 'transparent',
                            color: 'inherit',
                            whiteSpace: 'pre-wrap',
                            overflowWrap: 'break-word',
                        }}
                    />
                </div>
            )}
        </>
    );
}
