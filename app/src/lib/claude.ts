// Anthropic Claude client configuration
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
});

export { anthropic };

// Helper for belief extraction
export async function extractBeliefs(posts: string[]): Promise<any> {
    const content = posts.join('\n\n---\n\n');

    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: `You are an intellectual analyst helping creators understand their beliefs.
Given a collection of posts from a creator, extract their underlying beliefs.

Be opinionated but concise. Look for:
- Strongly held positions that appear repeatedly
- Angles they've overused (said too often)
- Emerging new directions in their thinking
- Contradictions or tensions between beliefs

Output as JSON matching this schema:
{
  "coreBeliefs": ["string array of 5-7 core beliefs"],
  "overusedAngles": ["string array of 2-3 overused angles"],
  "emergingThesis": "one emerging direction",
  "detectedTensions": [
    {"beliefA": "string", "beliefB": "string", "summary": "why these conflict"}
  ]
}`,
        messages: [
            {
                role: 'user',
                content: `Analyze these posts and extract the creator's beliefs:\n\n${content}`
            }
        ]
    });

    // Parse the response
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from Claude');
    }

    // Extract JSON from response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Could not parse JSON from Claude response');
    }

    return JSON.parse(jsonMatch[0]);
}

// Helper for idea generation
export async function generateIdeas(
    beliefs: { statement: string; type: string }[],
    tensions: { summary: string; beliefA: string; beliefB: string }[]
): Promise<any> {
    const beliefContext = beliefs.map(b => `[${b.type}] ${b.statement}`).join('\n');
    const tensionContext = tensions.map(t =>
        `TENSION: "${t.beliefA}" vs "${t.beliefB}" - ${t.summary}`
    ).join('\n');

    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: `You are helping a creator decide what to write about next.
Given their belief graph and detected tensions, suggest 3 idea directions.

Focus on:
- Underexplored themes they haven't covered enough
- Tensions that would benefit from public exploration
- Beliefs that could be strengthened with fresh angles

Output as JSON:
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
}`,
        messages: [
            {
                role: 'user',
                content: `Creator's beliefs:\n${beliefContext}\n\nDetected tensions:\n${tensionContext}\n\nSuggest 3 idea directions.`
            }
        ]
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from Claude');
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Could not parse JSON from Claude response');
    }

    return JSON.parse(jsonMatch[0]);
}
