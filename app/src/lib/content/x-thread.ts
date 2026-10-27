// X (Twitter) threads: how the posts are stored in a draft, counted, numbered and split.
// Client-safe: used by the repurpose route, the thread preview and the post sheet.

export const X_MAX_CHARS = 280;
// X counts every link as 23 characters, whatever its real length
const X_URL_WEIGHT = 23;
// Posts are kept in the draft separated by a line holding only this
export const THREAD_SEPARATOR = '---';

const URL_RE = /https?:\/\/[^\s]+/g;
const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;

// X weighs most Latin, punctuation and symbols as 1 and everything else (CJK, emoji) as 2
function codePointWeight(cp: number): number {
    if (cp <= 0x10ff) return 1;
    if (cp >= 0x2000 && cp <= 0x200d) return 1;
    if (cp >= 0x2010 && cp <= 0x201f) return 1;
    if (cp >= 0x2032 && cp <= 0x2037) return 1;
    return 2;
}

function textWeight(text: string): number {
    let total = 0;
    const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl
        ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
        : null;
    const graphemes = segmenter ? Array.from(segmenter.segment(text), s => s.segment) : Array.from(text);
    for (const g of graphemes) {
        // An emoji counts as 2 however many code points make it up
        if (PICTOGRAPHIC.test(g)) { total += 2; continue; }
        for (const ch of g) total += codePointWeight(ch.codePointAt(0)!);
    }
    return total;
}

/** Characters as X counts them: links are 23, emoji and CJK are 2. */
export function xLength(text: string): number {
    let total = 0;
    let last = 0;
    for (const m of text.matchAll(URL_RE)) {
        total += textWeight(text.slice(last, m.index)) + X_URL_WEIGHT;
        last = m.index! + m[0].length;
    }
    return total + textWeight(text.slice(last));
}

/** The posts of a thread draft, in order. Blank posts are dropped. */
export function parseThread(content: string): string[] {
    return content
        .replace(/\r\n/g, '\n')
        .split(/\n[ \t]*-{3,}[ \t]*\n/)
        .map(p => p.trim())
        .filter(Boolean);
}

/** The draft text for these posts: one post per block, separated by --- lines. */
export function joinThread(posts: string[]): string {
    return posts.map(p => p.trim()).filter(Boolean).join(`\n\n${THREAD_SEPARATOR}\n\n`);
}

/** "1/7" at the end of each post, the way most threads number themselves. */
export function numberPost(post: string, index: number, total: number): string {
    return total > 1 ? `${post}\n\n${index + 1}/${total}` : post;
}

/** What each post will look like when copied, numbered or not. */
export function finalPosts(posts: string[], numbered: boolean): string[] {
    return numbered ? posts.map((p, i) => numberPost(p, i, posts.length)) : posts;
}

/** Room the number takes ("\n\n12/12") so posts can be written to fit with it. */
export function numberingRoom(total: number): number {
    return `\n\n${total}/${total}`.length;
}

// Break a too-long post at the last sentence end, then the last space, that keeps it under the limit
function cutPoint(text: string, limit: number): number {
    let lastSentence = -1;
    let lastSpace = -1;
    let i = 0;
    for (const ch of text) {
        const next = i + ch.length;
        if (xLength(text.slice(0, next)) > limit) break;
        if (/[.!?]/.test(ch) && /\s/.test(text[next] ?? ' ')) lastSentence = next;
        if (/\s/.test(ch)) lastSpace = i;
        i = next;
    }
    if (lastSentence > limit / 3) return lastSentence;
    if (lastSpace > 0) return lastSpace;
    return Math.max(i, 1);
}

/** Split any post over the limit into posts that fit. Posts that already fit are left alone. */
export function fitPosts(posts: string[], limit: number = X_MAX_CHARS): string[] {
    const out: string[] = [];
    for (const post of posts) {
        let rest = post.trim();
        while (rest && xLength(rest) > limit) {
            const at = cutPoint(rest, limit);
            out.push(rest.slice(0, at).trim());
            rest = rest.slice(at).trim();
        }
        if (rest) out.push(rest);
    }
    return out;
}

/** Posts in the thread that are over X's limit once numbered, by position (0-based). */
export function overLimit(posts: string[], numbered: boolean): number[] {
    return finalPosts(posts, numbered)
        .map((p, i) => (xLength(p) > X_MAX_CHARS ? i : -1))
        .filter(i => i >= 0);
}
