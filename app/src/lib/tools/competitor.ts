import { openai } from '@/lib/openai';

export interface CompetitorInsight {
    type: 'unique' | 'common' | 'missing';
    claim: string;
    description: string;
    sourceUrl?: string;
}

export interface CompetitorCheckResult {
    insights: CompetitorInsight[];
    summary: string;
}

export class CompetitorService {

    /**
     * checkCompetitors
     * Logic: Find Competitors (or use specific URL) -> Analyze Claims -> Compare
     */
    static async checkCompetitors(text: string, competitorUrl?: string): Promise<CompetitorCheckResult> {
        console.log("CompetitorCheck: process started");

        // 1. Get competitor content
        let competitorData = [];
        if (competitorUrl) {
            console.log("CompetitorCheck: fetching specific URL", competitorUrl);
            const content = await this.fetchUrlContent(competitorUrl);
            competitorData.push({ url: competitorUrl, content });
        } else {
            console.log("CompetitorCheck: searching for top leaders");
            competitorData = await this.searchForCompetitors(text);
        }

        if (competitorData.length === 0) {
            return { insights: [], summary: "No competitor content found to compare against." };
        }

        // 2. Perform semantic comparison via LLM
        return await this.performComparison(text, competitorData);
    }

    private static async searchForCompetitors(text: string) {
        // Extract topic
        const topicPrompt = `Extract the core topic/keyword of this text in 3-5 words: "${text.substring(0, 500)}"`;
        const topicResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: topicPrompt }]
        });
        const topic = topicResponse.choices[0].message.content || "latest trends";

        const apiKey = process.env.TAVILY_API_KEY;
        const res = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: apiKey,
                query: `top articles on ${topic}`,
                search_depth: "basic",
                max_results: 3
            })
        });

        if (!res.ok) return [];
        const data = await res.json();
        return (data.results || []).map((r: any) => ({ url: r.url, content: r.content }));
    }

    private static async fetchUrlContent(url: string) {
        const apiKey = process.env.TAVILY_API_KEY;
        // Tavily's search with a specific URL or just use content extraction if available?
        // We can use the search API with the URL as a query or use their "extract" if they have it.
        // For simplicity, we'll search for the URL itself to get a snippet.
        const res = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: apiKey,
                query: url,
                search_depth: "advanced",
                max_results: 1
            })
        });
        const data = await res.json();
        return data.results?.[0]?.content || "Content unavailable";
    }

    private static async performComparison(userText: string, competitors: { url: string, content: string }[]): Promise<CompetitorCheckResult> {
        const compSummary = competitors.map(c => `URL: ${c.url}\nContent: ${c.content.substring(0, 1000)}`).join('\n\n---\n\n');

        const prompt = `
            Compare the "User Draft" against the "Competitor Articles".
            Identify:
            1. "unique": Claims or angles the User makes that competitors DON'T.
            2. "common": Points that both the User and competitors cover (Table-stakes).
            3. "missing": Critical points or data the competitors cover that the User MISSED.

            Format the output strictly as JSON:
            {
                "summary": "1-2 sentence overview of the comparison",
                "insights": [
                    { "type": "unique" | "common" | "missing", "claim": "Short Title", "description": "Explanation", "sourceUrl": "URL if missing" }
                ]
            }

            User Draft:
            ${userText.substring(0, 2000)}

            Competitor Articles:
            ${compSummary}
        `;

        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" }
            });

            const content = response.choices[0].message.content || "{}";
            return JSON.parse(content);
        } catch (e) {
            console.error("CompetitorCheck: comparison failed", e);
            return { insights: [], summary: "Failed to perform comparison." };
        }
    }
}
