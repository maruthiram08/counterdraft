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

async function resetData() {
    console.log("--- 🧹 RESETTING TEST DATA ---");

    // 1. Clear All Subscriptions
    const { error: deleteError } = await supabase
        .from('subscriptions')
        .delete()
        .neq('user_id', '000000'); // Deletes all rows where ID is not this dummy value (effectively all)

    // Note: Supabase delete requires a filter. .neq('id', 'x') works if we want all.
    // Or we can just use Truncate if we had RPC, but delete is safer for now.

    if (deleteError) {
        console.error("❌ Failed to clear subscriptions:", deleteError.message);
    } else {
        console.log("✅ All Subscriptions wiped.");
    }

    // 2. Reset Coupon Counts
    const { error: updateError } = await supabase
        .from('coupons')
        .update({ redemptions_count: 0 })
        .neq('code', 'xyz'); // Affects all

    if (updateError) {
        console.error("❌ Failed to reset coupons:", updateError.message);
    } else {
        console.log("✅ All Coupons reset to 0 redemptions.");
    }

    console.log("--- 🏁 READY FOR NEW TEST ---");
}

resetData();
