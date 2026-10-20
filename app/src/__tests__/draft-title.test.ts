/**
 * @jest-environment node
 */
import { cleanTitle, fallbackTitle, needsRetitle, titleFromItem } from '@/lib/brain/title';

const BRIEF = "Explore the deeper reasons behind the emotional resonance of K-pop with Indian Gen Z. This post would delve into the emotional safety and sense of connection that K-pop provides, suggesting that this obsession is more than a cultural trend—it's a response to unmet emotional needs.";

describe('needsRetitle', () => {
    it('flags briefs, instructions and paragraphs', () => {
        expect(needsRetitle(BRIEF)).toBe(true);
        expect(needsRetitle('Investigate how K-pop is influencing the way Indian Gen Z thinks about friendship')).toBe(true);
        expect(needsRetitle('In this post I argue that founders should hire later')).toBe(false);
        expect(needsRetitle('Why this post went viral and what it taught me about hooks')).toBe(false);
        expect(needsRetitle('K-pop and Gen Z: this post would look at safety')).toBe(true);
        expect(needsRetitle('')).toBe(true);
        expect(needsRetitle('Untitled Draft')).toBe(true);
    });

    it('flags a title copied from the angle', () => {
        expect(needsRetitle('Hiring is a trust problem', { angle: 'Hiring is a trust problem' })).toBe(true);
    });

    it('keeps real headlines', () => {
        expect(needsRetitle("Anthropic's AI Ambitions")).toBe(false);
        expect(needsRetitle('Why K-pop feels safer than real friendships for Gen Z')).toBe(false);
        expect(needsRetitle('Explore 5 tools I use daily')).toBe(false);
    });
});

describe('fallbackTitle', () => {
    it('turns a brief into a short phrase', () => {
        const title = fallbackTitle(BRIEF);
        expect(title).toBe('The emotional resonance of K-pop with Indian Gen Z');
        expect(needsRetitle(title)).toBe(false);
    });

    it('caps long single sentences', () => {
        const title = fallbackTitle('Investigate how K-pop is influencing the way Indian Gen Z thinks about friendship, love, belonging and identity in a hyper online world');
        expect(title.split(/\s+/).length).toBeLessThanOrEqual(12);
        expect(title.endsWith('…')).toBe(true);
        expect(title.startsWith('How K-pop')).toBe(true);
    });

    it('handles empty input', () => {
        expect(fallbackTitle('')).toBe('Untitled Draft');
        expect(fallbackTitle(null)).toBe('Untitled Draft');
    });
});

describe('cleanTitle', () => {
    it('strips quotes, markdown and trailing punctuation', () => {
        expect(cleanTitle('"Why K-pop Feels Like Home."')).toBe('Why K-pop Feels Like Home');
        expect(cleanTitle('# **Title: Hiring Is Trust**\nmore')).toBe('Hiring Is Trust');
    });
});

describe('titleFromItem', () => {
    it('keeps a short hook and shortens a brief', () => {
        expect(titleFromItem('Hiring is a trust problem', 'A long angle')).toBe('Hiring is a trust problem');
        expect(titleFromItem(BRIEF)).toBe('The emotional resonance of K-pop with Indian Gen Z');
        expect(titleFromItem(null, null)).toBe('Untitled Draft');
    });
});
