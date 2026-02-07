export const PRICING_CONFIG = {
    // Tiers
    TIERS: {
        FREE: 'free',
        PRO: 'pro',
    },

    // Limits (Easy to adjust for experimentation)
    LIMITS: {
        ['free']: {
            DRAFTS_PER_MONTH: 0, // STRICT BETA PAYWALL
            SEARCHES_PER_MONTH: 0, // No free searches
            IMAGES_PER_MONTH: 0,
            BRAIN_DEPTH: 'shallow',
            ALLOW_BELIEFS: false,
            ALLOW_TENSIONS: false,
        },
        ['pro']: {
            DRAFTS_PER_MONTH: Infinity,
            SEARCHES_PER_MONTH: Infinity,
            IMAGES_PER_MONTH: Infinity,
            BRAIN_DEPTH: 'deep',
            ALLOW_BELIEFS: true,
            ALLOW_TENSIONS: true,
        }
    },

    // Plan IDs (Mapped to Dodo Payments)
    PLANS: {
        GLOBAL: {
            MONTHLY: 'prod_gl_monthly',
            YEARLY: 'prod_gl_yearly',
        },
        INDIA: {
            MONTHLY: 'prod_in_monthly',
            YEARLY: 'prod_in_yearly',
        }
    }
} as const;

export type Tier = typeof PRICING_CONFIG.TIERS.FREE | typeof PRICING_CONFIG.TIERS.PRO;
