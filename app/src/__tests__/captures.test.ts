/** @jest-environment node */
import { captureKind, captureToSource, formatCaptureSources, formatCapturesForIdeas, stanceFromIntents, trimText } from '@/lib/brain/captures';
import { formatExploreSources, formatIdeaChain } from '@/lib/brain/strategy';
import { extractPageText } from '@/lib/read-page';
import type { BrainMetadata } from '@/types';

const frame = {
    id: 'cap-1',
    source_url: 'https://www.linkedin.com/feed/',
    source_title: 'Feed | LinkedIn',
    source_domain: 'www.linkedin.com',
    ocr_text: 'Hiring for culture fit is lazy.\nHire for culture add instead.',
    user_note: 'He ignores small teams',
    intent_type: 'counter',
    ai_metadata: { kind: 'frame', key_insight: 'Culture add beats culture fit' },
};

describe('captures', () => {
    it('reads the kind, falling back to the old bookmark marker', () => {
        expect(captureKind(frame)).toBe('frame');
        expect(captureKind({ ai_metadata: { type: 'bookmark' } })).toBe('bookmark');
        expect(captureKind({ ai_metadata: {} })).toBeUndefined();
    });

    it('turns a capture into a source that keeps its text, note and intent', () => {
        const source = captureToSource(frame);
        expect(source).toMatchObject({
            captureId: 'cap-1',
            captureKind: 'frame',
            intent: 'counter',
            note: 'He ignores small teams',
            source: 'linkedin.com',
            text: frame.ocr_text,
        });
    });

    it('uses page text read later for a bookmark saved without text', () => {
        const source = captureToSource({ id: 'b', source_url: 'https://example.com/a', ocr_text: '', ai_metadata: { type: 'bookmark' } }, 'Read later');
        expect(source.text).toBe('Read later');
        expect(source.title).toBe('example.com');
    });

    it('drops an intent the database does not know', () => {
        expect(captureToSource({ ...frame, intent_type: 'inspiration' }).intent).toBeUndefined();
    });

    it('takes a stance only when every capture pulls the same way', () => {
        expect(stanceFromIntents(['counter', 'counter'])).toBe('push_back');
        expect(stanceFromIntents(['agree'])).toBe('agree');
        expect(stanceFromIntents(['agree', 'counter'])).toBeUndefined();
        expect(stanceFromIntents(['evidence'])).toBeUndefined();
        expect(stanceFromIntents([undefined])).toBeUndefined();
    });

    it('trims long text at a sentence or line', () => {
        const long = `${'A sentence here. '.repeat(300)}`;
        const cut = trimText(long, 500);
        expect(cut.length).toBeLessThan(520);
        expect(cut.endsWith('[…]')).toBe(true);
    });

    it('tells the models what the creator thinks of each capture, with its domain for citing', () => {
        const meta = { explore: { query: '', from: 'captures', sources: [captureToSource(frame)] } } as unknown as BrainMetadata;
        const block = formatCaptureSources(meta);
        expect(block).toContain("THE CREATOR'S CAPTURES");
        expect(block).toContain('[C1] Feed | LinkedIn (linkedin.com)');
        expect(block).toContain('disagrees with this and wants to push back');
        expect(block).toContain('Their note: "He ignores small teams"');
        expect(block).toContain('Hire for culture add instead.');
        expect(formatCapturesForIdeas(meta.explore!.sources)).toContain('[C1]');
    });

    it('keeps captures out of the Explore sources list and names them in the idea chain', () => {
        const meta = { explore: { query: '', from: 'captures', sources: [captureToSource(frame)] } } as unknown as BrainMetadata;
        expect(formatExploreSources(meta)).toBe('');
        expect(formatIdeaChain({ hook: 'Culture fit is lazy', meta })).toContain('captures they saved while reading');
        expect(formatCaptureSources({} as BrainMetadata)).toBe('');
    });
});

describe('extractPageText', () => {
    it('keeps headings, paragraphs and lists apart and drops page furniture', () => {
        const html = `<html><head><title>Fallback</title><meta property="og:title" content="The real title"></head><body>
            <nav>Home About</nav>
            <div class="cookie-banner">We use cookies</div>
            <article>
                <h1>Why teams stall</h1>
                <p>First   paragraph with
                   a line break.</p>
                <ul><li>One point</li><li>Another point</li></ul>
                <p>${'Long enough text. '.repeat(20)}</p>
                <div class="share-bar">Share on X</div>
                <section class="comments"><p>Great post!</p></section>
            </article>
            <aside>Related: other stories</aside>
            <footer>© 2026</footer>
        </body></html>`;
        const { title, content } = extractPageText(html);
        expect(title).toBe('The real title');
        expect(content.split('\n\n').slice(0, 4)).toEqual([
            '## Why teams stall',
            'First paragraph with a line break.',
            '- One point',
            '- Another point',
        ]);
        for (const junk of ['Home About', 'cookies', 'Share on X', 'Great post!', 'Related', '© 2026']) {
            expect(content).not.toContain(junk);
        }
    });

    it('keeps an article whose wrapper class only looks like page furniture', () => {
        const html = `<body><div class="shared-layout"><article><p>${'The article itself. '.repeat(100)}</p></article></div></body>`;
        expect(extractPageText(html).content).toContain('The article itself.');
    });

    it('falls back to the text of pages built from bare divs', () => {
        const html = `<body><main><div>${'Words in a div. '.repeat(30)}</div></main></body>`;
        expect(extractPageText(html).content).toContain('Words in a div.');
    });
});
