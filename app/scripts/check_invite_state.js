const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load Env
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(
    env['NEXT_PUBLIC_SUPABASE_URL'],
    env['SUPABASE_SERVICE_ROLE_KEY']
);

async function diagnose() {
    console.log("--- 🕵️‍♂️ DIAGNOSIS START ---");

    // 1. Check Plan
    const { data: plan, error: planError } = await supabase.from('access_plans').select('*').eq('id', 'pro_beta_2026');
    console.log("1. Plan 'pro_beta_2026':", plan?.length ? "✅ Found" : "❌ MISSING");
    if (planError) console.error("   Error:", planError);

    // 2. Check Coupons
    const { data: coupons, error: couponError } = await supabase.from('coupons').select('*');
    console.log("2. Coupons Found:", coupons?.length || 0);
    coupons?.forEach(c => {
        console.log(`   - Code: ${c.code} | Used: ${c.redemptions_count}/${c.max_redemptions} | Plan: ${c.plan_id}`);
    });

    // 3. Check Subscriptions (Any created?)
    const { data: subs, error: subError } = await supabase.from('subscriptions').select('*');
    console.log("3. Subscriptions Found:", subs?.length || 0);
    if (subError) console.error("   Error:", subError);

    // 4. Check RLS Test (Try to insert a dummy subscription and roll back? No, just read is enough for now)
    // Actually, let's try to fetch users to see if Service Role is working for Auth
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    console.log("4. Auth Admin Access:", authError ? "❌ Failed" : "✅ Success");
    const targetUser = users?.find(u => u.email?.includes('mnvmaruthiram'));
    if (targetUser) {
        console.log(`   - Found User 'mnvmaruthiram': ID=${targetUser.id}`);
        // Check if this user has a sub
        const userSub = subs?.find(s => s.user_id === targetUser.id);
        console.log(`   - Subscription Status: ${userSub ? '✅ Active' : '❌ None'}`);
    } else {
        console.log("   - User 'mnvmaruthiram' not found in Auth.");
    }

    console.log("--- 🕵️‍♂️ DIAGNOSIS END ---");
}

diagnose();
