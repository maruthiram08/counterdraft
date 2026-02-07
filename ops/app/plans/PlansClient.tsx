'use client';

import { useState } from 'react';
import { updatePlan, createPlan } from './actions';
import { Pencil, Plus, Trash2, X, Check } from 'lucide-react';
import Link from 'next/link';

export default function PlansClient({ initialPlans }: { initialPlans: any[] }) {
    const [editingPlan, setEditingPlan] = useState<any>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Form State
    const [formData, setFormData] = useState<any>({});

    const handleEdit = (plan: any) => {
        setEditingPlan(plan);
        setFormData(plan);
    };

    const handleCreate = () => {
        setIsCreating(true);
        setFormData({
            id: '',
            display_name: '',
            price_inr: 0,
            price_usd: 0,
            validity_days: 30,
            limits: {}
        });
    };

    const handleSave = async () => {
        try {
            if (isCreating) {
                await createPlan(formData);
            } else {
                await updatePlan(editingPlan.id, formData);
            }
            setEditingPlan(null);
            setIsCreating(false);
            // Refresh handled by Server Action revalidatePath
        } catch (e: any) {
            alert('Error saving plan: ' + e.message);
        }
    };

    const handleChange = (field: string, value: any) => {
        setFormData({ ...formData, [field]: value });
    };

    const handleLimitChange = (json: string) => {
        try {
            const parsed = JSON.parse(json);
            setFormData({ ...formData, limits: parsed });
        } catch (e) {
            // Invalid JSON, ignore or show error state
        }
    };

    const isOpen = !!editingPlan || isCreating;

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900 mb-2 block">← Back to Command Center</Link>
                    <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Plan Management</h1>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md font-medium hover:bg-neutral-800"
                >
                    <Plus size={16} /> New Plan
                </button>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th className="px-6 py-3 font-medium text-neutral-500">ID</th>
                            <th className="px-6 py-3 font-medium text-neutral-500">Name</th>
                            <th className="px-6 py-3 font-medium text-neutral-500">Price (INR)</th>
                            <th className="px-6 py-3 font-medium text-neutral-500">Validity</th>
                            <th className="px-6 py-3 font-medium text-neutral-500">Limits</th>
                            <th className="px-6 py-3 font-medium text-neutral-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {initialPlans.map((plan) => (
                            <tr key={plan.id} className="hover:bg-neutral-50">
                                <td className="px-6 py-4 font-mono text-xs text-neutral-500">{plan.id}</td>
                                <td className="px-6 py-4 font-bold">{plan.display_name || plan.name || '-'}</td>
                                <td className="px-6 py-4">₹{(plan.price_inr || 0).toLocaleString()}</td>
                                <td className="px-6 py-4">{plan.validity_days} Days</td>
                                <td className="px-6 py-4 font-mono text-xs max-w-xs truncate text-neutral-400">
                                    {JSON.stringify(plan.limits)}
                                </td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => handleEdit(plan)}
                                        className="p-2 hover:bg-neutral-100 rounded-md text-neutral-500 hover:text-neutral-900"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
                            <h3 className="font-bold text-lg">{isCreating ? 'Create Plan' : 'Edit Plan'}</h3>
                            <button onClick={() => { setEditingPlan(null); setIsCreating(false); }} className="text-neutral-400 hover:text-neutral-900">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* ID Field (Read-only for Edit) */}
                            <div>
                                <label className="block text-xs font-bold uppercase text-neutral-500 mb-1">Plan ID (Unique)</label>
                                <input
                                    disabled={!isCreating}
                                    value={formData.id}
                                    onChange={(e) => handleChange('id', e.target.value)}
                                    className="w-full border border-neutral-200 rounded-md px-3 py-2 font-mono text-sm disabled:bg-neutral-100"
                                    placeholder="e.g. prod_pro_monthly"
                                />
                            </div>

                            {/* Name */}
                            <div>
                                <label className="block text-xs font-bold uppercase text-neutral-500 mb-1">Display Name</label>
                                <input
                                    value={formData.display_name || ''}
                                    onChange={(e) => handleChange('display_name', e.target.value)}
                                    className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm"
                                    placeholder="Pro Plan Monthly"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Price INR */}
                                <div>
                                    <label className="block text-xs font-bold uppercase text-neutral-500 mb-1">Price (INR)</label>
                                    <input
                                        type="number"
                                        value={formData.price_inr || ''}
                                        onChange={(e) => handleChange('price_inr', parseInt(e.target.value))}
                                        className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm"
                                    />
                                </div>
                                {/* Validity */}
                                <div>
                                    <label className="block text-xs font-bold uppercase text-neutral-500 mb-1">Validity (Days)</label>
                                    <input
                                        type="number"
                                        value={formData.validity_days || ''}
                                        onChange={(e) => handleChange('validity_days', parseInt(e.target.value))}
                                        className="w-full border border-neutral-200 rounded-md px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>

                            {/* Limits JSON */}
                            <div>
                                <label className="block text-xs font-bold uppercase text-neutral-500 mb-1">Limits (JSON)</label>
                                <textarea
                                    rows={5}
                                    defaultValue={JSON.stringify(formData.limits || {}, null, 2)}
                                    onChange={(e) => handleLimitChange(e.target.value)}
                                    className="w-full border border-neutral-200 rounded-md px-3 py-2 font-mono text-xs bg-neutral-50"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-2">
                            <button
                                onClick={() => { setEditingPlan(null); setIsCreating(false); }}
                                className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 text-sm font-medium bg-black text-white rounded-md hover:bg-neutral-800 flex items-center gap-2"
                            >
                                <Check size={16} /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
