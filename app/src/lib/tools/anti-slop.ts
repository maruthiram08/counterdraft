export interface SlopMatch {
    word: string;
    suggestion: string;
    reason: string;
    startIndex: number;
    endIndex: number;
}

export class AntiSlopService {
    private static dictionary: Record<string, { suggestion: string; reason: string }> = {
        "delve": { suggestion: "explore, look into", reason: "Common AI opening/transition." },
        "tapestry": { suggestion: "complexity, collection", reason: "Overused AI metaphor." },
        "unleash": { suggestion: "start, release", reason: "Hyperbolic AI-ism." },
        "pivotal": { suggestion: "important, key", reason: "AI filler word." },
        "robust": { suggestion: "strong, reliable", reason: "Overused corporate/AI jargon." },
        "ever-evolving": { suggestion: "changing, growing", reason: "Cliche transition." },
        "digital landscape": { suggestion: "market, world", reason: "Vague AI filler." },
        "comprehensive": { suggestion: "full, thorough", reason: "Often unnecessary filler." },
        "it is important to note": { suggestion: "Note that", reason: "Passive wordiness." },
        "essentially": { suggestion: "", reason: "Filler word; usually removable." },
        "at its core": { suggestion: "basically", reason: "AI-style reductionism." },
        "seamlessly": { suggestion: "easily", reason: "Adverb slop." },
        "transformative": { suggestion: "big", reason: "Hyperbolic AI jargon." },
        "synergy": { suggestion: "collaboration", reason: "Corporate slop." },
        "harness": { suggestion: "use", reason: "AI-style metaphor." }
    };

    /**
     * scan
     * Scans text for slop and returns matches.
     */
    static scan(text: string): SlopMatch[] {
        const matches: SlopMatch[] = [];
        const lowerText = text.toLowerCase();

        Object.entries(this.dictionary).forEach(([slop, meta]) => {
            const regex = new RegExp(`\\b${slop}\\b`, 'gi');
            let match;
            while ((match = regex.exec(text)) !== null) {
                matches.push({
                    word: match[0],
                    suggestion: meta.suggestion,
                    reason: meta.reason,
                    startIndex: match.index,
                    endIndex: match.index + match[0].length
                });
            }
        });

        // Sort by position
        return matches.sort((a, b) => a.startIndex - b.startIndex);
    }
}
