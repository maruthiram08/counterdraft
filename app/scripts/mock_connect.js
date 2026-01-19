
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function mockConnection() {
    console.log('Fetching user...');
    // 1. Get the first user (assuming it's you)
    const { data: users, error: userError } = await supabase.from('users').select('id, email').limit(1);

    if (userError || !users.length) {
        console.error('Error fetching user:', userError);
        return;
    }

    const userId = users[0].id;
    console.log(`Found user: ${users[0].email} (${userId})`);

    // 2. Insert fake connection
    const { error: insertError } = await supabase
        .from('connected_accounts')
        .upsert({
            user_id: userId,
            platform: 'linkedin',
            platform_user_id: 'mock_linkedin_id',
            access_token: 'mock_access_token',
            refresh_token: 'mock_refresh_token',
            token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
            scopes: ['r_liteprofile', 'r_emailaddress', 'w_member_social'],
            profile_name: 'Mock User',
            profile_picture: null,
            connected_at: new Date().toISOString(),
            revoked: false
        }, { onConflict: 'user_id, platform' });

    if (insertError) {
        console.error('Error inserting mock connection:', insertError);
    } else {
        console.log('✅ Success! Mock LinkedIn account connected.');
    }
}

mockConnection();
