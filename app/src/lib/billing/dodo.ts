import DodoPayments from 'dodopayments';

const apiKey = process.env.DODO_PAYMENTS_API_KEY;

if (!apiKey || apiKey === 'pk_test_dummy') {
    console.warn("⚠️ DODO_PAYMENTS_API_KEY is missing or using dummy value. Checkout will fail with 401.");
}

export const dodo = new DodoPayments({
    bearerToken: apiKey || 'pk_test_dummy',
    environment: process.env.NODE_ENV === 'production' ? 'live_mode' : 'test_mode',
});