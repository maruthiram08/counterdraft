import { openai } from '@/lib/openai';

export interface PlagiarismSource {
    url: string;
    snippet: string;
    overlap_score: number;
}

export interface PlagiarismResult {
    uniqueness_score: number;
    matched_sources: PlagiarismSource[];
}

export class PlagiarismService {

    /**
     * checkPlagiarism
     * Logic: Chunk -> Search -> Compare -> Score
     */
    static async checkPlagiarism(text: string): Promise<PlagiarismResult> {
        console.log("PlagiarismCheck: process started");

        // 1. Extract searchable chunks (Phrases that are most likely to be unique/matching)
        const chunks = await this.extractSearchableChunks(text);
        if (chunks.length === 0) {
            return { uniqueness_score: 100, matched_sources: [] };
        }

        console.log("PlagiarismCheck: extracted searchable chunks", chunks.length);

        // 2. Search Tavily for each chunk and collect snippets
        const sourcesMap = new Map<string, PlagiarismSource>();

        await Promise.all(chunks.map(async (chunk) => {
            const results = await this.searchTavily(chunk);
            results.forEach((res: any) => {
                const existing = sourcesMap.get(res.url);
                if (existing) {
                    existing.overlap_score += 1; // Increment match count
                } else {
                    sourcesMap.set(res.url, {
                        url: res.url,
                        snippet: res.content,
                        overlap_score: 1
                    });
                }
            });
        }));

        const matchedSources = Array.from(sourcesMap.values())
            .filter(s => s.overlap_score > 0)
            .sort((a, b) => b.overlap_score - a.overlap_score);

        // 3. Final Scoring (LLM judgment)
        const score = await this.calculateUniqueness(text, matchedSources);

        return {
            uniqueness_score: score,
            matched_sources: matchedSources.slice(0, 5) // Top 5 sources
        };
    }

    /**
     * extractSearchableChunks
     * Identifies 3-5 distinct, long phrases from the text that are good candidates for exact matching.
     */
    private static async extractSearchableChunks(text: string): Promise<string[]> {
        const prompt = `
            Extract 5 distinct, long phrases (15-25 words each) from the following text that are most likely to appear as exact matches elsewhere if the text was plagiarized.
            Avoid generic phrases. Focus on the core arguments or specific descriptions.
            Return ONLY a raw JSON array of strings.
            
            Text:
            ${text.substring(0, 2000)}
        `;

        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "text" }
            });

            const content = response.choices[0].message.content || "[]";
            const json = JSON.parse(content.replace(/```json/g, '').replace(/```/g, '').trim());
            return Array.isArray(json) ? json : [];
        } catch (e) {
            console.error("PlagiarismCheck: extraction failed", e);
            return [];
        }
    }

    /**
     * calculateUniqueness
     * Uses LLM to weigh the matched sources against the original text.
     */
    private static async calculateUniqueness(text: string, sources: PlagiarismSource[]): Promise<number> {
        if (sources.length === 0) return 100;

        const sourceSummary = sources.slice(0, 3).map(s => `URL: ${s.url}\nSnippet: ${s.snippet}`).join('\n\n');

        const prompt = `
            Determine the uniqueness percentage (0-100) of the "Original Text" compared to the "Web Sources".
            100 means completely original. 0 means copy-pasted.
            Be strict but fair. Small overlaps in common facts are expected.
            
            Original Text (Snippet):
            ${text.substring(0, 1000)}
            
            Web Sources:
            ${sourceSummary}
            
            Output ONLY a JSON object: { "uniqueness_score": number }
        `;

        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" }
            });

            const content = response.choices[0].message.content || "{}";
            const parsed = JSON.parse(content);
            return typeof parsed.uniqueness_score === 'number' ? parsed.uniqueness_score : 100;
        } catch (e) {
            console.error("PlagiarismCheck: scoring failed", e);
            return 85; // Fallback "Safe" score
        }
    }

    /**
     * searchTavily
     */
    private static async searchTavily(query: string) {
        const apiKey = process.env.TAVILY_API_KEY;
        if (!apiKey) return [];

        try {
            const res = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: apiKey,
                    query: `"${query}"`, // Search for exact phrase
                    search_depth: "basic",
                    max_results: 3
                })
            });

            if (!res.ok) return [];
            const data = await res.json();
            return data.results || [];
        } catch (e) {
            return [];
        }
    }
}
