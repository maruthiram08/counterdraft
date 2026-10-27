
import { openai } from '../openai';

import { RepurposeOptions, RepurposedContent, InstagramSlide } from '@/types';
import { X_MAX_CHARS, fitPosts, joinThread, numberingRoom, xLength } from './x-thread';
import { PREVIEW_MAX_CHARS, SUBJECT_MAX_CHARS, joinNewsletter } from './newsletter';

// Both new formats rework a post the writer already wrote, so its voice and facts carry over.
const KEEP_THE_WRITER = `
    VOICE & FACTS:
    - Keep the writer's voice, opinions and wording wherever they work. This is their piece, re-shaped, not a new one.
    - Use only the facts, numbers, names and stories in the original. Do not invent examples, data or quotes.
    - No engagement bait ("Thoughts?", "Agree?", "Like and repost"), no "In today's fast-paced world", no "Let's dive in".
`;

const THREAD_SIZES: Record<string, string> = { short: '3 to 5', medium: '6 to 8', long: '9 to 12' };

async function askJson(system: string, content: string, model = 'gpt-4o'): Promise<Record<string, unknown> | null> {
    const completion = await openai.chat.completions.create({
        model,
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: `Original Content:\n${content}` },
        ],
        response_format: { type: 'json_object' },
    });
    try {
        return JSON.parse(completion.choices[0].message.content || '');
    } catch {
        return null;
    }
}

const asPosts = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((p): p is string => typeof p === 'string' && p.trim().length > 0).map(p => p.trim()) : [];

/** An X thread: a first post that earns the click, then posts that each fit X's limit. */
export async function repurposeAsThread(content: string, options: RepurposeOptions): Promise<RepurposedContent> {
    const numbered = options.numbered !== false;
    const size = THREAD_SIZES[options.length || 'medium'] || THREAD_SIZES.medium;
    // Leave room for "12/12" at the end of each post when the thread is numbered
    const limit = numbered ? X_MAX_CHARS - numberingRoom(99) : X_MAX_CHARS;

    const system = `You are an expert editor turning a post into an X (Twitter) thread.

    PLATFORM: X THREAD

    STRUCTURE:
    - ${size} posts. Fewer, stronger posts beat padding.
    - **Post 1 is everything**: it must stand on its own and make people open the thread. Lead with the sharpest claim, the surprising number, or the tension, in the writer's words. No "A thread 🧵", no "Here's what I learned:", no hashtags.
    - Every post makes one point and reads well alone, because people see posts out of order.
    - Each post is at most ${limit} characters (X counts each link as 23). Short lines, line breaks where they help.
    - The last post lands the point: the takeaway or the question the writer actually cares about. No "Follow me for more".
    - Do not number the posts and do not add "1/" or "(1/7)". Numbering is added later.
    - Plain text only: no markdown, no bold, no headers. Emoji only if the original uses them.
    ${KEEP_THE_WRITER}
    Output valid JSON:
    {
      "title": "A short name for this thread (under 60 characters)",
      "posts": ["first post", "second post", "..."]
    }`;

    let parsed = await askJson(system, content);
    let posts = asPosts(parsed?.posts);

    // One more go when posts run long or none came back; any still too long are split at a sentence
    const tooLong = posts.filter(p => xLength(p) > limit).length;
    if (posts.length === 0 || tooLong > 0) {
        const retry = await askJson(
            `${system}\n\nIMPORTANT: Your last attempt had posts over ${limit} characters. Every post must be at most ${limit} characters. Cut words, not ideas.`,
            content,
        );
        const retryPosts = asPosts(retry?.posts);
        if (retryPosts.length > 0 && retryPosts.filter(p => xLength(p) > limit).length <= tooLong) {
            parsed = retry;
            posts = retryPosts;
        }
    }
    posts = fitPosts(posts, limit);

    if (posts.length === 0) throw new Error("Couldn't write the thread. Please try again.");

    const title = typeof parsed?.title === 'string' && parsed.title.trim() ? parsed.title.trim() : posts[0].slice(0, 60);
    return { title, content: joinThread(posts), extraData: { numbered } };
}

const NEWSLETTER_WORDS: Record<string, string> = { short: '300', medium: '600', long: '1000' };

/** A newsletter issue: subject line, preview text and a body with short sections. */
export async function repurposeAsNewsletter(content: string, options: RepurposeOptions): Promise<RepurposedContent> {
    const words = NEWSLETTER_WORDS[options.length || 'medium'] || NEWSLETTER_WORDS.medium;

    const system = `You are an expert newsletter editor turning a post into one issue of the writer's email newsletter.

    PLATFORM: EMAIL NEWSLETTER

    STRUCTURE:
    - **Subject line**: at most ${SUBJECT_MAX_CHARS} characters. Specific and honest, written the way the writer talks. Makes the reader want to open it. No clickbait, no ALL CAPS, no emoji.
    - **Preview text**: at most ${PREVIEW_MAX_CHARS} characters. It shows next to the subject in the inbox, so it adds to the subject instead of repeating it.
    - **Body**: about ${words} words, in markdown.
      - Open like a note to a reader who chose to subscribe: straight into the idea, no "Welcome to this week's issue".
      - 2 to 4 short sections, each with a ## heading that says something (not "Introduction" or "Conclusion").
      - Short paragraphs (1 to 3 sentences). One pull quote (> quote) at most. **Bold** at most once per section.
      - End with a short sign-off line in the writer's voice, and, only if it fits, one honest question to reply to.
    ${KEEP_THE_WRITER}
    Output valid JSON:
    {
      "subject": "The subject line",
      "previewText": "The preview text",
      "body": "The body in markdown"
    }`;

    let parsed = await askJson(system, content);
    if (!parsed?.subject || !parsed?.body) parsed = await askJson(system, content);
    const subject = typeof parsed?.subject === 'string' ? parsed.subject.trim() : '';
    const body = typeof parsed?.body === 'string' ? parsed.body.trim() : '';
    if (!subject || !body) throw new Error("Couldn't write the newsletter. Please try again.");
    const previewText = typeof parsed?.previewText === 'string' ? parsed.previewText.trim() : '';

    return {
        title: subject,
        content: joinNewsletter({ subject, previewText, body }),
        extraData: { subject, previewText },
    };
}

export async function repurposeContent(content: string, platform: string, options: RepurposeOptions): Promise<RepurposedContent> {
    if (platform === 'x_thread') return repurposeAsThread(content, options);
    if (platform === 'newsletter') return repurposeAsNewsletter(content, options);

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

    const preferredModel = 'gpt-4o-mini';
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
