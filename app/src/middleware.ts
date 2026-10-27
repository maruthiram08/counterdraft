import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { checkWriteOrigin } from '@/lib/request-origin';

const isProtectedRoute = createRouteMatcher([
    '/workspace(.*)',
    '/onboarding(.*)',
    '/api/billing(.*)', // Explicitly protect billing to ensure auth context
]);

export default clerkMiddleware(async (auth, req) => {
    // 1. Geo Detection (Pass-through)
    const country = req.headers.get('x-vercel-ip-country') || 'US';
    const res = NextResponse.next();
    res.headers.set('x-user-country', country);

    // 2. Extension CORS (Dynamic)
    const origin = req.headers.get('origin');
    const allowedExtensions = process.env.ALLOWED_EXTENSIONS?.split(',') || [];

    if (origin && origin.startsWith('chrome-extension://')) {
        const extensionId = origin.replace('chrome-extension://', '');
        if (allowedExtensions.length > 0 && !allowedExtensions.includes(extensionId)) {
            return NextResponse.json({ error: 'Unauthorized Extension' }, { status: 403 });
        }

        res.headers.set('Access-Control-Allow-Origin', origin);
        res.headers.set('Access-Control-Allow-Credentials', 'true');
        res.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT,OPTIONS');
        res.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

        // Handle Preflight directly
        if (req.method === 'OPTIONS') {
            return new NextResponse(null, { headers: res.headers });
        }
    }

    // 2.1 Basic CSRF Protection for API POST/PUT/PATCH/DELETE
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.nextUrl.pathname.startsWith('/api')) {
        const rejection = checkWriteOrigin({
            origin,
            referer: req.headers.get('referer'),
            host: req.headers.get('host'),
            secFetchSite: req.headers.get('sec-fetch-site'),
        });
        if (rejection) {
            // JSON so API callers (the Lens extension included) can show the reason
            return NextResponse.json({ error: rejection }, { status: 403 });
        }
    }

    // 3. Protect Routes
    if (isProtectedRoute(req)) {
        await auth.protect();
    }

    // Onboarding gating is handled client-side in /workspace to avoid a DB call per request.

    return res;
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
