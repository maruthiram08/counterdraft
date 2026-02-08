
import { openai } from '../openai';

import { RepurposeOptions, RepurposedContent, InstagramSlide } from '@/types';

export async function repurposeContent(content: string, platform: string, options: RepurposeOptions): Promise<RepurposedContent> {
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

    const preferredModel = platform === 'instagram' ? 'gpt-4o-mini' : 'gpt-4o-mini';
    let result: string | null = null;

    const attempt = async (model: string) => {
        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Original Content:\n${content}` }
            ],
            model,
            response_format: { type: "json_object" },
        });
        return completion.choices[0].message.content;
    };

    result = await attempt(preferredModel);
    if (!result) return { title: "Untitled Repurposed Draft", content: "" };

    try {
        const parsed = JSON.parse(result);

        if (platform === 'instagram') {
            const slides = parsed.slides || [];
            const hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags.join(' ') : (parsed.hashtags || '');

            // Construct markdown for the Editor
            let md = `**Caption:**\n${parsed.caption}\n\n${hashtags}\n\n---\n\n`;

            slides.forEach((s: InstagramSlide, i: number) => {
                md += `## Slide ${i + 1}: ${s.header}\n${s.body}\n\n> *Visual: ${s.visualDescription}*\n\n`;
            });

            return {
                title: parsed.title,
                content: md,
                extraData: { slides, hashtags: parsed.hashtags, caption: parsed.caption }
            };
        }

        if (platform === 'medium') {
            if (!parsed.title || !parsed.content) {
                throw new Error("Missing required fields");
            }
        }

        return parsed;
    } catch {
        // Retry with higher-capability model for Medium if JSON/fields are invalid
        if (platform === 'medium') {
            try {
                const retry = await attempt('gpt-4o');
                if (retry) {
                    const parsedRetry = JSON.parse(retry);
                    if (parsedRetry?.title && parsedRetry?.content) return parsedRetry;
                }
            } catch { }
        }
        // Fallback if model refuses JSON
        return {
            title: "Repurposed Draft",
            content: result
        };
    }
}
