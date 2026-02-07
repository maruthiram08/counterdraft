type RateLimitOptions = {
    windowMs: number;
    max: number;
};

type RateLimitResult = {
    allowed: boolean;
    retryAfter?: number;
};

const buckets = new Map<string, { count: number; resetAt: number }>();
const MAX_BUCKETS = 5000;

export function getClientIp(req: Request): string {
    const xff = req.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0].trim();
    const xri = req.headers.get('x-real-ip');
    if (xri) return xri.trim();
    const vercel = req.headers.get('x-vercel-forwarded-for');
    if (vercel) return vercel.split(',')[0].trim();
    const cf = req.headers.get('cf-connecting-ip');
    if (cf) return cf.trim();
    return 'unknown';
}

export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
        bucket = { count: 0, resetAt: now + opts.windowMs };
        buckets.set(key, bucket);
    }

    bucket.count += 1;

    if (bucket.count > opts.max) {
        const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
        return { allowed: false, retryAfter };
    }

    if (buckets.size > MAX_BUCKETS) {
        for (const [k, b] of buckets) {
            if (b.resetAt <= now) {
                buckets.delete(k);
            }
        }
    }

    return { allowed: true };
}
