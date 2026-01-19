
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Simple dotenv parser to avoid dependencies
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyPublishedPost() {
    console.log('🔍 Verifying Published Post Record...');

    // Get the most recent published post
    const { data: posts, error } = await supabase
        .from('published_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('❌ Error fetching published_posts:', error.message);
        return;
    }

    if (!posts || posts.length === 0) {
        console.error('❌ No published posts found in database.');
        return;
    }

    const post = posts[0];
    console.log('✅ Found latest published post:');
    console.log(`   - ID: ${post.id}`);
    console.log(`   - Draft ID: ${post.draft_id}`);
    console.log(`   - Platform: ${post.platform}`);
    console.log(`   - Platform Post ID: ${post.platform_post_id}`);
    console.log(`   - Published At: ${post.published_at}`);

    // Validation
    if (post.platform !== 'linkedin') {
        console.error('❌ Error: Latest post is not from LinkedIn.');
    } else if (!post.platform_post_id || !post.platform_post_id.startsWith('urn:li:share:') && !post.platform_post_id.startsWith('urn:li:ugcPost:')) {
        console.warn('⚠️ Warning: Platform Post ID format looks unusual (expected urn:li:share or urn:li:ugcPost).');
    } else {
        console.log('✅ Verification Successful: Post recorded correctly.');
    }
}

verifyPublishedPost();
