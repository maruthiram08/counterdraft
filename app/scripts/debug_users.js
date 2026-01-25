
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listUsers() {
    console.log("Listing users (attempt 2)...");
    // Just get all columns to see what we have, or minimal set.
    const { data: users, error } = await supabase
        .from('users')
        .select('*');

    if (error) {
        console.error("Error fetching users:", error);
        return;
    }

    console.log(`Found ${users.length} users:`);
    users.forEach(u => {
        // Print safely
        console.log(`- ${u.email} (ID: ${u.id})`);
        console.log(`  Raw:`, u);
    });
}

listUsers();
