import Razorpay from 'razorpay';

// Initialize Razorpay client for server-side usage
// We use fallbacks to prevent build-time crashes if env vars are missing
export const razorpay = new Razorpay({
    key_id: process.env.RP_KEY_ID || 'rzp_test_placeholder',
    key_secret: process.env.RP_KEY_SECRET || 'placeholder_secret',
});
