import { RefObject } from "react";

interface EditorCanvasProps {
    content: string;
    setContent: (v: string) => void;
    isPreview: boolean;
    parseMarkdown: (t: string) => string;
    renderHighlights: () => string | null;
    textareaRef: RefObject<HTMLTextAreaElement | null>;
    draftStatus: string;
    beliefText: string;
}

export function EditorCanvas({
    content,
    setContent,
    isPreview,
    parseMarkdown,
    renderHighlights,
    textareaRef,
    draftStatus,
    beliefText
}: EditorCanvasProps) {
    return (
        <div className="max-w-4xl mx-auto py-8 md:py-20 px-4 md:px-16 min-h-full relative">
            {/* Title / Context */}
            <div className="mb-6 md:mb-12 select-none">
                <h2 className={`text-xl md:text-3xl font-serif font-medium leading-tight mb-4 md:mb-6 break-words ${draftStatus === 'published' ? 'text-gray-500' : 'text-gray-800'}`}>
                    {beliefText}
                </h2>
                <div className="flex justify-center">
                    <div className="w-8 h-1 bg-[var(--accent)]/10 rounded-full mb-4 md:mb-8"></div>
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
        </div>
    );
}
