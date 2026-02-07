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

    // Fetch all profiles to map User IDs to Emails (Ops privilege)
    // NOTE: This might be heavy if users > 1000. For now it's fine.
    // Ideally, we'd join or fetch only needed.
    // Since 'profiles' table usually exists in public schema in Supabase starters.
    // Checking if 'profiles' exists or if we rely on Auth.

    // Since we access auth.users via Service Role, we can list users.
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

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
