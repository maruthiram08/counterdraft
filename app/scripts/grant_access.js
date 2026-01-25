
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function grantAccess() {
    const email = 'ram.venkat578@gmail.com';
    console.log(`Granting Unlimited Access (Pro) to: ${email}`);

    // 1. Find User
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email)
        .single();

    if (userError || !users) {
        console.error("User not found via sync table. Checking Auth...");
        // Ideally we check auth.users too if not synced, but we need the public.users record for usage table FK.
        // If they haven't synced, we can't grant usage on the public table yet.
        console.error("Error finding user:", userError);
        return;
    }

    const userId = users.id;
    console.log(`Found User ID: ${userId}`);

    // 2. Update Usage
    // Start with checking if usage record exists
    const { data: usage, error: usageCheckError } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (!usage) {
        console.log("Creating new usage record...");
        const { error: insertError } = await supabase
            .from('user_usage')
            .insert({
                user_id: userId,
                plan_tier: 'pro',
                draft_count: 0
            });

        if (insertError) console.error("Error creating usage:", insertError);
        else console.log("Success! Created Pro usage record.");
    } else {
        console.log(`Updating existing usage (Current Tier: ${usage.plan_tier})...`);
        const { error: updateError } = await supabase
            .from('user_usage')
            .update({ plan_tier: 'pro' })
            .eq('user_id', userId);

        if (updateError) console.error("Error updating usage:", updateError);
        else console.log("Success! Upgraded to Pro.");
    }
}

grantAccess();
