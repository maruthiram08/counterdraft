
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function grantAccessToId(clerkId) {
    console.log(`Granting Unlimited Access (Pro) to Clerk ID: ${clerkId}`);

    // 1. Find User by Clerk ID
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq('clerk_id', clerkId)
        .single();

    if (userError || !user) {
        console.error("User not found:", userError);
        return;
    }

    const userId = user.id;
    console.log(`Found User ID: ${userId} (${user.email})`);

    // 2. Update Usage
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

// Granting to the most recent user observed in logs
grantAccessToId('user_38QkueQCDftKihsEhjyShbZjLGo');
