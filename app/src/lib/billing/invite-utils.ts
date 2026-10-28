// Pure helpers for invite links, safe to import in client components

export type InviteCoupon = {
    discount_percent: number | null;
    max_redemptions: number | null;
    redemptions_count: number | null;
    expires_at: string | null;
};

export type InviteState = 'valid' | 'used' | 'expired' | 'discount' | 'missing';

/** What an invite link should show. Expiry wins over "used" so an old, used link says expired. */
export function inviteState(coupon: InviteCoupon | null, now: Date = new Date()): InviteState {
    if (!coupon) return 'missing';
    if ((coupon.discount_percent ?? 100) < 100) return 'discount';
    if (coupon.expires_at && new Date(coupon.expires_at) < now) return 'expired';
    if ((coupon.redemptions_count ?? 0) >= (coupon.max_redemptions ?? 1)) return 'used';
    return 'valid';
}

export function normalizeInviteCode(code: string): string {
    let decoded = code;
    try { decoded = decodeURIComponent(code); } catch { /* already decoded */ }
    return decoded.trim().toUpperCase();
}

/** "27 Nov 2026" */
export function formatInviteDate(iso: string | null | undefined): string | null {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Where "Create your account" goes: sign-up, then back into the app with the code in the URL */
export function inviteAuthUrl(mode: 'sign-up' | 'sign-in', code: string): string {
    const back = `/workspace?invite=${encodeURIComponent(code)}`;
    return `/${mode}?redirect_url=${encodeURIComponent(back)}`;
}
