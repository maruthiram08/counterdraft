import React from 'react';
import { headers } from 'next/headers';
import PricingClient from './PricingClient';

export default async function PricingPage() {
    // 1. Get Country server-side from middleware-injected header
    const headersList = await headers();
    const country = headersList.get('x-user-country') || 'US';

    // 2. Pass to Client Component
    return <PricingClient initialCountry={country} />;
}
