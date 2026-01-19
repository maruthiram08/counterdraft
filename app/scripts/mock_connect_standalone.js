
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Manually parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8').split('\n').reduce((acc, line) => {
    const [key, value] = line.split('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
}, {});

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Could not find NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function mockConnection() {
    console.log('Fetching all users...');
    const { data: users, error: userError } = await supabase.from('users').select('id, email');

    if (userError || !users.length) {
        console.error('Error fetching users:', userError);
        return;
    }

    console.log(`Found ${users.length} users. Connecting ALL of them to mock LinkedIn...`);

    for (const user of users) {
        console.log(`Processing user: ${user.email} (${user.id})...`);
        const { error: insertError } = await supabase
            .from('connected_accounts')
            .upsert({
                user_id: user.id,
                platform: 'linkedin',
                platform_user_id: `mock_linkedin_id_${user.id.substring(0, 8)}`,
                access_token: 'mock_access_token',
                refresh_token: 'mock_refresh_token',
                token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                scopes: ['r_liteprofile', 'r_emailaddress', 'w_member_social'],
                profile_name: 'Maruthi (Mock)',
                profile_picture: null,
                connected_at: new Date().toISOString(),
                revoked: false
            }, { onConflict: 'user_id, platform' });

        if (insertError) {
            console.error(`❌ Failed to connect ${user.email}:`, insertError);
        } else {
            console.log(`✅ Connected ${user.email}`);
        }
    }
    console.log('\n✨ DONE! All users are now connected.');
}

mockConnection();
