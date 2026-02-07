import Razorpay from 'razorpay';

// Initialize Razorpay client for server-side usage
// We use fallbacks to prevent build-time crashes if env vars are missing
export const razorpay = new Razorpay({
    key_id: process.env.RP_KEY_ID || process.env.rp_key_id || 'rzp_test_placeholder',
    key_secret: process.env.RP_KEY_SECRET || process.env.rp_key_secret || 'placeholder_secret',
});
