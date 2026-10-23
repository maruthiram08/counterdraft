import { openai } from '@/lib/openai';
import { TraceLogger } from '@/lib/trace';
import { MAX_TEXT, sourceText } from './deep-dive';

// Follow-up questions about one story, answered from that story's own text.

export interface ChatTurn {
    role: 'user' | 'assistant';
    text: string;
}

const MAX_TURNS = 6;
const MAX_TURN_LENGTH = 1200;

/** The last few well-formed turns of the conversation so far. */
export function cleanHistory(raw: unknown): ChatTurn[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map(t => (t ?? {}) as Record<string, unknown>)
        .filter(t => (t.role === 'user' || t.role === 'assistant') && typeof t.text === 'string' && t.text.trim())
        .map(t => ({ role: t.role as ChatTurn['role'], text: (t.text as string).trim().slice(0, MAX_TURN_LENGTH) }))
        .slice(-MAX_TURNS);
}

export async function answerAboutStory({ url, title, question, history, query }: {
    url: string;
    title: string;
    question: string;
    history: ChatTurn[];
    query?: string;
}): Promise<string | null> {
    const { text } = await sourceText(url, title);
    if (text.length < 200) return null;

    const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        messages: [
            {
                role: 'system',
                content: `You answer a writer's questions about one story so they can decide what to post about it.
Answer from the story's text below. Quote or name specifics from it when they help.
If the text doesn't answer the question, say so plainly in one sentence, then give your best general knowledge marked as such ("Not in the piece, but generally...").
Keep answers to 2-5 sentences, plain prose, no headings.${query ? `\nThe writer is exploring "${query}".` : ''}

Story: ${title}
Text:
${text.slice(0, MAX_TEXT)}`,
            },
            ...history.map(t => ({ role: t.role, content: t.text })),
            { role: 'user', content: question },
        ],
    });

    const answer = completion.choices[0].message.content?.trim() || null;
    TraceLogger.log('explore', 'Story chat', { url, turns: history.length, ok: Boolean(answer) });
    return answer;
}
