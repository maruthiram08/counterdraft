
import { useState } from "react";
import type { Draft, RepurposeOptions, InstagramSlide } from "@/types";
import type { SlideContent } from "@/lib/pptx-generator";

interface UseRepurposeProps {
    draft: Draft | null;
    content: string;
    coverImage: string | null;
    onSave: (id: string, content: string) => Promise<boolean>;
    getFullContent: () => string;
}

export function useRepurpose({
    draft,
    content,
    coverImage,
    onSave,
    getFullContent
}: UseRepurposeProps) {
    const [showRepurposeModal, setShowRepurposeModal] = useState(false);
    const [isRepurposing, setIsRepurposing] = useState(false);

    const handleRepurpose = async (platform: string, options: RepurposeOptions) => {
        if (!draft) return null;
        setIsRepurposing(true);
        try {
            await onSave(draft.id, getFullContent());

            const res = await fetch('/api/content/repurpose', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceId: draft.id,
                    platform,
                    options
                })
            });

            if (res.ok) {
                const data = await res.json();
                return data.id || null;
            } else {
                console.error("Repurpose failed with status:", res.status);
                return null;
            }
        } catch (e) {
            console.error("Repurpose Error:", e);
            return null;
        } finally {
            setIsRepurposing(false);
        }
    };

    const handleDownloadDesign = () => {
        if (!draft || draft.platform !== 'instagram') return;

        import('@/lib/pptx-generator').then(({ PptxGenerator }) => {
            const gen = new PptxGenerator();
            const slides: SlideContent[] = [];

            // Access platform_metadata safely since we know it's an 'instagram' draft conceptually
            const metadata = draft.platform_metadata as { slides?: InstagramSlide[] };

            if (metadata && Array.isArray(metadata.slides)) {
                const mapped = metadata.slides.map((s: InstagramSlide) => ({
                    title: s.header || "Slide",
                    body: s.body || "",
                    type: 'content' as const,
                    visualNotes: s.visualDescription
                }));
                slides.push(...mapped);
            } else {
                // Fallback: Naive Text Splitting
                const parts = content.split('\n\n').filter(p => p.trim().length > 0);
                const title = parts[0]?.replace(/^#+\s*/, '') || "Untitled";
                const bodyParts = parts.slice(1);

                bodyParts.forEach(part => {
                    slides.push({ title: title, body: part, type: 'content' as const });
                });
            }

            // Inject Cover Image
            if (coverImage && slides.length > 0) {
                slides[0].imageUrl = coverImage;
            }

            if (slides.length === 0) {
                slides.push({ title: "Draft", body: "No content found.", type: 'cover' as const });
            }

            gen.generateInstagramPost(slides);
        });
    };

    return {
        showRepurposeModal,
        setShowRepurposeModal,
        isRepurposing,
        handleRepurpose,
        handleDownloadDesign
    };
}
