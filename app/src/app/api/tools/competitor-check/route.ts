import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/user-sync';
import { CompetitorService } from '@/lib/tools/competitor';

export async function POST(req: NextRequest) {
    try {
        const userId = await getOrCreateUser();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { text, competitorUrl } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text required' }, { status: 400 });
        }

        const result = await CompetitorService.checkCompetitors(text, competitorUrl);

        return NextResponse.json({ result });

    } catch (error) {
        console.error("Competitor Check API Error:", error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
