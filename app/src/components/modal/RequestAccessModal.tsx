import React, { useState } from 'react';
import { X, Send, Loader2, Linkedin, User, Mail, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface RequestAccessModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function RequestAccessModal({ isOpen, onClose }: RequestAccessModalProps) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        linkedin: '',
        reason: ''
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/beta/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    linkedin_url: formData.linkedin,
                    reason: formData.reason
                })
            });

            const data = await res.json();
            if (res.ok) {
                setSuccess(true);
            } else {
                toast.error(data.error || "Failed to submit request.");
            }
        } catch (error) {
            toast.error("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gray-50 p-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-serif font-bold text-gray-900">Request Beta Access</h2>
                        <p className="text-sm text-gray-500 mt-0.5">We review requests manually every 24h.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {success ? (
                        <div className="text-center py-8 space-y-4 animate-in fade-in">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Send size={28} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Request Sent!</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Thanks for your interest, {formData.name.split(' ')[0]}.<br />
                                We'll review your LinkedIn profile and email you an invite code if you're a good fit for this beta batch.
                            </p>
                            <button
                                onClick={onClose}
                                className="mt-6 w-full bg-gray-900 text-white font-medium py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
                            >
                                Got it
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Name */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <User size={12} /> Name
                                </label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Your Full Name"
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-gray-800"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <Mail size={12} /> Work Email
                                </label>
                                <input
                                    required
                                    type="email"
                                    placeholder="you@company.com"
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-gray-800"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            {/* LinkedIn */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <Linkedin size={12} /> LinkedIn Profile
                                </label>
                                <input
                                    required
                                    type="url"
                                    placeholder="https://linkedin.com/in/..."
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-gray-800"
                                    value={formData.linkedin}
                                    onChange={e => setFormData({ ...formData, linkedin: e.target.value })}
                                />
                            </div>

                            {/* Reason */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <MessageSquare size={12} /> Why do you want access?
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="I write about X on LinkedIn and want to..."
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm font-medium text-gray-800 resize-none"
                                    value={formData.reason}
                                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:scale-100 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                {loading ? 'Submitting...' : 'Request Invite'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
