import { NextResponse } from 'next/server';
import { AntiSlopService } from '@/lib/tools/anti-slop';

// The homepage "Try it now" check. It only looks for stock phrases (the same word list the
// app uses on drafts), so it's free to run for anyone and never calls a model.

const EXTRA_PHRASES: Record<string, string> = {
    'game-changer': 'Hype the post can rarely back up.',
    'leverage': 'Corporate filler; "use" usually works.',
    "in today's world": 'Throat-clearing opening.',
};

const MAX_ISSUES = 5;

export async function POST(req: Request) {
    try {
        const { text } = await req.json();

        if (typeof text !== 'string' || text.length < 50) {
            return NextResponse.json({ error: 'Text too short' }, { status: 400 });
        }
        const sample = text.slice(0, 5000);

        const issues: { type: string; match: string; message: string; suggestion?: string }[] = [];
        const seen = new Set<string>();
        const add = (match: string, message: string, suggestion?: string) => {
            const key = match.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            issues.push({ type: 'cliche', match, message, suggestion: suggestion || undefined });
        };

        AntiSlopService.scan(sample).forEach(m => add(m.word, m.reason, m.suggestion));
        const lower = sample.toLowerCase();
        Object.entries(EXTRA_PHRASES).forEach(([phrase, reason]) => {
            const at = lower.indexOf(phrase);
            if (at !== -1) add(sample.slice(at, at + phrase.length), reason);
        });

        return NextResponse.json({
            issues: issues.slice(0, MAX_ISSUES),
            total: issues.length,
        });
    } catch (err) {
        console.error('Audit Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
