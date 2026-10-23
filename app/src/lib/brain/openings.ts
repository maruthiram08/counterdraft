import { openai } from '@/lib/openai';
import { TraceLogger } from '@/lib/trace';
import { BrainMetadata } from '@/types';
import { parseOpenings, splitOpening, OpeningsResult, SEE_MORE_CHARS } from '@/lib/editor/openings';

// The Hook lab: three new openings for a finished draft, each a different way in, and how the current one does.

const WRITER_MODEL = 'gpt-4o';

export async function suggestOpenings({ draft, meta, voice }: {
    draft: string;
    meta?: Partial<BrainMetadata>;
    voice?: string;
}): Promise<OpeningsResult> {
    const { opening } = splitOpening(draft);
    const audience = meta?.audience?.role ? `\nAudience: ${meta.audience.role}${meta.audience.pain ? ` (their pain: ${meta.audience.pain})` : ''}` : '';
    const stance = meta?.stance ? `\nStance: ${meta.stance}` : '';

    const completion = await openai.chat.completions.create({
        model: WRITER_MODEL,
        temperature: 0.8,
        response_format: { type: 'json_object' },
        messages: [
            {
                role: 'system',
                content: `You write openings for a creator's LinkedIn post. LinkedIn shows about ${SEE_MORE_CHARS.desktop} characters on desktop and ${SEE_MORE_CHARS.phone} on a phone before "see more", so the opening alone decides whether anyone reads on.

Write 3 new openings for the post below, each a different way in. Pick the 3 that suit this post best from:
- Bold claim: the post's sharpest point, stated flat
- Specific moment: a scene or moment the post already describes
- Number: a figure that is already in the post
- Tension: a contradiction or a cost the reader feels
- Reversal: the common belief, then why it's wrong

Rules:
- Use only facts, numbers, names and stories already in the post. Invent nothing.
- The key words must land in the first ${SEE_MORE_CHARS.phone} characters. One to three short lines.
- It must lead into the rest of the post as written, which stays the same.
- Sound like the creator, not like a copywriter: no clickbait, no "Here's the thing", no emoji, no question that only sets up the post.
- Rate each opening 1-5 on how likely someone in the audience is to click "see more", and rate the current opening the same way. Be honest; the current one may be best.

Return JSON:
{
  "current": { "rating": 1-5, "note": "one line on what the current opening does or misses" },
  "options": [ { "style": "Bold claim", "text": "the opening", "why": "one line on why it works for this audience", "rating": 1-5 } ]
}`,
            },
            {
                role: 'user',
                content: `${audience}${stance}${voice ? `\nThe creator's voice: ${voice}` : ''}

Current opening:
${opening}

Whole post:
${draft}`,
            },
        ],
    });

    let raw: unknown = {};
    try {
        raw = JSON.parse(completion.choices[0].message.content || '{}');
    } catch {
        raw = {};
    }
    const result = parseOpenings(raw, opening);
    TraceLogger.log('draft', 'Hook lab', { options: result.options.length, current: result.current?.rating });
    return result;
}
