import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { notFound, redirect } from 'next/navigation';
import InviteClient from './InviteClient';

interface Props {
    params: Promise<{ code: string }>
}

export default async function InvitePage({ params }: Props) {
    const { code } = await params;

    // 1. Validate Code
    const { data: coupon } = await supabase
        .from('coupons')
        .select('*, access_plans(*)')
        .eq('code', code)
        .single();

    if (!coupon) {
        return notFound();
    }

    // Discount codes are applied on the Pricing page
    if ((coupon.discount_percent ?? 100) < 100) {
        redirect(`/pricing?coupon=${encodeURIComponent(coupon.code)}`);
    }

    const isExpired = coupon.redemptions_count >= coupon.max_redemptions
        || (!!coupon.expires_at && new Date(coupon.expires_at) < new Date());
    const planName = coupon.access_plans?.display_name || 'Pro Plan';

    return (
        <div className={`min-h-screen flex flex-col items-center justify-center bg-canvas p-4 font-sans`}>
            <div className="max-w-md w-full bg-surface rounded-card shadow-card p-6 md:p-8 text-center">
                <div className="mb-6 flex justify-center">
                    <div className="h-16 w-16 bg-canvas shadow-raised text-ember-500 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"></path></svg>
                    </div>
                </div>

                {isExpired ? (
                    <>
                        <h1 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-2">Invite Expired</h1>
                        <p className="text-ink-soft">This invite has expired or has already been used.</p>
                    </>
                ) : (
                    <>
                        <h1 className="text-2xl font-medium tracking-[-0.02em] text-ink mb-2">You&apos;re Invited!</h1>
                        <p className="text-ink-soft mb-8">
                            Accept this invite to unlock <strong className="text-ink">{planName}</strong> access (1 Month Free).
                        </p>

                        <div className="bg-ember-50 rounded-tile shadow-raised p-4 mb-8 text-sm text-ember-700">
                            <strong>Zero Cost.</strong> No credit card required.
                        </div>

                        <InviteClient code={code} />
                    </>
                )}
            </div>
            <p className="mt-8 text-xs text-ink-muted">CounterDraft Beta Access</p>
        </div>
    );
}
