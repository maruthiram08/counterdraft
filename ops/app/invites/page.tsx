"use client";

import { useState } from 'react';
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
        maxUses: 1,
        discount: 100,
        validDays: 14
    });
    const [copied, setCopied] = useState(false);

    const generateRandomCode = () => {
        // 10 random characters (no look-alikes like 0/O, 1/I) so codes can't be guessed
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const bytes = crypto.getRandomValues(new Uint8Array(10));
        const random = Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
        const prefix = formData.discount >= 100 ? 'BETA' : `OFF${formData.discount}`;
        setFormData(prev => ({ ...prev, code: `${prefix}-${random}` }));
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
                                <label className="block text-sm font-medium text-neutral-700 mb-2">Discount % <span className="font-normal text-neutral-400">(100 = free invite)</span></label>
                                <input
                                    type="number"
                                    className="w-full p-3 border border-neutral-300 rounded-lg"
                                    value={formData.discount}
                                    onChange={e => setFormData({ ...formData, discount: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">Max Redemptions <span className="font-normal text-neutral-400">(people)</span></label>
                                <input
                                    type="number"
                                    min={1}
                                    className="w-full p-3 border border-neutral-300 rounded-lg"
                                    value={formData.maxUses}
                                    onChange={e => setFormData({ ...formData, maxUses: parseInt(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">Link valid for <span className="font-normal text-neutral-400">(days, 0 = no end)</span></label>
                                <input
                                    type="number"
                                    min={0}
                                    className="w-full p-3 border border-neutral-300 rounded-lg"
                                    value={formData.validDays}
                                    onChange={e => setFormData({ ...formData, validDays: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>
                        {formData.discount >= 100 && formData.maxUses > 1 && (
                            <p className="text-xs text-amber-700 -mt-3">This free invite can be used by {formData.maxUses} people. Anyone the link is forwarded to gets free Pro.</p>
                        )}

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
                                    {(success.discount_percent ?? 100) >= 100 ? (
                                        <div className="mt-2 text-xs text-green-600">
                                            <p>Free invite{success.max_redemptions === 1 ? ', works once' : `, works ${success.max_redemptions} times`}{success.expires_at ? `, until ${new Date(success.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}. Share this link:</p>
                                            <div className="mt-1 flex items-center gap-2">
                                                <span className="font-mono">https://counterdraft.com/invite/{success.code}</span>
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        try { await navigator.clipboard.writeText(`https://counterdraft.com/invite/${success.code}`); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
                                                    }}
                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-green-200 text-green-700 hover:bg-green-100"
                                                >
                                                    {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-xs mt-2 text-green-600">{success.discount_percent}% off at checkout. Share this link: <span className="font-mono">counterdraft.com/pricing?coupon={success.code}</span>, or the code to type on Pricing.</p>
                                    )}
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
