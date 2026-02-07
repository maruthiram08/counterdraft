'use client';

import { useState } from 'react';
import { approveRequest, rejectRequest, extendSubscription } from './actions';
import { Check, X, Clock, Plus, User } from 'lucide-react';
import Link from 'next/link';

export default function UsersClient({ requests, subscriptions, userMap }: { requests: any[], subscriptions: any[], userMap: any }) {
    const [activeTab, setActiveTab] = useState<'beta' | 'customers'>('beta');

    // Actions
    const handleApprove = async (id: string) => {
        if (!confirm('Approve this request? This will eventually trigger an invite email.')) return;
        try { await approveRequest(id); } catch (e: any) { alert(e.message); }
    };

    const handleReject = async (id: string) => {
        if (!confirm('Reject this request?')) return;
        try { await rejectRequest(id); } catch (e: any) { alert(e.message); }
    };

    const handleExtend = async (userId: string) => {
        const days = prompt("How many days to extend?", "30");
        if (!days) return;
        try { await extendSubscription(userId, parseInt(days)); } catch (e: any) { alert(e.message); }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900 mb-2 block">← Back to Command Center</Link>
                    <h1 className="text-3xl font-bold tracking-tight text-neutral-900">User Management</h1>
                </div>
            </div>

            <div className="flex gap-4 mb-6 border-b border-neutral-200">
                <button
                    onClick={() => setActiveTab('beta')}
                    className={`pb-3 px-1 font-medium text-sm transition-colors relative ${activeTab === 'beta' ? 'text-black' : 'text-neutral-500 hover:text-neutral-700'}`}
                >
                    Beta Requests ({requests.filter((r: any) => r.status === 'pending').length})
                    {activeTab === 'beta' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
                </button>
                <button
                    onClick={() => setActiveTab('customers')}
                    className={`pb-3 px-1 font-medium text-sm transition-colors relative ${activeTab === 'customers' ? 'text-black' : 'text-neutral-500 hover:text-neutral-700'}`}
                >
                    Active Customers ({subscriptions.length})
                    {activeTab === 'customers' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
                </button>
            </div>

            {activeTab === 'beta' && (
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-neutral-50 border-b border-neutral-200">
                            <tr>
                                <th className="px-6 py-3 font-medium text-neutral-500">Name</th>
                                <th className="px-6 py-3 font-medium text-neutral-500">Email</th>
                                <th className="px-6 py-3 font-medium text-neutral-500">Reason</th>
                                <th className="px-6 py-3 font-medium text-neutral-500">LinkedIn</th>
                                <th className="px-6 py-3 font-medium text-neutral-500">Status</th>
                                <th className="px-6 py-3 font-medium text-neutral-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {requests.map((req) => (
                                <tr key={req.id} className="hover:bg-neutral-50">
                                    <td className="px-6 py-4 font-medium">{req.name}</td>
                                    <td className="px-6 py-4 text-neutral-600">{req.email}</td>
                                    <td className="px-6 py-4 text-xs max-w-xs truncate" title={req.reason}>{req.reason}</td>
                                    <td className="px-6 py-4">
                                        {req.linkedin_url && (
                                            <a href={req.linkedin_url} target="_blank" className="text-blue-600 hover:underline text-xs">View Profile</a>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase ${req.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex gap-2">
                                        {req.status === 'pending' && (
                                            <>
                                                <button onClick={() => handleApprove(req.id)} className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100" title="Approve">
                                                    <Check size={14} />
                                                </button>
                                                <button onClick={() => handleReject(req.id)} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100" title="Reject">
                                                    <X size={14} />
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {requests.length === 0 && (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-neutral-500">No requests found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'customers' && (
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-neutral-50 border-b border-neutral-200">
                            <tr>
                                <th className="px-6 py-3 font-medium text-neutral-500">User</th>
                                <th className="px-6 py-3 font-medium text-neutral-500">Plan</th>
                                <th className="px-6 py-3 font-medium text-neutral-500">Status</th>
                                <th className="px-6 py-3 font-medium text-neutral-500">Provider</th>
                                <th className="px-6 py-3 font-medium text-neutral-500">Expiry</th>
                                <th className="px-6 py-3 font-medium text-neutral-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {subscriptions.map((sub) => (
                                <tr key={sub.id} className="hover:bg-neutral-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400">
                                                <User size={12} />
                                            </div>
                                            <span className="text-xs font-mono">{userMap[sub.user_id] || sub.user_id.substring(0, 8) + '...'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-xs">{sub.plan_id}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase ${sub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'
                                            }`}>
                                            {sub.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs capitalize text-neutral-500">{sub.provider || 'manual'}</td>
                                    <td className="px-6 py-4 text-xs text-neutral-600">
                                        {new Date(sub.current_period_end).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleExtend(sub.user_id)}
                                            className="p-1.5 hover:bg-neutral-100 rounded text-neutral-500 hover:text-blue-600 flex items-center gap-1 text-xs font-medium"
                                        >
                                            <Clock size={14} /> Extend
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {subscriptions.length === 0 && (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-neutral-500">No active subscriptions.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
