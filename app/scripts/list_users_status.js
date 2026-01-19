
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

const supabase = createClient(
    envConfig.NEXT_PUBLIC_SUPABASE_URL,
    envConfig.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUsers() {
    console.log('Fetching all users...');
    const { data: users, error: userError } = await supabase.from('users').select('id, email, clerk_id');

    if (userError) {
        console.error('Error users:', userError);
        return;
    }

    console.log('\n--- SYSTEM USERS ---');
    for (const user of users) {
        const { data: accounts } = await supabase
            .from('connected_accounts')
            .select('platform, revoked')
            .eq('user_id', user.id);

        const connected = accounts.some(a => a.platform === 'linkedin' && !a.revoked);
        const status = connected ? '✅ LINKEDIN CONNECTED' : '❌ no linkedin';

        console.log(`[${user.email}] ID: ${user.id}`);
        console.log(`   └─ Status: ${status}`);
    }
    console.log('--------------------\n');
}

checkUsers();
