import { supabase } from '@/lib/supabase';
import UsersClient from './UsersClient';

export const revalidate = 0;

export default async function UsersPage() {
    const { data: requests } = await supabase
        .from('beta_requests')
        .select('*')
        .order('created_at', { ascending: false });

    const { data: subs } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

    // Map user IDs to emails via the auth admin API (Ops privilege).
    // listUsers defaults to 50 per page; fetch up to 1000 so later users aren't shown as raw IDs.
    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });

    const userMap = (users || []).reduce((acc: any, user: any) => {
        acc[user.id] = user.email;
        return acc;
    }, {});

    return (
        <div className="min-h-screen bg-neutral-50 p-8 font-sans text-neutral-900">
            <UsersClient
                requests={requests || []}
                subscriptions={subs || []}
                userMap={userMap}
            />
        </div>
    );
}
