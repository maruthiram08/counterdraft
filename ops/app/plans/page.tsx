import { supabase } from '@/lib/supabase';
import PlansClient from './PlansClient';

export const revalidate = 0;

export default async function PlansPage() {
    const { data: plans } = await supabase
        .from('access_plans')
        .select('*')
        .order('created_at', { ascending: false });

    return (
        <div className="min-h-screen bg-neutral-50 p-8 font-sans text-neutral-900">
            <PlansClient initialPlans={plans || []} />
        </div>
    );
}
