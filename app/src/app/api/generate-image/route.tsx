
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { calculateSmartTypography } from '@/lib/smart-engine/typography';

export const runtime = 'edge';

// IBM Plex Sans, subset to Latin + Latin Extended (see fonts/OFL.txt). Satori has no 800/900,
// so the 800 "hook" weight from calculateSmartTypography renders with the closest face, Bold.
const loadFont = (url: URL) => fetch(url).then((res) => res.arrayBuffer());
const plexFonts = Promise.all([
    loadFont(new URL('./fonts/IBMPlexSans-Regular.ttf', import.meta.url)),
    loadFont(new URL('./fonts/IBMPlexSans-Medium.ttf', import.meta.url)),
    loadFont(new URL('./fonts/IBMPlexSans-SemiBold.ttf', import.meta.url)),
    loadFont(new URL('./fonts/IBMPlexSans-Bold.ttf', import.meta.url)),
]).then((files) =>
    files.map((data, i) => ({
        name: 'IBM Plex Sans',
        data,
        weight: ([400, 500, 600, 700] as const)[i],
        style: 'normal' as const,
    }))
);

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
    const fonts = await plexFonts;

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
                    fontFamily: 'IBM Plex Sans',
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
            fonts,
        }
    );
}
