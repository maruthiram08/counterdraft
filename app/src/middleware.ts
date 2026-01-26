import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher([
    '/workspace(.*)',
    '/onboarding(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
    if (isProtectedRoute(req)) {
        await auth.protect();
    }

    // Geo Detection
    // Vercel / Next.js usually provides this via `req.geo` or headers
    const country = req.headers.get('x-vercel-ip-country') || 'US';

    // We can't mutate `req` directly in Next.js middleware safely for downstream components
    // BUT we can return a response with headers that the client might see, or rewrite.
    // However, to pass data to a Server Component (page.tsx), we simply ensure the header exists
    // (It usually does on Vercel). If local, we might default it.

    // Actually, `clerkMiddleware` wraps the response.
    // To explicitly set it so `headers()` in page.tsx can read it reliably (even if we mock it locally):
    const res = NextResponse.next();
    res.headers.set('x-user-country', country);
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
