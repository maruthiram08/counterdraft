
import PptxGenJS from "pptxgenjs";

interface SlideContent {
    title: string;
    body: string;
    type: 'cover' | 'content';
    visualNotes?: string;
    imageUrl?: string;
}

export class PptxGenerator {
    private pres: PptxGenJS;

    constructor() {
        this.pres = new PptxGenJS();
    }

    /**
     * Generates a square (1080x1080 equivalent) presentation
     * optimized for Instagram import into Canva.
     */
    generateInstagramPost(slides: SlideContent[]) {
        // 1. Set Layout to Square 1080x1080
        // pptxgenjs uses inches. 1080px at 96dpi is 11.25 inches.
        // Let's use a standard 10x10 inch for simplicity, Canva scales it.
        // Define Custom Layout
        this.pres.defineLayout({ name: 'IG Square', width: 10, height: 10 });
        this.pres.layout = 'IG Square';

        slides.forEach(slide => {
            const s = this.pres.addSlide();
            s.background = { color: "FFFFFF" };

            // Image Handler
            if (slide.imageUrl) {
                s.addImage({
                    path: slide.imageUrl,
                    x: 0, y: 0, w: 10, h: 10,
                    sizing: { type: 'contain', w: 10, h: 10 }
                });
            }

            // Title
            s.addText(slide.title, {
                x: 0.5, y: 1, w: 9, h: 2,
                fontSize: 48,
                bold: true,
                color: "111111",
                align: "center",
                fontFace: "Arial"
            });

            // Body
            s.addText(slide.body, {
                x: 1, y: 3.5, w: 8, h: 5,
                fontSize: 24,
                color: "333333",
                align: "center",
                fontFace: "Arial",
                valign: "top"
            });

            // Helpful "meta" text for Canva user (hidden or small)
            s.addText("Draft content for Canva design", {
                x: 0.5, y: 9.5, w: 9, h: 0.5,
                fontSize: 10,
                color: "999999",
                align: "center"
            });
        });

        // 2. Browser Download
        return this.pres.writeFile({ fileName: "Counterdraft-Design-Handoff.pptx" });
    }
}
