import DodoPayments from 'dodopayments';

export const dodo = new DodoPayments({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY || 'pk_test_dummy',
    environment: process.env.NODE_ENV === 'production' ? 'live_mode' : 'test_mode',
});