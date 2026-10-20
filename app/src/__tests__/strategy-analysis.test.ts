import { toStrategyAnalysis } from '@/lib/brain/strategy';

describe('toStrategyAnalysis', () => {
    it('maps the strategy check response to what the panel shows', () => {
        expect(toStrategyAnalysis({
            score: 72,
            critique: 'The hook is strong but the CTA is vague.',
            strengths: ['Clear hook'],
            weaknesses: ['No proof point', 'Vague CTA'],
            actionable_fix: 'End with one concrete question for parents.',
        })).toEqual({
            score: 72,
            analysis: 'The hook is strong but the CTA is vague.',
            suggestions: ['End with one concrete question for parents.', 'No proof point', 'Vague CTA'],
        });
    });

    it('survives an empty or odd response', () => {
        expect(toStrategyAnalysis({})).toEqual({ score: 0, analysis: '', suggestions: [] });
        expect(toStrategyAnalysis({ score: '140', analysis: 'ok', suggestions: ['a', '', 'a'] })).toEqual({ score: 100, analysis: 'ok', suggestions: ['a'] });
    });
});
