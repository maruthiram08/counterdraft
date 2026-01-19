
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

async function forceDisconnect() {
    console.log('Forcefully revoking ALL LinkedIn connections...');

    const { error } = await supabase
        .from('connected_accounts')
        .update({
            revoked: true,
            access_token: '',
            refresh_token: ''
        })
        .neq('revoked', true); // Update only active ones

    if (error) {
        console.error('❌ Error disconnecting:', error);
    } else {
        console.log('✅ Success! All accounts disconnected.');
    }
}

forceDisconnect();
