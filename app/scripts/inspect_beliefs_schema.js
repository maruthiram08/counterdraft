
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

function loadEnv() {
    const envPath = path.resolve(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        });
    }
}

loadEnv();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectSchema() {
    console.log('🔍 Inspecting beliefs table schema...');
    const { data, error } = await supabase.from('beliefs').select('*').limit(1);

    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }

    if (data && data.length > 0) {
        console.log('✅ Found columns:', Object.keys(data[0]));
        console.log('Sample Row:', JSON.stringify(data[0], null, 2));
    } else {
        // If table is empty, we can't infer schema easily from select *
        console.log('⚠️ Table is empty, cannot infer columns from data.');
        // Try to insert a dummy to see errors? No, risky.
    }
}

inspectSchema();
