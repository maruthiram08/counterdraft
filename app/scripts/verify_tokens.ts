
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role to bypass RLS

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTokens() {
    console.log("Verifying LinkedIn tokens in DB...");

    const { data, error } = await supabase
        .from('connected_accounts')
        .select('*')
        .eq('provider', 'linkedin');

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
            console.log(`- Expires At: ${new Date(acc.expires_at).toISOString()}`);
        });
    }
}

verifyTokens();
