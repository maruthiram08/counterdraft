import { render, screen } from '@testing-library/react';
import { X_MAX_CHARS, fitPosts, finalPosts, joinThread, overLimit, parseThread, xLength } from '@/lib/content/x-thread';
import { joinNewsletter, newsletterHtml, newsletterPlainText, parseNewsletter } from '@/lib/content/newsletter';
import { ThreadPreview } from '@/components/editor/ThreadPreview';
import { NewsletterPreview } from '@/components/editor/NewsletterPreview';
import { PostSheet } from '@/components/editor/PostSheet';
import { postPlatformFor } from '@/lib/posts/posted';
import type { Draft } from '@/types';

describe('X threads', () => {
    it('counts characters the way X does', () => {
        expect(xLength('hello')).toBe(5);
        expect(xLength('see https://example.com/a/very/long/path/that/goes/on')).toBe(4 + 23);
        expect(xLength('🔥')).toBe(2);
        expect(xLength('👩‍💻')).toBe(2);
        expect(xLength('日本')).toBe(4);
    });

    it('keeps posts between --- lines and joins them back the same way', () => {
        const content = joinThread(['First post', 'Second\nwith a line', 'Third']);
        expect(content).toBe('First post\n\n---\n\nSecond\nwith a line\n\n---\n\nThird');
        expect(parseThread(content)).toEqual(['First post', 'Second\nwith a line', 'Third']);
        expect(parseThread('One\n---\nTwo\n\n-----\n\n\n')).toEqual(['One', 'Two']);
    });

    it('numbers posts at the end, only when there is more than one', () => {
        expect(finalPosts(['a', 'b'], true)).toEqual(['a\n\n1/2', 'b\n\n2/2']);
        expect(finalPosts(['a'], true)).toEqual(['a']);
        expect(finalPosts(['a', 'b'], false)).toEqual(['a', 'b']);
    });

    it('splits a long post at a sentence end and leaves short ones alone', () => {
        const sentence = 'This sentence is exactly long enough to matter here. ';
        const long = sentence.repeat(8).trim();
        const fitted = fitPosts(['Short one.', long], 273);
        expect(fitted[0]).toBe('Short one.');
        expect(fitted.length).toBeGreaterThan(2);
        fitted.forEach(p => {
            expect(xLength(p)).toBeLessThanOrEqual(273);
            expect(p.endsWith('.')).toBe(true);
        });
        expect(fitted.slice(1).join(' ')).toBe(long);
    });

    it('splits a post with no spaces at all', () => {
        const fitted = fitPosts(['x'.repeat(600)], X_MAX_CHARS);
        expect(fitted.map(p => p.length)).toEqual([280, 280, 40]);
    });

    it('flags posts that go over once numbered', () => {
        const nearly = 'y'.repeat(276);
        expect(overLimit([nearly, 'ok'], false)).toEqual([]);
        expect(overLimit([nearly, 'ok'], true)).toEqual([0]);
    });
});

describe('Newsletters', () => {
    const content = joinNewsletter({
        subject: 'Why I stopped writing every day',
        previewText: 'Less output, better posts.',
        body: '## The habit\n\nI wrote **every** day.\n\n> Quantity was the trap.\n\n- one\n- two\n\nRead [more](https://example.com) <script>x</script>',
    });

    it('reads the subject and preview text back out of the draft', () => {
        const parts = parseNewsletter(content);
        expect(parts.subject).toBe('Why I stopped writing every day');
        expect(parts.previewText).toBe('Less output, better posts.');
        expect(parts.body.startsWith('## The habit')).toBe(true);
    });

    it('treats a draft with no header as all body', () => {
        expect(parseNewsletter('Just a body\n\n---\n\nmore')).toEqual({ subject: '', previewText: '', body: 'Just a body\n\n---\n\nmore' });
    });

    it('turns the body into email HTML with inline styles and no raw tags', () => {
        const html = newsletterHtml(parseNewsletter(content).body);
        expect(html).toContain('<h2 style=');
        expect(html).toContain('<strong>every</strong>');
        expect(html).toContain('<blockquote style=');
        expect(html).toContain('<ul style=');
        expect(html).toContain('<a href="https://example.com" style=');
        expect(html).not.toContain('<script>');
        expect(html).not.toContain('class=');
        expect(newsletterHtml('[x](javascript:alert(1))')).toContain('href="#"');
    });

    it('turns the body into plain text with links written out', () => {
        const plain = newsletterPlainText(parseNewsletter(content).body);
        expect(plain).toContain('The habit\n\nI wrote every day.');
        expect(plain).toContain('• one\n• two');
        expect(plain).toContain('Read more (https://example.com)');
        expect(plain).not.toContain('**');
        expect(plain).not.toContain('##');
    });
});

describe('format previews', () => {
    it('shows each thread post with its count and a copy button, and flags long ones', () => {
        render(<ThreadPreview content={joinThread(['The hook.', 'z'.repeat(300)])} />);
        expect(screen.getByText('Post 1 · the hook')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Copy post 1' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Copy post 2' })).toBeInTheDocument();
        expect(screen.getByText(/1 over X's 280-character limit/)).toBeInTheDocument();
        expect(screen.getByText('Too long for X. Shorten it in the editor.')).toBeInTheDocument();
    });

    it('shows the inbox line and the copy options for a newsletter', () => {
        render(<NewsletterPreview content={joinNewsletter({ subject: 'Hello there', previewText: 'A preview', body: 'Body text' })} />);
        expect(screen.getByText('Hello there')).toBeInTheDocument();
        expect(screen.getByTestId('newsletter-body').innerHTML).toContain('Body text');
        ['Copy subject', 'Copy preview text', 'Copy the email, formatted', 'Copy plain text', 'Copy HTML code'].forEach(name =>
            expect(screen.getByRole('button', { name })).toBeInTheDocument());
    });
});

describe('Post sheet for repurposed formats', () => {
    const base: Draft = { id: 'd', belief_text: 'T', content: '', status: 'draft', created_at: '', updated_at: '' };
    beforeEach(() => {
        global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ connected: true }) }) as jest.Mock;
    });

    it('preselects X and offers each post to copy, never LinkedIn', async () => {
        const content = joinThread(['One', 'Two']);
        render(<PostSheet isOpen mode="post" draft={{ ...base, platform: 'x_thread', content }} content={content} onClose={jest.fn()} onMarkPosted={jest.fn()} onLinkedInPosted={jest.fn()} />);
        expect(screen.getByRole('button', { name: 'X' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Copy post 2' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /post to linkedin/i })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Copy the text' })).toBeNull();
    });

    it('preselects Newsletter for an issue', () => {
        expect(postPlatformFor('newsletter')).toBe('newsletter');
        expect(postPlatformFor('x_thread')).toBe('x');
        expect(postPlatformFor('medium')).toBe('medium');
        expect(postPlatformFor(undefined)).toBeNull();
    });
});
