
import jwt from 'jsonwebtoken';

// Zhipu AI configuration
const API_KEY = process.env.GLM_API_KEY!;
const BASE_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

function generateToken(): string {
    if (!API_KEY) throw new Error("GLM_API_KEY is missing");

    const [id, secret] = API_KEY.split('.');

    const payload = {
        api_key: id,
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiration
        timestamp: Math.floor(Date.now() / 1000),
    };

    // Zhipu specific header
    const header = {
        alg: 'HS256',
        sign_type: 'SIGN'
    };

    return jwt.sign(payload, secret, { header });
}

async function callGLM(messages: any[], systemPrompt?: string) {
    const token = generateToken();

    const finalMessages = [];
    if (systemPrompt) {
        finalMessages.push({ role: 'system', content: systemPrompt });
    }
    finalMessages.push(...messages);

    const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'glm-4-flash',
            messages: finalMessages,
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 4096,
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`GLM API Error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// ---------------------------------------------------------
// REPLACEMENT FUNCTIONS (Matching claude.ts signature)
// ---------------------------------------------------------

export async function extractBeliefs(posts: string[]): Promise<any> {
    const content = posts.join('\n\n---\n\n');

    const systemPrompt = `You are an intellectual analyst helping creators understand their beliefs.
Given a collection of posts from a creator, extract their underlying beliefs.

Be opinionated but concise. Look for:
- Strongly held positions that appear repeatedly
- Angles they've overused (said too often)
- Emerging new directions in their thinking
- Contradictions or tensions between beliefs

You MUST output ONLY valid JSON matching this schema (no markdown, no backticks):
{
  "coreBeliefs": ["string array of 5-7 core beliefs"],
  "overusedAngles": ["string array of 2-3 overused angles"],
  "emergingThesis": "one emerging direction",
  "detectedTensions": [
    {"beliefA": "string", "beliefB": "string", "summary": "why these conflict"}
  ]
}`;

    const rawResponse = await callGLM([
        { role: 'user', content: `Analyze these posts and extract the creator's beliefs:\n\n${content}` }
    ], systemPrompt);

    // Clean up potential markdown formatting from GLM
    const cleanJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error("Failed to parse GLM JSON", rawResponse);
        throw new Error("GLM response was not valid JSON");
    }
}

export async function generateIdeas(
    beliefs: { statement: string; type: string }[],
    tensions: { summary: string; beliefA: string; beliefB: string }[]
): Promise<any> {
    const beliefContext = beliefs.map(b => `[${b.type}] ${b.statement}`).join('\n');
    const tensionContext = tensions.map(t =>
        `TENSION: "${t.beliefA}" vs "${t.beliefB}" - ${t.summary}`
    ).join('\n');

    const systemPrompt = `You are helping a creator decide what to write about next.
Given their belief graph and detected tensions, suggest 3 idea directions.

Focus on:
- Underexplored themes they haven't covered enough
- Tensions that would benefit from public exploration
- Beliefs that could be strengthened with fresh angles

You MUST output ONLY valid JSON matching this schema (no markdown, no backticks):
{
  "ideas": [
    {
        "theme": "high-level theme",
        "topic": "specific topic to write about",
        "strengthensBelief": "which belief this reinforces",
        "exploresTension": "optional - which tension this explores",
        "risksWeakening": "optional - which belief might be weakened",
        "openingLine": "suggested opening line",
        "rationale": "why this is worth writing"
    }
  ]
}`;

    const rawResponse = await callGLM([
        { role: 'user', content: `Creator's beliefs:\n${beliefContext}\n\nDetected tensions:\n${tensionContext}\n\nSuggest 3 idea directions.` }
    ], systemPrompt);

    const cleanJson = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error("Failed to parse GLM JSON", rawResponse);
        throw new Error("GLM response was not valid JSON");
    }
}
