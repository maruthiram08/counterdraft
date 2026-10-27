/** @jest-environment node */
import { capturedPost } from '@/lib/brain/captures';
import { buildReframeItem, canReframe, checkOriginality, creditLine, formatReframe, hasCredit, modeFromIntent, startingMode } from '@/lib/brain/reframe';
import { formatIdeaChain } from '@/lib/brain/strategy';
import type { Artifact, BrainMetadata } from '@/types';

const original = `Most teams don't need more meetings, they need fewer and better ones.
I cut our standing meetings by half last quarter and shipping speed went up by a third.
The trick was writing the decision down before anyone walked into the room.`;

const capture = {
    id: 'cap-9',
    userId: 'u1',
    source_url: 'https://www.linkedin.com/feed/',
    source_domain: 'www.linkedin.com',
    source_title: 'Feed | LinkedIn',
    ocr_text: original,
    user_note: 'Works for big teams only',
    intent_type: 'counter',
    ai_metadata: { kind: 'frame', post: { author: 'Priya Raman', url: 'https://www.linkedin.com/feed/update/urn:li:activity:123/' } },
    createdAt: new Date(),
} as Artifact;

describe('reframe', () => {
    it('starts from the mode the capture intent suggests', () => {
        expect(modeFromIntent('agree')).toBe('build');
        expect(modeFromIntent('counter')).toBe('push_back');
        expect(modeFromIntent('evidence')).toBe('proof');
        expect(modeFromIntent('example')).toBe('proof');
        expect(modeFromIntent('style')).toBe('style');
        expect(modeFromIntent('framing')).toBe('my_story');
        expect(modeFromIntent(undefined)).toBe('build');
        expect(startingMode(capture)).toBe('push_back');
    });

    it('needs captured words to react to', () => {
        expect(canReframe(capture)).toBe(true);
        expect(canReframe({ ocr_text: '' })).toBe(false);
        expect(canReframe({ ocr_text: 'too short' })).toBe(false);
    });

    it('builds a Pipeline item that carries the post, author and link', () => {
        const item = buildReframeItem(capture, { mode: 'push_back', formatId: 'short' });
        expect(item.hook).toBe("Pushing back on Priya Raman's post");
        expect(item.brain_metadata.reframe).toMatchObject({
            mode: 'push_back',
            captureId: 'cap-9',
            author: 'Priya Raman',
            postUrl: 'https://www.linkedin.com/feed/update/urn:li:activity:123/',
            original,
        });
        expect(item.brain_metadata.length).toMatch(/Short/);
        // Counted as built from this capture, like ideas found from captures
        expect(item.brain_metadata.explore).toMatchObject({ from: 'captures', sources: [{ captureId: 'cap-9', author: 'Priya Raman' }] });
    });

    it('uses the take as the title when one is given', () => {
        const item = buildReframeItem(capture, { mode: 'build', take: 'Fewer meetings only works with written decisions', formatId: 'story' });
        expect(item.hook).toBe('Fewer meetings only works with written decisions');
        expect(item.format).toBe('personal_story');
        expect(item.brain_metadata.reframe?.take).toBe('Fewer meetings only works with written decisions');
    });

    it('tells every step how the creator wants to respond', () => {
        const meta = buildReframeItem(capture, { mode: 'push_back', take: 'Small teams need the meetings' }).brain_metadata as BrainMetadata;
        expect(formatReframe(meta)).toMatch(/Push back/);
        expect(formatReframe(meta)).toMatch(/Small teams need the meetings/);
        expect(formatIdeaChain({ hook: 'x', meta })).toMatch(/How the creator wants to respond/);
        expect(formatReframe({})).toBe('');
    });

    it('flags lines copied from the original, but not quoted ones', () => {
        const draft = `I disagree with this one.
I cut our standing meetings by half last quarter and shipping speed went up, they say.
"The trick was writing the decision down before anyone walked into the room."
Small teams need the hallway time.`;
        const result = checkOriginality(draft, original);
        expect(result.copied).toEqual(['I cut our standing meetings by half last quarter and shipping speed went up, they say.']);
        expect(result.share).toBeGreaterThan(0);
        expect(checkOriginality('Small teams need their meetings. That is my whole point here today.', original).copied).toEqual([]);
    });

    it('offers a credit line naming the author', () => {
        const line = creditLine({ author: 'Priya Raman' });
        expect(line).toBe('Sparked by a post from Priya Raman.');
        expect(creditLine({}, 'medium.com')).toMatch(/medium\.com/);
        expect(hasCredit(`My post.\n\n${line}`, line)).toBe(true);
    });
});

describe('capturedPost', () => {
    it('keeps a name and web links only', () => {
        expect(capturedPost({ author: '  Priya\n Raman ', url: 'https://www.linkedin.com/posts/x', authorUrl: 'javascript:alert(1)' }))
            .toEqual({ author: 'Priya Raman', url: 'https://www.linkedin.com/posts/x' });
        expect(capturedPost({ author: '', url: 'not a url' })).toBeUndefined();
        expect(capturedPost('Priya')).toBeUndefined();
    });
});
