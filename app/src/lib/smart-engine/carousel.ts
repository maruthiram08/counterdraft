
export interface SlideContent {
    index: number;
    text: string;
    type: 'cover' | 'content' | 'outro';
}

/**
 * intelligently splits long text into a carousel sequence.
 */
export function calculateCarousel(text: string, maxCharsPerSlide: number = 150): SlideContent[] {
    const slides: SlideContent[] = [];

    // 1. Cover Slide (First sentence or Title)
    // Heuristic: If there is a newline, take the first line. Else take first 10 words.
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    let title = lines[0];
    let body = lines.slice(1).join('\n');

    if (title.length > 80) {
        // Fallback: title is too long, treat it as body, use generic cover
        body = text;
        title = "Swipe to Read ->";
    }

    slides.push({ index: 0, text: title, type: 'cover' });

    // 2. Body Slides
    // Split remaining text by sentences to avoid cutting mid-thought.
    const sentences = body.match(/[^.!?]+[.!?]+|\s*$/g) || [body];

    let currentSlideText = "";

    sentences.forEach((sentence) => {
        const trimmed = sentence.trim();
        if (!trimmed) return;

        if ((currentSlideText.length + trimmed.length) > maxCharsPerSlide) {
            // Push current slide
            if (currentSlideText) {
                slides.push({ index: slides.length, text: currentSlideText.trim(), type: 'content' });
            }
            currentSlideText = trimmed;
        } else {
            currentSlideText += " " + trimmed;
        }
    });

    // Push last slide
    if (currentSlideText) {
        slides.push({ index: slides.length, text: currentSlideText.trim(), type: 'content' });
    }

    // 3. Outro Slide
    slides.push({ index: slides.length, text: "Save for later", type: 'outro' });

    return slides;
}
