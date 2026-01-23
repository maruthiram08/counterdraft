
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const getOpenAI = () => openai;

export async function generateImage(prompt: string): Promise<string | undefined> {
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
    });
    return response.data?.[0]?.url;
  } catch (e) {
    console.error("Image generation failed:", e);
    return undefined;
  }
}

export async function repurposeContent(content: string, platform: string, options: any): Promise<{ title: string; content: string; extraData?: any }> {
  const basePrompt = `You are an expert content strategist and editor. Your goal is to repurpose the input content into a high-performing piece for ${platform}.`;

  const mediumPrompt = `
    PLATFORM: MEDIUM (2025 Best Practices)
    
    GOAL: Create a polished, editorial-quality article.
    
    STRUCTURE & FORMATTING:
    - **Short Paragraphs**: 2-4 lines max. This is critical for mobile readability.
    - **Headers**: Use H2 (##) for main sections. Ensure they are intriguing, not generic.
    - **Pull Quotes**: Identify 1-2 powerful statements and format them as blockquotes (> quote).
    - **Emphasis**: Use **bold** for key insights, but sparingly (max 1 per section).
    - **Length**: ${options.length} (approx ${options.length === 'short' ? '400' : options.length === 'medium' ? '800' : '1500'} words).

    TONE & VOICE:
    - **Conversational**: Write like a human telling a story to a smart friend.
    - **Personal**: Use "I", "You", "We". Avoid passive voice and academic jargon.
    - **Hook**: The opening lines must grab attention immediately.

    TASK:
    1. Transform the Original Content into this format.
    2. Generate a catchy, click-worthy Title (H1 style, but returned in JSON field).

    Output valid JSON:
    {
      "title": "The exact title",
      "content": "The full markdown content"
    }
  `;

  const instagramPrompt = `
    PLATFORM: INSTAGRAM (${options.format === 'single' ? 'Single Post' : 'Carousel'})

    GOAL: Create a high-engagement visual post.

    STRUCTURE:
    - **Header**: Short, punchy title for the slide (Max 5 words).
    - **Body**: Concise text (Max 25 words per slide). Readable at a glance.
    - **Visual**: Brief description of the image/graphic vibe.

    TASK:
    Generate ${options.format === 'single' ? 'exactly 1 slide' : '5-8 slides'}.

    Output valid JSON matching this schema:
    {
      "title": "Post Title",
      "caption": "Full caption including hook, value, and CTA.",
      "hashtags": ["#tag1", "#tag2"],
      "slides": [
        { "header": "Slide Header", "body": "Slide Text", "visualDescription": "..." }
      ]
    }
  `;

  const systemPrompt = `
    ${basePrompt}
    ${platform === 'medium' ? mediumPrompt : instagramPrompt}
  `;

  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Original Content:\n${content}` }
    ],
    model: "gpt-4o",
    response_format: { type: "json_object" },
  });

  const result = completion.choices[0].message.content;
  if (!result) return { title: "Untitled Repurposed Draft", content: "" };

  try {
    const parsed = JSON.parse(result);

    if (platform === 'instagram') {
      const slides = parsed.slides || [];
      const hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags.join(' ') : (parsed.hashtags || '');

      // Construct markdown for the Editor
      let md = `**Caption:**\n${parsed.caption}\n\n${hashtags}\n\n---\n\n`;

      slides.forEach((s: any, i: number) => {
        md += `## Slide ${i + 1}: ${s.header}\n${s.body}\n\n> *Visual: ${s.visualDescription}*\n\n`;
      });

      return {
        title: parsed.title,
        content: md,
        extraData: { slides, hashtags: parsed.hashtags, caption: parsed.caption }
      };
    }

    return parsed;
  } catch (e) {
    // Fallback if model refuses JSON
    return {
      title: "Repurposed Draft",
      content: result
    };
  }
}

// Helper for belief extraction
export async function extractBeliefs(posts: string[]): Promise<any> {
  const content = posts.join('\n\n---\n\n');

  const systemPrompt = `You are an intellectual analyst helping creators understand their beliefs.
Given a collection of posts from a creator, extract their underlying beliefs.

Be opinionated but concise. Look for:
- Strongly held positions that appear repeatedly
- Angles they've overused (said too often)
- Emerging new directions in their thinking
- Contradictions or tensions between beliefs

Output as JSON matching this schema:
{
  "coreBeliefs": [
    {
      "statement": "concise belief statement",
      "reasoning": "why this is a core belief",
      "confidence": "high/medium/low",
      "context": "direct quote or snippet from text that evidences this"
    }
  ],
  "overusedAngles": [
    {
      "statement": "angle statement",
      "reasoning": "why this is overused",
      "confidence": "high/medium/low",
      "context": "direct quote or snippet"
    }
  ],
  "emergingThesis": {
      "statement": "thesis statement",
      "reasoning": "why this is emerging",
      "confidence": "low/medium/high",
      "context": "direct quote or snippet"
  },
  "detectedTensions": [
    {"beliefA": "string", "beliefB": "string", "summary": "why these conflict"}
  ]
}`;

  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Analyze these posts and extract the creator's beliefs:\n\n${content}` }
    ],
    model: "gpt-4o",
    response_format: { type: "json_object" },
  });

  const result = completion.choices[0].message.content;
  if (!result) throw new Error("No response from OpenAI");

  const parsed = JSON.parse(result);

  // Normalize 'emergingThesis' to array for consistency if AI returns single object
  let emerging = [];
  if (parsed.emergingThesis) {
    emerging = Array.isArray(parsed.emergingThesis) ? parsed.emergingThesis : [parsed.emergingThesis];
  }

  return {
    coreBeliefs: parsed.coreBeliefs || [],
    overusedAngles: parsed.overusedAngles || [],
    emergingThesis: emerging,
    detectedTensions: parsed.detectedTensions || []
  };
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

  const systemPrompt = `You are helping a creator decide what to write about next.
Given their belief graph and detected tensions, suggest 3 idea directions.

Focus on:
- Underexplored themes they haven't covered enough
- Tensions that would benefit from public exploration
- Beliefs that could be strengthened with fresh angles

Output as JSON matching this schema:
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

  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Creator's beliefs:\n${beliefContext}\n\nDetected tensions:\n${tensionContext}\n\nSuggest 3 idea directions.` }
    ],
    model: "gpt-4o",
    response_format: { type: "json_object" },
  });

  const result = completion.choices[0].message.content;
  if (!result) throw new Error("No response from OpenAI");

  return JSON.parse(result);
}

// Helper for outcome inference
export async function inferOutcomeWithLLM(
  topic: string,
  audience?: { role: string; pain: string }
): Promise<{ outcome: string; reasoning: string }> {
  const audienceContext = audience
    ? `Audience Role: ${audience.role}\nAudience Pain: ${audience.pain}`
    : "Audience: General professional audience";

  const systemPrompt = `You are an expert content strategist.
Given a topic and optional audience, determine the best "Outcome" for this piece of content.

Outcomes:
- authority: distinct point of view, thought leadership, teaching a concept.
- engagement: relatable, viral potential, asking questions, storytelling.
- conversion: selling a product/service, driving signup, clear CTA.
- connection: vulnerable, personal story, building trust.

Output as JSON: { "outcome": "authority|engagement|conversion|connection", "reasoning": "..." }`;

  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Topic: ${topic}\n${audienceContext}` }
    ],
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.3 // Lower temp for classification
  });

  const result = completion.choices[0].message.content;
  if (!result) throw new Error("No response from OpenAI");

  return JSON.parse(result);
}

// Helper for confidence calculation
export async function analyzeConfidenceWithLLM(
  topic: string,
  beliefs: { id: string; statement: string; type: string }[]
): Promise<{ level: 'low' | 'medium' | 'high'; score: number; reasoning: string; conflictingBeliefIds: string[] }> {
  const beliefContext = beliefs.map(b => `[${b.id}] (${b.type}) ${b.statement}`).join('\n');

  const systemPrompt = `You are a coherence engine for a thought leader.
Assess how well a new topic aligns with their existing beliefs.

Confidence Logic:
- HIGH (80-100): Strongly supported by Core beliefs. "Safe" territory.
- MEDIUM (50-79): Aligns with Emerging theories or neutral. potentially duplicative of Overused angles.
- LOW (0-49): Contradicts Core beliefs or is completely unrelated/random. "Risky" or needs bridge.

Output as JSON: 
{ 
  "level": "low|medium|high", 
  "score": number, 
  "reasoning": "concise explanation", 
  "conflictingBeliefIds": ["id1", "id2"] 
}`;

  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Existing Beliefs:\n${beliefContext}\n\nNew Topic: ${topic}\n\nAnalyze confidence.` }
    ],
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.3
  });

  const result = completion.choices[0].message.content;
  if (!result) throw new Error("No response from OpenAI");

  return JSON.parse(result);
}

// Helper for tag suggestion
export async function suggestTags(content: string): Promise<string[]> {
  const systemPrompt = `You are a social media expert.
Analyze the content and suggest 5-8 high-impact, relevant hashtags or context labels.
Mix broad niche tags (e.g. #Leadership) with specific tags (e.g. #RemoteWorkTips).

Output as JSON: { "tags": ["#tag1", "#tag2", ...] }`;

  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Content:\n${content.substring(0, 1000)}...` } // Limit context window
    ],
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.7
  });

  const result = completion.choices[0].message.content;
  if (!result) return [];

  try {
    const parsed = JSON.parse(result);
    return parsed.tags || [];
  } catch (e) {
    return [];
  }
}
