'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface RazorpayButtonProps {
    planId: string;
    buttonText?: string;
    className?: string;
    onSuccess?: () => void;
}

export function RazorpayButton({ planId, buttonText = 'Subscribe Now', className, onSuccess }: RazorpayButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handlePayment = async () => {
        setIsLoading(true);

        try {
            // 1. Load Script
            const isLoaded = await loadRazorpayScript();
            if (!isLoaded) {
                toast.error('Failed to load payment gateway. Check connection.');
                setIsLoading(false);
                return;
            }

            // 2. Create Order
            const orderRes = await fetch('/api/billing/razorpay/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId })
            });

            if (!orderRes.ok) {
                const err = await orderRes.json();
                throw new Error(err.message || 'Order creation failed');
            }

            const orderData = await orderRes.json();

            // 3. Open Razorpay
            const options = {
                key: orderData.keyId,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "CounterDraft",
                description: "Pro Subscription",
                order_id: orderData.orderId,
                handler: async function (response: RazorpayResponse) {
                    // 4. Verify Payment on Server
                    try {
                        const verifyRes = await fetch('/api/billing/razorpay/verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                planId: planId
                            })
                        });

                        if (verifyRes.ok) {
                            toast.success('Payment Successful! Welcome to Pro.');
                            if (onSuccess) onSuccess();
                        } else {
                            toast.error('Payment verified failed. Please contact support.');
                        }
                    } catch (verifyErr) {
                        toast.error('Verification error. Contact support.');
                        console.error(verifyErr);
                    }
                },
                prefill: {
                    // Ideally we pass user email/contact here if available
                    // email: user.email 
                },
                theme: {
                    color: "#2563EB" // Blue-600 to match brand
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response: RazorpayErrorResponse) {
                toast.error(response.error.description || 'Payment Failed');
            });
            rzp.open();

        } catch (error: unknown) {
            console.error('Payment Flow Error:', error);
            const message = error instanceof Error ? error.message : 'Something went wrong';
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handlePayment}
            disabled={isLoading}
            className={className || "px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"}
        >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
            {buttonText}
        </button>
    );
}

interface RazorpayResponse {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}

interface RazorpayErrorResponse {
    error: {
        code: string;
        description: string;
        source: string;
        step: string;
        reason: string;
        metadata: Record<string, unknown>;
    };
}

interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    handler: (response: RazorpayResponse) => void;
    prefill?: {
        email?: string;
        contact?: string;
        name?: string;
    };
    theme?: {
        color?: string;
    };
}

interface RazorpayInstance {
    open: () => void;
    on: (event: 'payment.failed', handler: (response: RazorpayErrorResponse) => void) => void;
}

// Add global type for Razorpay
declare global {
    interface Window {
        Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
    }
}
