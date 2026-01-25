
export interface TypographyConfig {
    fontSize: number;
    lineHeight: number;
    fontWeight: number;
}

/**
 * Calculates optimal typography based on text length.
 * Replicates a designer's decision to "scale down" text as it gets longer.
 */
export function calculateSmartTypography(text: string, maxChars: number = 300): TypographyConfig {
    const len = text.length;

    if (len < 20) {
        return { fontSize: 80, lineHeight: 1.1, fontWeight: 800 }; // Massive (Hook)
    } else if (len < 50) {
        return { fontSize: 60, lineHeight: 1.2, fontWeight: 700 }; // Headline
    } else if (len < 100) {
        return { fontSize: 48, lineHeight: 1.3, fontWeight: 600 }; // Sub-headline
    } else if (len < 200) {
        return { fontSize: 36, lineHeight: 1.4, fontWeight: 500 }; // Body
    } else {
        return { fontSize: 24, lineHeight: 1.5, fontWeight: 400 }; // Detailed Body
    }
}
