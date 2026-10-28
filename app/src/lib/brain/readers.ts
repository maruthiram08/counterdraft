import { openai } from '@/lib/openai';
import { TraceLogger } from '@/lib/trace';
import { BrainMetadata } from '@/types';
import { splitOpening, SEE_MORE_CHARS } from '@/lib/editor/openings';
import { parseReaderPanel, PANEL_SIZE, Reader, ReaderPanelResult } from '@/lib/editor/readers';

// The reader panel: imagined readers from the post's audience react to the draft, and optionally to openings.
// One cheap call per run. It gives opinions to weigh, not a prediction of how the post will do.

const PANEL_MODEL = 'gpt-4o-mini';

export async function askReaders({ draft, meta, readers, openings }: {
    draft: string;
    meta?: Partial<BrainMetadata>;
    readers?: Reader[]; // the panel from the last run, so the same people read the new version
    openings?: string[]; // openings to compare; the first is usually the current one
}): Promise<ReaderPanelResult> {
    const audience = meta?.audience?.role
        ? `The post is written for: ${meta.audience.role}${meta.audience.pain ? ` (their pain: ${meta.audience.pain})` : ''}${meta.audience.beliefs ? `. They already believe: ${meta.audience.beliefs}` : ''}`
        : 'No audience was set. Infer who the post is for from the post itself.';
    const panel = readers?.length
        ? `Use exactly these readers, keeping their names and who they are:\n${readers.map(r => `- ${r.name}: ${r.who}`).join('\n')}`
        : `Invent ${PANEL_SIZE} readers who would plausibly see this post in their LinkedIn feed: three from the audience above with different seniority and attitudes, one sceptical peer of the author, and one person adjacent to the audience who is only half interested. Give each a first name and one line on who they are.`;
    const openingList = openings?.length
        ? `\n\nOpenings to compare (by number):\n${openings.map((o, i) => `[${i}] ${o}`).join('\n')}`
        : '';

    const completion = await openai.chat.completions.create({
        model: PANEL_MODEL,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
            {
                role: 'system',
                content: `You play a small panel of LinkedIn readers giving honest, independent reactions to a creator's draft post before it is published.

${panel}

For each reader:
- readsOn: would they click "see more" after the opening? LinkedIn shows about ${SEE_MORE_CHARS.phone} characters on a phone before "see more". Most people scroll past most posts, so say no when the opening does not speak to them.
- reaction: their first reaction in their own voice, one or two sentences. Be specific to this post; no generic praise.
- comment: the comment they would actually leave, or "" if they would not comment. Most readers do not comment.
- lostAt: a short line copied word for word from the post where they lost interest, or "" if they read to the end.${openings?.length ? '\n- opens: the numbers of the openings below they would click "see more" on (can be empty).' : ''}

Readers differ: do not let them all agree. Judge the post as written; do not rewrite it.

Return JSON:
{ "readers": [ { "name": "", "who": "", "readsOn": true, "reaction": "", "comment": "", "lostAt": ""${openings?.length ? ', "opens": [0]' : ''} } ] }`,
            },
            {
                role: 'user',
                content: `${audience}

Opening:
${splitOpening(draft).opening}

Whole post:
${draft}${openingList}`,
            },
        ],
    });

    let raw: unknown = {};
    try {
        raw = JSON.parse(completion.choices[0].message.content || '{}');
    } catch {
        raw = {};
    }
    const result = parseReaderPanel(raw, draft, openings?.length || 0);
    TraceLogger.log('draft', 'Reader panel', { readers: result.readers.length, readOn: result.readers.filter(r => r.readsOn).length, openings: openings?.length || 0 });
    return result;
}
