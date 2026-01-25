import { openai } from '@/lib/openai';

export interface VerificationResult {
    claim: string;
    original_sentence?: string; // For highlighting in Editor
    status: 'verified' | 'disputed' | 'unverified';
    confidence: number;
    source?: {
        url: string;
        snippet: string;
    };
    analysis: string;
}

export class FactCheckService {

    /**
     * verifyDraft
     * Orchestrates the full verification flow.
     */
    static async verifyDraft(text: string): Promise<VerificationResult[]> {
        console.log("FactCheck: process started for text length", text.length);

        // 1. Extract Claims
        const claims = await this.extractClaims(text);
        if (claims.length === 0) return [];

        console.log("FactCheck: extracted claims", claims.length);

        // 2. Verify each item (Parallel)
        const results = await Promise.all(claims.map(item => this.verifyClaim(item.claim, item.original_sentence)));

        return results;
    }

    /**
     * extractClaims
     * Uses LLM to identify factual statements.
     */
    static async extractClaims(text: string): Promise<{ claim: string, original_sentence: string }[]> {
        const prompt = `
            Analyze the following text and extract a list of specific, verifiable factual claims.
            For each claim, you MUST also provide the "original_sentence" from the text where this claim originates.
            
            Return ONLY a raw JSON array of objects:
            [
              { "claim": "summarized claim", "original_sentence": "exact sentence from text" },
              ...
            ]

            Text:
            ${text.substring(0, 4000)}
        `;

        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" }
            });

            const content = response.choices[0].message.content || "{}";
            const json = JSON.parse(content);
            return Array.isArray(json.claims) ? json.claims : (Array.isArray(json) ? json : []);
        } catch (e) {
            console.error("FactCheck: extraction failed", e);
            return [];
        }
    }

    /**
     * verifyClaim
     * Search Tavily -> Judge with LLM
     */
    static async verifyClaim(claim: string, original_sentence?: string): Promise<VerificationResult> {
        try {
            // 1. Search Tavily
            const sources = await this.searchTavily(claim);
            if (sources.length === 0) {
                return {
                    claim,
                    status: 'unverified',
                    confidence: 0,
                    analysis: "No relevant web sources found."
                };
            }

            // 2. Judge (LLM evaluate claim vs source)
            const topSource = sources[0];
            const prompt = `
                Verify this claim against the source snippet.
                Claim: "${claim}"
                Source Snippet: "${topSource.content}"
                Source URL: ${topSource.url}

                Determine if the source supports, contradicts, or is irrelevant to the claim.
                Return JSON: { "status": "verified" | "disputed" | "unverified", "confidence": number (0-1), "analysis": "short explanation" }
            `;

            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" }
            });

            const content = response.choices[0].message.content || "{}";
            const judgement = JSON.parse(content);

            return {
                claim,
                original_sentence,
                status: judgement.status || 'unverified',
                confidence: judgement.confidence || 0,
                source: {
                    url: topSource.url,
                    snippet: topSource.content
                },
                analysis: judgement.analysis || 'Analysis failed'
            };

        } catch (e: any) {
            console.error("FactCheck: verification failed for claim", claim, e);
            const errorMessage = e.message || JSON.stringify(e);
            return {
                claim,
                status: 'unverified',
                confidence: 0,
                analysis: `Error: ${errorMessage}`
            };
        }
    }

    /**
     * searchTavily
     * Direct fetch to Tavily API
     */
    static async searchTavily(query: string) {
        const apiKey = process.env.TAVILY_API_KEY;
        if (!apiKey) throw new Error("Missing TAVILY_API_KEY env var");

        try {
            const res = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: apiKey,
                    query: query,
                    search_depth: "basic",
                    include_answer: false,
                    max_results: 1
                })
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Tavily API ${res.status}: ${text}`);
            }

            const data = await res.json();
            return data.results || [];
        } catch (e) {
            throw e; // Propagate to verifyClaim catch block
        }
    }
}
