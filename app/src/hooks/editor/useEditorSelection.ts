import { useState, useCallback, useEffect, RefObject } from "react";
import { getCaretCoordinates } from "@/lib/textarea-utils";

interface SelectionRange {
    start: number;
    end: number;
}

interface ToolbarPosition {
    top: number;
    left: number;
}

export function useEditorSelection(textareaRef: RefObject<HTMLTextAreaElement | null>) {
    const [toolbarPosition, setToolbarPosition] = useState<ToolbarPosition | null>(null);
    const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null);

    const handleSelect = useCallback(() => {
        if (!textareaRef.current) return;

        // Small timeout to allow browser to settle selection state
        setTimeout(() => {
            if (!textareaRef.current) return;

            const start = textareaRef.current.selectionStart;
            const end = textareaRef.current.selectionEnd;

            // Ensure real selection (at least 2 chars)
            if (start === end || (end - start) < 2) {
                setToolbarPosition(null);
                setSelectionRange(null);
                return;
            }

            // Calculate Pixel Coordinates
            const { top, left, height } = getCaretCoordinates(textareaRef.current, start);
            const rect = textareaRef.current.getBoundingClientRect();

            // Clamp top to be visible (account for header ~64px + toolbar height ~60px)
            const toolbarHeight = 160;
            const headerOffset = 80;

            let fixedTop = rect.top + top;
            let fixedLeft = rect.left + left;

            // Ensure it doesn't go above header
            if (fixedTop < headerOffset + toolbarHeight) {
                fixedTop = fixedTop + height + headerOffset;
            }

            // Ensure it doesn't go off right screen
            if (fixedLeft > window.innerWidth - 340) {
                fixedLeft = window.innerWidth - 340;
            }

            setSelectionRange({ start, end });
            setToolbarPosition({ top: fixedTop, left: fixedLeft });
        }, 10);
    }, [textareaRef]);

    // Global listener to catch selection release even if mouse is outside textarea
    useEffect(() => {
        const handler = () => handleSelect();

        document.addEventListener('mouseup', handler);
        document.addEventListener('keyup', handler);

        return () => {
            document.removeEventListener('mouseup', handler);
            document.removeEventListener('keyup', handler);
        };
    }, [handleSelect]);

    return { toolbarPosition, setToolbarPosition, selectionRange, setSelectionRange };
}
