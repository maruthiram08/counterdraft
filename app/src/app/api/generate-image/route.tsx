
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { calculateSmartTypography } from '@/lib/smart-engine/typography';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get('text') || 'Hello World';
    const theme = searchParams.get('theme') || 'cosmic';

    const typo = calculateSmartTypography(text);

    // Dynamic Colors based on "Remix Vibe" (simulated)
    const themes: Record<string, { bg: string, text: string, accent: string }> = {
        cosmic: { bg: '#0f172a', text: '#f8fafc', accent: '#8b5cf6' },
        minimal: { bg: '#ffffff', text: '#111111', accent: '#000000' },
        neon: { bg: '#111', text: '#fff', accent: '#39ff14' },
    };

    const colors = themes[theme] || themes.cosmic;

    return new ImageResponse(
        (
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.bg,
                    color: colors.text,
                    padding: '80px',
                    fontFamily: 'sans-serif',
                }}
            >
                <div style={{
                    display: 'flex',
                    fontSize: `${typo.fontSize}px`,
                    fontWeight: typo.fontWeight,
                    lineHeight: typo.lineHeight,
                    textAlign: 'center',
                    textWrap: 'balance',
                }}>
                    {text}
                </div>

                <div style={{
                    position: 'absolute',
                    bottom: 40,
                    fontSize: 24,
                    color: colors.accent,
                    fontWeight: 'bold',
                }}>
                    counterdraft.v1
                </div>
            </div>
        ),
        {
            width: 1080,
            height: 1080,
        }
    );
}
