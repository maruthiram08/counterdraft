
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStatus() {
    console.log('Checking connected accounts...');
    const { data, error } = await supabase.from('connected_accounts').select('*');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Connected Accounts:', data);
    }
}

checkStatus();
