/** @jest-environment node */
import { captureKind, captureToSource, formatCaptureSources, formatCapturesForIdeas, perCaptureLimit, stanceFromIntents, trimText } from '@/lib/brain/captures';
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

    it('guesses snip or frame for image captures saved before Lens recorded the kind', () => {
        const article = 'Every policy issue we researched led back to disconnection. '.repeat(10);
        expect(captureKind({ ai_metadata: { key_insight: 'x' }, ocr_text: article })).toBe('frame');
        expect(captureKind({ ai_metadata: {}, ocr_text: 'one\ntwo\nthree\nfour' })).toBe('frame');
        expect(captureKind({ ai_metadata: {}, ocr_text: 'A short quote' })).toBe('snip');
        expect(captureKind({ ai_metadata: {}, image_path: 'u/1.png' })).toBe('snip');
        // A saved kind always wins over the guess
        expect(captureKind({ ai_metadata: { kind: 'snip' }, ocr_text: article })).toBe('snip');
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

    it('keeps a long capture whole on the idea and shares the prompt budget between captures', () => {
        const long = 'Every word of this frame matters. '.repeat(250); // about 8,500 characters
        const source = captureToSource({ ...frame, ocr_text: long });
        expect(source.text).toBe(long.trim());
        const one = { explore: { query: '', from: 'captures', sources: [source] } } as unknown as BrainMetadata;
        expect(formatCaptureSources(one).length).toBeGreaterThan(7500);
        const six = { explore: { query: '', from: 'captures', sources: Array.from({ length: 6 }, (_, i) => ({ ...source, captureId: `c${i}` })) } } as unknown as BrainMetadata;
        expect(formatCaptureSources(six).length).toBeLessThan(15000);
        expect(perCaptureLimit(1)).toBe(8000);
        expect(perCaptureLimit(6)).toBe(2000);
        expect(perCaptureLimit(6, 3000)).toBe(1200);
    });

    it('carries the stored image along with the capture', () => {
        expect(captureToSource({ ...frame, imageUrl: 'https://img/x.png' }).image).toBe('https://img/x.png');
        expect(captureToSource(frame).image).toBeUndefined();
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

describe('capture images', () => {
    it('decodes the data URLs Lens sends and ignores anything else', () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { decodeImage } = require('@/lib/brain/capture-images');
        expect(decodeImage('data:image/png;base64,aGVsbG8=')).toMatchObject({ contentType: 'image/png', ext: 'png' });
        expect(decodeImage('data:image/jpeg;base64,aGVsbG8=')?.ext).toBe('jpg');
        expect(decodeImage('data:text/html;base64,aGVsbG8=')).toBeNull();
        expect(decodeImage('')).toBeNull();
    });

    it('adds what a chart shows to the capture text', () => {
        const source = captureToSource({ ...frame, ocr_text: 'Q3 revenue', ai_metadata: { kind: 'snip', visual_summary: 'Bar chart: revenue doubled' } });
        expect(source.text).toBe('Q3 revenue\n\n[What the image shows: Bar chart: revenue doubled]');
    });
});

describe('style intent', () => {
    it('reads a Style intent parked in ai_metadata and tells the writer to borrow the style', () => {
        const source = captureToSource({ ...frame, intent_type: null, ai_metadata: { kind: 'frame', intent: 'style' } });
        expect(source.intent).toBe('style');
        const meta = { explore: { query: '', from: 'captures', sources: [source] } } as unknown as BrainMetadata;
        expect(formatCaptureSources(meta)).toContain('borrow the style');
    });
});
