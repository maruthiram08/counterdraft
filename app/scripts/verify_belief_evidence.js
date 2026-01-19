
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

async function verifyLatestBelief() {
    console.log('🔍 Verifying Latest Belief Evidence...');

    // Get the most recent belief
    const { data: beliefs, error } = await supabase
        .from('beliefs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('❌ Error fetching beliefs:', error.message);
        return;
    }

    if (!beliefs || beliefs.length === 0) {
        console.error('❌ No beliefs found in database.');
        return;
    }

    const belief = beliefs[0];
    console.log('✅ Found latest belief:');
    console.log(`   - Statement: "${belief.statement}"`);
    console.log(`   - Type: ${belief.belief_type}`);
    console.log(`   - Context (Evidence): "${belief.original_statement}"`);
    console.log(`   - Confidence Level: ${belief.confidence_level}`);
    console.log(`   - Confidence Score: ${belief.confidence}`);

    // Validation
    if (belief.original_statement && belief.original_statement.length > 10) {
        console.log('✅ PASS: Evidence (Context) is present.');
    } else {
        console.error('❌ FAIL: Evidence is missing or too short.');
    }
}

verifyLatestBelief();
