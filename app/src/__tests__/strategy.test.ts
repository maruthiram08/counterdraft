import { extractOriginQuery, formatIdeaChain, formatStrategyContext, hasStrategy, normalizeFormat, sanitizeParsedStrategy } from '@/lib/brain/strategy';

describe('sanitizeParsedStrategy', () => {
    it('keeps free-text values and normalises presets', () => {
        const result = sanitizeParsedStrategy({
            outcome: 'Authority',
            format: 'story',
            stance: '  gently sceptical ',
            audience: { role: 'First-time founders', pain: 'Fear of the first PM hire', beliefs: 42 },
            cta: 'DM me',
            include: ['My last startup', '', 7],
            avoid: 'not a list',
            clarifyingQuestion: null,
            unknownField: 'dropped',
        });

        expect(result).toEqual({
            outcome: 'authority',
            format: 'personal_story',
            stance: 'gently sceptical',
            audience: { role: 'First-time founders', pain: 'Fear of the first PM hire' },
            cta: 'DM me',
            include: ['My last startup'],
        });
    });

    it('accepts a plain-string audience and ignores junk input', () => {
        expect(sanitizeParsedStrategy({ audience: 'Designers' })).toEqual({ audience: { role: 'Designers', pain: '' } });
        expect(sanitizeParsedStrategy(null)).toEqual({});
        expect(sanitizeParsedStrategy('nope')).toEqual({});
    });
});

describe('formatStrategyContext', () => {
    it('includes only the fields that are set, plus the brief verbatim', () => {
        const context = formatStrategyContext({
            stance: 'contrarian',
            format: 'story',
            cta: 'DM me',
            brief: 'Slightly spicy, not preachy.',
        });

        expect(context).toContain('- Stance: contrarian');
        expect(context).toContain('- Format: Personal Story');
        expect(context).toContain('- Call to action: DM me');
        expect(context).toContain('Slightly spicy, not preachy.');
        expect(context).not.toContain('Goal');
        expect(context).not.toContain('undefined');
    });

    it('returns nothing for an empty strategy', () => {
        expect(formatStrategyContext(undefined)).toBe('');
        expect(formatStrategyContext({ brief: '   ' })).toBe('');
    });
});

describe('helpers', () => {
    it('maps the legacy story value', () => {
        expect(normalizeFormat('story')).toBe('personal_story');
        expect(normalizeFormat('a short thread')).toBe('a short thread');
    });

    it('treats a brief alone as a strategy', () => {
        expect(hasStrategy({ brief: 'For founders' })).toBe(true);
        expect(hasStrategy({})).toBe(false);
    });
});

describe('idea chain', () => {
    it('lists the original search, source, idea and brief in order', () => {
        const chain = formatIdeaChain({
            hook: 'How a Holistic View of Time Can Transform Modern Life',
            meta: { sourceContext: 'Original Search Query: "GTM for B2B SaaS"\n\nSource Topics: ...', brief: 'For first-time dads' },
        });
        expect(extractOriginQuery('Original Search Query: "GTM for B2B SaaS"')).toBe('GTM for B2B SaaS');
        expect(chain).toContain('1. What the creator was originally searching for: "GTM for B2B SaaS"');
        expect(chain).toContain('2. The source material they picked');
        expect(chain).toContain('3. The idea they saved');
        expect(chain).toContain('4. Their brief for this post: "For first-time dads"');
    });
});
