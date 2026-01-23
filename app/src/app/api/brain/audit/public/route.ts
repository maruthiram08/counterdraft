import { NextResponse } from 'next/server';

// THIS IS A "LITE" VERSION OF THE BRAIN LOGIC
// It returns a simplified analysis for the public marketing site.
// In the future, this should call the real BrainDecisionService but filter the output.

export async function POST(req: Request) {
    try {
        const { text } = await req.json();

        if (!text || text.length < 50) {
            return NextResponse.json({ error: 'Text too short' }, { status: 400 });
        }

        // SIMULATED ANALYSIS for "Lite" version
        // 1. Check for basic "AI Stop Words"
        const aiPatterns = ['game-changer', 'unleash', 'leverage', 'in today\'s world', 'delve'];
        const issues = [];

        // Quick scan for clichés
        aiPatterns.forEach(word => {
            if (text.toLowerCase().includes(word)) {
                issues.push({
                    type: 'cliche',
                    match: word,
                    message: `The phrase "${word}" creates cognitive gloss.`
                });
            }
        });

        // Add a generic style issue if too clean
        if (issues.length === 0 && text.length > 200) {
            issues.push({
                type: 'tone',
                match: 'structure',
                message: 'Sentence structure lacks rhythmic variation.'
            });
        }

        // Calculate a "Teaser Score"
        // Base 80, minus 10 for each issue found
        const score = Math.max(40, 80 - (issues.length * 15));

        // MOCK RESPONSE
        // We only return ONE clear issue, the rest are "hidden" for the lead magnet.
        const response = {
            score,
            primary_critique: issues.length > 0 ? issues[0] : { type: 'positive', message: 'Good flow, but lacks unique opinion.' },
            hidden_issues_count: Math.max(0, issues.length - 1 + Math.floor(Math.random() * 3)) // Fake "more issues" to drive curiosity if few found
        };

        // Add artificial delay to simulate "Thinking"
        await new Promise(r => setTimeout(r, 2000));

        return NextResponse.json(response);

    } catch (err) {
        console.error('Audit Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
