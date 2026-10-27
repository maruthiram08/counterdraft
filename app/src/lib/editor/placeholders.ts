// Spots the draft leaves for the creator, like "[Insert a personal story about ...]".
// They must be filled before posting, so the draft step and editor make them hard to miss.

import type { Suggestion } from './suggestions';

export interface Placeholder {
    index: number;
    start: number;
    end: number;
    text: string;  // with the brackets, as it appears in the draft
    label: string; // what to write, without the brackets
}

// [at least 3 characters on one line], but not the text of a markdown link "[text](url)"
const PLACEHOLDER = /\[([^\]\n]{3,})\](?!\()/g;

export function findPlaceholders(text: string): Placeholder[] {
    return [...text.matchAll(PLACEHOLDER)].map((m, index) => ({
        index,
        start: m.index!,
        end: m.index! + m[0].length,
        text: m[0],
        label: m[1].trim(),
    }));
}

export const PLACEHOLDER_MARK_CLASS = 'bg-ember-100 rounded-sm shadow-[0_0_0_2px_var(--color-ember-200)]';
// Softer than a placeholder: the text is there, it just wants checking
export const SUGGESTION_MARK_CLASS = 'bg-dusk-100 rounded-sm';

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * The draft as escaped HTML for a highlight backdrop behind a textarea, with each placeholder marked,
 * and each suggested passage too when given. Every character stays where it is, so the marks line up with the text on top.
 */
export function markPlaceholders(text: string, suggestions: Suggestion[] = []): string {
    const marks = [
        ...findPlaceholders(text).map(p => ({ ...p, attr: 'data-placeholder', cls: PLACEHOLDER_MARK_CLASS })),
        ...suggestions.map(s => ({ ...s, attr: 'data-suggestion', cls: SUGGESTION_MARK_CLASS })),
    ].sort((a, b) => a.start - b.start);
    let html = '';
    let at = 0;
    for (const m of marks) {
        if (m.start < at) continue; // overlaps the one before
        html += escapeHtml(text.slice(at, m.start));
        html += `<mark ${m.attr}="${m.index}" class="${m.cls} text-transparent">${escapeHtml(m.text)}</mark>`;
        at = m.end;
    }
    html += escapeHtml(text.slice(at));
    // A trailing newline needs something after it, or the backdrop ends one line short of the textarea
    return html + (text.endsWith('\n') ? '<br/>&nbsp;' : '');
}
