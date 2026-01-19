
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Simple dotenv parser since we can't reliably rely on packages
function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, '../.env.local');
        const envFile = fs.readFileSync(envPath, 'utf8');
        envFile.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                process.env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
            }
        });
    } catch (e) {
        console.error("Could not load .env.local");
    }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTokens() {
    console.log("Verifying LinkedIn tokens in DB...");

    const { data, error } = await supabase
        .from('connected_accounts')
        .select('*')
        .eq('platform', 'linkedin');

    if (error) {
        console.error("Error fetching tokens:", error);
        return;
    }

    if (!data || data.length === 0) {
        console.log("❌ No LinkedIn accounts found.");
    } else {
        console.log(`✅ Found ${data.length} linked account(s).`);
        data.forEach(acc => {
            console.log(`- User ID: ${acc.user_id}`);
            console.log(`- Platform User ID: ${acc.platform_user_id}`);
            console.log(`- Access Token Present: ${!!acc.access_token}`);
            console.log(`- Expires At: ${acc.expires_at}`);
        });
    }
}

verifyTokens();
