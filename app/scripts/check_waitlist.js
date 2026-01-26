
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase environment variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    try {
        const { count, error } = await supabase
            .from('waitlist')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error('Error fetching waitlist count:', error);
            return;
        }

        console.log(`Current Waitlist Count: ${count}`);

        // Fetch last 5 entries
        const { data: recent, error: recentError } = await supabase
            .from('waitlist')
            .select('email, created_at, source')
            .order('created_at', { ascending: false })
            .limit(5);

        if (recentError) {
            console.error('Error fetching recent entries:', recentError);
        } else {
            console.log('\nLast 5 Entries:');
            console.table(recent);
        }

    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

main();
