import { supabase } from "@/lib/supabase";
import { BadgeDollarSign, Ticket, Users } from "lucide-react";
import Link from 'next/link';

export const revalidate = 0; // Disable cache

async function getStats() {
  const { data: plans } = await supabase.from('access_plans').select('*');
  const { data: coupons } = await supabase.from('coupons').select('*');
  const { count: subsCount } = await supabase.from('subscriptions').select('*', { count: 'exact', head: true });

  return {
    plans: plans || [],
    coupons: coupons || [],
    subsCount: subsCount || 0
  };
}

export default async function Home() {
  const { plans, coupons, subsCount } = await getStats();

  return (
    <div className="min-h-screen bg-neutral-50 p-8 font-sans text-neutral-900">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Ops Command Center</h1>
          <p className="text-neutral-500">Manage Plans, Mint Invites, Track Beta.</p>
        </div>
        <div className="flex gap-2">
          {/* Actions will go here */}
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="p-6 bg-white rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <BadgeDollarSign size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500">Active Plans</p>
              <h3 className="text-2xl font-bold">{plans.length}</h3>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <Ticket size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500">Total Invites</p>
              <h3 className="text-2xl font-bold">{coupons.length}</h3>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500">Active Beta Users</p>
              <h3 className="text-2xl font-bold">{subsCount}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Plans Section */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">💎 Access Plans</h2>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-3 font-medium text-neutral-500">ID</th>
                <th className="px-6 py-3 font-medium text-neutral-500">Name</th>
                <th className="px-6 py-3 font-medium text-neutral-500">Price</th>
                <th className="px-6 py-3 font-medium text-neutral-500">Limits</th>
                <th className="px-6 py-3 font-medium text-neutral-500">Default Validity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-neutral-50">
                  <td className="px-6 py-4 font-mono text-xs">{plan.id}</td>
                  <td className="px-6 py-4 font-medium">{plan.display_name}</td>
                  <td className="px-6 py-4">₹{(plan.price_inr / 100).toFixed(2)}</td>
                  <td className="px-6 py-4 text-xs font-mono max-w-xs truncate text-neutral-500">
                    {JSON.stringify(plan.limits)}
                  </td>
                  <td className="px-6 py-4">{plan.validity_days} days</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Coupons Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">🎟️ Recent Invites</h2>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-3 font-medium text-neutral-500">Code</th>
                <th className="px-6 py-3 font-medium text-neutral-500">Plan</th>
                <th className="px-6 py-3 font-medium text-neutral-500">Discount</th>
                <th className="px-6 py-3 font-medium text-neutral-500">Usage</th>
                <th className="px-6 py-3 font-medium text-neutral-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {coupons.slice(0, 10).map((c) => (
                <tr key={c.code} className="hover:bg-neutral-50">
                  <td className="px-6 py-4 font-mono text-xs font-bold text-blue-600">{c.code}</td>
                  <td className="px-6 py-4">{c.plan_id}</td>
                  <td className="px-6 py-4">{c.discount_percent}%</td>
                  <td className="px-6 py-4">{c.redemptions_count} / {c.max_redemptions}</td>
                  <td className="px-6 py-4">
                    {c.redemptions_count >= c.max_redemptions ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Redeemed</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
                    )}
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">No invites generated yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
