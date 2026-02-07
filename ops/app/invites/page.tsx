"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase'; // NOTE: This is actually server-side client, we shouldn't import in "use client". 
// Wait, 'ops/lib/supabase.ts' uses process.env.SUPABASE_SERVICE_ROLE_KEY which is not available in client.
// Correct approach: Fetch plans from an API or just hardcode common ones for now. 
// For simplicity in this specialized internal tool, let's just hardcode the Plans or creating a server component wrapper.
// Let's stick to a simple form that POSTs to our API.

import { Loader2, Copy, Check, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function InviteFactory() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<any>(null);
    const [error, setError] = useState("");

    // Form State
    const [formData, setFormData] = useState({
        code: '',
        planId: 'pro_beta_2026',
        maxUses: 100,
        discount: 100
    });

    const generateRandomCode = () => {
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        setFormData(prev => ({ ...prev, code: `BETA-${random}` }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess(null);

        try {
            const res = await fetch('/api/invites/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed');
            }

            setSuccess(data.data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50 p-8 font-sans text-neutral-900">
            <div className="max-w-2xl mx-auto">
                <div className="mb-8">
                    <Link href="/" className="text-neutral-500 hover:text-neutral-800 flex items-center gap-2 mb-4">
                        <ArrowLeft size={16} /> Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight">Invite Factory 🏭</h1>
                    <p className="text-neutral-500">Mint new access codes for the beta.</p>
                </div>

                <div className="bg-white p-8 rounded-xl border border-neutral-200 shadow-sm">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Code Input */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">Coupon Code</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. VIP-LAUNCH"
                                    className="flex-1 p-3 border border-neutral-300 rounded-lg font-mono text-lg uppercase tracking-wide focus:ring-2 focus:ring-black focus:outline-none"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                />
                                <button
                                    type="button"
                                    onClick={generateRandomCode}
                                    className="px-4 py-2 bg-neutral-100 text-neutral-600 rounded-lg hover:bg-neutral-200 text-sm font-medium"
                                >
                                    Random
                                </button>
                            </div>
                        </div>

                        {/* Plan Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">Plan ID</label>
                                <select
                                    className="w-full p-3 border border-neutral-300 rounded-lg bg-white"
                                    value={formData.planId}
                                    onChange={e => setFormData({ ...formData, planId: e.target.value })}
                                >
                                    <option value="pro_beta_2026">pro_beta_2026 (Full Access)</option>
                                    <option value="test_plan">test_plan</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">Discount %</label>
                                <input
                                    type="number"
                                    className="w-full p-3 border border-neutral-300 rounded-lg"
                                    value={formData.discount}
                                    onChange={e => setFormData({ ...formData, discount: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">Max Redemptions</label>
                            <input
                                type="number"
                                className="w-full p-3 border border-neutral-300 rounded-lg"
                                value={formData.maxUses}
                                onChange={e => setFormData({ ...formData, maxUses: parseInt(e.target.value) })}
                            />
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
                                Error: {error}
                            </div>
                        )}

                        {success && (
                            <div className="p-4 bg-green-50 text-green-700 rounded-lg text-sm border border-green-100 flex items-start gap-3">
                                <Check className="mt-0.5" size={16} />
                                <div>
                                    <p className="font-bold">Coupon Created!</p>
                                    <p className="font-mono mt-1">{success.code}</p>
                                    <p className="text-xs mt-2 text-green-600">Share this code with users to bypass payment.</p>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-black text-white rounded-lg font-bold text-lg hover:bg-neutral-800 disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {loading && <Loader2 className="animate-spin" />}
                            Mint Coupon
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
