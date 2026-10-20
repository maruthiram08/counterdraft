import { openai } from '../openai';

// Draft titles used to be the idea's brief ("Explore the deeper reasons behind ... This post would delve into ...").
// These helpers turn a draft into a real headline, with a cheap fallback when the model is unavailable.

const MAX_TITLE_WORDS = 12;
const MAX_TITLE_CHARS = 90;

// Briefs read as instructions to the writer, not as headlines
const BRIEF_OPENER = /^(explore|investigate|examine|discuss|analy[sz]e|delve|unpack|dive|look at|write about|reflect on|highlight|argue|challenge|address|share|consider|break down|this post)\b/i;

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

// True when a title is really a brief, angle or opening paragraph rather than a headline
export function needsRetitle(title: string | null | undefined, source?: { angle?: string | null }): boolean {
    const text = (title || '').trim();
    if (!text || text === 'Untitled Draft') return true;
    if (source?.angle && text === source.angle.trim()) return true;
    const words = wordCount(text);
    if (words > 16 || text.length > 120) return true;
    if (/\bthis (post|piece|article) (would|will|should|could|explores?|examines?|delves?|argues?|looks)\b/i.test(text)) return true;
    if (BRIEF_OPENER.test(text) && words > 8) return true;
    // More than one sentence is a paragraph, not a title
    if (/[.!?]\s+\S/.test(text) && words > 10) return true;
    return false;
}

// Strip quotes, markdown and trailing punctuation the model sometimes adds
export function cleanTitle(raw: string | null | undefined): string {
    return (raw || '')
        .split('\n')[0]
        .replace(/^#+\s*/, '')
        .replace(/\*\*/g, '')
        .replace(/^title:\s*/i, '')
        .trim()
        .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
        .replace(/[.:;,]+$/, '')
        .trim();
}

// Short phrase from a brief or hook: first clause, at most a dozen words
export function fallbackTitle(text: string | null | undefined): string {
    let phrase = cleanTitle(text);
    if (!phrase) return 'Untitled Draft';
    phrase = phrase.split(/(?<=[.!?])\s+|\s+[—–]\s+|—/)[0].trim();
    phrase = phrase.replace(BRIEF_OPENER, '').trim().replace(/^(the\s+)?(deeper\s+)?(reasons?|ways?)\s+(behind|why|for)\s+/i, '').trim();
    const words = phrase.split(/\s+/).filter(Boolean);
    if (words.length > MAX_TITLE_WORDS) phrase = `${words.slice(0, MAX_TITLE_WORDS).join(' ').replace(/[,;:]+$/, '')}…`;
    phrase = cleanTitle(phrase) || cleanTitle(text);
    if (phrase.length > MAX_TITLE_CHARS) phrase = `${phrase.slice(0, MAX_TITLE_CHARS).replace(/\s+\S*$/, '')}…`;
    return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

// A real headline for the post, written from the draft itself
export async function generateDraftTitle({ content, hook, angle }: { content: string; hook?: string | null; angle?: string | null }): Promise<string> {
    const body = (content || '').trim();
    const fallback = fallbackTitle(hook || angle);
    if (!body) return fallback;

    // A draft that already opens with a short markdown heading has its title
    const heading = body.match(/^#\s+(.+)$/m)?.[1];
    if (heading && body.trimStart().startsWith('#') && !needsRetitle(cleanTitle(heading))) return cleanTitle(heading);

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0.4,
            max_tokens: 30,
            messages: [
                {
                    role: 'system',
                    content: `You write headlines for social and newsletter posts. Given a post, return one title for it.
- 3 to ${MAX_TITLE_WORDS} words, specific to what the post actually argues
- A headline, not an instruction: never start with Explore, Investigate, Discuss or similar, and never say "this post"
- No quotes, hashtags, emoji or trailing period
Return ONLY the title.`,
                },
                { role: 'user', content: `${hook ? `Working idea: ${hook}\n\n` : ''}Post:\n${body.slice(0, 6000)}` },
            ],
        });
        const title = cleanTitle(completion.choices[0]?.message?.content);
        if (title && !needsRetitle(title)) return title;
    } catch (err) {
        console.error('[generateDraftTitle] failed, using fallback', err);
    }
    return fallback;
}

// Title for a draft row built from a pipeline item, without a model call
export function titleFromItem(hook?: string | null, angle?: string | null): string {
    const text = (hook || angle || '').trim();
    if (!text) return 'Untitled Draft';
    return needsRetitle(text, { angle }) ? fallbackTitle(text) : text;
}
