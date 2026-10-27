// Newsletter issues: the subject and preview text kept at the top of the draft, and the body
// turned into plain text or email-safe HTML for pasting into Substack, Beehiiv, Mailchimp or Gmail.
// Client-safe: used by the repurpose route, the email preview and the post sheet.

export const SUBJECT_MAX_CHARS = 60;
export const PREVIEW_MAX_CHARS = 110;

export interface NewsletterParts {
    subject: string;
    previewText: string;
    body: string;
}

const SUBJECT_RE = /^subject(?: line)?:\s*(.*)$/i;
const PREVIEW_RE = /^preview(?: text)?:\s*(.*)$/i;

/** The draft text: subject and preview lines, a --- line, then the body in markdown. */
export function joinNewsletter({ subject, previewText, body }: NewsletterParts): string {
    return `Subject: ${subject.trim()}\nPreview text: ${previewText.trim()}\n\n---\n\n${body.trim()}`;
}

/** Read the subject, preview text and body back out of a draft. Missing header lines come back empty. */
export function parseNewsletter(content: string): NewsletterParts {
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    let subject = '';
    let previewText = '';
    let i = 0;
    // Header: the subject and preview lines, blank lines between them, and an optional --- line
    for (; i < lines.length; i++) {
        const line = lines[i].trim();
        const s = line.match(SUBJECT_RE);
        const p = line.match(PREVIEW_RE);
        if (s) subject = s[1].trim();
        else if (p) previewText = p[1].trim();
        else if (line === '') continue;
        else if (/^-{3,}$/.test(line) && (subject || previewText)) { i++; break; }
        else break;
    }
    if (!subject && !previewText) i = 0;
    return { subject, previewText, body: lines.slice(i).join('\n').trim() };
}

const escapeHtml = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const safeUrl = (url: string) => (/^(https?:|mailto:)/i.test(url.trim()) ? url.trim() : '#');

// Inline styles only: email clients drop <style> blocks and classes
const STYLE = {
    p: 'margin:0 0 16px;font-size:16px;line-height:1.6;color:#1f1f1f;',
    h2: 'margin:28px 0 12px;font-size:22px;line-height:1.3;font-weight:600;color:#111;',
    h3: 'margin:24px 0 10px;font-size:18px;line-height:1.35;font-weight:600;color:#111;',
    quote: 'margin:20px 0;padding:4px 0 4px 16px;border-left:3px solid #e8590c;font-size:17px;line-height:1.55;font-style:italic;color:#333;',
    list: 'margin:0 0 16px;padding-left:24px;font-size:16px;line-height:1.6;color:#1f1f1f;',
    li: 'margin:0 0 6px;',
    a: 'color:#c2410c;text-decoration:underline;',
    img: 'display:block;max-width:100%;height:auto;margin:20px 0;border-radius:8px;',
};

function inlineHtml(text: string): string {
    return escapeHtml(text)
        .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, url) => `<img src="${safeUrl(url)}" alt="${alt}" style="${STYLE.img}" />`)
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => `<a href="${safeUrl(url)}" style="${STYLE.a}">${label}</a>`)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>')
        .replace(/(^|\W)_(?!\s)(.+?)_(?=\W|$)/g, '$1<em>$2</em>');
}

type Block =
    | { kind: 'p' | 'h2' | 'h3' | 'quote'; text: string }
    | { kind: 'ul' | 'ol'; items: string[] };

function blocks(markdown: string): Block[] {
    const out: Block[] = [];
    for (const chunk of markdown.replace(/\r\n/g, '\n').split(/\n\s*\n/)) {
        const lines = chunk.split('\n').map(l => l.trimEnd()).filter(l => l.trim());
        if (!lines.length) continue;
        const first = lines[0].trim();
        if (/^-{3,}$/.test(first) && lines.length === 1) continue;
        if (/^#{1,2}\s/.test(first)) { out.push({ kind: 'h2', text: first.replace(/^#+\s*/, '') }); if (lines.length > 1) out.push({ kind: 'p', text: lines.slice(1).join('\n') }); continue; }
        if (/^#{3,}\s/.test(first)) { out.push({ kind: 'h3', text: first.replace(/^#+\s*/, '') }); if (lines.length > 1) out.push({ kind: 'p', text: lines.slice(1).join('\n') }); continue; }
        if (lines.every(l => /^\s*>/.test(l))) { out.push({ kind: 'quote', text: lines.map(l => l.replace(/^\s*>\s?/, '')).join('\n') }); continue; }
        if (lines.every(l => /^\s*[-*•]\s+/.test(l))) { out.push({ kind: 'ul', items: lines.map(l => l.replace(/^\s*[-*•]\s+/, '')) }); continue; }
        if (lines.every(l => /^\s*\d+[.)]\s+/.test(l))) { out.push({ kind: 'ol', items: lines.map(l => l.replace(/^\s*\d+[.)]\s+/, '')) }); continue; }
        out.push({ kind: 'p', text: lines.join('\n') });
    }
    return out;
}

/** The body as email-safe HTML with inline styles. */
export function newsletterHtml(markdown: string): string {
    return blocks(markdown).map(b => {
        switch (b.kind) {
            case 'h2': return `<h2 style="${STYLE.h2}">${inlineHtml(b.text)}</h2>`;
            case 'h3': return `<h3 style="${STYLE.h3}">${inlineHtml(b.text)}</h3>`;
            case 'quote': return `<blockquote style="${STYLE.quote}">${inlineHtml(b.text).replace(/\n/g, '<br />')}</blockquote>`;
            case 'ul':
            case 'ol': return `<${b.kind} style="${STYLE.list}list-style-type:${b.kind === 'ul' ? 'disc' : 'decimal'};">${b.items.map(i => `<li style="${STYLE.li}">${inlineHtml(i)}</li>`).join('')}</${b.kind}>`;
            default: return `<p style="${STYLE.p}">${inlineHtml(b.text).replace(/\n/g, '<br />')}</p>`;
        }
    }).join('\n');
}

function inlinePlain(text: string): string {
    return text
        .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '')
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => (label === url ? url : `${label} (${url})`))
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1$2')
        .replace(/(^|\W)_(?!\s)(.+?)_(?=\W|$)/g, '$1$2');
}

/** The body as plain text: no markdown marks, links written out, headings on their own line. */
export function newsletterPlainText(markdown: string): string {
    return blocks(markdown).map(b => {
        switch (b.kind) {
            case 'h2':
            case 'h3': return inlinePlain(b.text);
            case 'quote': return inlinePlain(b.text);
            case 'ul': return b.items.map(i => `• ${inlinePlain(i)}`).join('\n');
            case 'ol': return b.items.map((i, n) => `${n + 1}. ${inlinePlain(i)}`).join('\n');
            default: return inlinePlain(b.text);
        }
    }).filter(Boolean).join('\n\n');
}
