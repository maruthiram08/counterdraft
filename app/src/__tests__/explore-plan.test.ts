import { detectIntent, fallbackPlan } from '@/lib/explore/plan';

jest.mock('@/lib/openai', () => ({ openai: {} }));

const GTM = 'How to develop GTM strategy for B2C product as a product strategy';

describe('explore search planning', () => {
    it('treats how-to questions as learning, not news', () => {
        expect(detectIntent(GTM)).toBe('learn');
        expect(detectIntent('B2C pricing frameworks')).toBe('learn');
        expect(detectIntent('remote work')).toBe('news');
        expect(detectIntent('OpenAI device launch')).toBe('news');
    });

    it('cuts a long how-to question down to focused searches that keep its qualifiers', () => {
        const plan = fallbackPlan(GTM);
        expect(plan.intent).toBe('learn');
        expect(plan.queries).toEqual(['GTM strategy B2C product framework', 'GTM strategy B2C product case study']);
        expect(plan.label).toBe('GTM strategy B2C product');
    });

    it('sends short searches as typed', () => {
        expect(fallbackPlan('remote work')).toEqual({ intent: 'news', label: 'remote work', queries: ['remote work'] });
    });
});
