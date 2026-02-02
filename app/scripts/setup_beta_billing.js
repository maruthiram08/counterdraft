require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase Environment Variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    console.log('🚀 Starting Beta Billing Setup...');

    const sqlPath = path.join(__dirname, '../migrations/014_beta_billing_schema.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // We can't run raw SQL with JS client easily unless we have an RPC function or direct DB access.
    // BUT: Many Supabase setups allow psql or have an RPC `exec_sql`.
    // If not, we instruct the user to run it in Dashboard.

    // CHECK: Does this user have an RPC for SQL?
    // If not, I'll try to just check if tables exist to verify, but I can't CREATE TABLE easily via JS Client without RPC.

    // STRATEGY: I will invoke a specialized Postgres call if available, 
    // or I'll just log the content and tell the user "Please run this in SQL Editor".
    // Actually, wait, I can use the `postgres` library if I have the connection string.
    // The user only has URL/Key in .env usually.

    // Let's try the RPC method 'exec_sql' which is common in some setups, 
    // if reliable fails, we output instructions.

    console.log('❌ Direct SQL execution via Client requires bespoke RPC.');
    console.log('✅ SQL File Created: migrations/014_beta_billing_schema.sql');
    console.log('\nPlease run the contents of that file in your Supabase SQL Editor to apply the schema.');
    console.log('Attempting to check if I can insert directly... (Only works if tables exist)');

    // Try to insert the plan manually via ORM to see if table exists (it won't yet).
    const { error } = await supabase.from('access_plans').select('*').limit(1);

    if (error && error.code === '42P01') { // undefined_table
        console.log('⚠️  Schema not found. Applying SQL is required step.');
    } else if (!error) {
        console.log('✅ Schema appears to exist!');
    }
}

runMigration();
