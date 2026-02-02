import { createClient } from '@supabase/supabase-js';
import { Outfit } from 'next/font/google';
import { notFound } from 'next/navigation';
import InviteClient from './InviteClient';

const outfit = Outfit({ subsets: ['latin'] });

// Init Server Client for Validation
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Safe in Server Component
);

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
        .eq('max_redemptions', 1) // Ensure it's a magic link type
        .single();

    if (!coupon) {
        return notFound();
    }

    const isExpired = coupon.redemptions_count >= coupon.max_redemptions;
    const planName = coupon.access_plans?.display_name || 'Pro Plan';

    return (
        <div className={`min-h-screen flex flex-col items-center justify-center bg-[#F9FAFB] p-4 ${outfit.className}`}>
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-neutral-100 text-center">
                <div className="mb-6 flex justify-center">
                    <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"></path></svg>
                    </div>
                </div>

                {isExpired ? (
                    <>
                        <h1 className="text-2xl font-bold text-neutral-900 mb-2">Invite Expired</h1>
                        <p className="text-neutral-500">This magic link has already been claimed.</p>
                    </>
                ) : (
                    <>
                        <h1 className="text-2xl font-bold text-neutral-900 mb-2">You're Invited!</h1>
                        <p className="text-neutral-500 mb-8">
                            Accept this invite to unlock <strong className="text-blue-600">{planName}</strong> access (1 Month Free).
                        </p>

                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-8 text-sm text-blue-800">
                            <strong>Zero Cost.</strong> No credit card required.
                        </div>

                        <InviteClient code={code} />
                    </>
                )}
            </div>
            <p className="mt-8 text-xs text-neutral-400">CounterDraft Beta Access</p>
        </div>
    );
}
