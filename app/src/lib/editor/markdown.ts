import DOMPurify from 'isomorphic-dompurify';

export interface VerificationResult {
    original_sentence?: string;
    status: 'verified' | 'disputed' | 'unverified' | 'irrelevant';
}

/**
 * Parses markdown text into HTML with specific custom formatting for the editor.
 */
export const parseMarkdown = (text: string) => {
    const html = text
        // Headers
        .replace(/^#{3} (.*$)/gim, '<h3 class="text-xl font-bold mt-6 mb-2">$1</h3>')
        .replace(/^#{2} (.*$)/gim, '<h2 class="text-2xl font-serif font-bold mt-8 mb-4 border-b border-gray-100 pb-2">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 class="text-4xl font-serif font-bold mb-6">$1</h1>')
        // Bold
        .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold text-gray-900">$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/gim, '<em class="italic text-gray-800">$1</em>')
        // Blockquotes (Pull Quotes)
        .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-gray-900 pl-5 py-2 my-6 text-xl font-serif italic text-gray-700 bg-gray-50/50 rounded-r-lg">$1</blockquote>')
        // Images
        .replace(/!\[(.*?)\]\((.*?)\)/gim, '<img src="$2" alt="$1" class="w-full rounded-xl my-6 shadow-sm border border-gray-100" />')
        // Links
        .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" class="text-blue-600 hover:underline decoration-blue-200 underline-offset-2">$1</a>')
        // Bullets
        .replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc marker:text-gray-400 pl-1 mb-1">$1</li>')
        // Paragraphs logic: Split by double newline, wrap non-tags in p
        .split('\n\n').map(p => {
            const trimmed = p.trim();
            if (!trimmed) return '';
            if (trimmed.startsWith('<')) return trimmed;
            return `<p class="mb-4 leading-relaxed text-lg text-gray-800">${trimmed.replace(/\n/g, '<br/>')}</p>`;
        }).join('');

    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'br', 'strong', 'em', 'blockquote', 'img', 'a', 'li', 'ul', 'ol'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'target', 'rel']
    });
};

/**
 * Generates HTML with highlights for selected text or verification results.
 */
export const generateHighlights = (
    content: string,
    selectionRange: { start: number; end: number } | null,
    verifications: VerificationResult[]
) => {
    // 1. Priority: Show Active Selection (Persistent even when blurred)
    if (selectionRange) {
        const { start, end } = selectionRange;
        if (start >= 0 && end <= content.length) {
            const pre = content.substring(0, start).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const sel = content.substring(start, end).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const post = content.substring(end).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

            // Use a distinct, clear highlight color (indigo-100 is good for 'focused' feel)
            return `${pre}<span class="bg-indigo-200">${sel}</span>${post}` + (content.endsWith('\n') ? '<br/>&nbsp;' : '');
        }
    }

    // 2. Secondary: Show Validation Highlights (if no selection)
    if (verifications.length === 0) return null;

    // Escape HTML
    let highlighted = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Highlight problematic claims (disputed/unverified)
    // Check for Markdown formatting in original sentences and normalize
    // We strip markdown chars from content for matching to make it robust
    const sorted = [...verifications]
        .filter(v => v.status !== 'verified' && v.original_sentence)
        .sort((a, b) => (b.original_sentence?.length || 0) - (a.original_sentence?.length || 0));

    sorted.forEach(v => {
        const sentence = v.original_sentence!;
        const escaped = sentence.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const colorClass = v.status === 'disputed' ? 'bg-red-200/50 border-b-2 border-red-400' : 'bg-yellow-100/50 border-b-2 border-yellow-300';

        // Escape regex chars
        const safeRegex = escaped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        highlighted = highlighted.replace(new RegExp(safeRegex, 'g'), `<span class="${colorClass} rounded-sm">${escaped}</span>`);
    });

    // Add a trailing space/newline indicator if at the end of content to keep heights matched
    return highlighted + (content.endsWith('\n') ? '<br/>&nbsp;' : '');
};
