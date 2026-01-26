export const PRICING_CONFIG = {
    // Tiers
    TIERS: {
        FREE: 'free',
        PRO: 'pro',
    },

    // Limits (Easy to adjust for experimentation)
    LIMITS: {
        ['free']: {
            DRAFTS_PER_MONTH: 2, // Hard limit for creation
            BRAIN_DEPTH: 'shallow', // Result filter level
            ALLOW_BELIEFS: false, // Feature flag
            ALLOW_TENSIONS: false, // Feature flag
        },
        ['pro']: {
            DRAFTS_PER_MONTH: Infinity,
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
